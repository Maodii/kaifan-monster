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
    await check("Batch insertion is atomic and invalid second row creates no stock or outbox",async()=>{
      const before=store.exportData();
      await assert.rejects(()=>store.addFoodsBatch([food("批量甲"),food("无效批量",-1)]));
      assert.equal(store.exportData(),before);
      adapter.forceSqlError="INSERT OR REPLACE INTO documents";
      await assert.rejects(()=>store.addFoodsBatch([food("失败批量")]),/injected/);
      adapter.forceSqlError="";assert.equal(store.exportData(),before);
      await store.addFoodsBatch([food("批量甲"),food("批量乙")]);
      assert.equal(store.state.foods.length,2);assert.equal(store.state.changes.length,2);
    });
    await check("Consume undo writes restoration movement and rejects subsequent mutation",async()=>{
      const f=store.state.foods[0]; await store.consume(f,2);
      await store.undoLast();let restored=store.state.foods.find(v=>v.id===f.id);
      assert.equal(restored.quantity,10);assert.equal(restored.movements.at(-1).reason,"restored");
      await store.consume(restored,1);restored=store.state.foods.find(v=>v.id===f.id);
      await store.saveFood(Object.assign(new M.Food(),restored,{notes:"后续编辑"}));
      const before=store.exportData();await assert.rejects(()=>store.undoLast(),/后续|同步/);assert.equal(store.exportData(),before);
    });
    await check("Purchase marking undo and actual inventory purchase have distinct atomic behavior",async()=>{
      const s=Object.assign(new M.Shopping(),{name:"采购甲",quantity:2,unit:"g"});await store.saveShopping(s);
      const item=store.state.shopping.find(v=>v.name==="采购甲");await store.purchaseStatus(item);assert(store.state.shopping.find(v=>v.id===item.id).purchased);
      await store.undoLast();assert.equal(store.state.shopping.find(v=>v.id===item.id).purchased,false);
      const before=store.exportData();adapter.forceSqlError="INSERT OR REPLACE INTO documents";
      await assert.rejects(()=>store.purchaseIntoInventory(item.id,food("采购甲",2)),/injected/);adapter.forceSqlError="";assert.equal(store.exportData(),before);
      await store.purchaseIntoInventory(item.id,food("采购甲",2));assert(store.state.shopping.find(v=>v.id===item.id).purchased);assert.equal(await store.lastUndo(),null);
    });
    await check("Deduction preview chooses earlier open-expiry batches and never mutates stock",async()=>{
      const a=food("鸡肉",10), b=food("鸡肉",10);a.id="a";b.id="b";a.openedAt="2026-11-01";a.openedExpiry="2026-11-07";a.batch="开封批次";
      const recipe=Object.assign(new M.Recipe(),{ingredients:[new M.Ingredient("鸡肉",12,"g")]});
      const before=JSON.stringify([b,a]);const p=Daily.previewDeduction(recipe,[b,a],"2026-11-05");
      assert.equal(p.lines[0].foodId,"a");assert.equal(p.lines[0].quantity,10);assert.equal(p.lines[1].quantity,2);assert.equal(p.errors.length,0);assert.equal(JSON.stringify([b,a]),before);
      assert(Daily.previewDeduction(recipe,[a],"2026-11-08").errors.length);
    });
    await check("Finance cent remainder and substitution/household exclusions preserve hard restrictions",async()=>{
      const f=Daily.mealFinance({food:10,delivery:2,discount:1,people:3,share:1});assert.equal(f.total,11);assert.equal(f.personal,3.66);assert.equal(f.others,7.34);
      assert.throws(()=>Daily.mealFinance({food:1,delivery:0,discount:2,people:1,share:1}));
      assert.equal(Daily.substituteOptions("鸡腿肉",["鸡胸肉"]).length,0);
      const h={members:[{name:"甲",enabled:true,appetite:1,excluded:["花生"]},{name:"乙",enabled:false,appetite:2,excluded:["鸡蛋"]}]};
      assert.equal(Daily.householdExclusions(h).join(","),"花生");assert.equal(Daily.householdPeople(h),1);
    });
    await check("Workspace download preserves unsynced stock, applies atomically and rejects stale local decision",async()=>{
      const check=await store.workspacePayload(), expected=signature(check), record={version:1,payload:{format:1,plans:[],preferences:{homeRegion:"上海","experience:v1":'{"collections":[{"name":"云端收藏夹","ids":[]}],"filters":[]}'}}};
      const stock=JSON.stringify(store.state.foods), changes=JSON.stringify(store.state.changes);
      await store.applyWorkspace(record,expected);assert.equal(await store.getSetting("homeRegion",""),"上海");assert.equal(JSON.stringify(store.state.foods),stock);assert.equal(JSON.stringify(store.state.changes),changes);
      await assert.rejects(()=>store.applyWorkspace(record,expected),/又有变化/);
      const snapshot=store.exportData(), current=signature(await store.workspacePayload());adapter.forceSqlError="INSERT OR REPLACE INTO documents";
      await assert.rejects(()=>store.applyWorkspace({...record,version:2},current),/injected/);adapter.forceSqlError="";assert.equal(store.exportData(),snapshot);
    });
    await check("Workspace API contract uses explicit baseVersion and rejects stale upload before HTTP",async()=>{
      const cloud=new (req("Cloud").Cloud)(), requests=[];
      cloud.request=async(path,method,body)=>{requests.push({path,method,body});return JSON.stringify({version:3,payload:{format:1,plans:[],preferences:{}}});};
      const checked=await cloud.checkWorkspace(store);await cloud.uploadWorkspace(store,checked);
      assert.equal(requests.at(-1).path,"/account/workspace");assert.equal(requests.at(-1).body.baseVersion,3);
      await store.setting("homeRegion","北京");const count=requests.length;await assert.rejects(()=>cloud.uploadWorkspace(store,checked),/又有变化/);assert.equal(requests.length,count);
    });
    await check("Leftover plan completion records zero cost without stock deduction and cannot be repeated",async()=>{
      const meal=Object.assign(new M.Meal(),{name:"原餐",date:new Date().toISOString(),estimatedCost:12});await store.saveMeal(meal);
      const source=store.state.meals.find(m=>m.name==="原餐");
      const plan=Object.assign(new (req("MealPlan").MealPlan)(),{date:M.dateString(new Date()),mode:"吃剩菜",note:source.name,sourceMealId:source.id,remainingPortions:1});await store.saveMealPlan(plan);
      const saved=store.state.plans.find(p=>p.sourceMealId===source.id), stock=JSON.stringify(store.state.foods);
      await store.recordLeftoverPlan(saved.id);
      assert.equal(store.state.meals.find(m=>m.id===saved.id).estimatedCost,0);assert.equal(JSON.stringify(store.state.foods),stock);
      await store.saveMealPlan({...store.state.plans.find(p=>p.id===saved.id),completed:false});
      await assert.rejects(()=>store.recordLeftoverPlan(saved.id),/已经|已.*记|重复/);
      assert.equal(store.state.meals.filter(m=>m.id===saved.id).length,1);
    });
    passed=true;
  } finally {
    fs.writeFileSync(root+"/work/reports/android-next20-tests.json",JSON.stringify({passed,checks,generated_core_sha256:crypto.createHash("sha256").update(fs.readFileSync(root+"/android/app/build/generated/assets/core.js")).digest("hex"),scope:"Generated canonical modules with real host SQLite; workspace HTTP request contract is isolated, not deployed API/device evidence"},null,2)+"\n");adapter.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
