import { Controller, Get, Put, Post, Body, Param, UseGuards, BadRequestException, ConflictException } from '@nestjs/common';
import { IsBoolean, IsString, MaxLength, IsArray, ArrayMaxSize, IsInt, Min } from 'class-validator';
import { Database } from './database';
import { AuthGuard, Identity, User } from './auth';
import { INGREDIENT_GROUPS } from './ingredient-discovery-core';
class SaveFavorite { @IsBoolean() saved!:boolean; }
class PublishFavorites {
 @IsArray() @ArrayMaxSize(5000) @IsString({each:true}) @MaxLength(100,{each:true}) recipeIds!:string[];
 @IsBoolean() confirmed!:boolean;
 @IsInt() @Min(0) expectedRevision!:number;
}
class SearchEvent { @IsString() @MaxLength(80) term!:string; }

/** Counts refer only to explicit public-catalog actions; private recipe contents stay private. */
@Controller('discovery') @UseGuards(AuthGuard)
export class DiscoveryController {
 constructor(private readonly db:Database){}
 private async exists(id:string):Promise<boolean>{
  return !!(await this.db.query("SELECT 1 FROM recipe_catalog WHERE id::text=$1 UNION ALL SELECT 1 FROM catalog_submission WHERE kind='recipe' AND status='approved' AND source_id::text=$1 LIMIT 1",[id])).length;
 }
 @Get('summary') async summary(@User() user:Identity):Promise<unknown>{
  const favorites=await this.db.query(`SELECT f.recipe_id AS "recipeId",count(DISTINCT f.user_id)::int AS count,
   count(DISTINCT f.user_id) FILTER(WHERE a.demo_seed_batch IS NULL)::int AS "realCount",
   count(DISTINCT f.user_id) FILTER(WHERE a.demo_seed_batch IS NOT NULL)::int AS "demoCount"
   FROM discovery_favorite f JOIN users a ON a.id=f.user_id AND a.deleted_at IS NULL WHERE EXISTS(SELECT 1 FROM recipe_catalog r WHERE r.id::text=f.recipe_id)
   OR EXISTS(SELECT 1 FROM catalog_submission s WHERE s.kind='recipe' AND s.status='approved' AND s.source_id::text=f.recipe_id)
   GROUP BY f.recipe_id ORDER BY "realCount" DESC,count DESC,f.recipe_id`);
  const mine=await this.db.query('SELECT recipe_id AS "recipeId" FROM discovery_favorite WHERE user_id=$1',[user.userId]);
  const hotSearches=await this.db.query(`SELECT term,count(DISTINCT s.user_id)::int AS count FROM discovery_search s JOIN users a ON a.id=s.user_id
   WHERE a.demo_seed_batch IS NULL AND a.deleted_at IS NULL AND searched_on>=CURRENT_DATE-6 GROUP BY term HAVING count(DISTINCT s.user_id)>=3 ORDER BY count DESC,term LIMIT 20`);
  const demoHotSearches=await this.db.query(`SELECT term,count(DISTINCT s.user_id)::int AS count FROM discovery_search s JOIN users a ON a.id=s.user_id
   WHERE a.demo_seed_batch IS NOT NULL AND a.deleted_at IS NULL AND searched_on>=CURRENT_DATE-6 GROUP BY term HAVING count(DISTINCT s.user_id)>=3 ORDER BY count DESC,term LIMIT 20`);
  const [owner]=await this.db.query('SELECT discovery_favorite_version FROM users WHERE id=$1',[user.userId]);
  const demoData=(await this.db.query('SELECT 1 FROM users WHERE demo_seed_batch IS NOT NULL AND deleted_at IS NULL LIMIT 1')).length>0;
  return {favorites,mine:mine.map(x=>x.recipeId),favoriteRevision:Number(owner.discovery_favorite_version),favoriteSyncMode:'explicit-local-snapshot',hotSearches,demoHotSearches,rankingBasis:'real-users',demoData,updatedAt:new Date().toISOString()};
 }
 @Put('favorites/:id') async favorite(@User() user:Identity,@Param('id') id:string,@Body() body:SaveFavorite):Promise<unknown>{
  if(id.length>100||(body.saved&&!await this.exists(id)))throw new BadRequestException('只能统计当前公开或内置菜谱的收藏');
  return this.db.transaction(async c=>{
   await c.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.userId]);
   if(body.saved)await c.query('INSERT INTO discovery_favorite(user_id,recipe_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[user.userId,id]);
   else await c.query('DELETE FROM discovery_favorite WHERE user_id=$1 AND recipe_id=$2',[user.userId,id]);
   const revision=await c.query('UPDATE users SET discovery_favorite_version=discovery_favorite_version+1 WHERE id=$1 RETURNING discovery_favorite_version',[user.userId]);
   const r=await c.query('SELECT count(*)::int AS count,count(*) FILTER(WHERE a.demo_seed_batch IS NULL)::int AS "realCount",count(*) FILTER(WHERE a.demo_seed_batch IS NOT NULL)::int AS "demoCount" FROM discovery_favorite f JOIN users a ON a.id=f.user_id AND a.deleted_at IS NULL WHERE recipe_id=$1',[id]);return {recipeId:id,saved:body.saved,count:r.rows[0].count,realCount:r.rows[0].realCount,demoCount:r.rows[0].demoCount,favoriteRevision:Number(revision.rows[0].discovery_favorite_version)};
  });
 }
 /** Explicit one-way publication: the current local list wins. Never hydrate local favorites from summary.mine. */
 @Post('favorites/snapshot') async publishFavorites(@User() user:Identity,@Body() body:PublishFavorites):Promise<unknown>{
  if(body.confirmed!==true||!Array.isArray(body.recipeIds)||body.recipeIds.length>5000||body.recipeIds.some(id=>typeof id!=='string'||!id.trim()||id.length>100)||!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)throw new BadRequestException('请确认发布当前本机收藏列表');
  const requested=Array.from(new Set(body.recipeIds));
  return this.db.transaction(async c=>{
   const [owner]=(await c.query('SELECT discovery_favorite_version FROM users WHERE id=$1 FOR UPDATE',[user.userId])).rows;
   if(Number(owner.discovery_favorite_version)!==body.expectedRevision)throw new ConflictException('其他设备已更新收藏热度，请刷新后确认本机列表再发布');
   // Eligibility is checked in the same statement; private, unknown and withdrawn IDs never affect counts.
   const eligible=(await c.query(`SELECT DISTINCT wanted.id FROM unnest($1::text[]) wanted(id)
    WHERE EXISTS(SELECT 1 FROM recipe_catalog r WHERE r.id::text=wanted.id)
    OR EXISTS(SELECT 1 FROM catalog_submission s WHERE s.source_id::text=wanted.id AND s.kind='recipe' AND s.status='approved')`,[requested])).rows.map(row=>row.id as string);
   await c.query('DELETE FROM discovery_favorite WHERE user_id=$1 AND NOT(recipe_id=ANY($2::text[]))',[user.userId,eligible]);
   await c.query('INSERT INTO discovery_favorite(user_id,recipe_id) SELECT $1,id FROM unnest($2::text[]) wanted(id) ON CONFLICT DO NOTHING',[user.userId,eligible]);
   const [updated]=(await c.query('UPDATE users SET discovery_favorite_version=discovery_favorite_version+1 WHERE id=$1 RETURNING discovery_favorite_version',[user.userId])).rows;
   return {published:true,favoriteRevision:Number(updated.discovery_favorite_version),publishedCount:eligible.length,ignoredCount:requested.length-eligible.length,localDataChanged:false,personalSyncChanged:false};
  });
 }
 @Post('searches') async search(@User() user:Identity,@Body() body:SearchEvent):Promise<unknown>{
  const term=body.term.normalize('NFKC').trim().replace(/\s+/g,' ');
  if(term.length<2||term.length>40)throw new BadRequestException('搜索词长度无效');
  // Only public dictionary terms may enter a public leaderboard. Never publish free text.
  const allowed=INGREDIENT_GROUPS.some(g=>g.label===term||g.names.includes(term))||!!(await this.db.query('SELECT 1 FROM recipe_catalog WHERE name=$1 LIMIT 1',[term])).length;
  if(!allowed)return {recorded:false};
  await this.db.transaction(async c=>{await c.query('DELETE FROM discovery_search WHERE searched_on<CURRENT_DATE-30');await c.query('INSERT INTO discovery_search(user_id,term) VALUES($1,$2) ON CONFLICT DO NOTHING',[user.userId,term]);});
  return {recorded:true};
 }
}
