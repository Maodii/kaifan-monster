import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir,readFile,rm,mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JwtService } from '@nestjs/jwt';
import { Database } from '../src/database';
import { AccountLifecycle } from '../src/account-lifecycle';
import { AuthService,AuthGuard } from '../src/auth';
import type { Cache } from '../src/cache';
import type { ExecutionContext } from '@nestjs/common';
async function main(){
 const admin=new Database(),db=new Database(),schema='account_test_'+randomUUID().replaceAll('-','');db.pool.options.options='-c search_path='+schema;
 const dir=resolve('../work/reports/account-test-outbox'),checks:string[]=[];let passed=false,created=false;
 const jwt=new JwtService({secret:'only-for-isolated-account-test-not-a-user-secret'}),cache={get:async()=>null,set:async()=>{}} as unknown as Cache;
 const auth=new AuthService(db,jwt,cache),life=new AccountLifecycle(db),guard=new AuthGuard(db,jwt,cache);
 const previous={mode:process.env.AUTH_MAIL_MODE,path:process.env.AUTH_MAIL_OUTBOX,node:process.env.NODE_ENV};
 process.env.NODE_ENV='test';
 const password='synthetic-strong-password1';
 const ctx=(token:string)=>({switchToHttp:()=>({getRequest:()=>({headers:{authorization:'Bearer '+token}})})}) as unknown as ExecutionContext;
 async function mail(){const names=await readdir(dir);assert.equal(names.length,1);const path=resolve(dir,names[0]);const d=JSON.parse(await readFile(path,'utf8'));await rm(path);return d;}
 try{
  await admin.query('CREATE SCHEMA '+schema);created=true;for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await db.query(await readFile('migrations/'+f,'utf8'));await mkdir(dir,{recursive:true,mode:0o700});
  const a:any=await auth.register('account-a@example.test',password,'synthetic-a'),b:any=await auth.register('account-b@example.test',password,'synthetic-b');
  const ia={userId:a.userId,deviceId:a.deviceId,role:'user'},ib={userId:b.userId,deviceId:b.deviceId,role:'user'};
  delete process.env.AUTH_MAIL_MODE;await assert.rejects(()=>life.request('reset-password','account-a@example.test'),/邮件服务尚未配置/);assert.equal((await db.query('SELECT count(*)::int AS n FROM auth_challenge'))[0].n,0);checks.push('Unconfigured delivery explicitly unavailable; no fake success');
  process.env.AUTH_MAIL_MODE='local-outbox';process.env.AUTH_MAIL_OUTBOX=dir;
  const response:any=await life.request('verify-email','account-a@example.test',ia);assert(!response.token);const verify=await mail();
  await assert.rejects(()=>life.confirm('verify-email','account-a@example.test',verify.token,undefined,ib));await assert.rejects(()=>life.confirm('reset-password','account-a@example.test',verify.token,password));
  await life.confirm('verify-email','account-a@example.test',verify.token,undefined,ia);await assert.rejects(()=>life.confirm('verify-email','account-a@example.test',verify.token,undefined,ia));assert.equal((await life.status(ia) as any).emailVerified,true);checks.push('Verification bound to owner/purpose, one-use; no token in HTTP response');
  await life.request('reset-password','unknown@example.test');assert.equal((await readdir(dir)).length,0);
  await life.request('reset-password','account-a@example.test');const first=await mail();await assert.rejects(()=>life.request('reset-password','account-a@example.test'),/频繁/);
  await db.query("UPDATE auth_challenge SET created_at=now()-interval '2 minutes' WHERE purpose='reset-password'");await life.request('reset-password','account-a@example.test');const reset=await mail();
  await assert.rejects(()=>life.confirm('reset-password','account-a@example.test',first.token,password));await assert.rejects(()=>life.confirm('reset-password','account-b@example.test',reset.token,password));
  await life.confirm('reset-password','account-a@example.test',reset.token,'new-test-password-long1');await assert.rejects(()=>life.confirm('reset-password','account-a@example.test',reset.token,password));
  await assert.rejects(()=>guard.canActivate(ctx(a.accessToken)));await assert.rejects(()=>auth.refresh(a.refreshToken));await assert.rejects(()=>auth.login('account-a@example.test',password,'again'));const next:any=await auth.login('account-a@example.test','new-test-password-long1','again');assert(await guard.canActivate(ctx(b.accessToken)));checks.push('Unknown-email generic response, throttle, resend revocation, cross-account/replay rejection and all old sessions revoked');
  await life.request('reset-password','account-b@example.test');const expired=await mail();await db.query("UPDATE auth_challenge SET expires_at=now()-interval '1 second' WHERE user_id=$1",[b.userId]);await assert.rejects(()=>life.confirm('reset-password','account-b@example.test',expired.token,password));checks.push('Expired token rejected');
  const current={userId:a.userId,deviceId:next.deviceId,role:'user'};await assert.rejects(()=>life.close(current,'wrong','注销我的账号'));await assert.rejects(()=>life.close(current,'new-test-password-long1','yes'));assert(await guard.canActivate(ctx(next.accessToken)));
  const family=randomUUID();await db.query('INSERT INTO family_group(id,name,owner_id,invite_code) VALUES($1,$2,$3,$4)',[family,'test-family',a.userId,randomUUID()]);await db.query("INSERT INTO family_member VALUES($1,$2,'admin')",[family,a.userId]);await assert.rejects(()=>life.close(current,'new-test-password-long1','注销我的账号'),/家庭/);assert(await guard.canActivate(ctx(next.accessToken)));await db.query('DELETE FROM family_member WHERE family_id=$1',[family]);
  const meal=randomUUID(),photo=randomUUID();await db.query('INSERT INTO meal_records(id,user_id,device_id,payload) VALUES($1,$2,$3,$4)',[meal,a.userId,next.deviceId,{name:'synthetic-meal'}]);await db.query("INSERT INTO meal_photo(id,user_id,meal_id,object_key,url,status) VALUES($1,$2,$3,$4,$5,'uploaded')",[photo,a.userId,meal,a.userId+'/synthetic','http://invalid.test/synthetic']);
  const event=randomUUID();await db.query("INSERT INTO telemetry_event(id,user_id,event_name,route,status,duration_ms,outcome) VALUES($1,$2,'ai_answer','AI direct',200,100,'model')",[event,a.userId]);await db.query("INSERT INTO telemetry_feedback(event_id,user_id,vote,reason) VALUES($1,$2,'up','helpful')",[event,a.userId]);
  await life.close(current,'new-test-password-long1','注销我的账号');assert.equal((await db.query('SELECT count(*)::int AS n FROM telemetry_event WHERE user_id=$1',[a.userId]))[0].n,0);assert.equal((await db.query('SELECT count(*)::int AS n FROM telemetry_feedback WHERE user_id=$1',[a.userId]))[0].n,0);await assert.rejects(()=>guard.canActivate(ctx(next.accessToken)));await assert.rejects(()=>auth.refresh(next.refreshToken));await assert.rejects(()=>auth.login('account-a@example.test','new-test-password-long1','again'));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM meal_records WHERE user_id=$1',[a.userId]))[0].n,0);assert.equal((await db.query('SELECT count(*)::int AS n FROM user_profile WHERE user_id=$1',[a.userId]))[0].n,0);assert.equal((await db.query('SELECT count(*)::int AS n FROM object_deletion_jobs WHERE photo_id=$1',[photo]))[0].n,1);
  const [closed]=await db.query('SELECT email,deleted_at FROM users WHERE id=$1',[a.userId]);assert(closed.deleted_at);assert(!closed.email.includes('account-a'));assert(await guard.canActivate(ctx(b.accessToken)));checks.push('Exact consent/password and atomic family blocker; cloud records/profile erased, media deletion queued, account sessions/login revoked; other account intact');passed=true;
 }finally{
  if(previous.mode===undefined)delete process.env.AUTH_MAIL_MODE;else process.env.AUTH_MAIL_MODE=previous.mode;if(previous.path===undefined)delete process.env.AUTH_MAIL_OUTBOX;else process.env.AUTH_MAIL_OUTBOX=previous.path;
  if(previous.node===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous.node;
  await db.onModuleDestroy();if(created)await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');await admin.onModuleDestroy();await rm(dir,{recursive:true,force:true});await writeFile('../work/reports/account-lifecycle-integration.json',JSON.stringify({passed,checks,scope:'Isolated PostgreSQL schema, synthetic accounts, development outbox; no real user photos/records',cleanup:created?'Temporary schema and mail tokens removed':'Database unavailable; no schema or mail token created'},null,2)+'\n');
 }
 console.log('PASS account lifecycle:',checks.length,'groups');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
