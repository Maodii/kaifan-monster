"use strict";
const vm=require("vm"),fs=require("fs"),assert=require("assert/strict"),crypto=require("crypto");
const {HostAdapter,root}=require("./host-adapter.cjs"),adapter=new HostAdapter(),checks=[];
const sandbox={console,TextDecoder,TextEncoder,Uint8Array,ArrayBuffer,Date,Map,Set,Promise,setTimeout,clearTimeout};sandbox.window=sandbox;
sandbox.Android={invoke:adapter.invoke.bind(adapter),async:(id,action,json)=>adapter.asyncOp(action,JSON.parse(json)).then(value=>sandbox.nativeResult(id,{value}),error=>sandbox.nativeResult(id,{error:error.message}))};
vm.createContext(sandbox);const core=fs.readFileSync(root+"/android/app/build/generated/assets/core.js","utf8");vm.runInContext(core,sandbox);
const req=n=>sandbox.require(n),M=req("Models"),L=req("DailyLivingCore"),Plan=req("MealPlan").MealPlan,P=req("Platform"),store=new(req("LocalStore").LocalStore)();
async function check(name,fn){await fn();checks.push(name);console.log("PASS",name);}
(async()=>{let passed=false;
try{
 await store.init(P.context);const today=M.dateString(new Date()),tomorrow=req("DailyExperienceCore").shiftDay(today,1);
 const source=Object.assign(new M.Meal(),{name:"原餐",date:new Date().toISOString(),estimatedCost:30});await store.saveMeal(source);
 let batch;
 await check("Canonical leftovers save and eat/discard update exact portions, zero-cost linked meal, no stock mutation",async()=>{
  const b=Object.assign(new L.LeftoverBatch(),{sourceMealId:source.id,name:source.name,total:2.5,remaining:2.5,preparedDate:today,expiryDate:tomorrow,storage:"冷冻",container:"蓝饭盒"});
  const stock=JSON.stringify(store.state.foods);await store.saveLeftover(b);batch=store.state.leftovers[0];
  await store.useLeftover(batch.id,.5,"eat",JSON.stringify(batch));batch=store.state.leftovers[0];assert.equal(batch.remaining,2);const meal=store.state.meals.find(m=>m.sourceMealId===source.id);assert.equal(meal.personalCost,0);assert.equal(meal.estimatedCost,0);
  const count=store.state.meals.length;await store.useLeftover(batch.id,.25,"discard",JSON.stringify(batch));batch=store.state.leftovers[0];assert.equal(batch.remaining,1.75);assert.equal(store.state.meals.length,count);assert.equal(JSON.stringify(store.state.foods),stock);
 });
 await check("Leftover stale snapshot, precision/overshoot/invalid action and SQL failure reject without partial meal/event writes",async()=>{
  const stale=JSON.stringify({...batch,remaining:2.5}),before=store.exportData();await assert.rejects(()=>store.useLeftover(batch.id,.1,"eat",stale));
  for(const [qty,action] of [[0,"eat"],[.0001,"eat"],[10,"eat"],[.1,"bad"]])await assert.rejects(()=>store.useLeftover(batch.id,qty,action,JSON.stringify(batch)));
  assert.equal(store.exportData(),before);adapter.forceSqlError="INSERT OR REPLACE INTO documents";await assert.rejects(()=>store.useLeftover(batch.id,.5,"eat",JSON.stringify(batch)));adapter.forceSqlError="";assert.equal(store.exportData(),before);
 });
 await check("Expired or future leftover cannot be eaten; expired stock may be explicitly discarded",async()=>{
  const old=Object.assign(new L.LeftoverBatch(),{sourceMealId:source.id,name:"过期",total:1,remaining:1,preparedDate:"2020-01-01",expiryDate:"2020-01-02"});await store.saveLeftover(old);const row=store.state.leftovers.find(b=>b.name==="过期");await assert.rejects(()=>store.useLeftover(row.id,.5,"eat",JSON.stringify(row)));await store.useLeftover(row.id,.5,"discard",JSON.stringify(row));
  assert.throws(()=>L.takeLeftover({...batch,preparedDate:tomorrow},.1,"eat",today));
 });
 await check("Trash restore assigns new private ID, retains delete tombstone, rejects repeat; clear only removes trash",async()=>{
  const food=Object.assign(new M.Food(),{name:"可恢复",quantity:1,unit:"个",expiryDate:tomorrow});await store.saveFood(food);await store.deleteFood(food);const entry=store.state.trash.find(e=>e.name===food.name);await store.restoreTrash(entry.id);const restored=store.state.foods.find(f=>f.name===food.name);assert.notEqual(restored.id,food.id);assert.equal(restored.familyId,"");assert(store.state.changes.some(c=>c.entityId===food.id&&c.operation==="delete"));await assert.rejects(()=>store.restoreTrash(entry.id));const before=JSON.stringify(store.state.foods);await store.clearTrash();assert.equal(JSON.stringify(store.state.foods),before);
 });
 const recipes=M.offlineRecipes().concat(store.builtinRecipes),options=new(req("RecommendationCore").RankingOptions)();let proposal;
 await check("Weekly suggestion is nonmutating, honors exclusions/occupied slots and distinct recipe groups",async()=>{
  const occupied=Object.assign(new Plan(),{date:"2098-01-03",occasion:"晚餐",recipeId:recipes[0].id,people:2});await store.saveMealPlan(occupied);options.excluded=["鸡蛋"];
  const before=store.exportData();proposal=L.suggestWeek(recipes,store.state.foods,store.state.meals,store.state.plans,"2098-01-03","晚餐",2,options);assert.equal(store.exportData(),before);assert(!proposal.plans.some(p=>p.date==="2098-01-03"));assert(proposal.plans.length>0);assert.equal(new Set(proposal.plans.map(p=>p.recipeId)).size,proposal.plans.length);
  assert(proposal.plans.every(p=>!recipes.find(r=>r.id===p.recipeId).ingredients.some(i=>i.name.includes("鸡蛋"))));
 });
 await check("Weekly adoption and recipe replacement reject stale snapshots atomically and retain inventory/shopping",async()=>{
  const foods=JSON.stringify(store.state.foods),shopping=JSON.stringify(store.state.shopping),snapshot=JSON.stringify(store.state.plans);await store.applySuggestedWeek(proposal.plans,snapshot);const before=store.exportData();await assert.rejects(()=>store.applySuggestedWeek(proposal.plans,snapshot));assert.equal(store.exportData(),before);
  const p=store.state.plans[0],old=JSON.stringify(p),next=recipes.find(r=>r.id!==p.recipeId);await store.replacePlannedRecipe(p.id,next.id,old);const after=store.exportData();await assert.rejects(()=>store.replacePlannedRecipe(p.id,p.recipeId,old));assert.equal(store.exportData(),after);assert.equal(JSON.stringify(store.state.foods),foods);assert.equal(JSON.stringify(store.state.shopping),shopping);
 });
 await check("Nutrition keeps zero known, unknown missing and source counts; dining restaurant/canteen uses personal share",async()=>{
  const meals=[Object.assign(new M.Meal(),{name:"套餐",id:"a",date:today+"T12:00:00",calories:0,calorieSource:"包装标签",place:"食堂",diningMode:"食堂",personalCost:5,estimatedCost:20,costType:"实付"}),Object.assign(new M.Meal(),{name:"饭",id:"b",date:today+"T13:00:00",calories:-1,place:"餐馆",diningMode:"餐馆",personalCost:8,estimatedCost:30,costType:"估算"})];
  const n=L.nutritionWeek(meals,today);assert.equal(n.days.length,7);assert.equal(n.known,1);assert.equal(n.unknown,1);assert.equal(n.totalKcal,0);assert.equal(n.days.at(-1).label,1);const places=L.diningPlaces(meals);assert.equal(places.length,2);assert.equal(places.find(p=>p.name==="食堂").paid,5);assert.equal(places.find(p=>p.name==="餐馆").estimated,8);
 });
 await check("Backup export/import contains leftovers with validated events and omits local trash",async()=>{
  const text=store.exportData(),data=JSON.parse(text);assert.equal(data.leftovers.length,2);assert.equal((data.trash || []).length,0);store.backupConflicts(text);await store.importData(text,false);assert.equal(store.state.leftovers.length,2);
  const invalid=JSON.parse(text);invalid.leftovers[0].remaining=99;const before=store.exportData();await assert.rejects(()=>store.importData(JSON.stringify(invalid),true));assert.equal(store.exportData(),before);
 });
 await check("Import preview signature is checked inside queued transaction; intervening writes survive rejected import",async()=>{
  const text=store.exportData(),signature=store.exportData();
  const meal=Object.assign(new M.Meal(),{name:"确认后排队修改",date:new Date().toISOString()});
  const mutation=store.saveMeal(meal),pending=store.importData(text,true,signature);
  await mutation;await assert.rejects(()=>pending,/变化/);assert(store.state.meals.some(m=>m.id===meal.id));
  const current=store.exportData();await store.importData(current,false,current);assert(store.state.meals.some(m=>m.id===meal.id));
 });
 passed=true;
}finally{
 fs.writeFileSync(root+"/work/reports/android-living-tests.json",JSON.stringify({passed,checks,generated_core_sha256:crypto.createHash("sha256").update(core).digest("hex"),scope:"32 generated shared modules with real host SQLite; not Android device or Harmony native crypto evidence"},null,2)+"\n");adapter.close();
}
})().catch(e=>{console.error(e);process.exitCode=1;});
