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
 await store.init(P.context);const W=req('AssistantWorkflow'),A=req('AssistantCore');const recipes=[...M.offlineRecipes(),...store.builtinRecipes];
 const dishes=recipes.slice(0,4).map(r=>Object.assign(new A.AssistantDish(),{id:r.id,name:r.name,people:r.people,minutes:r.minutes,ingredients:r.ingredients.map(i=>i.name),steps:r.steps}));const contextual=A.assistantDishPrompt('问题'.repeat(800),dishes,4);assert.ok(contextual.length<=600);assert.ok(contextual.includes(dishes[0].name));assert.ok(contextual.includes('本餐4人'));assert.ok(!contextual.includes(dishes[3].name));assert.equal(A.assistantDishPrompt('普通问题',[],2),'普通问题');assert.ok(A.assistantDishPrompt('怎么做',[dishes[0]],2).includes('做法摘录'));checks.push('shared recipe context bounds three dishes and 600 characters; serving count and single-dish method retained');
 const result=Object.assign(new A.AssistantResult(),{task:'week',proposalSource:'catalog_rules',plans:recipes.slice(0,3).map((r,i)=>Object.assign(new A.AssistantPlan(),{recipeId:r.id,name:r.name,date:'2026-11-'+(20+i),people:2}))});
 const keys=result.plans.map(W.assistantPlanKey);const existing=[Object.assign(new(req('MealPlan').MealPlan)(),{date:'2026-11-20',occasion:'晚餐',recipeId:recipes[8].id})];
 assert.equal(W.assistantDraftPlans(result,recipes,existing,keys).length,2);assert.equal(W.assistantDraftPlans(result,recipes,[],[keys[1]]).length,1);
 checks.push('selected dates only; all occupied dinner slots preserved');
 const evil=JSON.parse(JSON.stringify(result));evil.plans[0].recipeId='invented';assert.throws(()=>W.assistantDraftPlans(evil,recipes,[],keys.map((k,i)=>i===0?k.replace(result.plans[0].recipeId,'invented'):k)),/目录/);
 const bad=JSON.parse(JSON.stringify(result));bad.plans[0].date='2026-02-30';assert.throws(()=>W.assistantDraftPlans(bad,recipes,[],bad.plans.map(W.assistantPlanKey)),/无效/);
 checks.push('unknown recipe IDs and invalid dates refused locally');
 const plans=W.assistantDraftPlans(result,recipes,[],keys),base=W.assistantPlanSnapshot(store.state.plans),before=store.exportData();
 const original=adapter.operation.bind(adapter);let writes=0;adapter.operation=function(action,a={}){if(action==='db'&&a.sql.includes('INSERT OR REPLACE INTO documents')&&a.params?.[0]==='meal_plans'&&++writes===2)throw Error('injected second plan failure');return original(action,a)};
 await assert.rejects(()=>store.saveAssistantPlans(plans,base));assert.equal(store.exportData(),before);assert.equal(adapter.db('shiku.db').prepare("select count(*) n from documents where kind='meal_plans'").get().n,0);adapter.operation=original;
 checks.push('partial plan batch rolls back every row with real SQLite');
 const outcomes=await Promise.allSettled([store.saveAssistantPlans(plans,base),store.saveAssistantPlans(plans,base)]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(store.state.plans.length,3);assert.equal(store.state.meals.length,0);assert.equal(store.state.foods.length,0);
 checks.push('concurrent double-save commits once; meals and inventory untouched');
 await assert.rejects(()=>store.saveAssistantPlans(plans,base),/变化/);checks.push('stale plan preview cannot overwrite later edits');
 const meal=Object.assign(new A.AssistantMeal(),{name:'牛肉面',mealType:'午餐',diningMode:'餐馆',estimatedCost:-1,calories:-1,rating:0});const draft=W.assistantMealForEditor(meal);assert.equal(draft.id,'');assert.equal(draft.calories,-1);assert.equal(draft.items.length,1);assert.ok(draft.notes.includes('未提供花费'));assert.equal(store.state.meals.length,0);
 checks.push('parsed meal remains an unsaved editor draft; unknown values labelled');
 const report={passed:true,checks,generated_core_sha256:crypto.createHash('sha256').update(fs.readFileSync(root+'/android/app/build/generated/assets/core.js')).digest('hex'),scope:'canonical shared ArkTS functions with real SQLite host adapter; not device evidence'};fs.writeFileSync(root+'/work/reports/assistant-client-core.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{adapter.close()}})().catch(e=>{console.error(e);process.exitCode=1});
