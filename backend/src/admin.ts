import { isWhitelistedAdmin, runtimeConfig } from './runtime-config';
import { hash, verify } from 'argon2';
import { Throttle } from '@nestjs/throttler';
import { newPasswordError } from './credential-policy';
import { Body, CanActivate, Controller, ExecutionContext, ForbiddenException, Get, Injectable, Param, ParseUUIDPipe, Post, Query, UseGuards, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, ValidateNested, ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength, Matches } from 'class-validator';
import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { AuthGuard, AuthedRequest, Identity, User } from './auth';
import { Database } from './database';
import { SocialService } from './social';
import { buildCookingGuide } from './cooking-guide';
import type { CoreRecipe } from './recommend-core';

@Injectable()
export class AdminGuard implements CanActivate {
 canActivate(context:ExecutionContext):boolean {if(context.switchToHttp().getRequest<AuthedRequest>().identity?.role!=='admin')throw new ForbiddenException('仅管理员可访问工作台');return true;}
}
class Reason { @IsString() @MinLength(2) @MaxLength(300) @Matches(/\S/) reason!:string; }
class UserAiQuota extends Reason {
 @IsIn(['default','custom']) mode!:string;
 @IsOptional() @IsInt() @Min(0) @Max(100000) limit?:number;
}
class ResetUserPassword extends Reason {
 @IsString() @MinLength(1) @MaxLength(128) currentPassword!:string;
 @IsString() @MinLength(6) @MaxLength(128) newPassword!:string;
 @IsString() @MinLength(2) @MaxLength(254) confirmation!:string;
}
class CorrectionDecision extends Reason { @IsIn(['resolved','dismissed']) status!:string; }
class Review extends Reason { @IsIn(['approved','rejected']) status!:string; @IsIn(['pending','approved','rejected']) expectedStatus!:string; }
class IngredientEdit {
 @IsString() @MinLength(1) @MaxLength(100) @Matches(/\S/) name!:string;
 @IsNumber({allowNaN:false,allowInfinity:false}) @Min(0) @Max(1000000) quantity!:number;
 @IsString() @MinLength(1) @MaxLength(20) @Matches(/\S/) unit!:string;
 @IsBoolean() optional!:boolean;
 @IsString() @MaxLength(300) amountText!:string;
 @IsString() @MinLength(1) @MaxLength(300) @Matches(/\S/) quantitySource!:string;
 @IsString() @MaxLength(500) quantityBasis!:string;
}
class RecipeEdit extends Reason {
 @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>IngredientEdit) ingredients?:IngredientEdit[];
 @IsOptional() @IsInt() @Min(1) @Max(20) people?:number;
 @IsOptional() @IsNumber({allowNaN:false,allowInfinity:false}) @Min(0) @Max(100000) estimatedCost?:number;
 @IsOptional() @IsBoolean() costKnown?:boolean;
 @IsOptional() @IsInt() @Min(0) @Max(2880) prepMinutes?:number;
 @IsOptional() @IsInt() @Min(0) @Max(2880) cookMinutes?:number;
 @IsOptional() @IsBoolean() timeEstimated?:boolean;
 @IsInt() @Min(0) expectedVersion!:number;
 @IsString() @MinLength(1) @MaxLength(200) @Matches(/\S/) name!:string;
 @IsString() @MinLength(1) @MaxLength(40) @Matches(/\S/) region!:string;
 @IsString() @MinLength(1) @MaxLength(40) @Matches(/\S/) category!:string;
 @IsString() @MinLength(1) @MaxLength(60) @Matches(/\S/) taste!:string;
 @IsInt() @Min(1) @Max(2880) minutes!:number;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(80) @IsString({each:true}) @MinLength(1,{each:true}) @MaxLength(2000,{each:true}) @Matches(/\S/,{each:true}) steps!:string[];
}
class RecipeRevert extends Reason { @IsInt() @Min(0) expectedVersion!:number; @IsInt() @Min(0) targetVersion!:number; }
function qualityFlags(p:Record<string,any>):string[]{const flags:string[]=[];if(!Array.isArray(p.ingredients)||!p.ingredients.length||p.ingredients.some((i:any)=>!i.optional&&!(Number(i.quantity)>0)))flags.push('待核实主料用量');if(!(p.sourceUrl||p.referenceSources?.some((s:any)=>s.url)))flags.push('来源待核对');if(!Array.isArray(p.steps)||p.steps.length<2||p.steps.some((s:any)=>typeof s!=='string'||s.trim().length<8))flags.push('步骤待细化');if(p.timeEstimated!==false)flags.push('时间为估算');if(p.costKnown===false||!(p.estimatedCost>0))flags.push('费用待核实');return flags;}
function editedPayload(row:Record<string,any>,d:RecipeEdit):Record<string,any>{const payload={...row.payload,name:d.name.trim(),region:d.region.trim(),category:d.category.trim(),taste:d.taste.trim(),minutes:d.minutes,steps:d.steps.map(x=>x.trim())};for(const key of ['people','estimatedCost','costKnown','prepMinutes','cookMinutes','timeEstimated'] as const){if(d[key]!==undefined)payload[key]=d[key];}if(d.ingredients){payload.ingredients=d.ingredients.map(i=>({...i,name:i.name.trim(),unit:i.unit.trim(),quantitySource:i.quantitySource.trim()}));payload.needsQuantityReview=payload.ingredients.some((i:IngredientEdit)=>!i.optional&&i.quantity<=0);}if((d.prepMinutes!==undefined||d.cookMinutes!==undefined)&&Number(payload.prepMinutes)+Number(payload.cookMinutes)!==payload.minutes)throw new BadRequestException('备菜与烹饪分钟之和应等于总耗时');payload.editorialGuide=buildCookingGuide(payload as CoreRecipe);return payload;}
async function writeRecipe(c:PoolClient,id:string,p:Record<string,any>){await c.query('UPDATE recipe_catalog SET name=$2,region=$3,category=$4,taste=$5,minutes=$6,payload=$7,updated_at=now() WHERE id=$1',[id,p.name,p.region,p.category,p.taste,p.minutes,p]);await c.query('DELETE FROM recipe_step WHERE recipe_id=$1',[id]);for(const [n,step] of p.steps.entries())await c.query('INSERT INTO recipe_step(recipe_id,position,instruction) VALUES($1,$2,$3)',[id,n,step]);await c.query('DELETE FROM recipe_ingredient WHERE recipe_id=$1',[id]);for(const [n,i] of (p.ingredients||[]).entries())await c.query('INSERT INTO recipe_ingredient(recipe_id,position,name,quantity,unit,optional,amount_text,quantity_source,quantity_basis) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,n,i.name,i.quantity,i.unit,!!i.optional,i.amountText||'',i.quantitySource||'',i.quantityBasis||'']);}
class RetireDemo extends Reason { @IsString() @IsIn(['example-seed-batch']) batch!:string; @IsIn(['停用演示数据']) confirmation!:string; }
function pageArgs(page:string,q:string){const number=Number(page);if(!Number.isInteger(number)||number<1||number>10000||q.length>100)throw new BadRequestException('分页或搜索参数无效');return {page:number,offset:(number-1)*20,query:q.trim()};}
async function audit(c:PoolClient,u:Identity,action:string,type:string,id:string,reason:string,metadata:Record<string,unknown>={}){await c.query('INSERT INTO admin_audit(id,actor_id,device_id,action,target_type,target_id,reason,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),u.userId,u.deviceId,action,type,id,reason.trim(),metadata]);}

@Controller('admin') @UseGuards(AuthGuard,AdminGuard)
export class AdminController {
 constructor(private readonly db:Database,private readonly social:SocialService){}
 @Get('corrections') async corrections(@Query('page') page='1',@Query('q') q='',@Query('status') status='all'):Promise<unknown>{
  const a=pageArgs(page,q);if(!['all','pending','resolved','dismissed'].includes(status))throw new BadRequestException();
  const where="($1='' OR strpos(lower(r.name),lower($1))>0 OR strpos(lower(c.detail),lower($1))>0) AND ($2='all' OR c.status=$2)";
  const [{total}]=await this.db.query(`SELECT count(*)::int AS total FROM recipe_corrections c JOIN recipe_catalog r ON r.id=c.recipe_id WHERE ${where}`,[a.query,status]);
  const items=await this.db.query(`SELECT c.id,c.recipe_id,c.category,c.detail,c.status,c.resolution,c.created_at,r.name FROM recipe_corrections c JOIN recipe_catalog r ON r.id=c.recipe_id WHERE ${where} ORDER BY (c.status='pending') DESC,c.created_at DESC,c.id LIMIT 20 OFFSET $3`,[a.query,status,a.offset]);return {items,total,page:a.page,pageSize:20};
 }
 @Post('corrections/:id') async decideCorrection(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:CorrectionDecision):Promise<unknown>{return this.db.transaction(async c=>{const row=(await c.query('SELECT status FROM recipe_corrections WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)throw new NotFoundException();if(row.status!=='pending')throw new ConflictException('此反馈已处理');await c.query('UPDATE recipe_corrections SET status=$2,resolution=$3,updated_at=now() WHERE id=$1',[id,d.status,d.reason.trim()]);await audit(c,u,'recipe-correction','correction',id,d.reason,{status:d.status});return {id,status:d.status};});}

 @Get('overview') async overview(){
  const [counts]=await this.db.query(`SELECT
   (SELECT count(*)::int FROM users WHERE deleted_at IS NULL AND demo_seed_batch IS NULL AND role='user') AS users,
   (SELECT count(*)::int FROM users WHERE deleted_at IS NULL AND demo_seed_batch IS NOT NULL) AS demo_users,
   (SELECT count(*)::int FROM recipe_catalog) AS recipes,
   (SELECT count(*)::int FROM social_post WHERE visibility='public' AND status='approved') AS public_posts,
   (SELECT count(*)::int FROM social_post WHERE status='pending' AND visibility='public') AS pending_posts,
   (SELECT count(*)::int FROM catalog_submission WHERE status='pending') AS pending_catalog,
   (SELECT count(*)::int FROM reports WHERE status='pending') AS pending_reports,
   (SELECT count(*)::int FROM object_deletion_jobs) AS cleanup_jobs`);
  const trend=await this.db.query(`SELECT to_char(d,'YYYY-MM-DD') AS day,count(p.id)::int AS posts FROM generate_series((now() AT TIME ZONE 'Asia/Shanghai')::date-6,(now() AT TIME ZONE 'Asia/Shanghai')::date,interval '1 day') d LEFT JOIN social_post p ON p.created_at AT TIME ZONE 'Asia/Shanghai'>=d AND p.created_at AT TIME ZONE 'Asia/Shanghai'<d+interval '1 day' AND p.visibility='public' AND p.status='approved' GROUP BY d ORDER BY d`);
  return {counts,trend,serverTime:new Date().toISOString(),scope:'公开动态包含演示数据；普通用户数不含演示账号和管理员'};
 }
 @Get('users') async users(@Query('page') p='1',@Query('q') q='',@Query('type') type='all',@Query('role') role='all'){
  const a=pageArgs(p,q);if(!['all','real','demo'].includes(type)||!['all','user','admin'].includes(role))throw new BadRequestException();
  const where=`u.deleted_at IS NULL AND ($1='' OR strpos(lower(u.email),lower($1))>0 OR strpos(lower(COALESCE(pr.display_name,'')),lower($1))>0 OR u.id::text=$1) AND ($2='all' OR ($2='demo' AND u.demo_seed_batch IS NOT NULL) OR ($2='real' AND u.demo_seed_batch IS NULL)) AND ($3='all' OR u.role=$3)`;
  const [{total}]=await this.db.query(`SELECT count(*)::int AS total FROM users u LEFT JOIN user_profile pr ON pr.user_id=u.id WHERE ${where}`,[a.query,type,role]);
  const items=await this.db.query(`SELECT u.id,u.email,u.role,u.created_at,u.demo_seed_batch,u.email_verified_at,u.ai_daily_limit,(SELECT max(d.created_at) FROM devices d WHERE d.user_id=u.id) AS last_login_at,pr.display_name,pr.avatar_preset,r.name AS region,(SELECT count(*)::int FROM devices d WHERE d.user_id=u.id AND revoked_at IS NULL AND refresh_hash IS NOT NULL) AS active_devices FROM users u LEFT JOIN user_profile pr ON pr.user_id=u.id LEFT JOIN regions r ON r.code=pr.region_code WHERE ${where} ORDER BY u.created_at DESC,u.id LIMIT 20 OFFSET $4`,[a.query,type,role,a.offset]);
  return {items:items.map(user=>({...user,ai_unlimited:isWhitelistedAdmin({userId:user.id,role:user.role}),ai_effective_daily_limit:isWhitelistedAdmin({userId:user.id,role:user.role})?null:user.ai_daily_limit??(runtimeConfig().ai.dailyLimitEnabled?runtimeConfig().ai.perUserDay:null)})),total,page:a.page,pageSize:20,defaultDailyLimit:runtimeConfig().ai.perUserDay};
 }
 @Get('users/:id') async userDetail(@Param('id',ParseUUIDPipe) id:string){
  const [user]=await this.db.query(`SELECT u.id,u.email,u.role,u.created_at,u.email_verified_at,u.demo_seed_batch,u.ai_daily_limit,pr.display_name FROM users u LEFT JOIN user_profile pr ON pr.user_id=u.id WHERE u.id=$1 AND u.deleted_at IS NULL`,[id]);if(!user)throw new NotFoundException();
  const sessions=await this.db.query('SELECT id,name,created_at,revoked_at FROM devices WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',[id]);
  const [activity]=await this.db.query(`SELECT count(*) FILTER(WHERE event_name='ai_answer')::int AS answers,count(*) FILTER(WHERE event_name='ai_answer' AND outcome='model')::int AS successful_answers,max(created_at) AS last_activity_at FROM telemetry_event WHERE user_id=$1`,[id]);
  return {user:{...user,ai_unlimited:isWhitelistedAdmin({userId:user.id,role:user.role}),ai_effective_daily_limit:isWhitelistedAdmin({userId:user.id,role:user.role})?null:user.ai_daily_limit??(runtimeConfig().ai.dailyLimitEnabled?runtimeConfig().ai.perUserDay:null)},sessions,activity,defaultDailyLimit:runtimeConfig().ai.perUserDay,scope:'最近90天云端记录；不是剩余额度，不包含聊天内容和示例主体记录'};
 }
 @Post('users/:id/ai-quota') async setAiQuota(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:UserAiQuota){
  if(d.mode==='custom'&&(d.limit===undefined||d.limit===null))throw new BadRequestException('请输入每日次数');
  if(d.mode==='default'&&d.limit!==undefined)throw new BadRequestException('恢复默认时请勿填写次数');
  return this.db.transaction(async c=>{
   const target=(await c.query('SELECT id,role,ai_daily_limit FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[id])).rows[0];if(!target)throw new NotFoundException();
   if(isWhitelistedAdmin({userId:id,role:target.role}))throw new BadRequestException('白名单管理员保持不限额，无需设置每日次数');
   const limit=d.mode==='default'?null:d.limit!;await c.query('UPDATE users SET ai_daily_limit=$2 WHERE id=$1',[id,limit]);
   await audit(c,u,'set-ai-quota','user',id,d.reason,{before:target.ai_daily_limit,after:limit,mode:d.mode});
   return {saved:true,override:limit,effectiveDailyLimit:limit??(runtimeConfig().ai.dailyLimitEnabled?runtimeConfig().ai.perUserDay:null),resetTimezone:'Asia/Shanghai'};
  });
 }
 @Post('users/:id/reset-password') @Throttle({default:{limit:5,ttl:60000}})
 async resetPassword(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:ResetUserPassword){
  const error=newPasswordError(d.newPassword);if(error)throw new BadRequestException(error);
  return this.db.transaction(async c=>{
   // Use consistent ordering when two administrators reset each other's passwords.
   const locked=(await c.query('SELECT id,email,role,password_hash FROM users WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL ORDER BY id FOR UPDATE',[[u.userId,id]])).rows;
   const actor=locked.find(r=>r.id===u.userId),target=locked.find(r=>r.id===id);
   if(!actor||actor.role!=='admin'||!await verify(actor.password_hash,d.currentPassword))throw new ForbiddenException('管理员当前密码错误');
   if(!(await c.query('SELECT id FROM devices WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL',[u.deviceId,u.userId])).rowCount)throw new ForbiddenException('管理员会话已失效');
   if(!target)throw new NotFoundException('账号不存在');if(d.confirmation.trim().toLowerCase()!==target.email.toLowerCase())throw new BadRequestException('请准确输入目标账号');
   await c.query('UPDATE users SET password_hash=$2 WHERE id=$1',[id,await hash(d.newPassword)]);
   const revoked=await c.query('UPDATE devices SET revoked_at=now(),refresh_hash=NULL WHERE user_id=$1 AND revoked_at IS NULL RETURNING id',[id]);
   await c.query("UPDATE auth_challenge SET consumed_at=now() WHERE user_id=$1 AND purpose='reset-password' AND consumed_at IS NULL",[id]);
   await audit(c,u,'reset-password','user',id,d.reason,{revoked:revoked.rowCount});
   return {changed:true,revoked:revoked.rowCount,requiresLogin:id===u.userId};
  });
 }
 @Post('users/:id/revoke-sessions') async revoke(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:Reason){
  if(id===u.userId)throw new BadRequestException('请使用退出登录结束自己的会话');
  return this.db.transaction(async c=>{const target=(await c.query('SELECT id,role FROM users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[id])).rows[0];if(!target)throw new NotFoundException();if(target.role==='admin')throw new ForbiddenException('不支持在工作台撤销其他管理员会话');const changed=await c.query('UPDATE devices SET revoked_at=now(),refresh_hash=NULL WHERE user_id=$1 AND revoked_at IS NULL RETURNING id',[id]);await audit(c,u,'revoke-sessions','user',id,d.reason,{devices:changed.rowCount});return {revoked:changed.rowCount};});
 }
 @Get('recipes') async recipes(@Query('page') p='1',@Query('q') q='',@Query('category') category='',@Query('quality') quality='all'){
  const a=pageArgs(p,q);if(category.length>40||!['all','needs-review','quantity','steps','source'].includes(quality))throw new BadRequestException();
  const sourceMissing="COALESCE(r.payload->>'sourceUrl','')='' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(r.payload->'referenceSources','[]'::jsonb)) s WHERE COALESCE(s->>'url','')<>'')";
  const quantityMissing="jsonb_array_length(COALESCE(r.payload->'ingredients','[]'::jsonb))=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(r.payload->'ingredients','[]'::jsonb)) i WHERE COALESCE(i->>'optional','false')<>'true' AND COALESCE((i->>'quantity')::numeric,0)<=0)";
  const stepsMissing="jsonb_array_length(COALESCE(r.payload->'steps','[]'::jsonb))<2 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(r.payload->'steps','[]'::jsonb)) s WHERE length(btrim(s))<8)";
  const needsReview=`(${sourceMissing}) OR (${quantityMissing}) OR (${stepsMissing}) OR COALESCE(r.payload->>'timeEstimated','true')<>'false' OR COALESCE((r.payload->>'estimatedCost')::numeric,0)<=0 OR r.payload->>'costKnown'='false'`;
  const qualityWhere=quality==='quantity'?quantityMissing:quality==='source'?sourceMissing:quality==='steps'?stepsMissing:quality==='needs-review'?needsReview:'TRUE';
  const where="($1='' OR strpos(lower(r.name),lower($1))>0 OR EXISTS(SELECT 1 FROM recipe_ingredient i WHERE i.recipe_id=r.id AND strpos(lower(i.name),lower($1))>0)) AND ($2='' OR r.category=$2) AND ("+qualityWhere+")";
  const [{total}]=await this.db.query(`SELECT count(*)::int AS total FROM recipe_catalog r WHERE ${where}`,[a.query,category]);
  const items=await this.db.query(`SELECT r.id,r.name,r.region,r.category,r.taste,r.minutes,r.updated_at,r.payload,COALESCE(o.version,0) AS version,jsonb_array_length(r.payload->'steps') AS step_count,(SELECT count(*)::int FROM discovery_favorite f WHERE f.recipe_id=r.id::text) AS favorite_count FROM recipe_catalog r LEFT JOIN admin_recipe_override o ON o.recipe_id=r.id WHERE ${where} ORDER BY r.updated_at DESC,r.id LIMIT 20 OFFSET $3`,[a.query,category,a.offset]);
  return {items:items.map(r=>{const {payload,...summary}=r;return {...summary,qualityFlags:qualityFlags(payload)};}),total,page:a.page,pageSize:20,categories:await this.db.query('SELECT DISTINCT category FROM recipe_catalog ORDER BY category')};
 }
 @Get('recipes/:id') async recipe(@Param('id',ParseUUIDPipe) id:string){const [r]=await this.db.query('SELECT r.*,COALESCE(o.version,0) AS version FROM recipe_catalog r LEFT JOIN admin_recipe_override o ON o.recipe_id=r.id WHERE r.id=$1',[id]);if(!r)throw new NotFoundException();return {...r,qualityFlags:qualityFlags(r.payload)};}
 @Post('recipes/:id/preview') async previewRecipe(@Param('id',ParseUUIDPipe) id:string,@Body() d:RecipeEdit){const [row]=await this.db.query('SELECT r.*,COALESCE(o.version,0) AS version FROM recipe_catalog r LEFT JOIN admin_recipe_override o ON o.recipe_id=r.id WHERE r.id=$1',[id]);if(!row)throw new NotFoundException();if(Number(row.version)!==d.expectedVersion)throw new ConflictException('菜谱已变化，请刷新后预览');const payload=editedPayload(row,d);const fields=Object.keys(payload).filter(k=>JSON.stringify(payload[k])!==JSON.stringify(row.payload[k]));return {version:row.version,payload,qualityFlags:qualityFlags(payload),changes:fields.map(field=>({field,before:row.payload[field]??null,after:payload[field]})),saved:false};}
 @Get('recipes/:id/history') async recipeHistory(@Param('id',ParseUUIDPipe) id:string,@Query('page') p='1'){const a=pageArgs(p,'');const [exists]=await this.db.query('SELECT id FROM recipe_catalog WHERE id=$1',[id]);if(!exists)throw new NotFoundException();const [{total}]=await this.db.query('SELECT count(*)::int AS total FROM admin_recipe_history WHERE recipe_id=$1',[id]);const items=await this.db.query('SELECT version,action,reason,created_at,actor_id,before_payload,after_payload FROM admin_recipe_history WHERE recipe_id=$1 ORDER BY version DESC LIMIT 20 OFFSET $2',[id,a.offset]);return {items,total,page:a.page,pageSize:20};}
 @Post('recipes/:id') async editRecipe(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:RecipeEdit){
  return this.db.transaction(async c=>{
   await c.query('SELECT pg_advisory_xact_lock(842157)');
   const row=(await c.query('SELECT * FROM recipe_catalog WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)throw new NotFoundException();
   const version=Number((await c.query('SELECT version FROM admin_recipe_override WHERE recipe_id=$1',[id])).rows[0]?.version||0);if(version!==d.expectedVersion)throw new ConflictException('菜谱已被其他管理员修改，请刷新后重新编辑');
   const payload=editedPayload(row,d);await writeRecipe(c,id,payload);
   await c.query('INSERT INTO admin_recipe_override(recipe_id,version,updated_by) VALUES($1,$2,$3) ON CONFLICT(recipe_id) DO UPDATE SET version=excluded.version,updated_by=excluded.updated_by,updated_at=now()',[id,version+1,u.userId]);
   const fields=Object.keys(payload).filter(k=>JSON.stringify(payload[k])!==JSON.stringify(row.payload[k]));
   await c.query("INSERT INTO admin_recipe_history(recipe_id,version,actor_id,action,reason,before_payload,after_payload) VALUES($1,$2,$3,'edit',$4,$5,$6)",[id,version+1,u.userId,d.reason.trim(),row.payload,payload]);
   await audit(c,u,'edit-recipe','recipe',id,d.reason,{version:version+1,fields});return {saved:true,version:version+1,qualityFlags:qualityFlags(payload)};
  });
 }
 @Post('recipes/:id/revert') async revertRecipe(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:RecipeRevert){return this.db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(842157)');const row=(await c.query('SELECT * FROM recipe_catalog WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)throw new NotFoundException();const version=Number((await c.query('SELECT version FROM admin_recipe_override WHERE recipe_id=$1',[id])).rows[0]?.version||0);if(version!==d.expectedVersion)throw new ConflictException('菜谱已变化，请刷新后再恢复');
  const history=(await c.query(d.targetVersion===0?'SELECT before_payload AS payload FROM admin_recipe_history WHERE recipe_id=$1 ORDER BY version LIMIT 1':'SELECT after_payload AS payload FROM admin_recipe_history WHERE recipe_id=$1 AND version=$2',d.targetVersion===0?[id]:[id,d.targetVersion])).rows[0];if(!history)throw new NotFoundException('找不到该历史版本');const payload=history.payload;await writeRecipe(c,id,payload);await c.query('UPDATE admin_recipe_override SET version=$2,updated_by=$3,updated_at=now() WHERE recipe_id=$1',[id,version+1,u.userId]);await c.query("INSERT INTO admin_recipe_history(recipe_id,version,actor_id,action,reason,before_payload,after_payload) VALUES($1,$2,$3,'revert',$4,$5,$6)",[id,version+1,u.userId,d.reason.trim(),row.payload,payload]);await audit(c,u,'revert-recipe','recipe',id,d.reason,{version:version+1,targetVersion:d.targetVersion});return {saved:true,version:version+1};
 });}
 @Get('moderation') async moderation(@Query('page') p='1',@Query('q') q='',@Query('kind') kind='posts',@Query('status') status='pending'){
  const a=pageArgs(p,q);if(!['posts','catalog','reports'].includes(kind)||!['all','pending','approved','rejected'].includes(status))throw new BadRequestException();
  const table=kind==='posts'?'social_post':kind==='catalog'?'catalog_submission':'reports';
  // Private/family contents are excluded even from this moderation console.
  const where=`($1='all' OR t.status=$1) ${kind==='posts'?"AND t.visibility='public'":''} AND ($2='' OR strpos(lower(${kind==='reports'?'t.reason':"COALESCE(t.payload->>'name','')"}),lower($2))>0)`;
  const [{total}]=await this.db.query(`SELECT count(*)::int AS total FROM ${table} t WHERE ${where}`,[status,a.query]);
  const columns=kind==='reports'?'t.id,t.post_id,t.reason,t.status,t.created_at':`t.id,t.user_id,t.kind,t.status,t.payload,t.created_at,pr.display_name AS author_name,u.demo_seed_batch`;
  const joins=kind==='reports'?'':'LEFT JOIN user_profile pr ON pr.user_id=t.user_id LEFT JOIN users u ON u.id=t.user_id';
  const items=await this.db.query(`SELECT ${columns} FROM ${table} t ${joins} WHERE ${where} ORDER BY t.created_at DESC,t.id LIMIT 20 OFFSET $3`,[status,a.query,a.offset]);return {items,total,page:a.page,pageSize:20};
 }
 @Post('moderation/:kind/:id') async review(@User() u:Identity,@Param('kind') kind:string,@Param('id',ParseUUIDPipe) id:string,@Body() d:Review){
  if(!['posts','catalog','reports'].includes(kind))throw new BadRequestException();const table=kind==='posts'?'social_post':kind==='catalog'?'catalog_submission':'reports';
  return this.db.transaction(async c=>{const row=(await c.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`,[id])).rows[0];if(!row||kind==='posts'&&row.visibility!=='public')throw new NotFoundException();if(row.status!==d.expectedStatus)throw new ConflictException('内容状态已变化，请刷新后重新处理');
   await c.query(`UPDATE ${table} SET status=$2${kind==='catalog'?',reviewed_at=now()':''} WHERE id=$1`,[id,d.status]);
   if(kind==='posts')await this.social.notifyFollowers(c,{...row,status:d.status});
   if(kind==='reports'&&d.status==='approved')await c.query("UPDATE social_post SET status='rejected' WHERE id=$1",[row.post_id]);
   await audit(c,u,'review-'+kind,kind,id,d.reason,{before:row.status,after:d.status});return {id,status:d.status};});
 }
 @Get('audit') async audits(@Query('page') p='1',@Query('q') q='',@Query('action') action=''){
  const a=pageArgs(p,q);if(action.length>80)throw new BadRequestException();
  const where="($1='' OR strpos(lower(a.action),lower($1))>0 OR strpos(lower(a.reason),lower($1))>0 OR a.target_id=$1 OR a.actor_id::text=$1 OR strpos(lower(u.email),lower($1))>0) AND ($2='' OR a.action=$2)";
  const [{total}]=await this.db.query(`SELECT count(*)::int AS total FROM admin_audit a JOIN users u ON u.id=a.actor_id WHERE ${where}`,[a.query,action]);
  const items=await this.db.query(`SELECT a.id,a.actor_id,u.email AS actor_account,a.action,a.target_type,a.target_id,a.reason,a.metadata,a.created_at FROM admin_audit a JOIN users u ON u.id=a.actor_id WHERE ${where} ORDER BY a.created_at DESC,a.id LIMIT 20 OFFSET $3`,[a.query,action,a.offset]);
  return {items,total,page:a.page,pageSize:20,actions:await this.db.query('SELECT DISTINCT action FROM admin_audit ORDER BY action')};
 }
 @Get('demo') async demo(){return this.db.query(`SELECT u.demo_seed_batch AS batch,count(*)::int AS accounts,count(*) FILTER(WHERE u.deleted_at IS NULL)::int AS active_accounts,(SELECT count(*)::int FROM social_post p JOIN users a ON a.id=p.user_id WHERE a.demo_seed_batch=u.demo_seed_batch AND p.visibility='public' AND p.status='approved') AS public_posts FROM users u WHERE demo_seed_batch IS NOT NULL GROUP BY demo_seed_batch ORDER BY demo_seed_batch`);}
 @Post('demo/retire') async retire(@User() u:Identity,@Body() d:RetireDemo){return this.db.transaction(async c=>{
  const ids=(await c.query('SELECT id FROM users WHERE demo_seed_batch=$1 AND deleted_at IS NULL FOR UPDATE',[d.batch])).rows.map(x=>x.id);if(!ids.length)throw new ConflictException('此演示批次已停用');if(ids.includes(u.userId))throw new ForbiddenException();
  await c.query("UPDATE social_post SET status='rejected',visibility='private' WHERE user_id=ANY($1::uuid[])",[ids]);
  for(const table of ['discovery_favorite','discovery_search','social_like','social_favorite'])await c.query(`DELETE FROM ${table} WHERE user_id=ANY($1::uuid[])`,[ids]);
  await c.query('DELETE FROM social_follow WHERE follower_id=ANY($1::uuid[]) OR following_id=ANY($1::uuid[])',[ids]);
  await c.query('DELETE FROM social_notification WHERE user_id=ANY($1::uuid[]) OR actor_id=ANY($1::uuid[])',[ids]);
  await c.query('UPDATE devices SET revoked_at=now(),refresh_hash=NULL WHERE user_id=ANY($1::uuid[])',[ids]);await c.query('UPDATE users SET deleted_at=now() WHERE id=ANY($1::uuid[])',[ids]);await audit(c,u,'retire-demo','demo',d.batch,d.reason,{accounts:ids.length});return {retired:ids.length};
 });}
}
