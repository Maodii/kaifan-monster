import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir,readFile,writeFile } from 'node:fs/promises';
import { Database } from '../src/database';
import { DiscoveryController } from '../src/discovery';
import { SyncService } from '../src/sync';
import { CatalogController } from '../src/catalog';
import type { Identity } from '../src/auth';
import type { Cache } from '../src/cache';
async function main(){
 const admin=new Database(),db=new Database(),schema='discovery_test_'+randomUUID().replaceAll('-','');db.pool.options.options='-c search_path='+schema;
 const discovery=new DiscoveryController(db),catalog=new CatalogController(db,{} as Cache),checks:string[]=[];let passed=false,created=false;
 const users:Identity[]=Array.from({length:4},()=>({userId:randomUUID(),deviceId:randomUUID(),role:'user'}));
 const make=(i:number,approved=false)=>{const id=randomUUID(),pork=i%3===0;return {id,payload:{id,name:(approved?'公开':'内置')+'试验菜'+String(i).padStart(4,'0'),category:'家常菜',region:'四川',cuisine:'四川',taste:'咸鲜',minutes:i%40+5,people:2,estimatedCost:i%40+5,costKnown:true,difficulty:i%2?'简单':'普通',ingredients:[{name:pork?'猪里脊':'鸡蛋',quantity:pork?200:2,unit:pork?'g':'个'},{name:'番茄',quantity:200,unit:'g'}],steps:['充分加热后出锅']}};};
 const get=(p:Record<string,string>={})=>catalog.recipes(users[0],p.search,p.taste,p.sort,p.region,p.category,p.maxMinutes,p.page,p.ingredients,p.excludeIngredients,p.ingredientMode,p.maxCost,p.difficulty) as Promise<any[]>;
 try{
  await admin.query('CREATE SCHEMA '+schema);created=true;
  for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await db.query(await readFile('migrations/'+f,'utf8'));
  for(const u of users){await db.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)',[u.userId,u.userId+'@example.test','not-a-login-hash']);await db.query('INSERT INTO devices(id,user_id,name) VALUES($1,$2,$3)',[u.deviceId,u.userId,'synthetic']);}
  const builtin=Array.from({length:610},(_,i)=>make(i)),approved=Array.from({length:240},(_,i)=>make(i,true));
  await db.query(`INSERT INTO recipe_catalog(id,name,region,category,taste,minutes,source_revision,payload)
   SELECT (v->>'id')::uuid,v->'payload'->>'name','四川','家常菜','咸鲜',(v->'payload'->>'minutes')::int,'isolated-test',v->'payload'
   FROM jsonb_array_elements($1::jsonb) v`,[JSON.stringify(builtin)]);
  await db.query(`INSERT INTO catalog_submission(id,user_id,source_id,kind,status,payload)
   SELECT gen_random_uuid(),$2,(v->>'id')::uuid,'recipe','approved',v->'payload' FROM jsonb_array_elements($1::jsonb) v`,[JSON.stringify(approved),users[0].userId]);
  const recipe=builtin[0].id;
  assert.equal((await discovery.favorite(users[0],recipe,{saved:true}) as any).count,1);
  await Promise.all(Array.from({length:8},()=>discovery.favorite(users[0],recipe,{saved:true})));
  assert.equal((await discovery.favorite(users[1],recipe,{saved:true}) as any).count,2);
  let summary:any=await discovery.summary(users[0]);assert.equal(summary.favorites.find((x:any)=>x.recipeId===recipe).count,2);assert.deepEqual(summary.mine,[recipe]);assert.deepEqual((await discovery.summary(users[2]) as any).mine,[]);
  await discovery.favorite(users[0],recipe,{saved:false});assert.equal((await discovery.favorite(users[0],recipe,{saved:false}) as any).count,1);
  await assert.rejects(()=>discovery.favorite(users[0],randomUUID(),{saved:true}));checks.push('Real distinct-user favorites; concurrent duplicate save and repeated remove idempotent; mine account isolation; unknown recipe denied');
  const withdrawn=approved[0].id;await discovery.favorite(users[0],withdrawn,{saved:true});await db.query("UPDATE catalog_submission SET status='rejected' WHERE source_id=$1",[withdrawn]);
  summary=await discovery.summary(users[0]);assert(!summary.favorites.some((x:any)=>x.recipeId===withdrawn));await assert.rejects(()=>discovery.favorite(users[1],withdrawn,{saved:true}));await discovery.favorite(users[0],withdrawn,{saved:false});checks.push('Withdrawn public recipe excluded from counts and saving; existing owner can remove stale favorite');
  for(const u of users.slice(0,2))await discovery.search(u,{term:'鸡蛋'});assert.equal((await discovery.summary(users[0]) as any).hotSearches.length,0);
  await discovery.search(users[2],{term:' 鸡蛋 '});for(let i=0;i<4;i++)await discovery.search(users[0],{term:'鸡蛋'});
  summary=await discovery.summary(users[0]);assert.deepEqual(summary.hotSearches,[{term:'鸡蛋',count:3}]);
  assert.equal((await db.query("SELECT count(*)::int n FROM discovery_search WHERE term='鸡蛋'"))[0].n,3);
  for(const u of users)assert.deepEqual(await discovery.search(u,{term:'私人的电话号码和饮食记录'}),{recorded:false});assert.equal((await db.query("SELECT count(*)::int n FROM discovery_search WHERE term LIKE '私人的%'"))[0].n,0);
  await db.query("UPDATE discovery_search SET searched_on=CURRENT_DATE-7 WHERE user_id=$1",[users[2].userId]);assert.equal((await discovery.summary(users[0]) as any).hotSearches.length,0);
  await db.query("INSERT INTO discovery_search(user_id,term,searched_on) VALUES($1,'番茄',CURRENT_DATE-31)",[users[0].userId]);await discovery.search(users[3],{term:'番茄'});assert.equal((await db.query('SELECT count(*)::int n FROM discovery_search WHERE searched_on<CURRENT_DATE-30'))[0].n,0);checks.push('Three distinct accounts over seven days before public hot ranking; same-day dedup, private free-text excluded, expired events pruned');
  const pageIds:string[]=[];for(let p=1;p<=9;p++){const page=await get({page:String(p)});assert(page.length<=100);pageIds.push(...page.map(r=>r.id));}assert.equal(pageIds.length,849);assert.equal(new Set(pageIds).size,849);
  assert((await get({search:builtin[609].payload.name})).some(r=>r.id===builtin[609].id));assert((await get({search:approved[239].payload.name})).some(r=>r.id===approved[239].id));assert(!(await get({search:approved[0].payload.name})).some(r=>r.id===withdrawn));checks.push('Full 610 builtin + 240 public union searched before pagination; 849 currently visible IDs exactly once, beyond both old caps, withdrawn excluded');
  let hits=await get({ingredients:'pork',maxMinutes:'20',maxCost:'20',difficulty:'简单'});assert(hits.length>0);assert(hits.every(r=>r.payload.ingredients.some((i:any)=>i.name==='猪里脊')&&r.payload.minutes<=20&&r.payload.estimatedCost<=20&&r.payload.difficulty==='简单'));
  assert.equal((await get({ingredients:'pork',excludeIngredients:'pork'})).length,0);assert.equal((await get({ingredients:'pork,egg',ingredientMode:'all'})).length,0);assert((await get({ingredients:'pork,egg',ingredientMode:'any'})).length>0);
  hits=await get({ingredients:'西红柿'});assert(hits.length>0);assert.equal((await get({search:'%_\\'})).length,0);
  const rank=await get({sort:'favorites'});assert.equal(rank[0].id,recipe);assert.equal(rank[0].favoriteCount,1);
  for(const p of [{page:'1.01'},{page:'0'},{maxMinutes:'-1'},{maxCost:'Infinity'},{ingredientMode:'bad'},{sort:'oops'}])await assert.rejects(()=>get(p));
  checks.push('Ingredient taxonomy/aliases all-or-any; exclusion wins; budget/time/difficulty intersections; real favorite sort; literal wildcard query; invalid pagination/filter rejection');
  const sync=new SyncService(db,{withSyncLock:async(_user:string,fn:()=>Promise<unknown>)=>fn()} as unknown as Cache);
  const historyRecipe=builtin[5].id,historyId=randomUUID();
  await sync.push(users[0],[{changeId:randomUUID(),entityType:'recipe_favorites',entityId:historyId,operation:'upsert',baseVersion:0,modifiedAt:new Date().toISOString(),payload:{recipeId:historyRecipe}}]);
  summary=await discovery.summary(users[0]);assert(!summary.favorites.some((r:any)=>r.recipeId===historyRecipe),'private sync history must not silently create public popularity');
  // The local user removed their published favorite offline; refresh must not write it back locally.
  await discovery.favorite(users[0],recipe,{saved:true});summary=await discovery.summary(users[0]);const revision=summary.favoriteRevision;
  const personalBefore=await db.query('SELECT * FROM recipe_favorites WHERE user_id=$1',[users[0].userId]);
  await assert.rejects(()=>discovery.publishFavorites(users[0],{recipeIds:[],confirmed:false,expectedRevision:revision}));
  const empty:any=await discovery.publishFavorites(users[0],{recipeIds:[],confirmed:true,expectedRevision:revision});assert.equal(empty.publishedCount,0);assert.equal(empty.personalSyncChanged,false);
  summary=await discovery.summary(users[0]);assert.deepEqual(summary.mine,[]);assert.equal(summary.favorites.find((r:any)=>r.recipeId===recipe).count,1,'other account retained');
  await assert.rejects(()=>discovery.publishFavorites(users[0],{recipeIds:[recipe],confirmed:true,expectedRevision:revision}),/其他设备/);
  assert.deepEqual((await discovery.summary(users[0]) as any).mine,[],'stale snapshot cannot resurrect canceled favorite');
  const selected:any=await discovery.publishFavorites(users[0],{recipeIds:[historyRecipe,historyRecipe,randomUUID(),withdrawn],confirmed:true,expectedRevision:empty.favoriteRevision});assert.equal(selected.publishedCount,1);assert.equal(selected.ignoredCount,2);
  assert.deepEqual(await db.query('SELECT * FROM recipe_favorites WHERE user_id=$1',[users[0].userId]),personalBefore,'public publication cannot alter personal backup');
  assert.equal((await discovery.summary(users[0]) as any).favorites.find((r:any)=>r.recipeId===historyRecipe).count,1);
  checks.push('Actual private SyncService push does not invent public historical popularity; explicit local snapshot publishes only eligible unique recipes, offline removals win, stale revisions rejected, other users and private sync unchanged');passed=true;
 }finally{
  await db.onModuleDestroy();if(created)await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');await admin.onModuleDestroy();
  await writeFile('../work/reports/discovery-catalog-integration.json',JSON.stringify({passed,checks,scope:'Actual controller execution with isolated PostgreSQL schema, synthetic users and 850 synthetic recipes; HTTP guard/DTO transport not covered',cleanup:'Temporary schema removed; no user records modified'},null,2)+'\n');
 }
 console.log('PASS discovery/catalog PostgreSQL:',checks.length,'groups');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
