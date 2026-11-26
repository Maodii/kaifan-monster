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
 req('ReleaseLegal').PrivacyAccess.allowed=true;const {Cloud,Session}=req('Cloud'); const cloud=new Cloud();cloud.endpoint='http://localhost:13000';
 const session=(owner,access,refresh)=>Object.assign(new Session(),{userId:owner,accessToken:access,refreshToken:refresh});
 const old=()=>session('owner-a','old-access','old-refresh'),renewed=()=>session('owner-a','new-access','new-refresh');
 let refreshes=0,destroys=0,release,fail=false;const seen=[];
 P.http.createHttp=()=>({destroy(){destroys++},async request(url,options){
  if(url.endsWith('/auth/refresh')){refreshes++;await new Promise(r=>release=r);return {responseCode:fail?401:200,result:JSON.stringify(renewed())};}
  seen.push(options.header.Authorization);return {responseCode:options.header.Authorization==='Bearer old-access'?401:200,result:'ok'};
 }});
 async function pending(){for(let i=0;i<100&&!release;i++)await new Promise(r=>setTimeout(r,2));assert.ok(release,'refresh request started');}
 cloud.session=old();const pair=[cloud.request('/account/profile',P.http.RequestMethod.GET),cloud.request('/families',P.http.RequestMethod.GET)];await pending();assert.equal(refreshes,1);release();release=null;assert.deepEqual(await Promise.all(pair),['ok','ok']);assert.equal(seen.filter(x=>x==='Bearer new-access').length,2);assert.equal(JSON.parse(adapter.vault).accessToken,'new-access');
 checks.push('parallel expired requests share one refresh and both retry with the new token');
 cloud.session=old();const late=cloud.request('/account/profile',P.http.RequestMethod.GET);const rejected=assert.rejects(late,/会话已变化/);await pending();cloud.session=session('owner-b','b-access','b-refresh');adapter.vault=JSON.stringify(cloud.session);release();release=null;await rejected;assert.equal(cloud.session.userId,'owner-b');assert.equal(JSON.parse(adapter.vault).userId,'owner-b');
 checks.push('late refresh after account change cannot replace current account or secure storage');
 cloud.session=old();fail=true;const failed=assert.rejects(cloud.request('/families',P.http.RequestMethod.GET),/登录已过期/);await pending();release();release=null;await failed;
 fail=false;const retry=cloud.request('/families',P.http.RequestMethod.GET);await pending();release();release=null;assert.equal(await retry,'ok');assert.equal(refreshes,4);assert.equal(destroys,12);
 checks.push('failed refresh clears the single-flight slot and every HTTP handle is destroyed');

 let manifestCalls=[];let manifestStatus=200;const version='a'.repeat(64);P.http.createHttp=()=>({destroy(){},async request(url,options){manifestCalls.push({url,tag:options.header['If-None-Match']});return {responseCode:manifestStatus,result:JSON.stringify({version,records:[]})};}});
 cloud.session=renewed();cloud.endpoint='http://localhost:13000';const body=await cloud.request('/catalog/offline/manifest',P.http.RequestMethod.GET);manifestStatus=304;assert.equal(await cloud.request('/catalog/offline/manifest',P.http.RequestMethod.GET),body);assert.equal(manifestCalls.at(-1).tag,'"'+version+'"');cloud.endpoint='http://localhost:13001';manifestStatus=200;await cloud.request('/catalog/offline/manifest',P.http.RequestMethod.GET);assert.equal(manifestCalls.at(-1).tag,'');checks.push('public manifest 304 reuses exact version body; changed endpoint never sends another server ETag');
 const report={passed:true,checks,generated_core_sha256:crypto.createHash('sha256').update(fs.readFileSync(root+'/android/app/build/generated/assets/core.js')).digest('hex'),scope:'shared Cloud ArkTS through Android compiler adapter; deterministic HTTP and vault doubles, no device acceptance'};
 fs.writeFileSync(root+'/work/reports/cloud-refresh-unit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{adapter.close()}})().catch(e=>{console.error(e);process.exitCode=1});
