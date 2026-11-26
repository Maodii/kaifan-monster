import { Cache } from './cache';
import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { validatePayload } from './payload';
import { Database } from './database';
import { ChangeDto, entityTypes } from './dto';
import { Identity } from './auth';
@Injectable()
export class SyncService {
 constructor(private readonly db:Database,private readonly cache:Cache){}
 async push(user:Identity,changes:ChangeDto[]):Promise<unknown>{
  return this.cache.withSyncLock(user.userId,()=>this.db.transaction(async c=>{
   const accepted:unknown[]=[],conflicts:unknown[]=[];
   await c.query('SELECT pg_advisory_xact_lock(735456)');
   await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.userId]);
   for(const ch of changes){
    if(!entityTypes.includes(ch.entityType))throw new BadRequestException();
    if(!Number.isFinite(Date.parse(ch.modifiedAt))||Date.parse(ch.modifiedAt)>Date.now()+300000)throw new BadRequestException('修改时间无效或过于超前');
    if(JSON.stringify(ch.payload).length>200000)throw new BadRequestException('记录过大');
    const oldChange=(await c.query('SELECT version,payload FROM food_change_logs WHERE user_id=$1 AND change_id=$2',[user.userId,ch.changeId])).rows[0];
    if(oldChange){accepted.push({changeId:ch.changeId,entityId:ch.entityId,version:Number(oldChange.payload._recordVersion)});continue;}
    // 表名仅来自枚举白名单；所有值均参数化。
    const existing=(await c.query(`SELECT * FROM ${ch.entityType} WHERE id=$1 FOR UPDATE`,[ch.entityId])).rows[0];
    if(existing&&existing.user_id!==user.userId){
     if(!existing.family_id)throw new ForbiddenException();
     const member=await c.query('SELECT 1 FROM family_member WHERE family_id=$1 AND user_id=$2',[existing.family_id,user.userId]);if(!member.rowCount)throw new ForbiddenException();
    }
    const familyId=existing?.family_id||ch.familyId||null;
    if(ch.familyId&&existing&&ch.familyId!==existing.family_id)throw new BadRequestException('不能通过同步变更所属家庭');
    if(familyId){const member=await c.query('SELECT 1 FROM family_member WHERE family_id=$1 AND user_id=$2',[familyId,user.userId]);if(!member.rowCount)throw new ForbiddenException();}
    if(Number(existing?.version||0)!==ch.baseVersion){conflicts.push({changeId:ch.changeId,entityId:ch.entityId,server:existing||null,local:ch,suggested:existing&&Date.parse(existing.modified_at)>Date.parse(ch.modifiedAt)?'server':'local'});continue;}
    validatePayload(ch);
    if(ch.entityType==='meal_records'&&ch.operation==='delete'){
     await c.query("INSERT INTO object_deletion_jobs(id,photo_id,object_key,available_at) SELECT id,id,object_key,now()+interval '6 minutes' FROM meal_photo WHERE meal_id=$1 ON CONFLICT DO NOTHING",[ch.entityId]);
     await c.query("UPDATE social_post SET status='rejected' WHERE source_id=$1",[ch.entityId]);
     await c.query("UPDATE meal_photo SET status='deleting' WHERE meal_id=$1",[ch.entityId]);
    }
    const owners=familyId?(await c.query('SELECT user_id FROM family_member WHERE family_id=$1 ORDER BY user_id',[familyId])).rows.map(r=>r.user_id):[user.userId];
    // 同一家庭记录版本使用前一版本+1；全局日志版本对每个用户分别递增。
    const recordVersion=Number(existing?.version||0)+1;
    await c.query(`INSERT INTO ${ch.entityType}(id,user_id,family_id,payload,version,device_id,modified_at,deleted) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,version=EXCLUDED.version,device_id=EXCLUDED.device_id,modified_at=EXCLUDED.modified_at,deleted=EXCLUDED.deleted`,[ch.entityId,existing?.user_id||user.userId,familyId,ch.payload,recordVersion,user.deviceId,ch.modifiedAt,ch.operation==='delete']);
    for(const owner of owners){
     const v=(await c.query('UPDATE users SET global_version=global_version+1 WHERE id=$1 RETURNING global_version',[owner])).rows[0].global_version;
     await c.query('INSERT INTO food_change_logs(user_id,entity_type,entity_id,operation,version,base_version,device_id,modified_at,payload,change_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[owner,ch.entityType,ch.entityId,ch.operation,v,ch.baseVersion,user.deviceId,ch.modifiedAt,{...ch.payload,_recordVersion:recordVersion,_familyId:familyId},ch.changeId]);
    }
    accepted.push({changeId:ch.changeId,entityId:ch.entityId,version:recordVersion});
   }
   return {accepted,conflicts};
  }));
 }
 async pull(user:Identity,since:number):Promise<unknown>{
  if(!Number.isSafeInteger(since)||since<0)throw new BadRequestException('since无效');
  // 当前家庭权限重新验证，离组后不返回以前共享日志中的数据。
  const rows=await this.db.query(`SELECT l.* FROM food_change_logs l WHERE l.user_id=$1 AND l.version>$2 AND ((l.payload->>'_familyId') IS NULL OR EXISTS(SELECT 1 FROM family_member m WHERE m.user_id=$1 AND m.family_id::text=l.payload->>'_familyId')) ORDER BY l.version LIMIT 501`,[user.userId,since]);
  const page=rows.slice(0,500);const [u]=await this.db.query('SELECT global_version FROM users WHERE id=$1',[user.userId]);
  const memberships=await this.db.query('SELECT family_id FROM family_member WHERE user_id=$1',[user.userId]);
  return {familyIds:memberships.map(m=>m.family_id),changes:page,hasMore:rows.length>500,nextVersion:rows.length>500?Number(page[page.length-1].version):Number(u.global_version)};
 }
}
