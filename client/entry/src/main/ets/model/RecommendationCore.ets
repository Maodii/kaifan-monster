/** Shared portable recommendation engine. Copied byte-for-byte to ArkTS by sync-recommendation-core.py. */
export interface CoreIngredient { name: string; quantity: number; unit: string; optional?: boolean; }
export interface CoreFood { name: string; quantity: number; unit: string; expiryDate: string; openedExpiry?: string; archived?: boolean; }
export function coreExpiry(food:CoreFood):string{return food.openedExpiry&&food.openedExpiry<food.expiryDate?food.openedExpiry:food.expiryDate;}
export interface CoreRecipe { id: string; name: string; ingredients: CoreIngredient[]; aliases?: string[]; dishGroupId?: string; variantLabel?: string; taste?: string; region?: string; cuisine?: string; category?: string; minutes?: number; prepMinutes?: number; cookMinutes?: number; dietTags?: string[]; calories?: number; steps?: string[]; }
export interface CoreMealItem { name: string; recipeId?: string; category?: string; }
export interface CoreMeal { date: string; name?: string; recipeId?: string; items?: CoreMealItem[]; rating?: number; diningMode?: string; }
export class PreferenceEvent { recipeId: string = ''; action: string = 'open'; date: string = ''; intent?: string; }
export class RankingOptions {
 excluded: string[] = []; taste: string = ''; homeRegion: string = ''; region: string = ''; category: string = ''; maxMinutes: number = 0; goal: string = '均衡饮食';
 recentDays: number = 7; threshold: number = 3; learning: boolean = true; batch: number = 0;
 intent: string = 'cook'; seasonal:boolean=true;
}
export class MissingIngredient { name: string = ''; quantity: number = 0; unit: string = ''; unknown: boolean = false; }
export class CoreRank {
 recipeId: string = ''; score: number = 0; urgent: number = 0; matched: number = 0; coverage: number = 0;
 missing: MissingIngredient[] = []; recent: boolean = false; reasons: string[] = []; learned: number = 0;
}
class FeatureCount { key: string = ''; positive: number = 0; negative: number = 0; }
export class TasteModel { samples: number = 0; features: FeatureCount[] = []; domainKeys: string[] = []; }
const aliasGroups: string[][] = [['西红柿','番茄'],['青菜','小白菜','上海青'],['土豆','马铃薯'],['大米','米'],['生抽','生抽酱油'],['玉米淀粉','淀粉'],['香菜','芫荽']];
export function recipeMinutes(recipe: CoreRecipe): number {
 if (recipe.minutes && Number.isFinite(recipe.minutes) && recipe.minutes > 0) { return Math.ceil(recipe.minutes); }
 const prep: number = recipe.prepMinutes === undefined ? NaN : recipe.prepMinutes; const cook: number = recipe.cookMinutes === undefined ? NaN : recipe.cookMinutes;
 return Number.isFinite(prep + cook) && prep >= 0 && cook >= 0 ? Math.ceil(prep + cook) : 0;
}
export function canonicalName(value: string): string {
 const name: string = value.toLowerCase().replace(/\s/g,'').replace(/[（(].*?[）)]/g,'');
 for (const group of aliasGroups) { if (group.includes(name)) { return group[0]; } }
 return name;
}
/** Conservative editorial identity: no generic removal of cooking styles, regions or suffixes. */
export function recipeGroupKey(recipe: CoreRecipe): string {
 if (recipe.dishGroupId && recipe.dishGroupId.trim()) { return 'explicit:'+recipe.dishGroupId.trim(); }
 const name: string=recipe.name.toLowerCase().replace(/\s/g,'');
 const families: string[][]=[['红烧肉','徽派红烧肉','湖南家常红烧肉','南派红烧肉','简易红烧肉'],['番茄炒蛋','番茄炒鸡蛋','西红柿炒鸡蛋','西红柿炒蛋']];
 const family: string[] | undefined=families.find((v: string[]) => v.includes(name));
 return 'name:'+(family?family[0]:name||recipe.id);
}
/** Repeated requirements share stock; unknown amounts remain unknown after aggregation. */
export function requiredIngredients(recipe: CoreRecipe): CoreIngredient[] {
 const groups: CoreIngredient[]=[];
 for (const ingredient of recipe.ingredients.filter((i: CoreIngredient) => !i.optional)) {
  const same: CoreIngredient | undefined=groups.find((i: CoreIngredient) => canonicalName(i.name)===canonicalName(ingredient.name)&&compatibleUnit(ingredient.unit,i.unit)>0);
  if (same) { same.quantity=Number.isFinite(same.quantity)&&same.quantity>0&&Number.isFinite(ingredient.quantity)&&ingredient.quantity>0?same.quantity+ingredient.quantity*compatibleUnit(ingredient.unit,same.unit):0; }
  else { groups.push({name:ingredient.name,quantity:ingredient.quantity,unit:ingredient.unit}); }
 }
 return groups;
}
export function compatibleUnit(from: string, to: string): number {
 if (from === to) { return 1; } if (from === 'kg' && to === 'g') { return 1000; } if (from === 'g' && to === 'kg') { return 0.001; }
 if (from === 'L' && to === 'mL') { return 1000; } if (from === 'mL' && to === 'L') { return 0.001; } return 0;
}
function featureKeys(recipe: CoreRecipe): string[] { const keys: string[]=[]; if(recipe.region||recipe.cuisine){keys.push('region:'+(recipe.region||recipe.cuisine));} if(recipe.taste){keys.push('taste:'+recipe.taste);} if(recipe.category){keys.push('category:'+recipe.category);} return keys; }
function remember(model: TasteModel, recipe: CoreRecipe, weight: number): void {
 featureKeys(recipe).forEach((key: string) => { let item: FeatureCount | undefined = model.features.find((v: FeatureCount) => v.key === key); if (!item) { item = new FeatureCount(); item.key = key; model.features.push(item); } if (weight >= 0) { item.positive += weight; } else { item.negative -= weight; } });
}
export function recognizedRecipes(meal: CoreMeal, recipes: CoreRecipe[]): CoreRecipe[] {
 const ids: string[] = []; const names: string[] = [];
 if (meal.recipeId) { ids.push(meal.recipeId); } if (meal.name) { names.push(meal.name); }
 if (meal.items) { meal.items.forEach((i: CoreMealItem) => { if (i.recipeId) { ids.push(i.recipeId); } if (i.name) { names.push(i.name); } }); }
 return recipes.filter((r: CoreRecipe) => ids.includes(r.id) || names.some((n: string) => canonicalName(n) === canonicalName(r.name)));
}
export function trainTasteModel(recipes: CoreRecipe[], meals: CoreMeal[], events: PreferenceEvent[], now: number = Date.now(), intent: string = ''): TasteModel {
 const model: TasteModel = new TasteModel(); const seen: string[] = []; recipes.forEach((r: CoreRecipe) => { featureKeys(r).forEach((key: string) => { if (!model.domainKeys.includes(key)) { model.domainKeys.push(key); } }); });
 meals.forEach((m: CoreMeal) => { if (intent && (['外卖','餐馆','食堂'].includes(m.diningMode || '') ? 'record' : 'cook') !== intent) { return; } const age: number = (now - new Date(m.date).getTime()) / 86400000; if (!Number.isFinite(age) || age < 0 || age > 180) { return; }
  recognizedRecipes(m, recipes).forEach((r: CoreRecipe) => { const day: string = new Date(m.date).toISOString().slice(0,10); const key: string = day + ':' + r.id; if (!seen.includes(key)) { seen.push(key); model.samples++; const ratingWeight: number = m.rating && m.rating <= 2 ? -0.8 : m.rating && m.rating >= 4 ? 1.1 : 0.65; remember(model, r, ratingWeight * Math.exp(-age / 45)); } });
 });
 const actions: string[] = [];
 events.slice().reverse().forEach((e: PreferenceEvent) => { if (intent && (e.intent || 'cook') !== intent) { return; } const age: number = (now - new Date(e.date).getTime()) / 86400000; const key: string = e.recipeId + ':' + e.action + ':' + e.date.slice(0,10); if (!Number.isFinite(age) || age < 0 || age > 90 || actions.includes(key)) { return; }
  const recipe: CoreRecipe | undefined = recipes.find((r: CoreRecipe) => r.id === e.recipeId); if (!recipe) { return; } actions.push(key);
  if(['recently_eaten','too_complex'].includes(e.action)){return;}
  const base: number = e.action === 'like' ? 1.5 : ['dislike','not_my_taste'].includes(e.action) ? -1.5 : e.action === 'select' ? 0.8 : e.action === 'skip' ? -0.25 : 0.08;
  remember(model, recipe, base * Math.exp(-age / 30));
 }); return model;
}
function affinity(model: TasteModel, recipe: CoreRecipe, recipes: CoreRecipe[]): number {
 let value: number = 0;
 featureKeys(recipe).forEach((key: string) => { const prefix: string = key.split(':')[0] + ':'; const alternatives: string[] = [];
  model.domainKeys.filter((k: string) => k.startsWith(prefix)).forEach((k: string) => { alternatives.push(k); });
  const n: number = Math.max(2, alternatives.length); const counts: FeatureCount[] = model.features.filter((f: FeatureCount) => f.key.startsWith(prefix));
  const total: number = counts.reduce((sum: number, f: FeatureCount) => sum + f.positive,0); const item: FeatureCount | undefined = counts.find((f: FeatureCount) => f.key === key);
  const posterior: number = ((item ? item.positive : 0) + 1) / (total + n); const baseline: number = 1 / n;
  const negative: number = item ? item.negative / (item.positive + item.negative + 2) : 0;
  value += (posterior - baseline) / (1 - baseline) - negative;
 }); return Math.max(-1,Math.min(1,value / 3));
}
function dayDifference(date: string, now: number): number { if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){return NaN;} const parsed: Date=new Date(date+'T12:00:00'); if(parsed.getFullYear()!==Number(date.slice(0,4))||parsed.getMonth()+1!==Number(date.slice(5,7))||parsed.getDate()!==Number(date.slice(8,10))){return NaN;} const today: Date = new Date(now); return Math.round((parsed.getTime() - new Date(today.getFullYear(),today.getMonth(),today.getDate(),12).getTime()) / 86400000); }
/** Broad northern-hemisphere produce seasons, a soft inspiration hint rather than a local availability claim. */
export function seasonalIngredientNames(recipe:CoreRecipe,month:number):string[] {
 if(!Number.isInteger(month)||month<1||month>12){return [];}
 const names:string[]=month>=3&&month<=5?['春笋','莴笋','香椿','豌豆','韭菜']:month>=6&&month<=8?['丝瓜','冬瓜','苦瓜','黄瓜','茄子','番茄','西红柿','空心菜']:month>=9&&month<=11?['南瓜','莲藕','山药','芋头','板栗']:['白萝卜','萝卜','白菜','菠菜'];
 return recipe.ingredients.filter((i:CoreIngredient)=>!i.optional&&names.some((name:string)=>canonicalName(i.name).includes(canonicalName(name)))).map((i:CoreIngredient)=>i.name).filter((name:string,index:number,values:string[])=>values.indexOf(name)===index).slice(0,3);
}
export function feedbackAction(reason:string):string {return reason==='最近吃过'?'recently_eaten':reason==='太麻烦'?'too_complex':reason==='不合口味'?'not_my_taste':'dislike';}
function stableTie(id: string, batch: number): number { let hash: number = batch + 1; for (let i: number = 0; i < id.length; i++) { hash = (Math.imul(hash,31) ^ id.charCodeAt(i)) >>> 0; } return hash / 4294967296; }
/** Generic meat exclusions also cover concrete cuts; never let preferences override these. */
export function excludedIngredientName(actual:string,requested:string):boolean{
 const value:string=canonicalName(actual),word:string=canonicalName(requested);if(!word){return false;}if(value.includes(word)){return true;}
 if(word==='猪肉'){return /五花肉|猪|排骨|里脊肉|瘦肉|肉馅|肉末/.test(value)&&(!/牛|羊|鸡|鸭/.test(value)||/猪/.test(value));}
 if(word==='牛肉'){return /牛腩|牛排|牛里脊|牛柳|牛腱|肥牛/.test(value);}
 if(word==='羊肉'){return /羊排|羊腿|羊腩|肥羊/.test(value);}
 if(word==='鸡肉'){return /鸡胸|鸡腿|鸡翅|整鸡|半只鸡/.test(value);}
 return false;
}
/** Shared hard constraints for recommendation and the complete library; no preference/history pruning. */
export function matchesRankingConstraints(r: CoreRecipe, options: RankingOptions): boolean {
 const blocked: string[]=options.excluded.map((v: string) => canonicalName(v.trim())).filter((v: string) => !!v);
 return (!options.taste||r.taste===options.taste) && (!options.region||r.region===options.region||r.cuisine===options.region)
  && (!options.category||r.category===options.category||(r.dietTags||[]).includes(options.category)||(options.category==='快手菜'&&recipeMinutes(r)>0&&recipeMinutes(r)<=20))
  && (options.intent==='record'||!options.maxMinutes||(recipeMinutes(r)>0&&recipeMinutes(r)<=options.maxMinutes))
  && !blocked.some((word: string) => canonicalName(r.name).includes(word)||(r.aliases||[]).some((name: string) => canonicalName(name).includes(word))||r.ingredients.some((i: CoreIngredient) => excludedIngredientName(i.name,word)));
}
export function rankPersonalized(recipes: CoreRecipe[], foods: CoreFood[], meals: CoreMeal[], events: PreferenceEvent[], options: RankingOptions, now: number = Date.now()): CoreRank[] {
 const model: TasteModel = options.learning ? trainTasteModel(recipes,meals,events,now,options.intent) : new TasteModel();
 const eligible: CoreRecipe[] = recipes.filter((r: CoreRecipe) => matchesRankingConstraints(r,options));
 const recentIds: string[]=[]; const recentGroups: string[]=[];
 const byId: Map<string,CoreRecipe>=new Map<string,CoreRecipe>(); recipes.forEach((r: CoreRecipe) => { byId.set(r.id,r); });
 for (const meal of meals) {
  const age: number=now-new Date(meal.date).getTime();
  if (!Number.isFinite(age)||age<0||age>=options.recentDays*86400000) { continue; }
  for (const item of (meal.items||[]).concat([{name:meal.name||'',recipeId:meal.recipeId}])) {
   if(item.recipeId){recentIds.push(item.recipeId);const known:CoreRecipe|undefined=byId.get(item.recipeId);if(known){recentGroups.push(recipeGroupKey(known));}}
   if(item.name){recentGroups.push(recipeGroupKey({id:'',name:item.name,ingredients:[]}));}
  }
 }
 const ranked: CoreRank[] = eligible.map((r: CoreRecipe) => {
  const row: CoreRank = new CoreRank(); row.recipeId = r.id; let urgency: number = 0;
  const main: CoreIngredient[] = requiredIngredients(r);
  main.forEach((i: CoreIngredient) => { const matches: CoreFood[] = foods.filter((f: CoreFood) => !f.archived && Number.isFinite(f.quantity) && f.quantity > 0 && canonicalName(f.name) === canonicalName(i.name) && compatibleUnit(f.unit,i.unit) > 0 && dayDifference(coreExpiry(f),now) >= 0);
   const amount: number = matches.reduce((sum: number,f: CoreFood) => sum + f.quantity * compatibleUnit(f.unit,i.unit),0);
   const known: boolean=Number.isFinite(i.quantity)&&i.quantity>0;
   if (known && amount >= i.quantity) { row.matched++; } else { const missing: MissingIngredient = new MissingIngredient(); missing.name = i.name; missing.quantity = known ? Math.max(0,i.quantity - amount) : 0; missing.unit = i.unit; missing.unknown = !known; row.missing.push(missing); }
   if (known && matches.some((f: CoreFood) => dayDifference(coreExpiry(f),now) <= options.threshold)) { row.urgent++; urgency = Math.max(urgency,...matches.map((f: CoreFood) => Math.max(0,1 - dayDifference(coreExpiry(f),now) / (options.threshold + 1)))); }
  });
  row.coverage = main.length ? row.matched / main.length : 0;
  row.recent = recentIds.includes(r.id)||recentGroups.includes(recipeGroupKey(r));
  row.learned = options.learning ? affinity(model,r,recipes) : 0;
  const regionBonus: number = options.homeRegion && (r.region || r.cuisine) === options.homeRegion ? 10 : 0;
  const goalBonus: number = options.goal === '控制热量' && r.dietTags && r.dietTags.includes('减脂餐') ? 9 : options.goal === '高蛋白' && r.dietTags && r.dietTags.includes('高蛋白') ? 9 : options.goal === '清淡少油' && r.taste === '清淡' ? 7 : 0;
  const cooking: boolean = options.intent !== 'record';
  const timeBonus: number = cooking && recipeMinutes(r) > 0 && recipeMinutes(r) <= (options.maxMinutes || 30) ? 5 * (1 - recipeMinutes(r) / ((options.maxMinutes || 30) + 15)) : 0;
  const methodBonus: number = cooking && r.steps && r.steps.filter((step: string) => step.trim().length > 3).length >= 2 ? 3 : 0;
  const declined: boolean = options.learning && events.some((e: PreferenceEvent) => (e.intent || 'cook') === options.intent && e.recipeId === r.id && ['dislike','not_my_taste'].includes(e.action) && now >= new Date(e.date).getTime() && now - new Date(e.date).getTime() < 7 * 86400000);
  const contextFeedback:PreferenceEvent[]=options.learning?events.filter((e:PreferenceEvent)=>(e.intent||'cook')===options.intent&&e.recipeId===r.id&&now>=Date.parse(e.date)&&now-Date.parse(e.date)<7*86400000):[];
  const recentlyEaten:boolean=contextFeedback.some((e:PreferenceEvent)=>e.action==='recently_eaten');
  const tooComplex:boolean=cooking&&contextFeedback.some((e:PreferenceEvent)=>e.action==='too_complex');
  const seasonal:string[]=options.seasonal===false?[]:seasonalIngredientNames(r,new Date(now).getMonth()+1);
  const seasonalBonus:number=seasonal.length?2:0;
  row.score = Math.round((seasonalBonus+goalBonus + (cooking ? row.coverage * 55 + urgency * 24 : 0) + regionBonus + row.learned * 18 + timeBonus + methodBonus - (declined ? 20 : 0) - (tooComplex?14:0) - (row.recent||recentlyEaten ? 16 : 0) + stableTie(r.id,options.batch) * (options.batch ? 3 : 0.2)) * 100) / 100;
  if (cooking && row.urgent) { row.reasons.push('优先消耗临期食材'); } if (cooking && row.coverage > 0) { row.reasons.push('主料备齐 ' + Math.round(row.coverage * 100) + '%'); }
  if (timeBonus) { row.reasons.push('适合这次的做饭时间'); } if (declined) { row.reasons.push('近期点过少推荐，降低排序'); }
  if (goalBonus) { row.reasons.push('符合你选择的饮食目标'); } if (regionBonus) { row.reasons.push('符合你的地区偏好'); } if (row.learned > 0.03) { row.reasons.push('参考近期用餐与喜欢反馈'); } if (row.recent) { row.reasons.push('近期吃过，适当换口味'); }
  if(seasonalBonus){row.reasons.push('时令灵感：'+seasonal.join('、')+'（产地有差异）');}if(recentlyEaten){row.reasons.push('反馈最近吃过，先换一道');}if(tooComplex){row.reasons.push('反馈做法费时，降低本菜排序');}
  if (!row.reasons.length) { row.reasons.push(cooking ? '换一种家常灵感' : '换一种点菜灵感'); } return row;
 }).sort((a: CoreRank,b: CoreRank) => b.score - a.score || a.recipeId.localeCompare(b.recipeId));
 // A bounded greedy diversity pass on the first twelve suggestions, preserving exclusions and explicit filters.
 const recipeById: Map<string,CoreRecipe> = new Map<string,CoreRecipe>(); eligible.forEach((r: CoreRecipe) => { recipeById.set(r.id,r); });
 const selected: CoreRank[] = []; const remaining: CoreRank[] = ranked.slice();
 while (selected.length < 12 && remaining.length) {
  let best: number = 0; let bestValue: number = -Infinity;
  remaining.forEach((row: CoreRank,index: number) => { const recipe: CoreRecipe = recipeById.get(row.recipeId)!;
   const repeats: number = selected.slice(-4).filter((s: CoreRank) => { const prior: CoreRecipe = recipeById.get(s.recipeId)!; return (prior.category || '家常菜') === (recipe.category || '家常菜'); }).length;
   const ingredientRepeats: number = selected.slice(-4).filter((s: CoreRank) => { const prior: CoreRecipe = recipeById.get(s.recipeId)!; return recipe.ingredients.filter((i: CoreIngredient) => !i.optional).some((i: CoreIngredient) => prior.ingredients.some((p: CoreIngredient) => !p.optional && canonicalName(p.name) === canonicalName(i.name))); }).length;
   const groupRepeats:number=selected.filter((s:CoreRank)=>recipeGroupKey(recipeById.get(s.recipeId)!)===recipeGroupKey(recipe)).length;
   const regionRepeats:number=options.homeRegion||options.region?0:selected.slice(-4).filter((s:CoreRank)=>(recipeById.get(s.recipeId)!.region||recipeById.get(s.recipeId)!.cuisine||'')===(recipe.region||recipe.cuisine||'')).length;
   const value: number = row.score - repeats * 4 - ingredientRepeats * 5 - groupRepeats*14 - regionRepeats*1.5; if (value > bestValue) { bestValue = value; best = index; }
  }); selected.push(remaining.splice(best,1)[0]);
 } return selected.concat(remaining);
}
