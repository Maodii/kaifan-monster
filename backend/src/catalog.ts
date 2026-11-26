import { Response } from 'express';
import { RecipeSearchIndex, searchRecipeCatalog } from './recipe-search-core';
import { RecipeFilterOptions, matchesRecipeFilter, FilterRecipe } from './recipe-filter-core';
import { compareRecipeOrder } from './recipe-discovery-core';
import { cuisineForRegion } from './profile-core';
import { buildCatalogDelivery } from './catalog-delivery-core';
import { PortionOptions, recommendPortions, PortionIngredient } from './portion-core';
import { Body, Controller, Get, Post, Param, Query, Headers, Res, UseGuards, BadRequestException, ForbiddenException, ParseUUIDPipe, Delete, ConflictException } from '@nestjs/common';
import { IsOptional, IsString, IsIn, IsUUID, IsBoolean, MaxLength, MinLength, Matches, IsArray, ArrayMinSize, ArrayMaxSize, ArrayUnique } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { AuthGuard, Identity, User } from './auth';
import { Database } from './database';
import { RankingOptions, PreferenceEvent, trainTasteModel } from './recommend-core';
import { Cache } from './cache';
import { rankRecipes, RecipeInput, FoodInput, MealInput } from './recommend';
export class RecipeCorrectionDto { @IsUUID() recipeId!:string; @IsIn(['做法','用量','时间','来源','其他']) category!:string; @IsString() @MinLength(2) @MaxLength(1000) @Matches(/\S/) detail!:string; }
export class SubmissionDto { @IsIn(['barcode','recipe']) kind!:'barcode'|'recipe'; @IsUUID() sourceId!:string; @IsBoolean() confirmed!:boolean; }
export class EventDto { @IsOptional() @IsIn(['cook','record']) intent?:string; @IsString() @MaxLength(200) recipeId!:string; @IsIn(['open','select','skip','like','dislike','recently_eaten','too_complex','not_my_taste']) action!:'open'|'select'|'skip'|'like'|'dislike'|'recently_eaten'|'too_complex'|'not_my_taste'; }
export class DecisionDto { @IsIn(['approved','rejected']) status!:'approved'|'rejected'; }
export class CatalogDownloadDto {
 @IsString() @Matches(/^[a-f0-9]{64}$/) version!:string;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(25) @ArrayUnique() @IsUUID('all',{each:true}) ids!:string[];
}
@Controller('catalog') @UseGuards(AuthGuard)
export class CatalogController {
 constructor(private readonly db:Database,private readonly cache:Cache){}
 /** Content-addressed versioning detects imports and administrator edits without timestamp races. */
 @Post('corrections') async correction(@User() u:Identity,@Body() d:RecipeCorrectionDto):Promise<unknown>{
  if(d.detail.trim().length<2)throw new BadRequestException('请填写至少两字的具体问题');
  return this.db.transaction(async c=>{await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[u.userId]);if(!(await c.query('SELECT id FROM recipe_catalog WHERE id=$1',[d.recipeId])).rowCount)throw new BadRequestException('此菜谱不在公共目录，请编辑示例主体版本');const recent=await c.query("SELECT id FROM recipe_corrections WHERE user_id=$1 AND recipe_id=$2 AND category=$3 AND detail=$4 AND status='pending'",[u.userId,d.recipeId,d.category,d.detail.trim()]);if(recent.rowCount)return {id:recent.rows[0].id,status:'pending',duplicate:true};if(Number((await c.query("SELECT count(*) FROM recipe_corrections WHERE user_id=$1 AND created_at>now()-interval '1 day'",[u.userId])).rows[0].count)>=20)throw new BadRequestException('今日已提交20条，请稍后再补充');const id=randomUUID();await c.query('INSERT INTO recipe_corrections(id,user_id,recipe_id,category,detail) VALUES($1,$2,$3,$4,$5)',[id,u.userId,d.recipeId,d.category,d.detail.trim()]);return {id,status:'pending'};});
 }
 @Get('offline/manifest') async offlineManifest(@Headers('if-none-match') tag:string='',@Res({passthrough:true}) response?:Response):Promise<unknown>{
  const rows=await this.db.query<{id:string;payload:Record<string,unknown>}>('SELECT id,payload FROM recipe_catalog ORDER BY id');
  const manifest=buildCatalogDelivery(rows).manifest;const etag='"'+manifest.version+'"';if(response){response.setHeader('ETag',etag);response.setHeader('Cache-Control','private, max-age=0, must-revalidate');if(tag===etag){response.status(304);return;}}return manifest;
 }
 @Post('offline/download') async offlineDownload(@Body() d:CatalogDownloadDto):Promise<unknown>{
  // A single SELECT sees one committed catalog. A changed version invalidates the whole staged update.
  const snapshot=buildCatalogDelivery(await this.db.query<{id:string;payload:Record<string,unknown>}>('SELECT id,payload FROM recipe_catalog ORDER BY id'));
  if(snapshot.manifest.version!==d.version)throw new ConflictException('菜谱目录已更新，请重新检查；本机旧版仍可使用');
  const wanted=new Set(d.ids);const records=snapshot.records.filter(record=>wanted.has(record.id));
  if(records.length!==wanted.size)throw new BadRequestException('所选菜谱不在当前目录中');
  return {format:1,version:snapshot.manifest.version,records};
 }
 @Get('barcodes/:code') async barcode(@User() u:Identity,@Param('code') code:string):Promise<unknown>{
  if(!/^(\d{8}|\d{12}|\d{13})$/.test(code))throw new BadRequestException('条码格式无效');
  const own=await this.db.query(`SELECT payload FROM barcode_lib b WHERE NOT b.deleted AND payload->>'barcode'=$1 AND ((family_id IS NULL AND user_id=$2) OR EXISTS(SELECT 1 FROM family_member m WHERE m.family_id=b.family_id AND m.user_id=$2)) ORDER BY modified_at DESC LIMIT 20`,[code,u.userId]);
  const key='barcode:public:'+code;let pub=await this.cache.get<Record<string,unknown>[]>(key);if(!pub){pub=await this.db.query("SELECT payload FROM catalog_submission WHERE kind='barcode' AND status='approved' AND payload->>'barcode'=$1 ORDER BY created_at DESC LIMIT 20",[code]);await this.cache.set(key,pub,60);}return [...own,...pub].map(r=>r.payload);
 }
 @Get('recipes') async recipes(@User() u:Identity,@Query('search') search='',@Query('taste') taste='',@Query('sort') sort='latest',@Query('region') region='',@Query('category') category='',@Query('maxMinutes') maxMinutes='0',@Query('page') page='1',@Query('ingredients') ingredients='',@Query('excludeIngredients') excludeIngredients='',@Query('ingredientMode') ingredientMode='all',@Query('maxCost') maxCost='0',@Query('difficulty') difficulty=''):Promise<unknown>{
  const limitMinutes=Number(maxMinutes),pageNumber=Number(page),offset=(pageNumber-1)*100,budget=Number(maxCost);
  if(!Number.isInteger(pageNumber)||!Number.isInteger(offset)||offset<0||offset>100000||!Number.isFinite(limitMinutes)||limitMinutes<0||limitMinutes>1440||!Number.isFinite(budget)||budget<0||!['all','any'].includes(ingredientMode)||search.length>100||![taste,region,category,difficulty,ingredients,excludeIngredients].every(value=>value.length<=300)||!['latest','comprehensive','cost','cost-desc','minutes','minutes-desc','favorites'].includes(sort))throw new BadRequestException('筛选参数无效');
  // Filter the complete candidate union before pagination. No old 500/200 pre-search cap.
  const builtin=await this.db.query<{id:string;payload:FilterRecipe;created_at:string}>('SELECT id,payload,updated_at AS created_at FROM recipe_catalog');
  const pub=await this.db.query<{id:string;payload:FilterRecipe;created_at:string}>("SELECT source_id AS id,payload,created_at FROM catalog_submission WHERE kind='recipe' AND status='approved' ORDER BY created_at");
  const merged=new Map<string,typeof builtin[number]>();for(const row of [...pub,...builtin])merged.set(row.id,{...row,payload:{...row.payload,id:row.id}});
  const filter=new RecipeFilterOptions();filter.maxMinutes=limitMinutes;filter.maxCost=budget;filter.ingredientMode=ingredientMode;
  filter.ingredients=ingredients.split(/[,，、]/).map(x=>x.trim()).filter(Boolean).slice(0,20);filter.excludedIngredients=excludeIngredients.split(/[,，、]/).map(x=>x.trim()).filter(Boolean).slice(0,20);
  if(taste)filter.tastes=[taste];if(region)filter.regions=[region];if(category)filter.categories=[category];if(difficulty)filter.difficulties=[difficulty];
  const rows=[...merged.values()].filter(row=>matchesRecipeFilter(row.payload as FilterRecipe,filter));
  const index=new RecipeSearchIndex(rows.map(row=>row.payload));const result=searchRecipeCatalog(index,search);
  // This legacy endpoint returns a plain array with no way to label fallback suggestions.
  // Keep approximate suggestions in the client search page, where their explanation is visible.
  if(result.mode==='similar')return [];
  const scores=new Map(result.hits.map(hit=>[hit.recipeId,hit.score]));
  const counts=await this.db.query('SELECT recipe_id,count(*)::int AS count FROM discovery_favorite GROUP BY recipe_id');const favoriteCounts=new Map<string,number>(counts.map(row=>[row.recipe_id,row.count]));
  const matches=rows.filter(row=>scores.has(row.id)).map(row=>({...row,favoriteCount:favoriteCounts.get(row.id)||0}));const order=sort==='cost'?'价格升序':sort==='cost-desc'?'价格降序':sort==='minutes'?'耗时升序':sort==='minutes-desc'?'耗时降序':'综合排序';
  matches.sort((a,b)=>(sort==='favorites'?b.favoriteCount-a.favoriteCount:0)||(sort==='latest'&&!search.trim()?new Date(b.created_at).getTime()-new Date(a.created_at).getTime():0)||((search.trim()&&order==='综合排序')?(scores.get(b.id)||0)-(scores.get(a.id)||0):0)||compareRecipeOrder(a.payload,b.payload,order));
  return matches.slice(offset,offset+100);
 }
 @Get('recipes/:id/portions') async portions(@Param('id',ParseUUIDPipe) id:string,@Query('people') people='2',@Query('appetite') appetite='1',@Query('seasoning') seasoning='标准',@Query('spice') spice='原方'):Promise<unknown>{
  const [row]=await this.db.query('SELECT payload FROM recipe_catalog WHERE id=$1',[id]);if(!row)throw new BadRequestException('未找到内置菜谱');
  const options=new PortionOptions();options.people=Number(people);options.basePeople=Number(row.payload.people)||2;options.appetite=Number(appetite);options.seasoning=seasoning;options.spice=spice;
  if(!['标准','清淡','浓郁'].includes(seasoning))throw new BadRequestException('口味参数无效');
  try{return {recipeId:id,people:options.people,recommended:true,requiresConfirmation:true,ingredients:recommendPortions(row.payload.ingredients as PortionIngredient[],options)};}catch{throw new BadRequestException('人数或食量参数无效');}
 }
 @Get('taxonomy') async taxonomy():Promise<unknown>{return {regions:await this.db.query('SELECT region AS name,count(*)::int AS count FROM recipe_catalog GROUP BY region ORDER BY region'),categories:await this.db.query('SELECT category AS name,count(*)::int AS count FROM recipe_catalog GROUP BY category ORDER BY category')};}
 @Post('submissions') async submit(@User() u:Identity,@Body() d:SubmissionDto):Promise<unknown>{
  if(!d.confirmed)throw new BadRequestException('提交公共库前请二次确认');const table=d.kind==='barcode'?'barcode_lib':'recipes';const [source]=await this.db.query(`SELECT payload FROM ${table} WHERE id=$1 AND user_id=$2 AND NOT deleted`,[d.sourceId,u.userId]);if(!source)throw new ForbiddenException();
  const id=randomUUID();await this.db.query('INSERT INTO catalog_submission(id,user_id,source_id,kind,payload) VALUES($1,$2,$3,$4,$5)',[id,u.userId,d.sourceId,d.kind,source.payload]);return {id,status:'pending'};
 }
 @Get('submissions/mine') mine(@User() u:Identity):Promise<unknown>{return this.db.query('SELECT * FROM catalog_submission WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[u.userId]);}
 @Get('admin/pending') async pending(@User() u:Identity):Promise<unknown>{if(u.role!=='admin')throw new ForbiddenException();return this.db.query("SELECT * FROM catalog_submission WHERE status='pending' ORDER BY created_at LIMIT 100");}
 @Post('admin/:id/review') async review(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:DecisionDto):Promise<unknown>{if(u.role!=='admin')throw new ForbiddenException();const [r]=await this.db.query('UPDATE catalog_submission SET status=$1,reviewed_at=now() WHERE id=$2 RETURNING *',[d.status,id]);if(!r)throw new BadRequestException();if(r.kind==='barcode')await this.cache.drop('barcode:public:'+r.payload.barcode);else await this.cache.drop('recipes:approved');return {id,status:d.status};}
 private async publicRecipes():Promise<{id:string;payload:RecipeInput}[]>{const key='recipes:approved';let rows=await this.cache.get<{id:string;payload:RecipeInput}[]>(key);if(!rows){rows=await this.db.query("SELECT source_id AS id,payload FROM catalog_submission WHERE kind='recipe' AND status='approved' LIMIT 500");await this.cache.set(key,rows,30);}return rows;}
 @Get('recommendations') async recommendations(@User() u:Identity,@Query('taste') taste='',@Query('excluded') excluded='',@Query('recentDays') recent='7',@Query('region') region='',@Query('homeRegion') homeRegion='',@Query('category') category='',@Query('learning') learning='true',@Query('threshold') threshold='3',@Query('goal') goal='',@Query('maxMinutes') maxMinutes='0',@Query('intent') intent='cook',@Query('batch') batch='0'):Promise<unknown>{
  const days=Number(recent);if(!Number.isInteger(days)||days<0||days>365)throw new BadRequestException();
  const [food,meal,recipe,pub,builtin,events]=await Promise.all([
   this.db.query('SELECT payload FROM food_items f WHERE NOT deleted AND ((family_id IS NULL AND user_id=$1) OR EXISTS(SELECT 1 FROM family_member m WHERE m.family_id=f.family_id AND m.user_id=$1))',[u.userId]),
   this.db.query('SELECT payload FROM meal_records WHERE user_id=$1 AND NOT deleted',[u.userId]),this.db.query('SELECT id,payload FROM recipes WHERE user_id=$1 AND NOT deleted',[u.userId]),
   this.publicRecipes(),this.db.query('SELECT id,payload FROM recipe_catalog'),this.db.query('SELECT recipe_id,action,created_at,intent FROM recommendation_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1000',[u.userId])]);
  const recipes=new Map<string,RecipeInput>();for(const r of [...builtin,...pub,...recipe])recipes.set(r.id,{...r.payload,id:r.id} as RecipeInput);
  const [profile]=await this.db.query('SELECT p.diet_goal,r.name AS region_name FROM user_profile p LEFT JOIN regions r ON r.code=p.region_code WHERE p.user_id=$1',[u.userId]);
  const options=new RankingOptions();options.maxMinutes=Number(maxMinutes);options.intent=intent;options.batch=Number(batch);if(!Number.isInteger(options.maxMinutes)||options.maxMinutes<0||options.maxMinutes>1440||!['cook','record'].includes(intent)||!Number.isInteger(options.batch)||options.batch<0||options.batch>1000000)throw new BadRequestException('时间或推荐模式无效');options.goal=goal||(intent==='cook'?profile?.diet_goal:'')||'均衡饮食';options.region=region;options.homeRegion=homeRegion||(intent==='cook'&&profile?.region_name?cuisineForRegion(profile.region_name):'');options.category=category;options.learning=learning!=='false';options.threshold=Number(threshold);if(!Number.isInteger(options.threshold)||options.threshold<0||options.threshold>365)throw new BadRequestException('临期阈值无效');const feedback:PreferenceEvent[]=events.reverse().map(e=>({recipeId:e.recipe_id,action:e.action,intent:e.intent,date:new Date(e.created_at).toISOString()}));
  const list=[...recipes.values()];const history=meal.map(r=>r.payload as MealInput);if(options.learning){await this.db.query('INSERT INTO user_taste_profile(user_id,payload,intent) VALUES($1,$2,$3) ON CONFLICT(user_id,intent) DO UPDATE SET payload=excluded.payload,updated_at=now()',[u.userId,trainTasteModel(list,history,feedback,Date.now(),intent),intent]);}
  return rankRecipes(list,food.map(r=>r.payload as FoodInput),history,excluded.split(/[,，、]/).map(s=>s.trim()).filter(Boolean),taste,days,Date.now(),options,feedback);
 }
 @Delete('recommendations/learning') async clearLearning(@User() u:Identity,@Query('intent') intent=''):Promise<unknown>{if(intent&&!['cook','record'].includes(intent))throw new BadRequestException('推荐场景无效');await this.db.transaction(async c=>{await c.query("DELETE FROM recommendation_events WHERE user_id=$1 AND ($2='' OR intent=$2)",[u.userId,intent]);await c.query("DELETE FROM user_taste_profile WHERE user_id=$1 AND ($2='' OR intent=$2)",[u.userId,intent]);});return {cleared:true};}
 @Delete('recommendations/events/latest') async undoEvent(@User() u:Identity,@Query('recipeId') recipeId='',@Query('intent') intent='cook',@Query('action') action=''):Promise<unknown>{if(!recipeId||recipeId.length>200||!['cook','record'].includes(intent)||!['like','dislike','recently_eaten','too_complex','not_my_taste','skip'].includes(action))throw new BadRequestException('反馈参数无效');const rows=await this.db.query('DELETE FROM recommendation_events WHERE id=(SELECT id FROM recommendation_events WHERE user_id=$1 AND recipe_id=$2 AND intent=$3 AND action=$4 ORDER BY created_at DESC LIMIT 1) RETURNING id',[u.userId,recipeId,intent,action]);return {removed:rows.length};}
 @Post('recommendations/events') async event(@User() u:Identity,@Body() d:EventDto):Promise<unknown>{await this.db.query('INSERT INTO recommendation_events(user_id,recipe_id,action,intent) VALUES($1,$2,$3,$4)',[u.userId,d.recipeId,d.action,d.intent||'cook']);return {recorded:true};}
}
@Controller('insights') @UseGuards(AuthGuard)
export class InsightsController {
 constructor(private readonly db:Database){}
 @Get('meals') async meals(@User() u:Identity,@Query('from') from='1970-01-01',@Query('to') to='9999-12-31'):Promise<unknown>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to)))throw new BadRequestException();
  const meals=await this.db.query('SELECT payload FROM meal_records WHERE user_id=$1 AND NOT deleted',[u.userId]);const selected=meals.map(r=>r.payload).filter(p=>typeof p.date==='string'&&p.date.slice(0,10)>=from&&p.date.slice(0,10)<=to);
  const days:Record<string,number>={},types:Record<string,number>={},tags:Record<string,number>={},dishes:Record<string,{count:number;cost:number}>={};let total=0;
  for(const m of selected){const cost=Number(m.estimatedCost)||0;total+=cost;days[m.date.slice(0,10)]=(days[m.date.slice(0,10)]||0)+cost;types[m.mealType]=(types[m.mealType]||0)+cost;for(const tag of String(m.tags||'').split(/[,，、]/).filter(Boolean))tags[tag]=(tags[tag]||0)+cost;const dish=dishes[m.name]||{count:0,cost:0};dish.count++;dish.cost+=cost;dishes[m.name]=dish;}
  const food=await this.db.query('SELECT payload FROM food_items WHERE user_id=$1 AND NOT deleted',[u.userId]);return {estimated:true,total,days,types,tags,dishes,consumed:food.reduce((s,r)=>s+(Number(r.payload.consumedCost)||0),0),wasted:food.reduce((s,r)=>s+(Number(r.payload.wastedCost)||0),0)};
 }
 @Get('replenishment') async replenishment(@User() u:Identity):Promise<unknown>{const rows=await this.db.query('SELECT payload FROM food_items WHERE user_id=$1 AND NOT deleted',[u.userId]);return rows.map(r=>r.payload).filter(p=>p.archiveReason!=='wasted'&&(Number(p.quantity)<=1||p.archiveReason==='consumed')).map(p=>({name:p.name,unit:p.unit,category:p.category,quantity:1,reason:p.archiveReason==='consumed'?'已吃完':'余量不足',requiresConfirmation:true}));}
 @Post('backups') async backup(@User() u:Identity):Promise<unknown>{
  return this.db.transaction(async c=>{await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');const payload:Record<string,unknown>={};for(const table of ['food_items','barcode_lib','shopping_list','recipes','recipe_favorites','meal_records'])payload[table]=(await c.query(`SELECT id,payload,version FROM ${table} WHERE user_id=$1 AND family_id IS NULL AND NOT deleted`,[u.userId])).rows;const version=(await c.query('SELECT global_version FROM users WHERE id=$1',[u.userId])).rows[0].global_version;const id=randomUUID();await c.query('INSERT INTO user_backup(id,user_id,version,payload) VALUES($1,$2,$3,$4)',[id,u.userId,version,payload]);return {id,version};});
 }
 @Get('backups') backups(@User() u:Identity):Promise<unknown>{return this.db.query('SELECT id,version,created_at FROM user_backup WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',[u.userId]);}
 @Get('backups/:id') async download(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{const [r]=await this.db.query('SELECT * FROM user_backup WHERE user_id=$1 AND id=$2',[u.userId,id]);if(!r)throw new ForbiddenException();return r;}
 @Delete('backups/:id') async remove(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{await this.db.query('DELETE FROM user_backup WHERE user_id=$1 AND id=$2',[u.userId,id]);return {deleted:true};}
 @Get('admin/metrics') async metrics(@User() u:Identity):Promise<unknown>{if(u.role!=='admin')throw new ForbiddenException();const result:Record<string,number>={};for(const table of ['users','devices','food_items','meal_records','social_post','catalog_submission','object_deletion_jobs']){const [r]=await this.db.query(`SELECT count(*) FROM ${table}`);result[table]=Number(r.count);}return result;}
}
