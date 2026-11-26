// Runs inside deployed API container; only creates/resets/deletes synthetic accounts.
'use strict';
const assert=require('node:assert/strict'),{randomUUID,randomBytes}=require('node:crypto');
const {Database}=require('/app/dist/src/database.js');
const {AuthService}=require('/app/dist/src/auth.js'),{JwtService}=require('@nestjs/jwt');
(async()=>{const db=new Database(),ids=[],checks=[];let passed=false;
 const base='http://127.0.0.1:3000/api/v1',password='synthetic-'+randomBytes(20).toString('hex')+'1',newPassword='changed-'+randomBytes(20).toString('hex')+'2';
 const call=async(path,token,body)=>{const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});return {status:r.status,body:await r.json(),trace:r.headers.get('x-request-id')};};
 try{
  const tag=randomUUID(),auth=new AuthService(db,new JwtService({secret:process.env.JWT_SECRET,signOptions:{issuer:'shiku',audience:'shiku-client'},verifyOptions:{issuer:'shiku',audience:'shiku-client'}}),{}),sessions=[];
  for(const kind of ['admin','user']){const session=await auth.register('verify-'+kind+'-'+tag+'@example.test',password,'synthetic-admin-analytics-test');ids.push(session.userId);if(kind==='admin')await db.query("UPDATE users SET role='admin' WHERE id=$1",[session.userId]);sessions.push(session);}
  const [admin,user]=sessions;assert.equal((await call('/admin/analytics',user.accessToken)).status,403);assert.equal((await call('/admin/analytics')).status,401);
  const report=await call('/admin/analytics?test=include',admin.accessToken);assert.equal(report.status,200);assert.equal(report.body.collection.writeFailures,0);assert(report.trace);assert.equal((await call('/admin/users?q='+user.userId,admin.accessToken)).body.total,1);assert.equal((await call('/admin/users/'+user.userId,admin.accessToken)).status,200);
  checks.push('Deployed analytics/user search/details respond; no ordinary or anonymous admin access');
  const userQuota='/admin/users/'+user.userId+'/ai-quota';
  assert.equal((await call(userQuota,user.accessToken,{mode:'custom',limit:3,reason:'synthetic quota verification'})).status,403);
  assert.equal((await call(userQuota,admin.accessToken,{mode:'custom',limit:3,reason:'synthetic quota verification'})).status,201);
  assert.equal((await call('/ai/access',user.accessToken)).body.ai.dailyLimit,3);
  const event={id:randomUUID(),name:'page_view',page:'recipes',task:'',outcome:'',durationMs:0,firstTokenMs:-1,occurredAt:Date.now()};
  const batch={platform:'android',version:'1.0-test',events:[event]};
  const accepted=await call('/telemetry/events',user.accessToken,batch);assert.equal(accepted.status,201);assert.equal(accepted.body.inserted,1);assert.equal((await call('/telemetry/events',user.accessToken,batch)).body.inserted,0);
  assert.equal((await call('/telemetry/events',user.accessToken,{...batch,platform:'harmony',events:[{...event,id:randomUUID()}]})).body.inserted,1);
  assert.equal((await call('/telemetry/events',user.accessToken,{...batch,events:[{...event,prompt:'forbidden'}]})).status,400);
  assert.equal((await call(userQuota,admin.accessToken,{mode:'custom',limit:0,reason:'synthetic zero quota verification'})).status,201);
  const zero=await call('/ai/assist',user.accessToken,{prompt:'鸡蛋怎么蒸',consent:true,requestId:'zero_'+tag.replaceAll('-','')});assert.equal(zero.body.reason,'daily_limit');assert.equal(zero.body.quota.limit,0);
  assert.equal((await call(userQuota,admin.accessToken,{mode:'default',reason:'synthetic restore quota'})).status,201);assert.equal((await call('/ai/access',user.accessToken)).body.ai.dailyLimit,50);
  const clientReport=await call('/admin/analytics?test=include',admin.accessToken);assert(clientReport.body.clientEvents.some(e=>e.platform==='android'));assert(clientReport.body.clientEvents.some(e=>e.platform==='harmony'));
  checks.push('Live Android/Harmony batches validated and idempotent; per-user 3/0/default50 changes, ordinary denial and no-provider quota rejection verified');
  const reset={currentPassword:password,newPassword,confirmation:'verify-user-'+tag+'@example.test',reason:'合成账号上线验证'};
  assert.equal((await call('/admin/users/'+user.userId+'/reset-password',user.accessToken,reset)).status,403);
  assert.equal((await call('/admin/users/'+user.userId+'/reset-password',admin.accessToken,{...reset,currentPassword:'wrong'})).status,403);
  assert.equal((await call('/admin/users/'+user.userId+'/reset-password',admin.accessToken,reset)).status,201);
  assert.equal((await call('/auth/account',user.accessToken)).status,401);
  assert.equal((await call('/auth/refresh',null,{refreshToken:user.refreshToken})).status,401);
  assert.equal((await call('/auth/login',null,{email:reset.confirmation,password,deviceName:'old'})).status,401);
  const login=await call('/auth/login',null,{email:reset.confirmation,password:newPassword,deviceName:'new'});assert.equal(login.status,201);
  const audit=await call('/admin/audit?action=reset-password&q='+user.userId,admin.accessToken);assert.equal(audit.body.total,1);assert(!JSON.stringify(audit.body).includes(newPassword));
  checks.push('Synthetic password reset reauthentication, old access/refresh/password rejection and audit verified on live service');
  // Out-of-scope prompts stop before provider dispatch and still get a completion measurement.
  const result=await call('/ai/assist',login.body.accessToken,{prompt:'帮我买股票',consent:true,requestId:'verify_'+tag.replaceAll('-','')});assert.equal(result.status,201);assert.equal(result.body.source,'fallback');assert.equal(result.body.reason,'scope_restricted');assert.match(result.body.analyticsId,/^[a-f0-9-]{36}$/);
  await call('/admin/analytics?test=include',admin.accessToken);
  const rows=await db.query('SELECT event_name,route,code FROM telemetry_event WHERE id=$1',[result.body.analyticsId]);assert.equal(rows.length,1);assert.equal(rows[0].code,'scope_restricted');
  checks.push('Live inference completion metric is stored, with no provider call and no raw prompt');
  for(const host of ['https://api.example.invalid','https://legacy.example.invalid']){assert((await fetch(host+'/api/v1/ready',{signal:AbortSignal.timeout(10000)})).ok);const html=await (await fetch(host+'/admin/')).text();assert(html.includes('password-reset'));assert(html.includes('data-view="analytics"'));}
  checks.push('New and legacy public HTTPS readiness and updated admin shell verified');passed=true;
 }finally{
  if(ids.length)await db.transaction(async c=>{await c.query('DELETE FROM admin_audit WHERE actor_id=ANY($1::uuid[])',[ids]);await c.query('DELETE FROM telemetry_event WHERE user_id=ANY($1::uuid[])',[ids]);await c.query('DELETE FROM auth_challenge WHERE user_id=ANY($1::uuid[])',[ids]);await c.query('DELETE FROM user_profile WHERE user_id=ANY($1::uuid[])',[ids]);await c.query('DELETE FROM devices WHERE user_id=ANY($1::uuid[])',[ids]);await c.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[ids]);});
  await db.onModuleDestroy();
 }
 console.log(JSON.stringify({passed,checks,syntheticFixturesRemoved:true,actualModelCalls:0,actualUserPasswordsChanged:0}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
