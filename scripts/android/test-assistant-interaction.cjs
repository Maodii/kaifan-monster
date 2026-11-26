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
 await store.init(P.context);const I=req('AssistantInteraction'),A=req('AssistantCore');
 await check('model markdown becomes readable text without fetching links or changing quantities',async()=>{const value='### 做法\n**番茄**与__鸡蛋__，*小火*，~~大火~~，`2克`\n> 注意熟透\n|食材|用量|\n|---|---|\n|盐|2克|\n[查看菜谱](https://example.invalid)\n![图片](https://example.invalid/a.png)\n```text\n2 * 3 = 6\n```';const plain=I.answerPlainText(value);assert.ok(plain.includes('番茄与鸡蛋，小火，大火，2克'));assert.ok(plain.includes('盐 · 2克'));assert.ok(plain.includes('2 * 3 = 6'));assert.ok(!/https:|\*\*|__|```|\|---/.test(plain));assert.ok(!plain.includes('###'));});
 await check('partial streamed formatting does not expose headings or unfinished bold/link markers',async()=>{for(const value of ['**小火','###','```','[菜谱](https://example.invalid']){const plain=I.answerPlainText(value);assert.ok(!/\*\*|###|```|https:/.test(plain));}assert.equal(I.answerPlainText('2*3*4'),'2*3*4');});
 await check('plain answer formatting preserves unsafe-looking input as text and bounds long replies',async()=>{const text='# 食材\n- 鸡蛋 **2个**\n1. 小火炒熟\n<script>steal()</script>';const rows=I.answerBlocks(text);assert.deepEqual(JSON.parse(JSON.stringify(rows)).map(x=>x.kind),['heading','list','step','text']);assert.equal(rows[1].text,'鸡蛋 2个');assert.equal(rows[3].text,'<script>steal()</script>');assert.ok(I.answerPreview('x'.repeat(900),false).length<=701);assert.equal(I.answerPreview('x'.repeat(900),true).length,900);});
 await check('each follow-up has an explicit purpose and never claims to change records',async()=>{const prompts=['short','detail','cheap','light'].map(I.refineQuestion);assert.equal(new Set(prompts).size,4);assert.ok(prompts.every(p=>p.length<600));assert.ok(prompts[2].includes('不改变明确忌口'));assert.ok(prompts[1].includes('未知'));});
 await check('fault classification distinguishes login, budget/rate, terminal and transient errors',async()=>{assert.equal(I.assistantFault('登录已过期').action,'login');assert.equal(I.assistantFault('提问次数已达限制').action,'wait');assert.equal(I.assistantFault('助手请求已结束').fresh,true);assert.equal(I.assistantFault('结果已过期').fresh,true);assert.equal(I.assistantFault('网络中断').fresh,false);assert.equal(I.transientAssistantFailure('网络中断'),true);assert.equal(I.transientAssistantFailure('读取位置无效'),false);});
 await check('draft bank is capped, context-separated, limited to input size and explicitly clearable',async()=>{const bank=new I.AssistantDraftBank();bank.remember(I.assistantDraftKey('ask',['one']),'A');bank.remember(I.assistantDraftKey('ask',['two']),'B');assert.equal(bank.read('ask:one'),'A');assert.equal(bank.read('ask:two'),'B');for(let n=0;n<9;n++)bank.remember('key'+n,'x'.repeat(700));assert.equal(bank.read('key0'),'');assert.equal(bank.read('key8').length,600);bank.remember('key8','');assert.equal(bank.read('key8'),'');bank.clear();assert.equal(bank.read('key7'),'');assert.ok(!store.exportData().includes('key7'));});
 await check('local reference sorting/comparison preserve sources and expose unknown facts',async()=>{const make=(id,minutes,cost)=>Object.assign(new M.Recipe(),{id,name:id,minutes,people:2,estimatedCost:cost,costKnown:cost>0,ingredients:[{name:'未知食材',quantity:0,unit:'g',optional:false}]});const rows=[make('slow',40,20),make('unknown',0,0),make('quick',10,5)];const before=JSON.stringify(rows);assert.equal(I.referenceOrder(rows,'time',2)[0].id,'quick');assert.equal(I.referenceOrder(rows,'cost',2).at(-1).id,'unknown');const compare=I.compareDishes(rows[1],rows[2],4);assert.equal(compare[1].left,'待核');assert.equal(compare[2].left,'待估算');assert.equal(compare[2].right,'约¥10');assert.equal(JSON.stringify(rows),before);});
 await check('polling backs off for empty output and resets when chunks arrive',async()=>{assert.equal(I.pollingDelay(0),300);assert.equal(I.pollingDelay(2),600);assert.equal(I.pollingDelay(5),1000);assert.ok(I.assistantWaitLabel(9,false).includes('停止'));assert.equal(I.assistantWaitLabel(9,true),'正在回答');});
 await check('two transient GET failures resume same cursor without another model start',async()=>{let starts=0,gets=0;const cursors=[],updates=[],request=new A.AssistantRequest(),live=new A.AssistantLive();const result=await live.run(request,async(path,method)=>{if(method==='POST'){starts++;return JSON.stringify({id:request.requestId,state:'running',delta:'先备',position:2});}gets++;cursors.push(path);if(gets<3)throw Error('网络中断');return JSON.stringify({id:request.requestId,state:'done',delta:'菜',position:3,result:{source:'model',text:'先备菜'}});},s=>updates.push(s));assert.equal(starts,1);assert.equal(gets,3);assert.equal(new Set(cursors).size,1);assert.ok(cursors[0].endsWith('after=2'));assert.deepEqual(updates,['先备','先备菜']);assert.equal(result.text,'先备菜');});
 await check('non-network faults are not replayed and terminal failure allows explicit new request identity',async()=>{let calls=0;const request=new A.AssistantRequest(),live=new A.AssistantLive();await assert.rejects(live.run(request,async(path,method)=>{calls++;if(method==='POST')return JSON.stringify({state:'running',delta:'',position:0});throw Error('登录已过期');},()=>{}),/登录/);assert.equal(calls,2);await assert.rejects(live.run(request,async()=>JSON.stringify({state:'error',delta:'',position:0}),()=>{}),/请求已结束/);const retry=new A.AssistantRetry();retry.bind(request);const old=request.requestId;retry.clear();const fresh=new A.AssistantRequest();retry.bind(fresh);assert.notEqual(fresh.requestId,old);});
 await check('cancel during a reconnect wait closes the job and rejects all late chunks',async()=>{let getEntered,release;const entered=new Promise(r=>getEntered=r),updates=[],calls=[],request=new A.AssistantRequest(),live=new A.AssistantLive();const run=live.run(request,async(path,method)=>{calls.push(method);if(method==='DELETE')return '{}';if(method==='POST')return JSON.stringify({state:'running',delta:'已',position:1});getEntered();return new Promise(r=>release=r);},s=>updates.push(s));const reject=assert.rejects(run,/取消/);await entered;await live.cancel();release(JSON.stringify({state:'done',delta:'晚到',position:3,result:{source:'model',text:'已晚到'}}));await reject;assert.deepEqual(updates,['已']);assert.equal(calls.filter(m=>m==='DELETE').length,1);});
 const report={passed:true,checks,generated_core_sha256:crypto.createHash('sha256').update(fs.readFileSync(root+'/android/app/build/generated/assets/core.js')).digest('hex'),scope:'canonical shared ArkTS through host compiler, real SQLite adapter and deterministic network faults; no device claim'};fs.writeFileSync(root+'/work/reports/assistant-interaction-unit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{adapter.close()}})().catch(e=>{console.error(e);process.exitCode=1});
