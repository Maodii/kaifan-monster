import { Body, Controller, Get, Put, UseGuards, BadRequestException, ConflictException } from '@nestjs/common';
import { IsInt, IsObject, Min } from 'class-validator';
import { Database } from './database';
import { AuthGuard, Identity, User } from './auth';
export class WorkspaceDto { @IsInt() @Min(0) baseVersion!:number; @IsObject() payload!:Record<string,unknown>; }
const preferenceKeys=['homeRegion','outsideRegion','dietGoal','outsideGoal','learningEnabled','outsideLearning','excluded','taste','recentDays','recommendScene','experience:v1','household:v1'];
export function validateWorkspace(p:Record<string,unknown>):void{
 if(JSON.stringify(p).length>500000||p.format!==1||Object.keys(p).some(k=>!['format','plans','preferences'].includes(k))||!Array.isArray(p.plans)||p.plans.length>1000||!p.preferences||typeof p.preferences!=='object'||Array.isArray(p.preferences))throw new BadRequestException('工作区格式无效');
 const seen=new Set<string>();
 for(const v of p.plans){if(!v||typeof v!=='object'||typeof v.id!=='string'||!/^[a-f0-9-]{36}$/.test(v.id)||seen.has(v.id)||typeof v.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||!Number.isFinite(Date.parse(v.date))||new Date(v.date).toISOString().slice(0,10)!==v.date||!['早餐','午餐','晚餐','加餐'].includes(v.occasion)||!Number.isInteger(v.people)||v.people<1||v.people>20||typeof v.completed!=='boolean'||(v.mode&&!['在家做','外食','外卖','吃剩菜'].includes(v.mode))||typeof v.recipeId!=='string'||v.recipeId.length>200||(v.note!==undefined&&(typeof v.note!=='string'||v.note.length>200)))throw new BadRequestException('计划无效');if(v.sourceMealId!==undefined&&(typeof v.sourceMealId!=='string'||(v.sourceMealId&&!/^[a-f0-9-]{36}$/.test(v.sourceMealId))))throw new BadRequestException('关联用餐无效');if(v.remainingPortions!==undefined&&(!Number.isFinite(v.remainingPortions)||v.remainingPortions<0||v.remainingPortions>100))throw new BadRequestException('剩余份数无效');seen.add(v.id);}
 for(const [key,value] of Object.entries(p.preferences)){
  if(!preferenceKeys.includes(key)||typeof value!=='string'||value.length>100000)throw new BadRequestException('偏好格式无效');
  if(key==='experience:v1'&&value){let v:any;try{v=JSON.parse(value);}catch{throw new BadRequestException('收藏夹格式无效');}if(!v||!Array.isArray(v.collections)||v.collections.length>30||!Array.isArray(v.filters)||v.filters.length>12||v.collections.some((c:any)=>!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>24||!Array.isArray(c.ids)||c.ids.length>1000||c.ids.some((id:any)=>typeof id!=='string'||id.length>200)))throw new BadRequestException('收藏夹格式无效');}
  if(key==='household:v1'&&value){let v:any;try{v=JSON.parse(value);}catch{throw new BadRequestException('成员档案格式无效');}if(!v||!Array.isArray(v.members)||v.members.length>20||v.members.some((m:any)=>!m||typeof m.id!=='string'||typeof m.name!=='string'||!m.name.trim()||m.name.length>24||!Number.isFinite(m.appetite)||m.appetite<0.25||m.appetite>3||typeof m.enabled!=='boolean'||!Array.isArray(m.excluded)||m.excluded.length>30||m.excluded.some((x:any)=>typeof x!=='string'||x.length>80)))throw new BadRequestException('成员档案格式无效');}
 }
}
@Controller('account/workspace') @UseGuards(AuthGuard)
export class WorkspaceController {
 constructor(private readonly db:Database){}
 @Get() async get(@User() u:Identity):Promise<unknown>{const [row]=await this.db.query('SELECT payload,version,updated_at FROM account_workspace WHERE user_id=$1',[u.userId]);return row||{payload:null,version:0,updated_at:null};}
 @Put() async put(@User() u:Identity,@Body() d:WorkspaceDto):Promise<unknown>{validateWorkspace(d.payload);return this.db.transaction(async c=>{await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[u.userId]);const row=(await c.query('SELECT version FROM account_workspace WHERE user_id=$1',[u.userId])).rows[0];if(Number(row?.version||0)!==d.baseVersion)throw new ConflictException('其他设备已更新安排与偏好，请对照后选择');return (await c.query('INSERT INTO account_workspace(user_id,payload,version,device_id) VALUES($1,$2,1,$3) ON CONFLICT(user_id) DO UPDATE SET payload=EXCLUDED.payload,version=account_workspace.version+1,updated_at=now(),device_id=EXCLUDED.device_id RETURNING payload,version,updated_at',[u.userId,d.payload,u.deviceId])).rows[0];});}
}
