"use strict";
const vm = require("vm"), fs = require("fs"), assert = require("assert/strict"), crypto=require("crypto");
const {HostAdapter,root} = require("./host-adapter.cjs");
const adapter = new HostAdapter(), checks = [];
const sandbox = {console,TextDecoder,TextEncoder,Uint8Array,ArrayBuffer,Date,Map,Set,Promise,setTimeout,clearTimeout};
sandbox.window = sandbox;
sandbox.Android = {invoke:adapter.invoke.bind(adapter),async:(id,action,json)=>adapter.asyncOp(action,JSON.parse(json)).then(value=>sandbox.nativeResult(id,{value}),error=>sandbox.nativeResult(id,{error:error.message}))};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(root+"/android/app/build/generated/assets/core.js","utf8"),sandbox);
const req = n=>sandbox.require(n), M=req("Models"), Daily=req("DailyFlowCore"), P=req("Platform");
const store = new (req("LocalStore").LocalStore)();
const signature = req("WorkspaceCore").workspaceSignature;
const food = (name, quantity=10)=>Object.assign(new M.Food(),{name,quantity,unit:"g",expiryDate:"2099-12-31",purchasedAt:"2026-11-05",estimatedPrice:10});
async function check(name,fn){await fn();checks.push(name);console.log("PASS",name);}
(async()=>{
 let passed=false;
 try {
  await store.init(P.context);
  const C=req("ConvenienceCore"), W=req("WorkspaceMergeCore");
  await check("Partial procurement converts g/kg, preserves pending remainder and rejects stale full snapshot even at same timestamp",async()=>{
   await store.saveShopping(Object.assign(new M.Shopping(),{name:"土豆",quantity:1,unit:"kg"}));
   let item=store.state.shopping.find(s=>s.name==="土豆"), snapshot=JSON.stringify(item);
   await store.purchasePartial(item.id,food("土豆",300),snapshot);
   item=store.state.shopping.find(s=>s.id===item.id);assert.equal(item.quantity,.7);assert.equal(item.purchased,false);
   assert.equal(store.state.foods.at(-1).quantity,300);assert.equal(store.state.foods.at(-1).purchasedQuantity,300);
   const before=store.exportData();await assert.rejects(()=>store.purchasePartial(item.id,food("土豆",100),snapshot),/变化/);assert.equal(store.exportData(),before);
   snapshot=JSON.stringify(item);const changed={...item,quantity:.6};await store.atomic(async()=>{await store.persist("shopping_list",item.id,JSON.stringify(changed));});
   assert.equal(changed.modifiedAt,item.modifiedAt);await assert.rejects(()=>store.purchasePartial(item.id,food("土豆",100),snapshot),/变化/);
  });
  await check("Partial procurement rejects overshoot/unit/family mismatch and rolls back SQL failures; exact remainder completes once",async()=>{
   let item=store.state.shopping.find(s=>s.name==="土豆"), snapshot=JSON.stringify(item), before=store.exportData();
   for(const f of [food("土豆",1000),{...food("土豆",1),unit:"个"},{...food("土豆",100),familyId:"other"},food("番茄",100)]){
    await assert.rejects(()=>store.purchasePartial(item.id,f,snapshot));assert.equal(store.exportData(),before);
   }
   adapter.forceSqlError="INSERT OR REPLACE INTO documents";await assert.rejects(()=>store.purchasePartial(item.id,food("土豆",100),snapshot),/injected/);adapter.forceSqlError="";assert.equal(store.exportData(),before);
   await store.purchasePartial(item.id,food("土豆",600),snapshot);assert(store.state.shopping.find(s=>s.id===item.id).purchased);
   before=store.exportData();await assert.rejects(()=>store.purchasePartial(item.id,food("土豆",600),snapshot));assert.equal(store.exportData(),before);
  });
  await check("Energy sources and consumed share produce actual kcal; invalid source, zero fraction and invalid reference rejected",async()=>{
   assert.equal(C.consumedEnergy({referenceKcal:601,fraction:.5,source:"包装标签"}),301);
   for(const value of [{referenceKcal:-1,fraction:1,source:"手动估算"},{referenceKcal:600,fraction:0,source:"包装标签"},{referenceKcal:600,fraction:1.1,source:"包装标签"},{referenceKcal:600,fraction:.5,source:"猜测"}])assert.throws(()=>C.consumedEnergy(value));
   const meal=new M.Meal();assert.equal(meal.energyReference,-1);assert.equal(meal.consumedFraction,1);
  });
  await check("Three-way merge requires conflict decisions, preserves deletion and ignores JSON object key order",async()=>{
   const payload=(name)=>({format:1,plans:[{id:"p",date:"2026-11-06",occasion:"晚餐",note:name}],preferences:{homeRegion:name}});
   const base=payload("原"),local=payload("本机"),remote=payload("云端");let rows=W.workspaceMergeRows(local,remote,base);
   assert(rows.some(r=>r.conflict&&!r.choice));assert.throws(()=>W.mergedWorkspace(rows));rows.forEach(r=>r.choice=r.kind==="plan"?"local":"remote");
   let merged=W.mergedWorkspace(rows);assert.equal(merged.plans[0].note,"本机");assert.equal(merged.preferences.homeRegion,"云端");
   rows=W.workspaceMergeRows({...base,plans:[]},base,base);assert.equal(W.mergedWorkspace(rows).plans.length,0);
   const reordered={...base,plans:[{note:"原",occasion:"晚餐",date:"2026-11-06",id:"p"}]};assert(W.workspaceMergeRows(base,reordered).every(r=>!r.conflict));
  });
  await check("Temporary skip stays in its intent and expires exactly at deadline without learning writes",async()=>{
   const before=store.exportData(), rows=[{recipeId:"a",intent:"cook",until:200},{recipeId:"b",intent:"record",until:200}];
   assert.equal(C.activeSkips(rows,"cook",199).join(","),"a");assert.equal(C.activeSkips(rows,"record",199).join(","),"b");assert.equal(C.activeSkips(rows,"cook",200).length,0);assert.equal(store.exportData(),before);
  });
  await check("Workspace merged upload uses CAS and rejects local changes before sending",async()=>{
   const cloud=new(req("Cloud").Cloud)(),requests=[];cloud.request=async(path,method,body)=>{requests.push({path,method,body});return JSON.stringify({version:4,payload:body?.payload||{format:1,plans:[],preferences:{}}});};
   const checked=await cloud.checkWorkspace(store);await cloud.mergeWorkspace(store,checked,{format:1,plans:[],preferences:{homeRegion:"上海"}});assert.equal(requests.at(-1).body.baseVersion,4);
   const count=requests.length;await assert.rejects(()=>cloud.mergeWorkspace(store,checked,checked.local),/变化/);assert.equal(requests.length,count);
  });

  await check("Balanced/parallel menu honors exclusions and elapsed-time constraints; unresolved duplicate workspace keys rejected",async()=>{
   const U=req("UsabilityCore"),K=req("KitchenWorkflowCore");
   const a=Object.assign(new M.Recipe(),{id:"steam-meat",name:"蒸鸡肉",category:"大菜",minutes:30,prepMinutes:5,cookMinutes:25,people:2,estimatedCost:8,steps:["小火蒸25分钟，鸡肉熟透"],ingredients:[new M.Ingredient("鸡肉",200,"g")]}),b=Object.assign(new M.Recipe(),{id:"greens",name:"炒青菜",category:"快手菜",minutes:10,prepMinutes:3,cookMinutes:7,people:2,estimatedCost:3,steps:["大火翻炒7分钟至青菜变软"],ingredients:[new M.Ingredient("青菜",200,"g")]});
   const o=Object.assign(new U.DrawOptions(),{dishes:2,soups:0,minutes:100,budget:0,balance:true,seed:"test"});
   const sequential=U.drawMenu([a,b],o),parallel=U.drawMenu([a,b],{...o,timeMode:"parallel"});assert.equal(parallel.ids.length,2);assert.equal(parallel.minutes,K.cookTimeline([a,b]).parallelMinutes);assert(parallel.minutes<=sequential.minutes);
   assert.equal(U.drawMenu([a,b],{...o,excluded:["鸡肉"]}).ids.length,0);assert.equal(U.drawMenu([a,b],{...o,minutes:1}).ids.length,0);
   const dup={format:1,plans:[{id:"same"},{id:"same"}],preferences:{}};assert.throws(()=>W.workspaceMergeRows(dup,{format:1,plans:[],preferences:{}}),/重复/);
  });
  passed=true;
 }finally{
  fs.writeFileSync(root+"/work/reports/android-next10-tests.json",JSON.stringify({passed,checks,generated_core_sha256:crypto.createHash("sha256").update(fs.readFileSync(root+"/android/app/build/generated/assets/core.js")).digest("hex"),scope:"31 generated canonical modules and actual host SQLite; not device evidence"},null,2)+"\n");adapter.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
