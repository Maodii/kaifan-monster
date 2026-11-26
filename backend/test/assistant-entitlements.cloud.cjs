/** Run inside deployed API with a single temporary fixture; no real model calls. */
const assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto'),{Pool}=require('pg'),Redis=require('ioredis'),{JwtService}=require('@nestjs/jwt');
const {runtimeConfig,isWhitelistedAdmin}=require('/app/dist/src/runtime-config'),{AssistantBudget,budgetDay}=require('/app/dist/src/assistant-budget');
const db=new Pool({host:process.env.PGHOST,port:Number(process.env.POSTGRES_PORT||5432),user:process.env.POSTGRES_USER,password:process.env.POSTGRES_PASSWORD,database:process.env.POSTGRES_DB,connectionTimeoutMillis:3000});
const redis=new Redis({host:process.env.REDIS_HOST,port:Number(process.env.REDIS_PORT),password:process.env.REDIS_PASSWORD,maxRetriesPerRequest:1});redis.on('error',()=>{});
const jwt=new JwtService({secret:process.env.JWT_SECRET,signOptions:{issuer:'shiku',audience:'shiku-client'}});
const userId=randomUUID(),deviceId=randomUUID(),who=createHash('sha256').update(userId).digest('hex'),dayKey='ai:v2:day:'+budgetDay()+':'+who;
let fixture=false;const auditDevices=[];
function token(uid,did,role='user'){return jwt.sign({userId:uid,deviceId:did,role,type:'access'},{expiresIn:'60s'});}
async function request(path,auth,method='GET',body){const r=await fetch('http://127.0.0.1:3000/api/v1'+path,{method,headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});return {status:r.status,body:await r.json()};}
(async()=>{try{
const config=runtimeConfig();assert.equal(config.ai.dailyLimitEnabled,true);assert.equal(config.ai.perUserDay,50);assert.equal(config.ai.adminUserIds.length,3);
for(const id of config.ai.adminUserIds){
 const rows=(await db.query('SELECT u.role,d.id AS device FROM users u LEFT JOIN devices d ON d.user_id=u.id AND d.revoked_at IS NULL WHERE u.id=$1 AND u.deleted_at IS NULL LIMIT 1',[id])).rows;assert.equal(rows.length,1);assert.equal(rows[0].role,'admin');
 if(!rows[0].device){const temporary=randomUUID();await db.query('INSERT INTO devices(id,user_id,name) VALUES($1,$2,$3)',[temporary,id,'temporary whitelist verification']);auditDevices.push(temporary);rows[0].device=temporary;}
 const auth=token(id,rows[0].device);const access=await request('/ai/access',auth);assert.equal(access.status,200);assert.equal(access.body.whitelistedAdmin,true);assert.equal(access.body.ai.dailyLimit,null);
 for(const path of ['/admin/overview','/discovery/summary','/community/posts/page'])assert.equal((await request(path,auth)).status,200);
 const budget=new AssistantBudget({redis});const lease=await budget.reserve(id,'entitlement-audit-'+randomUUID(),isWhitelistedAdmin({userId:id,role:'admin'}));await lease.finish(false,false);
}
await db.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)',[userId,'runtime-audit-'+userId+'@invalid.local','disabled-audit-fixture-'+randomUUID()]);fixture=true;
await db.query('INSERT INTO devices(id,user_id,name) VALUES($1,$2,$3)',[deviceId,userId,'temporary entitlement verification']);
const auth=token(userId,deviceId,'admin'); // Forged stale role cannot override database role.
let r=await request('/ai/access',auth);assert.equal(r.body.role,'user');assert.equal(r.body.whitelistedAdmin,false);assert.equal(r.body.ai.dailyLimit,50);
assert.equal((await request('/discovery/summary',auth)).status,404);assert.equal((await request('/admin/overview',auth)).status,403);
await redis.set(dayKey,'50','EX',120);
const prompt={prompt:'鸡蛋怎么蒸',consent:true,requestId:'quota-audit-'+randomUUID()};
r=await request('/ai/assist',auth,'POST',prompt);assert.equal(r.status,201);assert.equal(r.body.reason,'daily_limit');assert.ok(r.body.text.includes('50'));assert.equal(r.body.quota.remaining,0);
const job={...prompt,requestId:'quota-job-'+randomUUID()};r=await request('/ai/assist/jobs',auth,'POST',job);assert.equal(r.status,201);assert.equal(r.body.state,'running');
for(let i=0;i<10;i++){r=await request('/ai/assist/jobs/'+job.requestId,auth);if(r.body.state==='done')break;await new Promise(resolve=>setTimeout(resolve,100));}
assert.equal(r.body.state,'done');assert.equal(r.body.result.reason,'daily_limit');assert.ok(r.body.result.text.includes('北京时间零点'));
assert.equal(await redis.get(dayKey),'50');
assert.equal((await request('/ready',auth)).status,200);
console.log(JSON.stringify({passed:true,admin_accounts:config.ai.adminUserIds.length,default_daily_limit:50,checks:['all whitelist admins verified with stale user JWT roles','admin and private feature HTTP access','normal signup defaults to user','client-forged admin role ignored','quota direct response','quota polling response','no counter overrun','readiness'],real_model_calls:0}));
}finally{if(auditDevices.length)await db.query('DELETE FROM devices WHERE id=ANY($1::uuid[])',[auditDevices]);await redis.del(dayKey);if(fixture){await db.query('DELETE FROM devices WHERE user_id=$1',[userId]);await db.query('DELETE FROM users WHERE id=$1',[userId]);}await redis.quit();await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
