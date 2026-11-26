import { PASSWORD_PATTERN } from './credential-policy';
import { Cache } from './cache';
import { Body, Controller, Delete, Patch, Put, Get, Param, ParseUUIDPipe, Post, Query, UseGuards, BadRequestException, ForbiddenException, NotFoundException, HttpException } from '@nestjs/common';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { verify, hash } from 'argon2';
import { randomBytes, randomUUID } from 'node:crypto';
import { AuthGuard, AuthService, Identity, User } from './auth';
import { CredentialsDto, RegisterDto, RefreshDto, PushDto, FamilyDto, InviteDto, entityTypes } from './dto';
import { Database } from './database';
import { AccountLifecycle } from './account-lifecycle';
import { EmailRequestDto, EmailTokenDto, ResetPasswordDto, CloseAccountDto } from './dto';
import { SyncService } from './sync';
import { LocalAdminCredentialsDto } from './dto';
export class PasswordDto { @IsString() @MaxLength(128) currentPassword!:string; @IsString() @MinLength(6) @MaxLength(128) @Matches(PASSWORD_PATTERN) newPassword!:string; }
export class DeviceNameDto { @IsString() @MinLength(1) @MaxLength(80) name!:string; }
@Controller('auth')
export class AuthController {
 constructor(private readonly auth:AuthService,private readonly db:Database){}
 @Post('register') @Throttle({default:{limit:5,ttl:60000}}) register(@Body() d:RegisterDto):Promise<unknown>{return this.auth.register(d.email,d.password,d.deviceName,d.displayName,d.regionCode,d.avatarPreset);}
 @Post('login') @Throttle({default:{limit:10,ttl:60000}}) login(@Body() d:CredentialsDto):Promise<unknown>{return this.auth.login(d.email,d.password,d.deviceName);}
 @Post('admin-login') @Throttle({default:{limit:10,ttl:60000}}) adminLogin(@Body() d:LocalAdminCredentialsDto):Promise<unknown>{return this.auth.localAdminLogin(d.email,d.password,d.deviceName);}
 @Post('refresh') refresh(@Body() d:RefreshDto):Promise<unknown>{return this.auth.refresh(d.refreshToken);}
 @Post('password') @UseGuards(AuthGuard) async password(@User() u:Identity,@Body() d:PasswordDto):Promise<unknown>{const [user]=await this.db.query('SELECT password_hash FROM users WHERE id=$1',[u.userId]);if(!await verify(user.password_hash,d.currentPassword))throw new ForbiddenException('当前密码错误');const passwordHash=await hash(d.newPassword);await this.db.transaction(async c=>{await c.query('UPDATE users SET password_hash=$1 WHERE id=$2',[passwordHash,u.userId]);await c.query('UPDATE devices SET revoked_at=now(),refresh_hash=NULL WHERE user_id=$1',[u.userId]);});return {changed:true,requiresLogin:true};}
 @Get('account') @UseGuards(AuthGuard) account(@User() u:Identity):Promise<unknown>{return new AccountLifecycle(this.db).status(u);}
 @Post('email/request') @Throttle({default:{limit:5,ttl:60000}}) @UseGuards(AuthGuard) requestEmail(@User() u:Identity,@Body() d:EmailRequestDto):Promise<unknown>{return new AccountLifecycle(this.db).request('verify-email',d.email,u);}
 @Post('email/confirm') @UseGuards(AuthGuard) confirmEmail(@User() u:Identity,@Body() d:EmailTokenDto):Promise<unknown>{return new AccountLifecycle(this.db).confirm('verify-email',d.email,d.token,undefined,u);}
 @Post('password/request-reset') @Throttle({default:{limit:5,ttl:60000}}) requestReset(@Body() d:EmailRequestDto):Promise<unknown>{return new AccountLifecycle(this.db).request('reset-password',d.email);}
 @Post('password/reset') @Throttle({default:{limit:10,ttl:60000}}) resetPassword(@Body() d:ResetPasswordDto):Promise<unknown>{return new AccountLifecycle(this.db).confirm('reset-password',d.email,d.token,d.newPassword);}
 @Delete('account') @Throttle({default:{limit:5,ttl:60000}}) @UseGuards(AuthGuard) closeAccount(@User() u:Identity,@Body() d:CloseAccountDto):Promise<unknown>{return new AccountLifecycle(this.db).close(u,d.password,d.confirmation);}
 @Post('logout') @UseGuards(AuthGuard) logout(@User() u:Identity):Promise<unknown>{return this.auth.revoke(u,u.deviceId);}
}
@Controller('devices') @UseGuards(AuthGuard)
export class DevicesController {
 constructor(private readonly db:Database,private readonly auth:AuthService){}
 @Get() list(@User() u:Identity):Promise<unknown>{return this.db.query('SELECT id,name,created_at,revoked_at FROM devices WHERE user_id=$1 ORDER BY created_at DESC',[u.userId]);}
 @Put(':id') renamePut(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:DeviceNameDto):Promise<unknown>{return this.rename(u,id,d);}
 @Patch(':id') async rename(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:DeviceNameDto):Promise<unknown>{const [r]=await this.db.query('UPDATE devices SET name=$1 WHERE user_id=$2 AND id=$3 AND revoked_at IS NULL RETURNING id,name',[d.name,u.userId,id]);if(!r)throw new ForbiddenException();return r;}
 @Delete(':id') revoke(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.auth.revoke(u,id);}
}
@Controller('sync') @UseGuards(AuthGuard)
export class SyncController {
 constructor(private readonly sync:SyncService){}
 @Post('push') push(@User() u:Identity,@Body() d:PushDto):Promise<unknown>{return this.sync.push(u,d.changes);}
 @Get('pull') pull(@User() u:Identity,@Query('since') since='0'):Promise<unknown>{return this.sync.pull(u,Number(since));}
}
@Controller('records') @UseGuards(AuthGuard)
export class RecordsController {
 constructor(private readonly db:Database){}
 @Get(':type') list(@User() u:Identity,@Param('type') type:string,@Query('familyId') familyId?:string):Promise<unknown>{
  if(!entityTypes.includes(type as typeof entityTypes[number]))throw new BadRequestException('未知记录类型');
  if(familyId&&!/^[0-9a-f-]{36}$/i.test(familyId))throw new BadRequestException();
  return this.db.query(`SELECT id,payload,version,modified_at,device_id,family_id FROM ${type} WHERE NOT deleted AND ((family_id IS NULL AND user_id=$1 AND $2::uuid IS NULL) OR (family_id=$2::uuid AND EXISTS(SELECT 1 FROM family_member m WHERE m.family_id=$2::uuid AND m.user_id=$1))) ORDER BY modified_at DESC LIMIT 500`,[u.userId,familyId||null]);
 }
}
@Controller('families') @UseGuards(AuthGuard)
export class FamiliesController {
 constructor(private readonly db:Database){}
 @Get() list(@User() u:Identity):Promise<unknown>{return this.db.query('SELECT f.id,f.name,m.role FROM family_group f JOIN family_member m ON m.family_id=f.id WHERE m.user_id=$1',[u.userId]);}
 @Post() async create(@User() u:Identity,@Body() d:FamilyDto):Promise<unknown>{
  const id=randomUUID(),invite=randomBytes(16).toString('hex');
  await this.db.transaction(async c=>{await c.query('INSERT INTO family_group(id,name,owner_id,invite_code) VALUES($1,$2,$3,$4)',[id,d.name,u.userId,invite]);await c.query("INSERT INTO family_member VALUES($1,$2,'admin')",[id,u.userId]);});return {id,name:d.name,inviteCode:invite};
 }
 @Get(':id/invite') async invite(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{const [f]=await this.db.query("SELECT f.invite_code FROM family_group f JOIN family_member m ON m.family_id=f.id WHERE f.id=$1 AND m.user_id=$2 AND m.role='admin'",[id,u.userId]);if(!f)throw new ForbiddenException();return {inviteCode:f.invite_code};}
 @Post(':id/invite') async rotateInvite(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(735456)');const r=await c.query("UPDATE family_group f SET invite_code=$1 WHERE f.id=$2 AND EXISTS(SELECT 1 FROM family_member m WHERE m.family_id=f.id AND m.user_id=$3 AND m.role='admin') RETURNING invite_code",[randomBytes(16).toString('hex'),id,u.userId]);if(!r.rowCount)throw new ForbiddenException();return {inviteCode:r.rows[0].invite_code};});}
 @Post('join') async join(@User() u:Identity,@Body() d:InviteDto):Promise<unknown>{
  return this.db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(735456)');const f=(await c.query('SELECT * FROM family_group WHERE invite_code=$1 FOR UPDATE',[d.inviteCode])).rows[0];if(!f)throw new NotFoundException('邀请码无效');const joined=await c.query("INSERT INTO family_member VALUES($1,$2,'member') ON CONFLICT DO NOTHING RETURNING user_id",[f.id,u.userId]);if(joined.rowCount){await c.query('SELECT pg_advisory_xact_lock(735456)');for(const table of entityTypes){const records=(await c.query(`SELECT * FROM ${table} WHERE family_id=$1`,[f.id])).rows;for(const record of records){const version=(await c.query('UPDATE users SET global_version=global_version+1 WHERE id=$1 RETURNING global_version',[u.userId])).rows[0].global_version;await c.query('INSERT INTO food_change_logs(user_id,entity_type,entity_id,operation,version,base_version,device_id,modified_at,payload,change_id) VALUES($1,$2,$3,$4,$5,0,$6,$7,$8,$9)',[u.userId,table,record.id,record.deleted?'delete':'upsert',version,u.deviceId,record.modified_at,{...record.payload,_recordVersion:Number(record.version),_familyId:f.id},randomUUID()]);}}}return {id:f.id,name:f.name};});
 }
 @Delete(':id') async dissolve(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{await this.db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(735456)');const [f]=(await c.query('SELECT * FROM family_group WHERE id=$1 FOR UPDATE',[id])).rows;if(!f||f.owner_id!==u.userId)throw new ForbiddenException();await c.query('DELETE FROM family_member WHERE family_id=$1',[id]);await c.query('UPDATE family_group SET invite_code=$1 WHERE id=$2',[randomBytes(32).toString('hex'),id]);});return {dissolved:true};}
 @Get(':id/members') async members(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{
  const [m]=await this.db.query('SELECT role FROM family_member WHERE family_id=$1 AND user_id=$2',[id,u.userId]);if(!m)throw new ForbiddenException();return this.db.query('SELECT m.user_id,m.role,u.email FROM family_member m JOIN users u ON u.id=m.user_id WHERE family_id=$1',[id]);
 }
 @Delete(':id/members/:member') async remove(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Param('member',ParseUUIDPipe) member:string):Promise<unknown>{
  if(member===u.userId)throw new BadRequestException('管理员不能移除自己');
  const r=await this.db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(735456)');return (await c.query("DELETE FROM family_member m WHERE m.family_id=$1 AND m.user_id=$2 AND m.role<>'admin' AND EXISTS(SELECT 1 FROM family_member a WHERE a.family_id=$1 AND a.user_id=$3 AND a.role='admin') RETURNING user_id",[id,member,u.userId])).rows;});if(!r.length)throw new ForbiddenException();return {removed:true};
 }
}
@Controller()
export class HealthController {
 constructor(private readonly db:Database,private readonly cache:Cache){}
 @Get('health') health():unknown{return {status:'ok',service:'shiku',time:new Date().toISOString()};}
 @Get('ready') async ready():Promise<unknown>{
  const deadline=new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(new Error('dependency_timeout')),3000);timer.unref();});
  try{await Promise.race([Promise.all([this.db.query('SELECT 1'),this.cache.redis.ping(),fetch((process.env.S3_ENDPOINT||'http://127.0.0.1:9000')+'/minio/health/live',{signal:AbortSignal.timeout(2500)}).then(r=>{if(!r.ok)throw new Error('object_store_unavailable');})]),deadline]);return {status:'ready'};}
  catch{throw new HttpException('服务依赖暂不可用',503);}
 }
}
