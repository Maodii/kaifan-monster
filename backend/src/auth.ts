import { ACCOUNT_PATTERN, newPasswordError } from './credential-policy';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, BadRequestException, ForbiddenException, createParamDecorator } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { randomUUID, createHash } from 'node:crypto';
import type { Request } from 'express';
import { Cache } from './cache';
import { Database } from './database';
export interface Identity { userId:string; deviceId:string; role:string; aiDailyLimit?:number|null; }
export type AuthedRequest=Request & {identity?:Identity};
export const User=createParamDecorator((_data:unknown,ctx:ExecutionContext):Identity=>ctx.switchToHttp().getRequest<AuthedRequest>().identity!);
const digest=(s:string):string=>createHash('sha256').update(s).digest('hex');
@Injectable()
export class AuthService {
 constructor(private readonly db:Database,private readonly jwt:JwtService,private readonly cache:Cache){}
 async register(email:string,password:string,deviceName:string,displayName='食库朋友',regionCode='',avatarPreset='tomato'):Promise<unknown>{
  if(!ACCOUNT_PATTERN.test(email.trim().toLowerCase())||email.trim().length>254)throw new BadRequestException('账号格式无效');
  const passwordError=newPasswordError(password);if(passwordError)throw new BadRequestException(passwordError);
  if(displayName.trim().length<2||/[\u0000-\u001f\u007f]/.test(displayName))throw new BadRequestException('昵称无效');
  if(regionCode&&!(await this.db.query('SELECT code FROM regions WHERE code=$1',[regionCode])).length)throw new BadRequestException('地区无效');
  const normalized=email.trim().toLowerCase();
  const passwordHash=await hash(password); const userId=randomUUID(), deviceId=randomUUID();
  try {await this.db.transaction(async c=>{await c.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)',[userId,normalized,passwordHash]);await c.query('INSERT INTO devices(id,user_id,name) VALUES($1,$2,$3)',[deviceId,userId,deviceName]);await c.query('INSERT INTO user_profile(user_id,display_name,region_code,avatar_preset) VALUES($1,$2,$3,$4)',[userId,displayName.trim(),regionCode||null,avatarPreset]);});}
  catch(e){if((e as {code:string}).code==='23505')throw new BadRequestException('账号已注册');throw e;}
  return this.issue({userId,deviceId,role:'user'});
 }
 async localAdminLogin(account:string,password:string,deviceName:string):Promise<unknown>{
  if(process.env.LOCAL_ADMIN_LOGIN!=='true'||account.trim().toLowerCase()!=='admin')throw new UnauthorizedException('账号或密码错误');
  return this.login(account,password,deviceName,true);
 }
 async login(email:string,password:string,deviceName:string,adminOnly=false):Promise<unknown>{
  const identity=await this.db.transaction(async c=>{
   // Serialize password verification with reset/closure, so a stale password cannot
   // create a new live device after a concurrent credential change.
   const [u]=(await c.query("SELECT * FROM users WHERE email=$1 AND deleted_at IS NULL AND ($2=false OR (role='admin' AND demo_seed_batch IS NULL)) FOR UPDATE",[email.trim().toLowerCase(),adminOnly])).rows;
   if(!u||!await verify(u.password_hash,password))throw new UnauthorizedException('账号或密码错误');
   const deviceId=randomUUID();await c.query('INSERT INTO devices(id,user_id,name) VALUES($1,$2,$3)',[deviceId,u.id,deviceName]);
   return {userId:u.id,deviceId,role:u.role};
  });
  return this.issue(identity);
 }
 async issue(identity:Identity):Promise<unknown>{
  const accessToken=await this.jwt.signAsync({...identity,type:'access'},{expiresIn:'15m'});
  const refreshToken=await this.jwt.signAsync({...identity,type:'refresh',jti:randomUUID()},{expiresIn:'30d'});
  await this.db.query('UPDATE devices SET refresh_hash=$1 WHERE id=$2 AND user_id=$3',[digest(refreshToken),identity.deviceId,identity.userId]);
  return {accessToken,refreshToken,...identity};
 }
 async refresh(token:string):Promise<unknown>{
  let p:Identity & {type:string};try{p=await this.jwt.verifyAsync(token);}catch{throw new UnauthorizedException();}
  if(p.type!=='refresh')throw new UnauthorizedException();
  // 原子消费刷新令牌，防止重放及并发轮换。
  const rows=await this.db.query('UPDATE devices SET refresh_hash=NULL WHERE id=$1 AND user_id=$2 AND refresh_hash=$3 AND revoked_at IS NULL RETURNING id',[p.deviceId,p.userId,digest(token)]);
  if(!rows.length)throw new UnauthorizedException('刷新令牌已失效');
  const [u]=await this.db.query('SELECT role FROM users WHERE id=$1 AND deleted_at IS NULL',[p.userId]);
  if(!u)throw new UnauthorizedException('账号不可用');
  return this.issue({userId:p.userId,deviceId:p.deviceId,role:u.role});
 }
 async revoke(identity:Identity,deviceId:string):Promise<unknown>{
  const r=await this.db.query('UPDATE devices SET revoked_at=now(),refresh_hash=NULL WHERE id=$1 AND user_id=$2 RETURNING id',[deviceId,identity.userId]);
  if(!r.length)throw new ForbiddenException();await this.cache.set('revoked:'+deviceId,true,30*86400);return {revoked:true};
 }
}
@Injectable()
export class AuthGuard implements CanActivate {
 constructor(private readonly db:Database,private readonly jwt:JwtService,private readonly cache:Cache){}
 async canActivate(ctx:ExecutionContext):Promise<boolean>{
  const req=ctx.switchToHttp().getRequest<AuthedRequest>();const header=req.headers.authorization;
  if(!header?.startsWith('Bearer '))throw new UnauthorizedException();
  let p:Identity & {type:string};try{p=await this.jwt.verifyAsync(header.slice(7));}catch{throw new UnauthorizedException();}
  if(p.type!=='access')throw new UnauthorizedException();
  if(await this.cache.get<boolean>('revoked:'+p.deviceId))throw new UnauthorizedException('设备已解绑');
  const [d]=await this.db.query('SELECT u.role,u.ai_daily_limit FROM devices d JOIN users u ON u.id=d.user_id WHERE d.id=$1 AND d.user_id=$2 AND d.revoked_at IS NULL AND u.deleted_at IS NULL',[p.deviceId,p.userId]);
  if(!d)throw new UnauthorizedException('设备已解绑');
  req.identity={userId:p.userId,deviceId:p.deviceId,role:d.role,aiDailyLimit:d.ai_daily_limit};return true;
 }
}
