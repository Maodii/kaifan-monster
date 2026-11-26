import { LeftoverBatch, LeftoverEvent, TrashEntry, validateLeftover, takeLeftover } from './DailyLivingCore';
import { EnergyPortion, consumedEnergy } from './ConvenienceCore';
import { UndoAction, effectiveExpiry } from './DailyFlowCore';
import { WorkspacePayload, WorkspaceRecord, WorkspacePreferences, WORKSPACE_KEYS, workspaceSignature } from './WorkspaceCore';
import { CatalogManifest, CatalogUpdatePackage, readCatalogManifest, applyCatalogUpdate } from './CatalogUpdate';
import { MealPlan } from './MealPlan';
import { validateMealItems, totalMealCost } from './MealRules';
import { canonicalName, PreferenceEvent } from './RecommendationCore';
import { formProvider, formBindingData, formInfo } from '@kit.FormKit';
import { cardData, CardData } from './CardData';
import { relationalStore, preferences } from '@kit.ArkData';
import { common } from '@kit.AbilityKit';
import { util } from '@kit.ArkTS';
import { RemoteChange, PayloadMetadata } from './Cloud';
import { Food, FoodMovement, Shopping, Meal, MealItem, Ingredient, Change, Recipe, Favorite, Template, dateString, validDate, unitFactor, offlineRecipes } from './Models';
export class Snapshot {
 leftovers:LeftoverBatch[]=[]; trash:TrashEntry[]=[]; plans: MealPlan[] = []; recipes: Recipe[] = []; favorites: Favorite[] = []; templates: Template[] = []; foods: Food[] = []; shopping: Shopping[] = []; meals: Meal[] = []; changes: Change[] = []; locations: string[] = ['冷藏室', '冷冻室', '橱柜', '阳台'];
}
class BuiltinCatalog { version: number = 1; sourceRevision: string = ''; recipes: Recipe[] = []; }
export class LocalStore {
 retiredRecipeIds:string[]=[]; private writeQueue:Promise<void>=Promise.resolve();
 builtinRecipes: Recipe[] = []; feedback: PreferenceEvent[] = [];
 private db: relationalStore.RdbStore | undefined = undefined;
 private prefs: preferences.Preferences | undefined = undefined;
 private scope:string='';
 state: Snapshot = new Snapshot(); deviceId: string = ''; revision: number = 0;
 async init(context: common.UIAbilityContext): Promise<void> {
  const registry:preferences.Preferences=await preferences.getPreferences(context,{name:'shiku_account_spaces'});
  this.scope=(await registry.get('activeScope','')).toString();
  if(this.scope&&!/^[a-f0-9-]{36}$/.test(this.scope)){throw new Error('本机账号空间标识无效');}
  await this.writeQueue;
  if(this.db){await this.db.close();this.db=undefined;}
  this.state=new Snapshot();this.feedback=[];this.builtinRecipes=[];
  this.prefs = await preferences.getPreferences(context, { name: this.scope?'shiku_settings_'+this.scope:'shiku_settings' });
  this.deviceId = (await this.prefs.get('deviceId', '')).toString();
  if (!this.deviceId) { this.deviceId = util.generateRandomUUID(); await this.prefs.put('deviceId', this.deviceId); await this.prefs.flush(); }
  this.db = await relationalStore.getRdbStore(context, { name: this.scope?'shiku_'+this.scope+'.db':'shiku.db', securityLevel: relationalStore.SecurityLevel.S1 });
  await this.db.executeSql('CREATE TABLE IF NOT EXISTS documents (kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(kind,id))');
  await this.db.executeSql('CREATE TABLE IF NOT EXISTS recipe_catalog (id TEXT PRIMARY KEY, name TEXT NOT NULL, region TEXT NOT NULL, category TEXT NOT NULL, minutes INTEGER NOT NULL, payload TEXT NOT NULL)');
  await this.db.executeSql('CREATE INDEX IF NOT EXISTS catalog_region_category ON recipe_catalog(region,category,minutes)');
  await this.db.executeSql('CREATE INDEX IF NOT EXISTS catalog_name ON recipe_catalog(name)');
  await this.db.executeSql('CREATE TABLE IF NOT EXISTS catalog_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  await this.db.executeSql('CREATE TABLE IF NOT EXISTS recommendation_feedback (id TEXT PRIMARY KEY,recipe_id TEXT NOT NULL,action TEXT NOT NULL,created_at TEXT NOT NULL)');
  const columns: relationalStore.ResultSet = await this.db.querySql('PRAGMA table_info(recommendation_feedback)');
  let hasIntent: boolean = false; try { while (columns.goToNextRow()) { if (columns.getString(1) === 'intent') { hasIntent = true; } } } finally { columns.close(); }
  if (!hasIntent) { await this.db.executeSql("ALTER TABLE recommendation_feedback ADD COLUMN intent TEXT NOT NULL DEFAULT 'cook'"); }
  await this.db.executeSql('CREATE INDEX IF NOT EXISTS feedback_recent ON recommendation_feedback(created_at)');
  await this.seedCatalog(context);
  await this.load();
 }
 async selectAccountSpace(context:common.UIAbilityContext,userId:string,email:string):Promise<void>{
  if(!/^[a-f0-9-]{36}$/.test(userId)){throw new Error('账号标识无效');}
  const registry:preferences.Preferences=await preferences.getPreferences(context,{name:'shiku_account_spaces'});
  const legacy:preferences.Preferences=await preferences.getPreferences(context,{name:'shiku_settings'});
  const legacyEmail:string=(await legacy.get('boundEmail','')).toString();
  const legacyOwner:string=(await registry.get('legacyOwner','')).toString();
  let target:string=userId;
  if(legacyOwner===userId||(!legacyOwner&&Boolean(legacyEmail)&&legacyEmail===email)){
   target='';
  }
  const oldScope:string=this.scope;
  const claimOwner:string=(await registry.get('guestClaimOwner','')).toString();
  const previouslySynced:boolean=Boolean(await this.getSetting('lastSync',''))||Number(await this.getSetting('syncVersion','0'))>0||this.state.foods.some((f:Food)=>f.version>0||Boolean(f.familyId))||this.state.meals.some((m:Meal)=>m.version>0||Boolean(m.familyId))||this.state.recipes.some((r:Recipe)=>r.version>0)||this.state.shopping.some((s:Shopping)=>s.version>0);
  const canClaim:boolean=!previouslySynced&&oldScope===''&&!legacyOwner&&!legacyEmail&&(!claimOwner||claimOwner===userId)&&target!=='';
  const guest:string=canClaim?JSON.stringify(this.state):'';
  const guestPreferences:string[]=WORKSPACE_KEYS.concat(['theme','reducedMotion']);
  const values:string[]=[];
  if(canClaim){for(const key of guestPreferences){values.push(await this.getSetting(key,''));}await registry.put('guestClaimOwner',userId);await registry.flush();}
  await registry.put('activeScope',target);await registry.flush();
  try{
   await this.init(context);
   if(canClaim&&await this.getSetting('guestAdopted','')!=='true'){
    await this.importData(guest,false);
    for(let i:number=0;i<guestPreferences.length;i++){if(values[i]&&await this.getSetting(guestPreferences[i],'')===''){await this.setting(guestPreferences[i],values[i]);}}
    await this.setting('guestAdopted','true');
   }
   if(target===''&&!legacyOwner){await registry.put('legacyOwner',userId);await registry.flush();}
  }catch(error){await registry.put('legacyOwner',legacyOwner);await registry.put('activeScope',oldScope);await registry.flush();await this.init(context);throw new Error((error as Error).message);}

 }
 private async seedCatalog(context: common.UIAbilityContext): Promise<void> {
  const raw: Uint8Array = await context.resourceManager.getRawFileContent('recipes.json');
  const catalog: BuiltinCatalog = JSON.parse(util.TextDecoder.create('utf-8').decodeToString(raw)) as BuiltinCatalog;
  const meta: relationalStore.ResultSet = await this.db!.querySql("SELECT value FROM catalog_meta WHERE key='revision'");
  let current: string = ''; try { if (meta.goToFirstRow()) { current = meta.getString(0); } } finally { meta.close(); }
  if (current !== catalog.sourceRevision) {
   await this.db!.beginTransaction();
   try { for (const r of catalog.recipes) { await this.db!.executeSql('INSERT OR REPLACE INTO recipe_catalog(id,name,region,category,minutes,payload) VALUES(?,?,?,?,?,?)',[r.id,r.name,r.region,r.category,r.minutes,JSON.stringify(r)]); } await this.db!.executeSql("INSERT OR REPLACE INTO catalog_meta(key,value) VALUES('revision',?)",[catalog.sourceRevision]);await this.db!.executeSql("DELETE FROM catalog_meta WHERE key IN ('remoteManifest','remoteRetiredIds')"); await this.db!.commit(); } catch (e) { await this.db!.rollBack(); throw new Error((e as Error).message); }
  }
  const rows: relationalStore.ResultSet = await this.db!.querySql('SELECT payload FROM recipe_catalog ORDER BY name'); this.builtinRecipes = [];
  try { while (rows.goToNextRow()) { this.builtinRecipes.push(JSON.parse(rows.getString(0)) as Recipe); } } finally { rows.close(); }
  await this.reloadBuiltinCatalog();
  const events: relationalStore.ResultSet = await this.db!.querySql('SELECT recipe_id,action,created_at,intent FROM recommendation_feedback ORDER BY created_at LIMIT 1000'); this.feedback = [];
  try { while (events.goToNextRow()) { const event: PreferenceEvent = new PreferenceEvent(); event.recipeId = events.getString(0); event.action = events.getString(1); event.date = events.getString(2); event.intent = events.getString(3); this.feedback.push(event); } } finally { events.close(); }
 }
 async releaseUnsyncedBinding(): Promise<void> {
  const synced: boolean = (await this.getSetting('lastSync','')).length > 0 || Number(await this.getSetting('syncVersion','0')) > 0 || this.state.changes.some((change: Change) => change.baseVersion > 0) || this.state.foods.some((item: Food) => item.version > 0 || Boolean(item.familyId)) || this.state.meals.some((item: Meal) => item.version > 0 || Boolean(item.familyId)) || this.state.recipes.some((item: Recipe) => item.version > 0) || this.state.shopping.some((item: Shopping) => item.version > 0);
  if (synced || this.state.templates.some((item: Template) => item.version > 0 || Boolean(item.familyId)) || this.state.favorites.some((item: Favorite) => item.version > 0)) { throw new Error('本机已有同步记录，请使用原账号；现有数据不会清空'); }
  await this.setting('boundEmail','');
 }
 async recordFeedback(recipeId: string, action: string, intent: string = 'cook'): Promise<void> {
  if (!['open','select','skip','like','dislike','recently_eaten','too_complex','not_my_taste'].includes(action)) { throw new Error('反馈类型无效'); }
  const event: PreferenceEvent = new PreferenceEvent(); event.recipeId = recipeId; event.action = action; event.intent = intent; event.date = new Date().toISOString();
  await this.db!.executeSql('INSERT INTO recommendation_feedback(id,recipe_id,action,created_at,intent) VALUES(?,?,?,?,?)',[util.generateRandomUUID(),recipeId,action,event.date,intent]); this.feedback.push(event); if (this.feedback.length > 1000) { this.feedback = this.feedback.slice(-1000); }
  await this.db!.executeSql('DELETE FROM recommendation_feedback WHERE id NOT IN (SELECT id FROM recommendation_feedback ORDER BY created_at DESC LIMIT 1000)'); this.revision++;
 }
 async clearLearning(intent: string = ''): Promise<void> { if (intent) { await this.db!.executeSql('DELETE FROM recommendation_feedback WHERE intent=?',[intent]); this.feedback = this.feedback.filter((event: PreferenceEvent) => (event.intent || 'cook') !== intent); } else { await this.db!.executeSql('DELETE FROM recommendation_feedback'); this.feedback = []; } this.revision++; }
 private async load(): Promise<void> {
  if (!this.db) { throw new Error('数据库未就绪'); }
  await this.db.executeSql("DELETE FROM documents WHERE kind='trash' AND CAST(json_extract(payload,'$.deletedAt') AS INTEGER)<?",[Date.now()-30*86400000]);
  const rows: relationalStore.ResultSet = await this.db.querySql('SELECT kind,payload FROM documents ORDER BY rowid');
  const state: Snapshot = new Snapshot();
  try {
   while (rows.goToNextRow()) {
    const kind: string = rows.getString(0); const value: string = rows.getString(1);
    if(kind==='leftover_batches'){state.leftovers.push(JSON.parse(value) as LeftoverBatch);}
    if(kind==='trash'){const entry:TrashEntry=JSON.parse(value) as TrashEntry;if(entry.deletedAt>Date.now()-30*86400000){state.trash.push(entry);}}
    if (kind === 'recipes') { state.recipes.push(JSON.parse(value) as Recipe); }
    if (kind === 'recipe_favorites') { state.favorites.push(JSON.parse(value) as Favorite); }
    if (kind === 'barcode_lib') { state.templates.push(JSON.parse(value) as Template); }
    if (kind === 'food_items') { state.foods.push(JSON.parse(value) as Food); }
    if (kind === 'shopping_list') { state.shopping.push(JSON.parse(value) as Shopping); }
    if (kind === 'meal_records') { state.meals.push(JSON.parse(value) as Meal); }
    if (kind === 'meal_plans') { state.plans.push(JSON.parse(value) as MealPlan); }
    if (kind === 'changes') { state.changes.push(JSON.parse(value) as Change); }
    if (kind === 'locations') { state.locations = JSON.parse(value) as string[]; }
   }
  } finally { rows.close(); }
  this.state = state; this.revision++;
  const data: CardData = cardData(state.foods, state.shopping); if (this.prefs) { await this.prefs.put('cardData', JSON.stringify(data)); await this.prefs.flush(); }
  try { const forms: formInfo.RunningFormInfo[] = await formProvider.getPublishedRunningFormInfos(); for (const form of forms) { await formProvider.updateForm(form.formId, formBindingData.createFormBindingData(data)); } } catch (_) { /* 没有桌面卡片时，本地读写仍然有效。 */ }
 }
 private async persist(kind: string, id: string, payload: string): Promise<void> {
  if (!this.db) { throw new Error('数据库未就绪'); }
  await this.db.executeSql('INSERT OR REPLACE INTO documents(kind,id,payload) VALUES(?,?,?)', [kind, id, payload]);
 }
 private async writeChange(kind: string, id: string, payload: string, version: number, operation: string = 'upsert'): Promise<void> {
  const change: Change = new Change(); change.changeId = util.generateRandomUUID(); change.entityId = id; change.entityType = kind;
  change.baseVersion = version; change.payload = payload; change.modifiedAt = new Date().toISOString(); change.deviceId = this.deviceId; change.operation = operation;
  await this.persist('changes', change.changeId, JSON.stringify(change));
 }
 async saveFood(food: Food): Promise<void> {
  if((food.openedAt&&!validDate(food.openedAt))||(food.openedExpiry&&(!validDate(food.openedExpiry)||!food.openedAt||food.openedExpiry<food.openedAt))){throw new Error('请确认开封与开封后到期日期');}
  if (!food.name.trim() || food.quantity < 0 || !Number.isFinite(food.quantity) || !Number.isFinite(food.estimatedPrice) || food.estimatedPrice < 0 || !validDate(food.expiryDate) || (food.purchasedAt.length > 0 && !validDate(food.purchasedAt))) { throw new Error('请填写食材名称、有效数量和到期日期'); }
  if (!food.id) { food.purchasedQuantity = food.quantity; food.purchasePrice = food.estimatedPrice; food.movements = []; food.id = util.generateRandomUUID(); }
  food.modifiedAt = new Date().toISOString(); food.deviceId = this.deviceId;
  await this.atomic(async () => { await this.persist('food_items', food.id, JSON.stringify(food)); await this.writeChange('food_items', food.id, JSON.stringify(food), food.version); });
 }
 async deleteFood(food: Food): Promise<void> {
  await this.atomic(async () => { await this.stashTrash('food_items',food.id); await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['food_items', food.id]); await this.writeChange('food_items', food.id, JSON.stringify(food), food.version, 'delete'); });
 }
 async saveShopping(item: Shopping): Promise<void> {
  if (!item.name.trim() || item.quantity <= 0 || !Number.isFinite(item.quantity)) { throw new Error('采购名称和数量无效'); }
  if (!item.id) { item.id = util.generateRandomUUID(); } item.modifiedAt = new Date().toISOString();
  await this.atomic(async () => { await this.persist('shopping_list', item.id, JSON.stringify(item)); await this.writeChange('shopping_list', item.id, JSON.stringify(item), item.version); });
 }
 async deleteShopping(item: Shopping): Promise<void> {
  await this.atomic(async () => { await this.stashTrash('shopping_list',item.id); await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['shopping_list', item.id]); await this.writeChange('shopping_list', item.id, JSON.stringify(item), item.version, 'delete'); });
 }
 async saveMeal(meal: Meal): Promise<void> {
  if(meal.energyReference>=0){const energy:EnergyPortion=new EnergyPortion();energy.referenceKcal=meal.energyReference;energy.fraction=meal.consumedFraction;energy.source=meal.calorieSource;if(consumedEnergy(energy)!==meal.calories){throw new Error('热量与食用比例不一致');}}

  if((meal.actualMinutes!==undefined&&(!Number.isFinite(meal.actualMinutes)||meal.actualMinutes<0||meal.actualMinutes>2880))||(meal.trialFailure||'').length>400||(meal.trialSubstitution||'').length>200){throw new Error('请核对试做记录');}
  if ((meal.calories !== undefined && (!Number.isFinite(meal.calories) || meal.calories < -1 || meal.calories > 30000)) || (meal.rating !== undefined && (!Number.isInteger(meal.rating) || meal.rating < 0 || meal.rating > 5)) || (meal.place || '').length > 200) { throw new Error('热量、评分或地点无效'); }
  if (!Number.isFinite(new Date(meal.date).getTime())) { throw new Error('用餐日期无效'); }
  if (meal.items && meal.items.length > 0) { validateMealItems(meal.items); meal.name = meal.items.map((item: MealItem) => item.name).join('、').slice(0, 200); meal.estimatedCost = totalMealCost(meal.items); }
  if (!meal.name.trim() || !Number.isFinite(meal.estimatedCost) || meal.estimatedCost < 0) { throw new Error('用餐名称或估算花费无效'); }
  if (!meal.id) { meal.id = util.generateRandomUUID(); } meal.modifiedAt = new Date().toISOString();
  await this.atomic(async () => { await this.persist('meal_records', meal.id, JSON.stringify(meal)); await this.writeChange('meal_records', meal.id, JSON.stringify(meal), meal.version); });
 }
 async cook(recipe: Recipe): Promise<void> {
  if (recipe.ingredients.filter((i: Ingredient) => !i.optional).some((i: Ingredient) => !Number.isFinite(i.quantity) || i.quantity <= 0)) { throw new Error('请先补齐主料实际用量；来源未注明的用量不会自动估算扣减'); }
  if (new Set(recipe.ingredients.map((i) => i.name)).size !== recipe.ingredients.length) { throw new Error('请先合并重复食材用量'); }
  // 一次事务完成扣减及用餐记录；任何食材不足均回滚。
  await this.atomic(async () => {
   for (const ingredient of recipe.ingredients.filter((i: Ingredient) => !i.optional)) {
    let required: number = ingredient.quantity;
    const matches: Food[] = this.state.foods.filter((f: Food) => !f.archived && canonicalName(f.name) === canonicalName(ingredient.name) && unitFactor(f.unit, ingredient.unit) > 0 && f.quantity > 0 && new Date(effectiveExpiry(f) + 'T23:59:59').getTime() >= Date.now()).sort((a: Food, b: Food) => effectiveExpiry(a).localeCompare(effectiveExpiry(b)));
    if (matches.reduce((sum: number, f: Food) => sum + f.quantity * unitFactor(f.unit, ingredient.unit), 0) < required) { throw new Error(`${ingredient.name}库存不足，请先补充或调整菜谱`); }
    for (const original of matches) {
     if (required <= 0) { break; }
     const f: Food = JSON.parse(JSON.stringify(original)) as Food; const used: number = Math.min(f.quantity, required / unitFactor(f.unit, ingredient.unit)); const originalQuantity: number = f.quantity; f.quantity -= used; required -= used * unitFactor(f.unit, ingredient.unit); f.consumedCost = (f.consumedCost || 0) + f.estimatedPrice * used / originalQuantity; f.estimatedPrice = f.estimatedPrice * f.quantity / originalQuantity;
     const movement: FoodMovement = new FoodMovement(); movement.id = util.generateRandomUUID(); movement.date = new Date().toISOString(); movement.quantity = used; movement.cost = f.consumedCost - (original.consumedCost || 0); movement.before = originalQuantity; movement.after = f.quantity; movement.recipeName = recipe.name; f.movements = (f.movements || []).concat([movement]);
     f.archived = f.quantity === 0; if (f.archived) { f.archiveReason = 'consumed'; } f.modifiedAt = new Date().toISOString();
     await this.persist('food_items', f.id, JSON.stringify(f)); await this.writeChange('food_items', f.id, JSON.stringify(f), f.version);
    }
   }
   const meal: Meal = new Meal(); meal.id = util.generateRandomUUID(); meal.name = recipe.name; meal.date = new Date().toISOString(); meal.recipeId = recipe.id; meal.estimatedCost = recipe.estimatedCost; meal.modifiedAt = meal.date; meal.items = [new MealItem(recipe.name, recipe.estimatedCost, recipe.id, recipe.cuisine)];
   await this.persist('meal_records', meal.id, JSON.stringify(meal)); await this.writeChange('meal_records', meal.id, JSON.stringify(meal), 0);
  });
 }
 private validateMealPlan(plan: MealPlan, importedRecipes: Recipe[] = []): void {
  if (!validDate(plan.date) || !['早餐','午餐','晚餐','加餐'].includes(plan.occasion) || !Number.isInteger(plan.people) || plan.people < 1 || plan.people > 20 || typeof plan.completed !== 'boolean') { throw new Error('请选择有效日期、餐次及1至20位用餐人数'); }
  if((plan.sourceMealId&& !/^[a-f0-9-]{36}$/.test(plan.sourceMealId))||(plan.remainingPortions!==undefined&&(!Number.isFinite(plan.remainingPortions)||plan.remainingPortions<0||plan.remainingPortions>100))){throw new Error('关联原餐或剩余份数无效');}
  if(plan.mode&&!['在家做','外食','外卖','吃剩菜'].includes(plan.mode)){throw new Error('安排类型无效');}
  if(plan.note!==undefined&&(typeof plan.note!=='string'||plan.note.length>200)){throw new Error('安排内容过长');}
  if(plan.mode&&plan.mode!=='在家做'){if(!plan.note||!plan.note.trim()){throw new Error('请填写安排内容');}return;}
  if (!offlineRecipes().concat(this.builtinRecipes).concat(this.state.recipes).concat(importedRecipes).some((recipe: Recipe) => recipe.id === plan.recipeId)) { throw new Error('计划菜谱不存在，请重新选择'); }
 }
 async saveMealPlan(plan: MealPlan): Promise<void> {
  this.validateMealPlan(plan);
  const value: MealPlan = JSON.parse(JSON.stringify(plan)) as MealPlan;
  if (!value.id) { value.id = util.generateRandomUUID(); }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)) { throw new Error('计划ID无效'); }
  value.modifiedAt = new Date().toISOString();
  await this.atomic(async () => { await this.persist('meal_plans', value.id, JSON.stringify(value)); });
  plan.id = value.id; plan.modifiedAt = value.modifiedAt;
 }
 async saveMealPlans(plans:MealPlan[]):Promise<void>{
  if(plans.length>100){throw new Error('一次最多安排100项');}for(const plan of plans){this.validateMealPlan(plan);}const values:MealPlan[]=JSON.parse(JSON.stringify(plans)) as MealPlan[];for(const value of values){value.id=util.generateRandomUUID();value.modifiedAt=new Date().toISOString();}await this.atomic(async()=>{for(const value of values){await this.persist('meal_plans',value.id,JSON.stringify(value));}});
 }
 async saveAssistantPlans(plans:MealPlan[],expected:string):Promise<void>{
  if(!plans.length||plans.length>7){throw new Error('请选择1到7天的主菜');}for(const p of plans){this.validateMealPlan(p);}
  const scope:string=this.scope;const database:relationalStore.RdbStore|undefined=this.db;const values:MealPlan[]=JSON.parse(JSON.stringify(plans)) as MealPlan[];
  await this.atomic(async()=>{
   if(scope!==this.scope||database!==this.db||JSON.stringify(this.state.plans)!==expected){throw new Error('账号或计划已变化，请重新核对');}
   const slots:string[]=[];
   for(const p of values){const slot:string=p.date+'|'+p.occasion;if(slots.includes(slot)||this.state.plans.some((old:MealPlan)=>old.date===p.date&&old.occasion===p.occasion)){throw new Error('这天已有安排，请重新选择');}slots.push(slot);p.id=util.generateRandomUUID();p.modifiedAt=new Date().toISOString();await this.persist('meal_plans',p.id,JSON.stringify(p));}
  });
 }
 async removeMealPlan(planId: string): Promise<void> {
  await this.atomic(async () => { await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['meal_plans', planId]); });
 }
 async recordLeftoverPlan(planId:string):Promise<void>{
  await this.atomic(async()=>{
   const plan:MealPlan|undefined=this.state.plans.find((p:MealPlan)=>p.id===planId);
   if(!plan||plan.mode!=='吃剩菜'||!plan.sourceMealId||plan.completed){throw new Error('剩菜计划不存在或已经完成');}
   if(this.state.meals.some((m:Meal)=>m.id===planId)){throw new Error('这份计划已记过餐，请编辑原记录');}
   const source:Meal|undefined=this.state.meals.find((m:Meal)=>m.id===plan.sourceMealId);
   if(!source){throw new Error('原餐记录已移除，请先核对剩菜来源');}
   if(plan.date>dateString(new Date())){throw new Error('未来计划请在实际用餐后记录');}
   const meal:Meal=new Meal();meal.id=planId;meal.name=plan.note||source.name;meal.sourceMealId=source.id;meal.leftoverPortions=plan.remainingPortions||0;meal.diningMode='在家做';meal.tags='剩菜';meal.mealType=plan.occasion;meal.date=new Date(plan.date+'T12:00:00').toISOString();meal.modifiedAt=new Date().toISOString();meal.estimatedCost=0;meal.financeFood=0;meal.mealTotal=0;meal.personalCost=0;meal.notes='费用已记在原餐；此次不重复扣库存。请自行确认保存与食用安全。';
   const done:MealPlan=JSON.parse(JSON.stringify(plan)) as MealPlan;done.completed=true;done.modifiedAt=meal.modifiedAt;
   await this.persist('meal_records',meal.id,JSON.stringify(meal));await this.writeChange('meal_records',meal.id,JSON.stringify(meal),0);await this.persist('meal_plans',done.id,JSON.stringify(done));
  });
 }
 async completeMealPlan(planId: string, completed: boolean): Promise<void> {
  const original: MealPlan | undefined = this.state.plans.find((plan: MealPlan) => plan.id === planId);
  if (!original) { throw new Error('该计划不存在'); }
  const value: MealPlan = JSON.parse(JSON.stringify(original)) as MealPlan; value.completed = completed;
  await this.saveMealPlan(value);
 }
 async saveRecipe(recipe: Recipe): Promise<void> {
  if (new Set(recipe.ingredients.map((i) => i.name + ':' + i.unit)).size !== recipe.ingredients.length) { throw new Error('相同食材与单位请合并为一条用料'); }
  if (!recipe.name.trim() || recipe.ingredients.length === 0 || recipe.steps.length === 0 || recipe.ingredients.some((i) => !i.name.trim() || !Number.isFinite(i.quantity) || i.quantity <= 0) || !Number.isFinite(recipe.estimatedCost) || recipe.estimatedCost < 0) { throw new Error('请补齐菜名、有效用料与步骤'); }
  if (!recipe.id) { recipe.id = util.generateRandomUUID(); } recipe.modifiedAt = new Date().toISOString();
  await this.atomic(async () => { await this.persist('recipes', recipe.id, JSON.stringify(recipe)); await this.writeChange('recipes', recipe.id, JSON.stringify(recipe), recipe.version); });
 }
 async saveAssistantRecipe(recipe:Recipe,expected:string):Promise<void>{
  const scope:string=this.scope;const database:relationalStore.RdbStore|undefined=this.db;
  if(!recipe.originRecipeId||recipe.id||recipe.status!=='private'||recipe.familyId||!recipe.name.trim()||!recipe.ingredients.length||!recipe.steps.length||recipe.ingredients.some((i)=>!i.name.trim()||!Number.isFinite(i.quantity)||i.quantity<=0)||!Number.isFinite(recipe.estimatedCost)||recipe.estimatedCost<0){throw new Error('请核对菜谱名称、用料、做法和费用');}
  await this.atomic(async()=>{if(scope!==this.scope||database!==this.db){throw new Error('账号已变化');}if(JSON.stringify(this.state.recipes)!==expected){throw new Error('私房菜已变化，请重新确认');}if(this.state.recipes.some((r:Recipe)=>r.originRecipeId===recipe.originRecipeId||r.id===recipe.originRecipeId)){throw new Error('这道菜已在你的私房菜中');}recipe.id=util.generateRandomUUID();recipe.modifiedAt=new Date().toISOString();await this.persist('recipes',recipe.id,JSON.stringify(recipe));await this.writeChange('recipes',recipe.id,JSON.stringify(recipe),0);});
 }
 async undoAssistantRecipe(id:string,expected:string):Promise<void>{const scope:string=this.scope;const database:relationalStore.RdbStore|undefined=this.db;await this.atomic(async()=>{if(scope!==this.scope||database!==this.db){throw new Error('账号已变化');}const r:Recipe|undefined=this.state.recipes.find((v:Recipe)=>v.id===id);if(!r||JSON.stringify(r)!==expected){throw new Error('菜谱已有后续修改，不能直接撤销');}await this.db!.executeSql("DELETE FROM documents WHERE kind='recipes' AND id=?",[id]);await this.writeChange('recipes',id,JSON.stringify(r),r.version,'delete');});}
 async deleteRecipe(recipe: Recipe): Promise<void> { await this.atomic(async () => { await this.stashTrash('recipes',recipe.id); await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['recipes', recipe.id]); await this.writeChange('recipes', recipe.id, JSON.stringify(recipe), recipe.version, 'delete'); }); }
 async favorite(recipeId: string): Promise<void> {
  const old: Favorite | undefined = this.state.favorites.find((f: Favorite) => f.recipeId === recipeId);
  await this.atomic(async () => { if (old) { await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['recipe_favorites', old.id]); await this.writeChange('recipe_favorites', old.id, JSON.stringify(old), old.version, 'delete'); } else { const f: Favorite = new Favorite(); f.id = util.generateRandomUUID(); f.recipeId = recipeId; f.modifiedAt = new Date().toISOString(); await this.persist('recipe_favorites', f.id, JSON.stringify(f)); await this.writeChange('recipe_favorites', f.id, JSON.stringify(f), 0); } });
 }
 async batchFood(ids: string[], operation: string, value: string): Promise<void> {
  if (operation === 'expiry' && !validDate(value)) { throw new Error('到期日期无效'); } if (operation === 'location' && !this.state.locations.includes(value)) { throw new Error('请选择存放位置'); }
  await this.atomic(async () => { for (const original of this.state.foods.filter((f: Food) => ids.includes(f.id))) { const f: Food = JSON.parse(JSON.stringify(original)) as Food; if (operation === 'delete') { await this.stashTrash('food_items',f.id); await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['food_items', f.id]); await this.writeChange('food_items', f.id, JSON.stringify(f), f.version, 'delete'); } else { if (operation === 'location') { f.location = value; } if (operation === 'expiry') { f.expiryDate = value; } f.modifiedAt = new Date().toISOString(); await this.persist('food_items', f.id, JSON.stringify(f)); await this.writeChange('food_items', f.id, JSON.stringify(f), f.version); } } });
 }
 async clearPurchased(): Promise<void> { await this.atomic(async () => { for (const s of this.state.shopping.filter((item: Shopping) => item.purchased)) { await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['shopping_list', s.id]); await this.writeChange('shopping_list', s.id, JSON.stringify(s), s.version, 'delete'); } }); }
 async deleteTemplate(template: Template): Promise<void> { await this.atomic(async () => { await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['barcode_lib', template.id]); await this.writeChange('barcode_lib', template.id, JSON.stringify(template), template.version, 'delete'); }); }
 async saveTemplate(template: Template): Promise<void> {
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(template.barcode) || !template.name.trim()) { throw new Error('请输入有效EAN/UPC条码及名称'); }
  if (!template.id) { template.id = util.generateRandomUUID(); } template.modifiedAt = new Date().toISOString();
  await this.atomic(async () => { await this.persist('barcode_lib', template.id, JSON.stringify(template)); await this.writeChange('barcode_lib', template.id, JSON.stringify(template), template.version); });
 }
 async deleteMeal(meal: Meal): Promise<void> {
  await this.atomic(async () => { await this.stashTrash('meal_records',meal.id); await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['meal_records', meal.id]); await this.writeChange('meal_records', meal.id, JSON.stringify(meal), meal.version, 'delete'); });
 }
 async consume(food: Food, quantity: number, wasted: boolean = false): Promise<void> {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > food.quantity) { throw new Error('消耗量需大于0且不超过库存'); }
  const f: Food = JSON.parse(JSON.stringify(food)) as Food; const cost: number = f.quantity > 0 ? f.estimatedPrice * quantity / f.quantity : 0;
  const movement: FoodMovement = new FoodMovement(); movement.id = util.generateRandomUUID(); movement.date = new Date().toISOString(); movement.quantity = quantity; movement.cost = cost; movement.reason = wasted ? 'wasted' : 'consumed'; movement.before = food.quantity; movement.after = Math.max(0,food.quantity - quantity); f.movements = (f.movements || []).concat([movement]);
  f.quantity = Math.max(0, f.quantity - quantity); f.estimatedPrice = Math.max(0, f.estimatedPrice - cost);
  if (wasted) { f.wastedCost = (f.wastedCost || 0) + cost; } else { f.consumedCost = (f.consumedCost || 0) + cost; }
  f.archived = f.quantity === 0; if (f.archived) { f.archiveReason = wasted ? 'wasted' : 'consumed'; }
  f.modifiedAt=new Date().toISOString(); const undo:UndoAction=new UndoAction();undo.id=util.generateRandomUUID();undo.kind='food_items';undo.entityId=f.id;undo.before=JSON.stringify(food);undo.after=JSON.stringify(f);undo.createdAt=Date.now();await this.atomic(async()=>{const current:Food|undefined=this.state.foods.find((v:Food)=>v.id===food.id);if(!current||JSON.stringify(current)!==JSON.stringify(food)){throw new Error('库存已有变化，请重新检查');}await this.persist('food_items',f.id,undo.after);await this.writeChange('food_items',f.id,undo.after,f.version);await this.persist('undo','latest',JSON.stringify(undo));});
 }
 async renameLocation(oldName: string, name: string): Promise<void> {
  name = name.trim(); if (!name || name.length > 40 || !this.state.locations.includes(oldName) || this.state.locations.includes(name)) { throw new Error('名称为空、过长或与现有位置重复'); }
  await this.atomic(async () => {
   await this.persist('locations', 'all', JSON.stringify(this.state.locations.map((v: string) => v === oldName ? name : v)));
   for (const original of this.state.foods.filter((v: Food) => v.location === oldName)) { const f: Food = JSON.parse(JSON.stringify(original)) as Food; f.location = name; f.modifiedAt = new Date().toISOString(); await this.persist('food_items', f.id, JSON.stringify(f)); await this.writeChange('food_items', f.id, JSON.stringify(f), f.version); }
   for (const original of this.state.templates.filter((v: Template) => v.location === oldName)) { const t: Template = JSON.parse(JSON.stringify(original)) as Template; t.location = name; t.modifiedAt = new Date().toISOString(); await this.persist('barcode_lib', t.id, JSON.stringify(t)); await this.writeChange('barcode_lib', t.id, JSON.stringify(t), t.version); }
  });
 }
 async addFoodsBatch(foods:Food[]):Promise<void>{
  if(!foods.length||foods.length>30){throw new Error('请选择1至30项食材');}
  for(const f of foods){if(!f.name.trim()||!Number.isFinite(f.quantity)||f.quantity<=0||!validDate(f.expiryDate)||!Number.isFinite(f.estimatedPrice)||f.estimatedPrice<0){throw new Error('请逐项确认数量、日期与价格');}}
  await this.atomic(async()=>{for(const original of foods){const f:Food=JSON.parse(JSON.stringify(original)) as Food;f.id=util.generateRandomUUID();f.version=0;f.familyId='';f.modifiedAt=new Date().toISOString();f.purchasedQuantity=f.quantity;f.purchasePrice=f.estimatedPrice;await this.persist('food_items',f.id,JSON.stringify(f));await this.writeChange('food_items',f.id,JSON.stringify(f),0);}});
 }
 async purchaseIntoInventory(shoppingId:string,food:Food):Promise<void>{if(!food.name.trim()||food.quantity<=0||!Number.isFinite(food.quantity)||!validDate(food.expiryDate)||!Number.isFinite(food.estimatedPrice)||food.estimatedPrice<0){throw new Error('请确认有效数量、日期和本批总价');}await this.atomic(async()=>{const item:Shopping|undefined=this.state.shopping.find((v:Shopping)=>v.id===shoppingId);if(!item){throw new Error('采购项已删除');}const f:Food=JSON.parse(JSON.stringify(food)) as Food;f.id=util.generateRandomUUID();f.version=0;f.purchasedQuantity=f.quantity;f.purchasePrice=f.estimatedPrice;f.modifiedAt=new Date().toISOString();const next:Shopping=JSON.parse(JSON.stringify(item)) as Shopping;next.purchased=true;next.modifiedAt=f.modifiedAt;await this.persist('food_items',f.id,JSON.stringify(f));await this.writeChange('food_items',f.id,JSON.stringify(f),0);await this.persist('shopping_list',next.id,JSON.stringify(next));await this.writeChange('shopping_list',next.id,JSON.stringify(next),next.version);await this.db!.executeSql("DELETE FROM documents WHERE kind='undo' AND id='latest'");});}
 async purchasePartial(shoppingId:string,food:Food,expectedSnapshot:string):Promise<void>{
  if(!food.name.trim()||!Number.isFinite(food.quantity)||food.quantity<=0||!validDate(food.expiryDate)||!Number.isFinite(food.estimatedPrice)||food.estimatedPrice<0){throw new Error('请核对实际买到的数量、日期和金额');}
  await this.atomic(async()=>{
   const source:Shopping|undefined=this.state.shopping.find((s:Shopping)=>s.id===shoppingId);
   if(!source||source.purchased||JSON.stringify(source)!==expectedSnapshot){throw new Error('采购项已变化，请刷新后再买');}
   if(source.familyId!==(food.familyId||'')){throw new Error('采购与入库共享范围必须相同');}
   const factor:number=unitFactor(food.unit,source.unit);if(canonicalName(food.name)!==canonicalName(source.name)||factor<=0){throw new Error('部分购入须为同食材和可换算单位；替换品请单独录入');}
   const bought:number=food.quantity*factor;if(bought>source.quantity+0.00001){throw new Error('超过待购数量，请先调整采购计划');}
   const f:Food=JSON.parse(JSON.stringify(food)) as Food;f.id=util.generateRandomUUID();f.version=0;f.purchasedAt=f.purchasedAt||dateString(new Date());f.purchasedQuantity=f.quantity;f.purchasePrice=f.estimatedPrice;f.modifiedAt=new Date().toISOString();
   const next:Shopping=JSON.parse(JSON.stringify(source)) as Shopping;const remaining:number=Math.round((source.quantity-bought)*1000000)/1000000;next.purchased=remaining<=0;next.quantity=remaining>0?remaining:source.quantity;next.modifiedAt=f.modifiedAt;
   await this.persist('food_items',f.id,JSON.stringify(f));await this.writeChange('food_items',f.id,JSON.stringify(f),0);await this.persist('shopping_list',next.id,JSON.stringify(next));await this.writeChange('shopping_list',next.id,JSON.stringify(next),next.version);await this.db!.executeSql("DELETE FROM documents WHERE kind='undo' AND id='latest'");
  });
 }
 async purchaseStatus(item:Shopping):Promise<void>{const original:Shopping|undefined=this.state.shopping.find((s:Shopping)=>s.id===item.id);if(!original||original.modifiedAt!==item.modifiedAt){throw new Error('采购项已变化，请刷新');}const after:Shopping=JSON.parse(JSON.stringify(original)) as Shopping;after.purchased=!after.purchased;after.modifiedAt=new Date().toISOString();const undo:UndoAction=new UndoAction();undo.id=util.generateRandomUUID();undo.kind='shopping_list';undo.entityId=item.id;undo.before=JSON.stringify(original);undo.after=JSON.stringify(after);undo.createdAt=Date.now();await this.atomic(async()=>{await this.persist('shopping_list',after.id,undo.after);await this.writeChange('shopping_list',after.id,undo.after,after.version);await this.persist('undo','latest',JSON.stringify(undo));});}
 async lastUndo():Promise<UndoAction|null>{const rows:relationalStore.ResultSet=await this.db!.querySql("SELECT payload FROM documents WHERE kind='undo' AND id='latest'");try{return rows.goToFirstRow()?JSON.parse(rows.getString(0)) as UndoAction:null;}finally{rows.close();}}
 async undoLast():Promise<void>{await this.atomic(async()=>{const action:UndoAction|null=await this.lastUndo();if(!action||Date.now()-action.createdAt>300000){throw new Error('仅可撤销5分钟内最近一次操作');}const rows:relationalStore.ResultSet=await this.db!.querySql('SELECT payload FROM documents WHERE kind=? AND id=?',[action.kind,action.entityId]);let current:string='';try{if(rows.goToFirstRow()){current=rows.getString(0);}}finally{rows.close();}if(current!==action.after){throw new Error('记录已有后续修改或同步，不能直接撤销');}let restored:string=action.before;if(action.kind==='food_items'){const f:Food=JSON.parse(action.before) as Food;const after:Food=JSON.parse(action.after) as Food;const movement:FoodMovement=new FoodMovement();movement.id=util.generateRandomUUID();movement.date=new Date().toISOString();movement.reason='restored';movement.quantity=f.quantity-after.quantity;movement.before=after.quantity;movement.after=f.quantity;movement.cost=Math.max(0,f.estimatedPrice-after.estimatedPrice);f.movements=(after.movements||[]).concat([movement]);f.modifiedAt=movement.date;restored=JSON.stringify(f);}await this.persist(action.kind,action.entityId,restored);const metadata:Food=JSON.parse(restored) as Food;await this.writeChange(action.kind,action.entityId,restored,metadata.version||0);await this.db!.executeSql("DELETE FROM documents WHERE kind='undo' AND id='latest'");});}
 async removeLatestFeedback(recipeId:string,intent:string,action:string):Promise<void>{await this.atomic(async()=>{await this.db!.executeSql('DELETE FROM recommendation_feedback WHERE id=(SELECT id FROM recommendation_feedback WHERE recipe_id=? AND intent=? AND action=? ORDER BY created_at DESC LIMIT 1)',[recipeId,intent,action]);});const index:number=this.feedback.map((e:PreferenceEvent)=>e.recipeId+'|'+(e.intent||'cook')+'|'+e.action).lastIndexOf(recipeId+'|'+intent+'|'+action);if(index>=0){this.feedback.splice(index,1);}this.revision++;}
 async workspacePayload():Promise<WorkspacePayload>{const payload:WorkspacePayload=new WorkspacePayload();payload.plans=JSON.parse(JSON.stringify(this.state.plans)) as MealPlan[];const entries:string[]=[];for(const key of WORKSPACE_KEYS){const value:string=await this.getSetting(key,'');if(value!==''){entries.push(JSON.stringify(key)+':'+JSON.stringify(value));}}payload.preferences=JSON.parse('{'+entries.join(',')+'}') as WorkspacePreferences;return payload;}
 async applyWorkspace(record:WorkspaceRecord,expectedLocal:string):Promise<void>{if(!record.payload||record.payload.format!==1||!Array.isArray(record.payload.plans)){throw new Error('工作区无效');}if(workspaceSignature(await this.workspacePayload())!==expectedLocal){throw new Error('本机安排又有变化，请重新对照');}for(const plan of record.payload.plans){this.validateMealPlan(plan);}await this.atomic(async()=>{if(workspaceSignature(await this.workspacePayload())!==expectedLocal){throw new Error('本机安排又有变化，请重新对照');}await this.db!.executeSql("DELETE FROM documents WHERE kind='meal_plans'");for(const plan of record.payload!.plans){await this.persist('meal_plans',plan.id,JSON.stringify(plan));}for(const key of WORKSPACE_KEYS){await this.persist('workspace_settings',key,this.workspacePreference(record.payload!.preferences,key));}await this.persist('workspace_settings','workspaceVersion',String(record.version));});}
 private workspacePreference(p:WorkspacePreferences,key:string):string {const keys:string[]=Object.keys(p);const values:string[]=Object.values(p);const index:number=keys.indexOf(key);return index>=0&&typeof values[index]==='string'?values[index]:'';}
 async saveLocations(locations: string[]): Promise<void> { await this.atomic(async () => { await this.persist('locations', 'all', JSON.stringify(locations)); }); }
 async setting(key: string, value: string): Promise<void> { if(WORKSPACE_KEYS.includes(key)||key==='workspaceVersion'){await this.atomic(async()=>{await this.persist('workspace_settings',key,value);});return;} if (this.prefs) { await this.prefs.put(key, value); await this.prefs.flush(); } }
 async getSetting(key: string, fallback: string): Promise<string> { if(this.db&&(WORKSPACE_KEYS.includes(key)||key==='workspaceVersion')){const rows:relationalStore.ResultSet=await this.db.querySql("SELECT payload FROM documents WHERE kind='workspace_settings' AND id=?",[key]);try{if(rows.goToFirstRow()){return rows.getString(0)||fallback;}}finally{rows.close();}}return this.prefs ? (await this.prefs.get(key, fallback)).toString() : fallback; }
 async replacePlannedRecipe(id:string,recipeId:string,expected:string):Promise<void>{
  await this.atomic(async()=>{const old:MealPlan|undefined=this.state.plans.find((p:MealPlan)=>p.id===id);if(!old||JSON.stringify(old)!==expected||old.completed||old.mode!=='在家做'){throw new Error('计划已变化，请刷新');}const next:MealPlan=JSON.parse(JSON.stringify(old)) as MealPlan;next.recipeId=recipeId;next.modifiedAt=new Date().toISOString();this.validateMealPlan(next);await this.persist('meal_plans',id,JSON.stringify(next));});
 }
 async applySuggestedWeek(plans:MealPlan[],expected:string):Promise<void>{
  if(plans.length>7){throw new Error('一次最多安排七天');}for(const p of plans){this.validateMealPlan(p);}
  await this.atomic(async()=>{if(JSON.stringify(this.state.plans)!==expected){throw new Error('安排已有变化，请重新生成草案');}const slots:string[]=[];for(const p of plans){const slot:string=p.date+':'+p.occasion;if(slots.includes(slot)||this.state.plans.some((old:MealPlan)=>old.date===p.date&&old.occasion===p.occasion)){throw new Error('餐次已有安排，请重新生成');}slots.push(slot);const copy:MealPlan=JSON.parse(JSON.stringify(p)) as MealPlan;copy.id=util.generateRandomUUID();copy.modifiedAt=new Date().toISOString();await this.persist('meal_plans',copy.id,JSON.stringify(copy));}});
 }
 async saveLeftover(batch:LeftoverBatch):Promise<void>{
  validateLeftover(batch);if(batch.id){throw new Error('已有批次请使用分次食用或丢弃');}if(batch.remaining!==batch.total||batch.events.length){throw new Error('新批次份数不一致');}
  const copy:LeftoverBatch=JSON.parse(JSON.stringify(batch)) as LeftoverBatch;copy.id=util.generateRandomUUID();copy.modifiedAt=new Date().toISOString();
  await this.atomic(async()=>{if(!this.state.meals.some((m:Meal)=>m.id===copy.sourceMealId)){throw new Error('原餐已删除，请重新选择');}await this.persist('leftover_batches',copy.id,JSON.stringify(copy));});
 }
 async useLeftover(id:string,quantity:number,action:string,expected:string):Promise<void>{
  await this.atomic(async()=>{const batch:LeftoverBatch|undefined=this.state.leftovers.find((b:LeftoverBatch)=>b.id===id);if(!batch||JSON.stringify(batch)!==expected){throw new Error('剩余份数已变化，请重新确认');}
   const next:LeftoverBatch=takeLeftover(batch,quantity,action,dateString(new Date()));const event:LeftoverEvent=new LeftoverEvent();event.id=util.generateRandomUUID();event.date=new Date().toISOString();event.portions=quantity;event.action=action;
   if(action==='eat'){const m:Meal=new Meal();m.id=util.generateRandomUUID();m.name=batch.name;m.date=event.date;m.sourceMealId=batch.sourceMealId;m.leftoverPortions=quantity;m.estimatedCost=0;m.personalCost=0;m.diningMode='在家做';m.tags='剩菜';m.notes='原餐已计费；本次未重复扣减库存';m.modifiedAt=event.date;event.mealId=m.id;await this.persist('meal_records',m.id,JSON.stringify(m));await this.writeChange('meal_records',m.id,JSON.stringify(m),0);}
   next.events.push(event);next.modifiedAt=event.date;await this.persist('leftover_batches',next.id,JSON.stringify(next));
  });
 }
 private async stashTrash(kind:string,id:string):Promise<void>{
  const rows:relationalStore.ResultSet=await this.db!.querySql('SELECT payload FROM documents WHERE kind=? AND id=?',[kind,id]);let payload:string='';try{if(rows.goToFirstRow()){payload=rows.getString(0);}}finally{rows.close();}if(!payload){throw new Error('记录已删除，请刷新');}
  const entry:TrashEntry=new TrashEntry();entry.id=util.generateRandomUUID();entry.kind=kind;entry.payload=payload;entry.name=(JSON.parse(payload) as Food).name;entry.deletedAt=Date.now();await this.persist('trash',entry.id,JSON.stringify(entry));
  await this.db!.executeSql("DELETE FROM documents WHERE kind='trash' AND (CAST(json_extract(payload,'$.deletedAt') AS INTEGER)<? OR id NOT IN (SELECT id FROM documents WHERE kind='trash' ORDER BY CAST(json_extract(payload,'$.deletedAt') AS INTEGER) DESC,rowid DESC LIMIT 30))",[Date.now()-30*86400000]);
 }
 async restoreTrash(id:string):Promise<void>{
  await this.atomic(async()=>{const entry:TrashEntry|undefined=this.state.trash.find((e:TrashEntry)=>e.id===id);if(!entry||entry.deletedAt<Date.now()-30*86400000){throw new Error('记录已过保留期');}if(!['food_items','shopping_list','meal_records','recipes'].includes(entry.kind)){throw new Error('不支持恢复此记录');}
   const value:Food=JSON.parse(entry.payload) as Food;value.id=util.generateRandomUUID();value.version=0;value.familyId='';(value as Object as PayloadMetadata)._familyId='';value.modifiedAt=new Date().toISOString();if(entry.kind==='meal_records'){const meal:Meal=value as Object as Meal;meal.cloudPhoto='';meal.photoId='';meal.photoStatus=meal.localPhoto?'pending':'';}await this.persist(entry.kind,value.id,JSON.stringify(value));await this.writeChange(entry.kind,value.id,JSON.stringify(value),0);await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?',['trash',id]);
  });
 }
 async clearTrash():Promise<void>{await this.atomic(async()=>{await this.db!.executeSql("DELETE FROM documents WHERE kind='trash'");});}
 exportData(): string { const safe:Snapshot=JSON.parse(JSON.stringify(this.state)) as Snapshot;safe.changes=[];safe.trash=[];for(const f of safe.foods){f.localPhoto='';f.familyId='';}for(const m of safe.meals){m.localPhoto='';m.photoOriginal='';m.familyId='';}for(const recipe of safe.recipes){recipe.familyId='';}for(const item of safe.shopping){item.familyId='';}for(const t of safe.templates){t.familyId='';}return JSON.stringify(safe,null,2); }
 backupConflicts(content: string): number {
  const incoming: Snapshot = JSON.parse(content) as Snapshot; if (!incoming || (incoming.plans !== undefined && !Array.isArray(incoming.plans)) || !Array.isArray(incoming.foods) || !Array.isArray(incoming.shopping) || !Array.isArray(incoming.meals)) { throw new Error('备份格式不正确'); }
  if(incoming.leftovers!==undefined&&!Array.isArray(incoming.leftovers)){throw new Error('备份剩菜格式不正确');}let count: number = (incoming.leftovers||[]).filter((b:LeftoverBatch)=>this.state.leftovers.some((old:LeftoverBatch)=>old.id===b.id)).length; incoming.foods.forEach((f: Food) => { if (this.state.foods.some((old: Food) => old.id === f.id)) { count++; } }); incoming.shopping.forEach((s: Shopping) => { if (this.state.shopping.some((old: Shopping) => old.id === s.id)) { count++; } }); incoming.meals.forEach((m: Meal) => { if (this.state.meals.some((old: Meal) => old.id === m.id)) { count++; } });
  (incoming.templates || []).forEach((t: Template) => { if (this.state.templates.some((old: Template) => old.id === t.id)) { count++; } }); (incoming.recipes || []).forEach((r: Recipe) => { if (this.state.recipes.some((old: Recipe) => old.id === r.id)) { count++; } }); (incoming.plans || []).forEach((plan: MealPlan) => { if (this.state.plans.some((old: MealPlan) => old.id === plan.id)) { count++; } }); return count;
 }
 private async importDocument(kind: string, id: string, content: string, replace: boolean): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { throw new Error('备份存在无效记录ID'); }
  const rows: relationalStore.ResultSet = await this.db!.querySql('SELECT payload FROM documents WHERE kind=? AND id=?', [kind, id]); let version: number = 0;
  try { if (rows.goToFirstRow()) { if (!replace) { return; } const old: Food = JSON.parse(rows.getString(0)) as Food; version = old.version || 0; } } finally { rows.close(); }
  if (kind === 'meal_plans'||kind==='leftover_batches') { await this.persist(kind, id, content); return; }
  const value: Food = JSON.parse(content) as Food; value.version = version; const normalized: string = JSON.stringify(value); await this.persist(kind, id, normalized); await this.writeChange(kind, id, normalized, version);
 }
 async importData(content: string, replace: boolean = false, expected: string = ''): Promise<void> {
  this.backupConflicts(content); const incoming: Snapshot = JSON.parse(content) as Snapshot;
  await this.atomic(async () => {
   if(expected&&this.exportData()!==expected){throw new Error('本机记录在预览后已有变化，请重新导入');}
   for (const f of incoming.foods) { if (!f.name || !Number.isFinite(f.quantity) || f.quantity < 0 || !validDate(f.expiryDate) || !Number.isFinite(f.estimatedPrice) || f.estimatedPrice < 0) { throw new Error('备份存在无效库存'); } await this.importDocument('food_items', f.id, JSON.stringify(f), replace); }
   for (const s of incoming.shopping) { if (!s.name || !Number.isFinite(s.quantity) || s.quantity <= 0) { throw new Error('备份存在无效采购项'); } await this.importDocument('shopping_list', s.id, JSON.stringify(s), replace); }
   for (const m of incoming.meals) { if (m.items && m.items.length > 0) { validateMealItems(m.items); m.estimatedCost = totalMealCost(m.items); } if (!m.name || !Number.isFinite(m.estimatedCost) || m.estimatedCost < 0 || !Number.isFinite(new Date(m.date).getTime())) { throw new Error('备份存在无效用餐记录'); } await this.importDocument('meal_records', m.id, JSON.stringify(m), replace); }
   for (const t of incoming.templates || []) { if (!t.name || !/^(\d{8}|\d{12}|\d{13})$/.test(t.barcode)) { throw new Error('备份条码模板无效'); } await this.importDocument('barcode_lib', t.id, JSON.stringify(t), replace); }
   for (const r of incoming.recipes || []) { if (!r.name || !Array.isArray(r.ingredients) || !Array.isArray(r.steps)) { throw new Error('备份菜谱无效'); } await this.importDocument('recipes', r.id, JSON.stringify(r), replace); }
   for (const f of incoming.favorites || []) { if (!f.recipeId) { throw new Error('备份收藏无效'); } await this.importDocument('recipe_favorites', f.id, JSON.stringify(f), replace); }
   if (incoming.plans !== undefined && !Array.isArray(incoming.plans)) { throw new Error('备份计划格式不正确'); }
   for (const p of incoming.plans || []) { this.validateMealPlan(p, incoming.recipes || []); await this.importDocument('meal_plans', p.id, JSON.stringify(p), replace); }
   for(const b of incoming.leftovers||[]){validateLeftover(b);await this.importDocument('leftover_batches',b.id,JSON.stringify(b),replace);}
   if (Array.isArray(incoming.locations)) { const locations: string[] = this.state.locations.slice(); for (const name of incoming.locations) { if (typeof name !== 'string' || name.length > 100) { throw new Error('备份位置无效'); } if (name && !locations.includes(name)) { locations.push(name); } } await this.persist('locations', 'all', JSON.stringify(locations)); }
  });
 }
 async acknowledge(kind: string, id: string, version: number, changeIds: string[]): Promise<void> {
  await this.atomic(async () => {
   const rows: relationalStore.ResultSet = await this.db!.querySql('SELECT payload FROM documents WHERE kind=? AND id=?', [kind, id]);
   try { if (rows.goToFirstRow()) { await this.persistVersion(kind, id, rows.getString(0), version); } } finally { rows.close(); }
   for (const changeId of changeIds) { await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['changes', changeId]); }
  });
 }
 private async persistVersion(kind: string, id: string, content: string, version: number): Promise<void> {
  if (kind === 'recipes') { const value: Recipe = JSON.parse(content) as Recipe; const scope: PayloadMetadata = JSON.parse(content) as PayloadMetadata; if (scope._familyId !== undefined) { value.familyId = scope._familyId || ''; } value.id = id; value.version = version; await this.persist(kind, id, JSON.stringify(value)); }
  if (kind === 'recipe_favorites') { const value: Favorite = JSON.parse(content) as Favorite; value.id = id; value.version = version; await this.persist(kind, id, JSON.stringify(value)); }
  if (kind === 'barcode_lib') { const value: Template = JSON.parse(content) as Template; const scope: PayloadMetadata = JSON.parse(content) as PayloadMetadata; if (scope._familyId !== undefined) { value.familyId = scope._familyId || ''; } value.id = id; value.version = version; await this.persist(kind, id, JSON.stringify(value)); }
  if (kind === 'food_items') { const value: Food = JSON.parse(content) as Food; const scope: PayloadMetadata = JSON.parse(content) as PayloadMetadata; if (scope._familyId !== undefined) { value.familyId = scope._familyId || ''; } const old: Food | undefined = this.state.foods.find((f: Food) => f.id === id); value.localPhoto = old ? old.localPhoto : ''; value.id = id; value.version = version; await this.persist(kind, id, JSON.stringify(value)); }
  if (kind === 'shopping_list') { const value: Shopping = JSON.parse(content) as Shopping; const scope: PayloadMetadata = JSON.parse(content) as PayloadMetadata; if (scope._familyId !== undefined) { value.familyId = scope._familyId || ''; } value.id = id; value.version = version; await this.persist(kind, id, JSON.stringify(value)); }
  if (kind === 'meal_records') { const value: Meal = JSON.parse(content) as Meal; const scope: PayloadMetadata = JSON.parse(content) as PayloadMetadata; if (scope._familyId !== undefined) { value.familyId = scope._familyId || ''; } const old: Meal | undefined = this.state.meals.find((m: Meal) => m.id === id); value.localPhoto = old ? old.localPhoto : ''; value.photoOriginal = old ? old.photoOriginal : ''; value.photoStatus = value.cloudPhoto ? 'uploaded' : value.localPhoto ? 'pending' : ''; value.id = id; value.version = version; await this.persist(kind, id, JSON.stringify(value)); }
 }
 async reconcileFamilies(ids: string[]): Promise<void> {
  const previous: string[] = JSON.parse(await this.getSetting('familyIds', '[]')) as string[]; const removed: string[] = previous.filter((id: string) => !ids.includes(id));
  if (removed.length > 0) { await this.atomic(async () => {
   const rows: relationalStore.ResultSet = await this.db!.querySql('SELECT kind,id,payload FROM documents');
   try { while (rows.goToNextRow()) { const kind: string = rows.getString(0); if (!['food_items','shopping_list','meal_records','barcode_lib','recipes'].includes(kind)) { continue; } const metadata: PayloadMetadata = JSON.parse(rows.getString(2)) as PayloadMetadata; if (metadata.familyId && removed.includes(metadata.familyId)) { await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', [kind, rows.getString(1)]); } } } finally { rows.close(); }
   // 离组后的待提交修改保留，标记为冲突，不上传到其他空间。
  }); }
  await this.setting('familyIds', JSON.stringify(ids));
 }
 async applyRemote(changes: RemoteChange[]): Promise<void> {
  await this.atomic(async () => {
   for (const change of changes) {
    if (this.state.changes.some((ch: Change) => ch.entityId === change.entity_id && ch.entityType === change.entity_type)) { continue; }
    if (change.operation === 'delete') { await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', [change.entity_type, change.entity_id]); }
    else { const metadata: PayloadMetadata = JSON.parse(JSON.stringify(change.payload)) as PayloadMetadata; await this.persistVersion(change.entity_type, change.entity_id, JSON.stringify(change.payload), metadata._recordVersion); }
   }
  });
 }
 async rebase(kind: string, id: string, version: number): Promise<void> {
  await this.atomic(async () => {
   const pending: Change[] = this.state.changes.filter((ch: Change) => ch.entityId === id && ch.entityType === kind);
   for (const ch of pending) { await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['changes', ch.changeId]); }
   if (pending.length > 0) { const latest: Change = pending[pending.length - 1]; await this.writeChange(kind, id, latest.payload, version, latest.operation); }
  });
 }
 assertConflictCurrent(kind: string, id: string, changeId: string): void {
  const pending: Change[] = this.state.changes.filter((c: Change) => c.entityId === id && c.entityType === kind); if (pending.length === 0 || pending[pending.length - 1].changeId !== changeId) { throw new Error('本机记录在对照后又有修改，请重新同步再决定'); }
 }
 async mergeConflict(kind: string, id: string, payload: Object, version: number, expectedChangeId: string): Promise<void> {
  this.assertConflictCurrent(kind, id, expectedChangeId);
  await this.atomic(async () => {
   for (const ch of this.state.changes.filter((c: Change) => c.entityId === id && c.entityType === kind)) { await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['changes', ch.changeId]); }
   const value: Food = payload as Food; value.version = version; value.modifiedAt = new Date().toISOString(); await this.persistVersion(kind, id, JSON.stringify(value), version); await this.writeChange(kind, id, JSON.stringify(value), version);
  });
 }
 async replaceFromConflict(kind: string, id: string, payload: Object, version: number, deleted: boolean): Promise<void> {
  await this.atomic(async () => {
   for (const ch of this.state.changes.filter((c: Change) => c.entityId === id && c.entityType === kind)) { await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', ['changes', ch.changeId]); }
   if (deleted) { await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?', [kind, id]); }
   else { await this.persistVersion(kind, id, JSON.stringify(payload), version); }
  });
 }
 async undoAddedRows(kind:string,ids:string[],expected:string):Promise<void>{
  if(!['shopping_list','meal_plans'].includes(kind)||!ids.length||ids.length>200){throw new Error('撤销范围无效');}
  const scope:string=this.scope;const database:relationalStore.RdbStore|undefined=this.db;
  await this.atomic(async()=>{if(scope!==this.scope||database!==this.db){throw new Error('账号已变化');}const current:string=JSON.stringify(kind==='shopping_list'?this.state.shopping:this.state.plans);if(current!==expected){throw new Error('内容已有后续变化，不能撤销');}for(const id of ids){if(kind==='shopping_list'){const item:Shopping|undefined=this.state.shopping.find((s:Shopping)=>s.id===id);if(!item){throw new Error('采购已变化');}await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?',[kind,id]);await this.writeChange(kind,id,JSON.stringify(item),item.version,'delete');}else{if(!this.state.plans.some((p:MealPlan)=>p.id===id)){throw new Error('计划已变化');}await this.db!.executeSql('DELETE FROM documents WHERE kind=? AND id=?',[kind,id]);}}});
 }
 async addShoppingBatch(items:Shopping[]):Promise<void>{
  if(items.length>200||items.some((s:Shopping)=>!s.name.trim()||!Number.isFinite(s.quantity)||s.quantity<=0)){throw new Error('采购项目或数量无效');}
  const values:Shopping[]=JSON.parse(JSON.stringify(items)) as Shopping[];
  await this.atomic(async()=>{for(const s of values){s.id=util.generateRandomUUID();s.modifiedAt=new Date().toISOString();await this.persist('shopping_list',s.id,JSON.stringify(s));await this.writeChange('shopping_list',s.id,JSON.stringify(s),0);}});
 }
 async catalogManifest():Promise<CatalogManifest|null>{return readCatalogManifest(this.db!);}
 async installCatalog(update:CatalogUpdatePackage):Promise<void>{
  const run:Promise<void>=this.writeQueue.then(async()=>{await applyCatalogUpdate(this.db!,update);await this.reloadBuiltinCatalog();this.revision++;});this.writeQueue=run.catch(()=>{});return run;
 }
 private async reloadBuiltinCatalog():Promise<void>{const rows:relationalStore.ResultSet=await this.db!.querySql('SELECT payload FROM recipe_catalog ORDER BY name');const recipes:Recipe[]=[];try{while(rows.goToNextRow()){recipes.push(JSON.parse(rows.getString(0)) as Recipe);}}finally{rows.close();}this.builtinRecipes=recipes;const retired:relationalStore.ResultSet=await this.db!.querySql("SELECT value FROM catalog_meta WHERE key='remoteRetiredIds'");try{this.retiredRecipeIds=retired.goToFirstRow()?JSON.parse(retired.getString(0)) as string[]:[];}finally{retired.close();}}

 private async atomic(action: () => Promise<void>): Promise<void> {
  const run:Promise<void>=this.writeQueue.then(()=>this.performAtomic(action));this.writeQueue=run.catch(()=>{});return run;
 }
 private async performAtomic(action:()=>Promise<void>):Promise<void>{
  if (!this.db) { throw new Error('数据库未就绪'); }
  await this.db.beginTransaction();
  try { await action(); await this.db.commit(); } catch (e) { await this.db.rollBack(); throw new Error((e as Error).message || '写入失败'); }
  await this.load();
 }
}
