import { newPasswordError } from './credential-policy';
import { BadRequestException, ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { hash, verify } from 'argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Database } from './database';
import type { Identity } from './auth';

const digest = (value:string):string => createHash('sha256').update(value).digest('hex');
const purposeValues = ['verify-email','reset-password'] as const;
export type ChallengePurpose = typeof purposeValues[number];
/** Deliberately opt-in development outbox; never returns mail/token content via HTTP. */
export class AccountLifecycle {
 constructor(private readonly db:Database){}
 private mailMode():string {
  if (process.env.NODE_ENV === 'production' || process.env.AUTH_MAIL_MODE !== 'local-outbox' || !process.env.AUTH_MAIL_OUTBOX) {
   throw new ServiceUnavailableException('邮件服务尚未配置，暂不能发送验证码或找回密码邮件');
  }
  return resolve(process.env.AUTH_MAIL_OUTBOX);
 }
 async request(purpose:ChallengePurpose,email:string,identity?:Identity):Promise<unknown>{
  const directory=this.mailMode();
  const [user]=await this.db.query('SELECT id,email,email_verified_at FROM users WHERE email=$1 AND deleted_at IS NULL',[email.trim().toLowerCase()]);
  // Generic response prevents discovering whether an email address has an account.
  const response={accepted:true,delivery:'local-development-outbox',message:'本地开发邮件已受理；不会发送到真实邮箱'};
  if(!user)return response;
  if(purpose==='verify-email'&&(!identity||user.id!==identity.userId))throw new ForbiddenException('只能验证当前账号邮箱');
  if(purpose==='verify-email'&&user.email_verified_at)return {...response,alreadyVerified:true};
  const token=randomBytes(32).toString('hex'),id=randomUUID();
  const file=resolve(directory,id+'.json');
  let written=false;
  try {
   await this.db.transaction(async c=>{
    const row=(await c.query('SELECT id FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[user.id])).rows[0];
    if(!row)throw new BadRequestException('账号不可用');
    const [last]=(await c.query('SELECT created_at FROM auth_challenge WHERE user_id=$1 AND purpose=$2 ORDER BY created_at DESC LIMIT 1',[user.id,purpose])).rows;
    if(last&&Date.now()-new Date(last.created_at).getTime()<60000)throw new ConflictException('请求过于频繁，请一分钟后重试');
    await c.query('UPDATE auth_challenge SET consumed_at=now() WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL',[user.id,purpose]);
    await c.query("INSERT INTO auth_challenge(id,user_id,purpose,token_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '15 minutes')",[id,user.id,purpose,digest(token)]);
    await mkdir(directory,{recursive:true,mode:0o700});
    const directoryInfo=await stat(directory);if((directoryInfo.mode&0o077)!==0)throw new ServiceUnavailableException('开发邮件目录必须仅当前用户可读写（0700）');
    await writeFile(file,JSON.stringify({to:user.email,purpose,token,expiresInSeconds:900,developmentOnly:true},null,2)+'\n',{mode:0o600,flag:'wx'});written=true;
   });
  }catch(error){if(written)await unlink(file).catch(()=>{});throw error;}
  return response;
 }
 async confirm(purpose:ChallengePurpose,email:string,token:string,password?:string,identity?:Identity):Promise<unknown>{
  if(!/^[a-f0-9]{64}$/.test(token))throw new BadRequestException('验证码无效或已过期');
  if(purpose==='reset-password'&&(typeof password!=='string'||!!newPasswordError(password)))throw new BadRequestException('新密码需6–128位，且同时包含字母和数字');
  const passwordHash=purpose==='reset-password'?await hash(password!):undefined;
  return this.db.transaction(async c=>{
   const [user]=(await c.query('SELECT id FROM users WHERE email=$1 AND deleted_at IS NULL FOR UPDATE',[email.trim().toLowerCase()])).rows;
   if(!user||(purpose==='verify-email'&&identity?.userId!==user.id))throw new BadRequestException('验证码无效或已过期');
   const challenge=await c.query('UPDATE auth_challenge SET consumed_at=now() WHERE user_id=$1 AND purpose=$2 AND token_hash=$3 AND consumed_at IS NULL AND expires_at>now() RETURNING id',[user.id,purpose,digest(token)]);
   if(!challenge.rowCount)throw new BadRequestException('验证码无效或已过期');
   if(purpose==='verify-email')await c.query('UPDATE users SET email_verified_at=now() WHERE id=$1',[user.id]);
   else {
    await c.query('UPDATE users SET password_hash=$1 WHERE id=$2',[passwordHash,user.id]);
    await c.query('UPDATE devices SET revoked_at=now(),refresh_hash=NULL WHERE user_id=$1',[user.id]);
    await c.query('UPDATE auth_challenge SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL',[user.id]);
   }
   return purpose==='verify-email'?{verified:true}:{changed:true,requiresLogin:true};
  });
 }
 async status(identity:Identity):Promise<unknown>{
  const [user]=await this.db.query('SELECT email,email_verified_at FROM users WHERE id=$1 AND deleted_at IS NULL',[identity.userId]);
  if(!user)throw new ForbiddenException();
  return {email:user.email,emailVerified:!!user.email_verified_at,mailDelivery:process.env.NODE_ENV!=='production'&&process.env.AUTH_MAIL_MODE==='local-outbox'&&!!process.env.AUTH_MAIL_OUTBOX?'local-development-outbox':'unavailable'};
 }
 async closeVerified(identity:Identity,confirmation:string):Promise<unknown>{return this.close(identity,'',confirmation,true);}
 async close(identity:Identity,password:string,confirmation:string,verifiedPhone=false):Promise<unknown>{
  if(confirmation!=='注销我的账号')throw new BadRequestException('请输入“注销我的账号”确认');
  const replacement=await hash(randomBytes(48).toString('hex'));
  return this.db.transaction(async c=>{
   await c.query('SELECT pg_advisory_xact_lock(735456)');
   const [user]=(await c.query('SELECT password_hash,phone FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[identity.userId])).rows;
   if(!user||(!verifiedPhone&&!await verify(user.password_hash,password)))throw new ForbiddenException('当前密码错误');
   // Never silently delete other household members’ data or leave dangling shared ownership.
   const family=(await c.query('SELECT 1 FROM family_member WHERE user_id=$1 LIMIT 1',[identity.userId])).rowCount;
   let shared=false;
   for(const table of ['food_items','barcode_lib','shopping_list','recipes','recipe_favorites','meal_records']){
    if((await c.query(`SELECT 1 FROM ${table} WHERE user_id=$1 AND family_id IS NOT NULL LIMIT 1`,[identity.userId])).rowCount){shared=true;break;}
   }
   if(family||shared)throw new ConflictException('账号存在家庭成员关系或共享记录，请先处理家庭数据；未删除任何内容');
   for(const table of ['meal_photo','user_avatar','album_backup_photo']){
    await c.query(`INSERT INTO object_deletion_jobs(id,photo_id,object_key,available_at) SELECT id,id,object_key,now()+interval '6 minutes' FROM ${table} WHERE user_id=$1 ON CONFLICT DO NOTHING`,[identity.userId]);
   }
   await c.query('UPDATE user_profile SET avatar_id=NULL WHERE user_id=$1',[identity.userId]);
   await c.query('DELETE FROM user_avatar WHERE user_id=$1',[identity.userId]);
   await c.query('DELETE FROM album_backup_photo WHERE user_id=$1',[identity.userId]);
   await c.query('DELETE FROM album_backup_consent WHERE user_id=$1',[identity.userId]);
   await c.query('DELETE FROM meal_photo WHERE user_id=$1',[identity.userId]);
   // Community replies may be referenced by other users: erase body, retain anonymous linkage.
   await c.query("UPDATE social_comment SET body='[账号已注销]' WHERE user_id=$1",[identity.userId]);
   await c.query("UPDATE social_post SET visibility='private',status='rejected',payload='{}'::jsonb WHERE user_id=$1",[identity.userId]);
   await c.query("UPDATE reports SET reason='[账号已注销]' WHERE user_id=$1",[identity.userId]);
   await c.query('DELETE FROM social_follow WHERE follower_id=$1 OR following_id=$1',[identity.userId]);
   await c.query('DELETE FROM social_notification WHERE user_id=$1 OR actor_id=$1',[identity.userId]);
   await c.query('DELETE FROM sms_auth_challenge WHERE user_id=$1 OR phone=$2',[identity.userId,user.phone]);
   for(const table of ['social_favorite','social_like','catalog_submission','user_backup','recommendation_events','user_taste_profile','auth_challenge','telemetry_feedback','telemetry_event','discovery_favorite','discovery_search'])await c.query(`DELETE FROM ${table} WHERE user_id=$1`,[identity.userId]);
   // A normalized meal item may reference a recipe, so delete meal items before private recipes.
   await c.query('DELETE FROM meal_record_item WHERE meal_id IN (SELECT id FROM meal_records WHERE user_id=$1)',[identity.userId]);
   for(const table of ['meal_records','recipe_favorites','food_items','barcode_lib','shopping_list','recipes'])await c.query(`DELETE FROM ${table} WHERE user_id=$1`,[identity.userId]);
   await c.query('DELETE FROM food_change_logs WHERE user_id=$1',[identity.userId]);
   await c.query('DELETE FROM user_profile WHERE user_id=$1',[identity.userId]);
   await c.query('UPDATE devices SET revoked_at=now(),refresh_hash=NULL,name=$2 WHERE user_id=$1',[identity.userId,'已注销设备']);
   await c.query("UPDATE users SET email=$2,password_hash=$3,deleted_at=now(),email_verified_at=NULL,phone=NULL,phone_verified_at=NULL WHERE id=$1",[identity.userId,'deleted-'+identity.userId+'@invalid.local',replacement]);
   return {deleted:true,requiresLogin:true,objectsCleanupQueued:true,objectAccessMayRemainSeconds:300,localDataDeleted:false};
  });
 }
}
