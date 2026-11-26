import { Controller, Delete, Get, Post, Param, Query, ParseUUIDPipe, UseGuards, ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import type {PoolClient} from 'pg';
import { Database } from './database';
import { AuthGuard, Identity, User } from './auth';

/** Server-owned collaboration metadata. Offline edits cannot forge or overwrite a claim. */
@Controller('shopping') @UseGuards(AuthGuard)
export class ShoppingClaimsController {
 constructor(private readonly db:Database){}
 private async item(c:PoolClient,user:Identity,id:string):Promise<Record<string,any>> {
  // Same lock order as SyncService and family membership changes; purchase/revoke and claim serialize.
  await c.query('SELECT pg_advisory_xact_lock(735456)');
  const row=(await c.query('SELECT id,family_id,payload,deleted FROM shopping_list WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!row||row.deleted)throw new NotFoundException('采购项不存在');
  if(!row.family_id||!(await c.query('SELECT 1 FROM family_member m JOIN users u ON u.id=m.user_id WHERE m.family_id=$1 AND m.user_id=$2 AND u.deleted_at IS NULL',[row.family_id,user.userId])).rowCount)throw new ForbiddenException('仅当前家庭成员可认领共享采购项');
  return row;
 }
 private async status(c:PoolClient,user:Identity,row:Record<string,any>):Promise<unknown> {
  const claim=(await c.query('SELECT c.claimant_id,c.claimed_at,COALESCE(p.display_name,\'小怪朋友\') AS claimant_name FROM shopping_claim c JOIN family_member m ON m.family_id=c.family_id AND m.user_id=c.claimant_id JOIN users u ON u.id=c.claimant_id AND u.deleted_at IS NULL LEFT JOIN user_profile p ON p.user_id=c.claimant_id WHERE c.shopping_id=$1 AND c.family_id=$2',[row.id,row.family_id])).rows[0];
  const purchased=row.payload.purchased===true;return {shoppingId:row.id,familyId:row.family_id,purchased,claimed:!!claim&&!purchased,claimantId:claim&&!purchased?claim.claimant_id:'',claimantName:claim&&!purchased?claim.claimant_name:'',claimedAt:claim&&!purchased?claim.claimed_at:null,mine:!!claim&&!purchased&&claim.claimant_id===user.userId,syncMode:'server-metadata'};
 }
 @Get('claims') async list(@User() user:Identity,@Query('familyId') familyId=''):Promise<unknown>{
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(familyId))throw new BadRequestException('家庭标识无效');
  if(!(await this.db.query('SELECT 1 FROM family_member WHERE family_id=$1 AND user_id=$2',[familyId,user.userId])).length)throw new ForbiddenException();
  const items=await this.db.query(`SELECT c.shopping_id AS "shoppingId",c.family_id AS "familyId",true AS claimed,c.claimant_id AS "claimantId",COALESCE(p.display_name,'小怪朋友') AS "claimantName",c.claimed_at AS "claimedAt",c.claimant_id=$2 AS mine
   FROM shopping_claim c JOIN shopping_list s ON s.id=c.shopping_id AND s.family_id=c.family_id JOIN family_member m ON m.family_id=c.family_id AND m.user_id=c.claimant_id JOIN users a ON a.id=c.claimant_id AND a.deleted_at IS NULL LEFT JOIN user_profile p ON p.user_id=c.claimant_id WHERE c.family_id=$1 AND NOT s.deleted AND COALESCE(s.payload->'purchased','false'::jsonb)<>'true'::jsonb AND EXISTS(SELECT 1 FROM family_member allowed WHERE allowed.family_id=c.family_id AND allowed.user_id=$2) ORDER BY c.claimed_at DESC,c.shopping_id LIMIT 500`,[familyId,user.userId]);
  return {items,syncMode:'server-metadata'};
 }
 @Get(':id/claim') statusOne(@User() user:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.db.transaction(async c=>this.status(c,user,await this.item(c,user,id)));}
 @Post(':id/claim') claim(@User() user:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{
  return this.db.transaction(async c=>{
   const row=await this.item(c,user,id);if(row.payload.purchased===true)throw new ConflictException('此项已买到，无需认领');
   const existing=(await c.query('SELECT claimant_id FROM shopping_claim WHERE shopping_id=$1 FOR UPDATE',[id])).rows[0];
   if(existing&&existing.claimant_id!==user.userId)throw new ConflictException('已有家人认领，请先与对方确认');
   await c.query('INSERT INTO shopping_claim(shopping_id,family_id,claimant_id) VALUES($1,$2,$3) ON CONFLICT(shopping_id) DO NOTHING',[id,row.family_id,user.userId]);
   return this.status(c,user,row);
  });
 }
 @Delete(':id/claim') release(@User() user:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{
  return this.db.transaction(async c=>{
   const row=await this.item(c,user,id);const existing=(await c.query('SELECT claimant_id FROM shopping_claim WHERE shopping_id=$1 FOR UPDATE',[id])).rows[0];
   if(existing&&existing.claimant_id!==user.userId)throw new ConflictException('只能取消自己认领的采购项');
   await c.query('DELETE FROM shopping_claim WHERE shopping_id=$1 AND claimant_id=$2',[id,user.userId]);return this.status(c,user,row);
  });
 }
}
