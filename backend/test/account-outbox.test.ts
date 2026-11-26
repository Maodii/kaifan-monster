import assert from 'node:assert/strict';
import { mkdtemp,readFile,readdir,rm,stat,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { AccountLifecycle } from '../src/account-lifecycle';
import type { Database } from '../src/database';
async function main(){
 const parent=resolve('../work/reports'),dir=await mkdtemp(parent+'/account-outbox-unit-');const checks:string[]=[];let failCommit=false,storedHash='';
 const old={mode:process.env.AUTH_MAIL_MODE,path:process.env.AUTH_MAIL_OUTBOX,node:process.env.NODE_ENV};
 const user={id:'synthetic-owner',email:'synthetic@example.test',email_verified_at:null};
 const fake={query:async()=>[user],transaction:async(fn:any)=>{const result=await fn({query:async(sql:string,values:any[])=>{if(sql.startsWith('INSERT INTO auth_challenge'))storedHash=values[3];return {rows:sql.startsWith('SELECT id FROM users')?[user]:[],rowCount:1};}});if(failCommit)throw new Error('synthetic commit failure');return result;}} as unknown as Database;
 const life=new AccountLifecycle(fake);
 try{
  delete process.env.AUTH_MAIL_MODE;await assert.rejects(()=>life.request('reset-password',user.email),/邮件服务尚未配置/);
  process.env.AUTH_MAIL_MODE='local-outbox';process.env.AUTH_MAIL_OUTBOX=dir;process.env.NODE_ENV='production';await assert.rejects(()=>life.request('reset-password',user.email),/邮件服务尚未配置/);process.env.NODE_ENV='test';checks.push('No fake delivery when unconfigured; production refuses development transport');
  const result:any=await life.request('reset-password',user.email);assert(!result.token);const files=await readdir(dir);assert.equal(files.length,1);const file=resolve(dir,files[0]),mail=JSON.parse(await readFile(file,'utf8'));assert.equal((await stat(file)).mode&0o777,0o600);assert.equal((await stat(dir)).mode&0o777,0o700);assert.equal(storedHash,createHash('sha256').update(mail.token).digest('hex'));assert.equal(mail.developmentOnly,true);assert.equal(result.delivery,'local-development-outbox');await rm(file);checks.push('Actual outbox file mode0600/directory0700, SHA256 token persistence, no token in API response');
  await assert.rejects(()=>life.request('verify-email',user.email,{userId:'other',deviceId:'synthetic',role:'user'}),/只能验证/);assert.equal((await readdir(dir)).length,0);checks.push('Other account cannot request verification for owner');
  failCommit=true;await assert.rejects(()=>life.request('reset-password',user.email),/synthetic commit/);assert.equal((await readdir(dir)).length,0);checks.push('Failed database commit compensates development-mail file');
  await assert.rejects(()=>life.confirm('reset-password',user.email,'bad-token','valid-password-long'),/无效/);await assert.rejects(()=>life.confirm('reset-password',user.email,'a'.repeat(64),'short'),/新密码/);await assert.rejects(()=>life.close({userId:'owner',deviceId:'synthetic',role:'user'},'password','yes'),/注销我的账号/);checks.push('Token/password/explicit deletion confirmation rejected before database mutations');
  await writeFile('../work/reports/account-outbox-unit.json',JSON.stringify({passed:true,checks,limits:['Filesystem and validation tests use synthetic database adapter; PostgreSQL integration remains blocked']},null,2)+'\n');console.log('PASS account outbox/validation:',checks.length,'groups');
 }finally{await rm(dir,{recursive:true,force:true});for(const [key,value] of [['AUTH_MAIL_MODE',old.mode],['AUTH_MAIL_OUTBOX',old.path],['NODE_ENV',old.node]]){if(value===undefined)delete process.env[key!];else process.env[key!]=value;}}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
