import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, HttpException, Injectable, Post, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { hash, verify } from 'argon2';
import type { Request } from 'express';
import type { PoolClient } from 'pg';
import { Database } from './database';
import { AuthGuard, AuthService, Identity, User } from './auth';
import { AliyunSmsProvider, SmsPurpose } from './sms-provider';
import { AccountLifecycle } from './account-lifecycle';
import { newPasswordError } from './credential-policy';
export class SmsSendDto {
 @IsString() @Matches(/^1[3-9]\d{9}$/) phone!:string;
 @IsIn(['login','reset','bind','close']) purpose!:SmsPurpose;
}
export class SmsProofDto {
 @IsUUID() challengeId!:string;
 @IsString() @Matches(/^\d{6}$/) code!:string;
}
export class SmsLoginDto extends SmsProofDto {
 @IsString() @Length(1,80) deviceName!:string;
}
export class SmsBindDto extends SmsProofDto {
 @IsOptional() @IsString() @MaxLength(128) currentPassword?:string;
}
export class SmsResetDto extends SmsProofDto {
 @IsString() @Length(6,128) newPassword!:string;
}
export class SmsCloseDto extends SmsProofDto {
 @IsString() @IsIn(['注销我的账号']) confirmation!:string;
}
type Challenge={id:string;phone:string;purpose:SmsPurpose;user_id:string|null;device_id:string|null;status:string;attempts:number;expires_at:Date};
const mask=(phone:string|null):string=>phone?phone.slice(0,3)+'****'+phone.slice(-4):'';
@Injectable()
export class SmsAuthService {
 constructor(private readonly db:Database,private readonly auth:AuthService,private readonly provider:AliyunSmsProvider){}
 private enabled():void{if(process.env.SMS_AUTH_ENABLED!=='true')throw new ServiceUnavailableException('短信认证尚未配置，请使用账号密码登录');}
 private async phoneLock(c:PoolClient,phone:string):Promise<void>{await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,842160))',[phone]);}
 async status(identity:Identity):Promise<unknown>{const [u]=await this.db.query('SELECT phone FROM users WHERE id=$1 AND deleted_at IS NULL',[identity.userId]);return {enabled:process.env.SMS_AUTH_ENABLED==='true',phoneMasked:mask(u?.phone),phoneBound:!!u?.phone};}
 async send(d:SmsSendDto,ip:string,identity?:Identity):Promise<unknown>{
  this.enabled();if(!/^1[3-9]\d{9}$/.test(d.phone))throw new BadRequestException('请输入中国大陆11位手机号');
  if((d.purpose==='bind'||d.purpose==='close')&&!identity)throw new ForbiddenException();
  if(identity&&d.purpose!=='bind'&&d.purpose!=='close')throw new BadRequestException('验证码用途不匹配');
  const id=randomUUID(),ipHash=createHmac('sha256',process.env.JWT_SECRET||'sms-test-only').update(ip).digest('hex');
  await this.db.transaction(async c=>{
   await c.query('SELECT pg_advisory_xact_lock(842161)');await this.phoneLock(c,d.phone);
   await c.query("DELETE FROM sms_auth_challenge WHERE created_at<now()-interval '7 days'");
   if(identity){const u=(await c.query('SELECT phone,role FROM users WHERE id=$1 AND deleted_at IS NULL',[identity.userId])).rows[0];if(!u||u.role==='admin')throw new ForbiddenException('管理员请继续使用原账号安全入口');if(d.purpose==='bind'&&u.phone)throw new ConflictException('当前账号已绑定手机号；换绑请联系客服核实');if(d.purpose==='close'&&u.phone!==d.phone)throw new BadRequestException('请使用当前账号已绑定的手机号');}
   const rate=(await c.query(`SELECT count(*) FILTER(WHERE phone=$1 AND created_at>now()-interval '60 seconds')::int recent,
    count(*) FILTER(WHERE phone=$1)::int phone_day,count(*) FILTER(WHERE ip_hash=$2 AND created_at>now()-interval '1 hour')::int ip_hour,count(*)::int total
    FROM sms_auth_challenge WHERE created_at>now()-interval '24 hours'`,[d.phone,ipHash])).rows[0];
   const cap=Math.max(1,Math.min(1000,Number(process.env.SMS_AUTH_DAILY_LIMIT)||100));
   if(rate.recent||rate.phone_day>=5||rate.ip_hour>=20||rate.total>=cap)throw new HttpException('发送过于频繁或今日额度已用完，请稍后再试',429);
   await c.query("UPDATE sms_auth_challenge SET status='failed' WHERE phone=$1 AND status IN ('pending','sent')",[d.phone]);
   await c.query('INSERT INTO sms_auth_challenge(id,phone,purpose,user_id,device_id,ip_hash) VALUES($1,$2,$3,$4,$5,$6)',[id,d.phone,d.purpose,identity?.userId||null,identity?.deviceId||null,ipHash]);
  });
  try{await this.provider.send(d.phone,d.purpose,id);await this.db.query("UPDATE sms_auth_challenge SET status='sent' WHERE id=$1 AND status='pending'",[id]);}
  catch(error){await this.db.query("UPDATE sms_auth_challenge SET status='failed' WHERE id=$1",[id]);throw error;}
  return {challengeId:id,expiresIn:300,retryAfter:60,phoneMasked:mask(d.phone)};
 }
 private async consume<T>(d:SmsProofDto,purpose:SmsPurpose,identity:Identity|undefined,action:(c:PoolClient,ch:Challenge)=>Promise<T>):Promise<T>{
  this.enabled();if(!/^\d{6}$/.test(d.code))throw new BadRequestException('请输入6位验证码');
  // Return a failure marker from the transaction so attempt counters persist on wrong codes.
  const result=await this.db.transaction(async c=>{
   const preview=(await c.query('SELECT phone FROM sms_auth_challenge WHERE id=$1',[d.challengeId])).rows[0];
   if(!preview)return {invalid:true as const};await this.phoneLock(c,preview.phone);
   const ch=(await c.query('SELECT * FROM sms_auth_challenge WHERE id=$1 FOR UPDATE',[d.challengeId])).rows[0] as Challenge|undefined;
   if(!ch||ch.purpose!==purpose||ch.status!=='sent'||ch.attempts>=5||new Date(ch.expires_at).getTime()<=Date.now()||ch.user_id!==(identity?.userId||null)||ch.device_id!==(identity?.deviceId||null))return {invalid:true as const};
   await c.query('UPDATE sms_auth_challenge SET attempts=attempts+1 WHERE id=$1',[ch.id]);
   let passed=false;try{passed=await this.provider.check(ch.phone,purpose,ch.id,d.code);}catch{return {unavailable:true as const};}
   if(!passed)return {invalid:true as const};
   await c.query('SAVEPOINT sms_action');
   try{const value=await action(c,ch);await c.query("UPDATE sms_auth_challenge SET status='consumed' WHERE id=$1",[ch.id]);return {value};}
   catch(error){await c.query('ROLLBACK TO SAVEPOINT sms_action');return {actionError:error};}
  });
  if('unavailable' in result)throw new ServiceUnavailableException('短信验证暂不可用，请稍后重试');
  if('actionError' in result)throw result.actionError;
  if('invalid' in result)throw new BadRequestException('验证码不正确、已使用或已过期，请重新获取');
  return result.value;
 }
 async login(d:SmsLoginDto):Promise<unknown>{
  // A generated inaccessible password preserves existing schema without treating a phone as an old account name.
  const passwordHash=await hash(randomBytes(32).toString('hex'));
  const identity=await this.consume(d,'login',undefined,async(c,ch)=>{
   let u=(await c.query('SELECT id,role FROM users WHERE phone=$1 AND deleted_at IS NULL FOR UPDATE',[ch.phone])).rows[0];
   if(u?.role==='admin')throw new ForbiddenException('管理员请使用账号密码登录');
   if(!u){const id=randomUUID();await c.query('INSERT INTO users(id,email,password_hash,phone,phone_verified_at) VALUES($1,$2,$3,$4,now())',[id,'sms-'+id,passwordHash,ch.phone]);await c.query("INSERT INTO user_profile(user_id,display_name,avatar_preset) VALUES($1,$2,'tomato')",[id,'小怪朋友']);u={id,role:'user'};}
   const deviceId=randomUUID();await c.query('INSERT INTO devices(id,user_id,name) VALUES($1,$2,$3)',[deviceId,u.id,d.deviceName]);return {userId:u.id,deviceId,role:u.role} as Identity;
  });return this.auth.issue(identity);
 }
 async bind(d:SmsBindDto,identity:Identity):Promise<unknown>{return this.consume(d,'bind',identity,async(c,ch)=>{
  const u=(await c.query('SELECT password_hash,phone,role FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[identity.userId])).rows[0];
  if(!u||u.role==='admin')throw new ForbiddenException();if(u.phone)throw new ConflictException('当前账号已绑定手机号');
  if(!d.currentPassword||!await verify(u.password_hash,d.currentPassword))throw new ForbiddenException('请填写当前账号密码以确认绑定');
  if((await c.query('SELECT id FROM users WHERE phone=$1 AND deleted_at IS NULL',[ch.phone])).rowCount)throw new ConflictException('该手机号已绑定其他账号，不会合并或覆盖数据');
  await c.query('UPDATE users SET phone=$1,phone_verified_at=now() WHERE id=$2',[ch.phone,identity.userId]);return {bound:true,phoneMasked:mask(ch.phone)};
 });}
 async reset(d:SmsResetDto):Promise<unknown>{const error=newPasswordError(d.newPassword);if(error)throw new BadRequestException(error);const passwordHash=await hash(d.newPassword);
  return this.consume(d,'reset',undefined,async(c,ch)=>{const u=(await c.query("SELECT id FROM users WHERE phone=$1 AND deleted_at IS NULL AND role='user' FOR UPDATE",[ch.phone])).rows[0];if(!u)throw new BadRequestException('手机号未绑定可找回的账号，请先使用原账号登录绑定');await c.query('UPDATE users SET password_hash=$1 WHERE id=$2',[passwordHash,u.id]);await c.query('UPDATE devices SET revoked_at=now(),refresh_hash=NULL WHERE user_id=$1',[u.id]);await c.query('UPDATE auth_challenge SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL',[u.id]);return {changed:true,requiresLogin:true};});
 }
 async close(d:SmsCloseDto,identity:Identity):Promise<unknown>{
  // Existing lifecycle performs deletion; verification and deletion share one DB transaction via a scoped adapter.
  return this.consume(d,'close',identity,async(c,ch)=>{const u=(await c.query('SELECT phone FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[identity.userId])).rows[0];if(u?.phone!==ch.phone)throw new ForbiddenException();const scoped={transaction:async<T>(fn:(tx:PoolClient)=>Promise<T>):Promise<T>=>fn(c)} as Database;const result=await new AccountLifecycle(scoped).closeVerified(identity,d.confirmation);await c.query('DELETE FROM sms_auth_challenge WHERE phone=$1',[ch.phone]);return result;});
 }
}
@Controller('auth/sms')
export class SmsAuthController {
 constructor(private readonly sms:SmsAuthService){}
 @Post('send') @Throttle({default:{limit:5,ttl:60000}}) send(@Body() d:SmsSendDto,@Req() req:Request):Promise<unknown>{if(d.purpose!=='login'&&d.purpose!=='reset')throw new BadRequestException('请先登录再绑定或管理手机号');return this.sms.send(d,req.ip||req.socket.remoteAddress||'unknown');}
 @Post('login') @Throttle({default:{limit:10,ttl:60000}}) login(@Body() d:SmsLoginDto):Promise<unknown>{return this.sms.login(d);}
 @Post('reset') @Throttle({default:{limit:10,ttl:60000}}) reset(@Body() d:SmsResetDto):Promise<unknown>{return this.sms.reset(d);}
 @Get('status') @UseGuards(AuthGuard) status(@User() u:Identity):Promise<unknown>{return this.sms.status(u);}
 @Post('account/send') @Throttle({default:{limit:5,ttl:60000}}) @UseGuards(AuthGuard) accountSend(@Body() d:SmsSendDto,@Req() req:Request,@User() u:Identity):Promise<unknown>{return this.sms.send(d,req.ip||req.socket.remoteAddress||'unknown',u);}
 @Post('bind') @Throttle({default:{limit:5,ttl:60000}}) @UseGuards(AuthGuard) bind(@Body() d:SmsBindDto,@User() u:Identity):Promise<unknown>{return this.sms.bind(d,u);}
 @Post('close') @Throttle({default:{limit:5,ttl:60000}}) @UseGuards(AuthGuard) close(@Body() d:SmsCloseDto,@User() u:Identity):Promise<unknown>{return this.sms.close(d,u);}
}
