import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir,readFile,writeFile } from 'node:fs/promises';
import { JwtService } from '@nestjs/jwt';
import { Database } from '../src/database';
import { AuthService,Identity } from '../src/auth';
import { SmsAuthService } from '../src/sms-auth';
import { AliyunSmsProvider,SmsPurpose } from '../src/sms-provider';
import type { Cache } from '../src/cache';
const checks:string[]=[];
async function main(){
 const admin=new Database(),db=new Database(),schema='sms_test_'+randomUUID().replaceAll('-','');db.pool.options.options='-c search_path='+schema;
 const previous=process.env.SMS_AUTH_ENABLED;process.env.SMS_AUTH_ENABLED='true';
 let fail=false,calls=0;const issued=new Map<string,string>();
 const provider={send:async(_p:string,_purpose:SmsPurpose,id:string)=>{calls++;if(fail)throw Error('synthetic failure');issued.set(id,'123456');},check:async(_p:string,_purpose:SmsPurpose,id:string,code:string)=>issued.get(id)===code} as AliyunSmsProvider;
 const auth=new AuthService(db,new JwtService({secret:'isolated-sms-test-secret-at-least-32-chars'}),{get:async()=>null,set:async()=>{}} as unknown as Cache);
 const sms=new SmsAuthService(db,auth,provider);let created=false,passed=false;
 const send=async(phone:string,purpose:SmsPurpose='login',identity?:Identity)=>await sms.send({phone,purpose},'test-ip-'+phone,identity) as {challengeId:string};
 const proof=(ch:{challengeId:string})=>({...ch,code:'123456'});
 const age=async(phone:string)=>db.query("UPDATE sms_auth_challenge SET created_at=now()-interval '61 seconds' WHERE phone=$1",[phone]);
 try{
  await admin.query('CREATE SCHEMA '+schema);created=true;for(const f of(await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort())await db.query(await readFile('migrations/'+f,'utf8'));
  const ch=await send('19900000001');const a=await sms.login({...proof(ch),deviceName:'harmony'}) as Identity;assert(a.userId);await assert.rejects(()=>sms.login({...proof(ch),deviceName:'replay'}));checks.push('Auto registration + existing JWT; successful code cannot be reused');
  await age('19900000001');const ch2=await send('19900000001');const b=await sms.login({...proof(ch2),deviceName:'android'}) as Identity;assert.equal(b.userId,a.userId);assert.notEqual(b.deviceId,a.deviceId);checks.push('Dual clients share account, independent devices');
  const numeric=await auth.register('19900000002','synthetic-password1','old') as Identity;const n=await send('19900000002');const distinct=await sms.login({...proof(n),deviceName:'new'}) as Identity;assert.notEqual(numeric.userId,distinct.userId);checks.push('Phone-shaped old username never auto-merged');
  const old=await auth.register('legacy-sms-test','synthetic-password1','old') as Identity;const bind=await send('19900000003','bind',old);
  await assert.rejects(()=>sms.bind({...proof(bind),currentPassword:'synthetic-password1'},a));await assert.rejects(()=>sms.bind({...proof(bind),currentPassword:'wrong'},old));assert.equal((await db.query('SELECT attempts FROM sms_auth_challenge WHERE id=$1',[bind.challengeId]))[0].attempts,1);
  await sms.bind({...proof(bind),currentPassword:'synthetic-password1'},old);assert.equal((await db.query('SELECT phone FROM users WHERE id=$1',[old.userId]))[0].phone,'19900000003');checks.push('Bind requires password + correct user/device; failed action increments counter');
  await age('19900000003');const reset=await send('19900000003','reset');await assert.rejects(()=>sms.login({...proof(reset),deviceName:'cross-purpose'}));await sms.reset({...proof(reset),newPassword:'reset-password2'});await assert.rejects(()=>auth.login('legacy-sms-test','synthetic-password1','old'));const fresh=await auth.login('legacy-sms-test','reset-password2','new') as Identity;assert.equal(fresh.userId,old.userId);assert((await db.query('SELECT revoked_at FROM devices WHERE id=$1',[old.deviceId]))[0].revoked_at);checks.push('Purpose isolation; reset revokes old devices, preserves user ID');
  const wrong=await send('19900000004');for(let i=0;i<5;i++)await assert.rejects(()=>sms.login({...proof(wrong),code:'999999',deviceName:'bad'}));await assert.rejects(()=>sms.login({...proof(wrong),deviceName:'exhausted'}));assert.equal((await db.query('SELECT attempts FROM sms_auth_challenge WHERE id=$1',[wrong.challengeId]))[0].attempts,5);checks.push('Wrong-code counters persist, attempts capped at 5');
  const expired=await send('19900000005');await db.query("UPDATE sms_auth_challenge SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.challengeId]);await assert.rejects(()=>sms.login({...proof(expired),deviceName:'expired'}));checks.push('Expiry enforced');
  const concurrent=await Promise.allSettled([send('19900000006'),send('19900000006')]);assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1);checks.push('Concurrent sends obey atomic cooldown');
  fail=true;await assert.rejects(()=>send('19900000007'));fail=false;assert.equal((await db.query('SELECT status FROM sms_auth_challenge WHERE phone=$1',['19900000007']))[0].status,'failed');await assert.rejects(()=>send('19900000007'));checks.push('Provider failure persists and remains rate limited');
  await age('19900000003');const close=await send('19900000003','close',fresh);await sms.close({...proof(close),confirmation:'注销我的账号'},fresh);assert.equal((await db.query('SELECT phone FROM users WHERE id=$1',[old.userId]))[0].phone,null);assert.equal((await db.query('SELECT count(*)::int n FROM sms_auth_challenge WHERE phone=$1',['19900000003']))[0].n,0);checks.push('SMS close uses data deletion lifecycle; phone and challenge PII removed');
  const capped='19900000020';for(let i=0;i<5;i++){await send(capped);await age(capped);}let countBefore=calls;await assert.rejects(()=>send(capped));assert.equal(calls,countBefore);checks.push('Phone rolling daily cap prevents sixth provider call');
  for(let i=0;i<20;i++)await sms.send({phone:'19900000'+String(100+i),purpose:'login'},'synthetic-shared-ip');countBefore=calls;await assert.rejects(()=>sms.send({phone:'19900000200',purpose:'login'},'synthetic-shared-ip'));assert.equal(calls,countBefore);checks.push('Shared IP hourly cap prevents provider call across different phones');
  const priorCap=process.env.SMS_AUTH_DAILY_LIMIT;try{process.env.SMS_AUTH_DAILY_LIMIT='1';countBefore=calls;await assert.rejects(()=>send('19900000300'));assert.equal(calls,countBefore);}finally{if(priorCap===undefined)delete process.env.SMS_AUTH_DAILY_LIMIT;else process.env.SMS_AUTH_DAILY_LIMIT=priorCap;}checks.push('Global rolling budget blocks provider before send');
  process.env.SMS_AUTH_ENABLED='false';const count=calls;await assert.rejects(()=>send('19900000008'));assert.equal(calls,count);checks.push('Disabled mode never calls provider');passed=true;
 }finally{if(previous===undefined)delete process.env.SMS_AUTH_ENABLED;else process.env.SMS_AUTH_ENABLED=previous;await db.onModuleDestroy();if(created)await admin.query('DROP SCHEMA '+schema+' CASCADE');await admin.onModuleDestroy();await writeFile('../work/reports/sms-auth-integration.json',JSON.stringify({passed,checks,scope:'Isolated PostgreSQL schema, synthetic provider; no real SMS or user mutation',cleanup:'Temporary schema removed'},null,2)+'\n');}
 console.log('PASS SMS auth:',checks.length,'groups');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
