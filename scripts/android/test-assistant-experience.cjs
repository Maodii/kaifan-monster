const vm = require("vm"),
  fs = require("fs"),
  assert = require("assert/strict"),
  crypto = require("crypto"),
  { HostAdapter, root } = require("./host-adapter.cjs");
const adapter = new HostAdapter(),
  checks = [];
const sandbox = {
  console,
  TextDecoder,
  TextEncoder,
  Uint8Array,
  ArrayBuffer,
  Date,
  Map,
  Set,
  Promise,
  setTimeout,
  clearTimeout,
};
sandbox.window = sandbox;
sandbox.Android = {
  invoke: adapter.invoke.bind(adapter),
  async: (id, action, json) =>
    adapter.asyncOp(action, JSON.parse(json)).then(
      (value) => sandbox.nativeResult(id, { value }),
      (e) => sandbox.nativeResult(id, { error: e.message }),
    ),
};
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(root + "/android/app/build/generated/assets/core.js", "utf8"),
  sandbox,
);
const req = (n) => sandbox.require(n);
let store = new (req("LocalStore").LocalStore)();
const P = req("Platform"),
  M = req("Models"),
  E = req("ExperienceCore"),
  R = req("RecommendationCore"),
  T = req("UtilityState");
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log("PASS", name);
}
(async()=>{try{
 await store.init(P.context);const A=req('AssistantCore'),X=req('AssistantExperience'),U=req('UsabilityCore');
 await check('genuine cursor deltas accumulate Chinese and UTF-16 positions, with one job start',async()=>{
  const request=new A.AssistantRequest(),calls=[],updates=[];const live=new A.AssistantLive();
  const result=await live.run(request,async(path,method)=>{calls.push([path,method]);if(method==='POST')return JSON.stringify({id:request.requestId,state:'running',delta:'先',position:1});if(path.endsWith('after=1'))return JSON.stringify({id:request.requestId,state:'running',delta:'做🥣',position:4});return JSON.stringify({id:request.requestId,state:'done',delta:'汤',position:5,result:{source:'model',text:'先做🥣汤'}});},text=>updates.push(text));
  assert.equal(result.text,'先做🥣汤');assert.deepEqual(updates,['先','先做🥣','先做🥣汤']);assert.equal(calls.filter(c=>c[1]==='POST').length,1);assert.ok(calls.at(-1)[0].endsWith('after=4'));
 });
 await check('cancel during pending start sends DELETE immediately and suppresses late deltas',async()=>{
  let release;const request=new A.AssistantRequest(),calls=[],updates=[],live=new A.AssistantLive();
  const run=live.run(request,async(path,method)=>{calls.push([path,method]);if(method==='DELETE')return '{}';return new Promise(r=>release=r)},t=>updates.push(t));const reject=assert.rejects(run,/取消/);await live.cancel();release(JSON.stringify({state:'done',delta:'晚到',position:2,result:{source:'model',text:'晚到'}}));await reject;assert.equal(updates.length,0);assert.equal(calls.filter(c=>c[1]==='DELETE').length,1);
 });
 await check('transport interruption retains retry identity, and legacy/offline responses fabricate no deltas',async()=>{
  const request=new A.AssistantRequest(),retry=new A.AssistantRetry(),live=new A.AssistantLive();retry.bind(request);const id=request.requestId;await assert.rejects(live.run(request,async()=>{throw Error('网络中断')},()=>{}),/网络/);const again=Object.assign(new A.AssistantRequest(),{prompt:request.prompt});retry.bind(again);assert.equal(again.requestId,id);const result=await live.run(again,async()=>JSON.stringify({source:'fallback',text:'离线'}),()=>{throw Error('fake delta')});assert.equal(result.text,'离线');
 });
 const make=(id,name,minutes,cost,ingredients=[])=>Object.assign(new M.Recipe(),{id,name,minutes,estimatedCost:cost,costKnown:true,people:2,category:'家常菜',ingredients:ingredients.map(name=>({name,quantity:100,unit:'g',optional:false})),steps:['准备食材','炒熟'],tips:'核对熟度'});
 const recipes=[make('locked','番茄炒蛋',10,5,['番茄','鸡蛋']),make('old','土豆炒肉',20,20,['土豆','猪肉']),make('new','清炒菜花',10,8,['菜花']),make('hot','辣椒炒蛋',10,5,['辣椒','鸡蛋'])];
 const opts=Object.assign(new U.DrawOptions(),{dishes:2,soups:0,people:2,minutes:60,budget:100,lockedIds:['locked'],seed:'test'});
 await check('successive menu adjustments retain locks, servings and exclusions without mutating the original',async()=>{
  const snapshot=JSON.stringify(opts),current=['locked','old'];const next=X.experienceAdjustmentOptions(recipes,current,opts,'replace'),result=X.experienceAdjustMenu(recipes,current,opts,'replace');assert.ok(result.ids.includes('locked'));assert.ok(!result.ids.includes('old'));assert.equal(next.people,2);assert.equal(JSON.stringify(opts),snapshot);
  const mild=X.experienceAdjustmentOptions(recipes,result.ids,next,'mild'),second=X.experienceAdjustMenu(recipes,result.ids,next,'mild');assert.ok(second.ids.includes('locked'));assert.ok(!second.ids.includes('hot'));assert.ok(mild.disliked.includes('old'));
  const impossible=Object.assign(new U.DrawOptions(),opts,{budget:1});assert.throws(()=>X.experienceAdjustMenu(recipes,current,impossible,'replace'));assert.deepEqual(current,['locked','old']);
 });
 await check('replace changes exactly one unlocked dish; faster and outside estimates use the current meal',async()=>{
  const many=Object.assign(new U.DrawOptions(),opts,{dishes:3,minutes:120,budget:100});const original=['locked','old','new'];const result=X.experienceAdjustMenu(recipes,original,many,'replace');assert.equal(result.ids.filter(id=>original.includes(id)).length,2);assert.ok(result.ids.includes('locked'));const fast=X.experienceAdjustmentOptions(recipes,['locked','old'],opts,'faster');assert.equal(fast.minutes,24);assert.throws(()=>X.experienceAdjustmentOptions(recipes,['locked'],Object.assign(new U.DrawOptions(),opts,{lockedIds:['locked']}),'replace'),/解锁/);
  const outside=Object.assign(new U.DrawOptions(),opts,{mode:'外食',outsidePerPerson:30,outsideOverhead:45,budget:100});const cheap=X.experienceAdjustmentOptions(recipes,['locked','old'],outside,'cheaper');assert.equal(cheap.budget,51);assert.equal(cheap.outsidePerPerson,25.5);assert.ok(X.experienceAdjustMenu(recipes,['locked','old'],outside,'cheaper').ids.length);const quick=X.experienceAdjustmentOptions(recipes,['locked','old'],outside,'faster');assert.equal(quick.minutes,36);assert.equal(quick.outsideOverhead,36);
 });
 await check('replacement drafts preserve source and invalidate price; unsafe frying swap refused',async()=>{
  const tofu=make('tofu','炖老豆腐',15,8,['老豆腐']);const original=JSON.stringify(tofu),swap=X.experienceSwaps(tofu)[0],draft=X.experienceSwapDraft(tofu,swap);assert.equal(JSON.stringify(tofu),original);assert.equal(draft.ingredients[0].name,'嫩豆腐');assert.equal(draft.costKnown,false);assert.equal(draft.estimatedCost,0);assert.equal(X.experienceSwaps(Object.assign({},tofu,{name:'煎老豆腐'})).length,0);assert.ok(X.experienceSections(tofu).find(s=>s.key==='cook').lines.length>0);
  assert.equal(X.experienceQuestion('吃什么',0,0,''),'吃什么');assert.ok(X.experienceQuestion('吃什么',4,20,'清淡').includes('4人'));assert.ok(!X.experienceQuestion('吃什么',0,0,'过敏').includes('过敏'));assert.ok(X.experienceQuestion('x'.repeat(900),4,20,'清淡').length<=600);
 });
 await check('SQLite undo is transactional, refuses subsequent edits and invalid kinds',async()=>{
  const Shopping=req('Models').Shopping;await store.addShoppingBatch([Object.assign(new Shopping(),{name:'番茄',quantity:2,unit:'个'}),Object.assign(new Shopping(),{name:'鸡蛋',quantity:3,unit:'个'})]);const ids=store.state.shopping.map(s=>s.id),expected=JSON.stringify(store.state.shopping),before=store.exportData();const original=adapter.operation.bind(adapter);let writes=0;adapter.operation=function(action,a={}){if(action==='db'&&a.sql.startsWith('DELETE FROM documents')&&++writes===2)throw Error('injected undo failure');return original(action,a)};
  await assert.rejects(store.undoAddedRows('shopping_list',ids,expected),/injected/);adapter.operation=original;assert.equal(store.exportData(),before);await assert.rejects(store.undoAddedRows('foods',ids,expected),/范围/);await store.addShoppingBatch([Object.assign(new Shopping(),{name:'米',quantity:1,unit:'kg'})]);await assert.rejects(store.undoAddedRows('shopping_list',ids,expected),/变化/);const current=JSON.stringify(store.state.shopping);await store.undoAddedRows('shopping_list',ids,current);assert.equal(store.state.shopping.length,1);assert.equal(store.state.shopping[0].name,'米');
 });
 await check('queued undo rejects an account-space change even when the list snapshot matches',async()=>{let release;const scope=store.scope;store.writeQueue=new Promise(r=>release=r);const expected=JSON.stringify(store.state.shopping),ids=store.state.shopping.map(s=>s.id),undo=store.undoAddedRows('shopping_list',ids,expected);const rejected=assert.rejects(undo,/账号/);store.scope='different';release();await rejected;store.scope=scope;assert.equal(store.state.shopping.length,1);});
 const report={passed:true,checks,generated_core_sha256:crypto.createHash('sha256').update(fs.readFileSync(root+'/android/app/build/generated/assets/core.js')).digest('hex'),scope:'shared ArkTS and real SQLite host adapter; deterministic network doubles, no device acceptance'};fs.writeFileSync(root+'/work/reports/assistant-experience-unit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{adapter.close()}})().catch(e=>{console.error(e);process.exitCode=1});
