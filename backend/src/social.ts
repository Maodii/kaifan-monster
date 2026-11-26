import { Body, Controller, Delete, ForbiddenException, Get, Injectable, Param, ParseUUIDPipe, Post, Patch, Query, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { IsUUID, IsIn, IsBoolean, IsOptional, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { randomUUID, createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { Cache } from './cache';
import { Database } from './database';
import { AuthGuard, Identity, User } from './auth';
export class PublishDto {
 @IsUUID() sourceId!:string;
 @IsIn(['meal','recipe']) kind!:'meal'|'recipe';
 @IsIn(['private','family','public']) visibility!:'private'|'family'|'public';
 @IsOptional() @IsUUID() familyId?:string;
 @IsBoolean() showPrice!:boolean;
 @IsBoolean() confirmed!:boolean;
}
export class CommentDto { @IsString() @MinLength(1) @MaxLength(2000) @Matches(/\S/) body!:string; @IsOptional() @IsUUID() parentId?:string; }
export class ReportDto { @IsString() @MinLength(1) @MaxLength(1000) @Matches(/\S/) reason!:string; }
export class ReviewDto { @IsIn(['approved','rejected']) status!:'approved'|'rejected'; }
const postProjection=`p.*,COALESCE((SELECT display_name FROM user_profile WHERE user_id=p.user_id),'小怪朋友') AS author_name,COALESCE((SELECT avatar_preset FROM user_profile WHERE user_id=p.user_id),'tomato') AS author_avatar,(SELECT count(*)::int FROM social_like WHERE post_id=p.id) AS like_count,EXISTS(SELECT 1 FROM social_like WHERE post_id=p.id AND user_id=$2) AS liked,(SELECT count(*)::int FROM social_comment WHERE post_id=p.id) AS comment_count,(SELECT count(*)::int FROM social_favorite WHERE post_id=p.id) AS favorite_count,EXISTS(SELECT 1 FROM social_favorite WHERE post_id=p.id AND user_id=$2) AS favorited`;
const publicFields=new Set(['name','date','mealType','tags','notes','recipeId','ingredients','steps','tips','taste','minutes','people','quantity','unit','items','estimatedPrice','estimatedCost','price','cost','totalCost','totalPrice','referenceCost','referenceTotalCost','cuisine','difficulty','cloudPhoto','photoId','trialOutcome','actualMinutes','trialSubstitution','trialFailure']);
const priceFields=new Set(['estimatedPrice','estimatedCost','price','cost','totalCost','totalPrice','referenceCost','referenceTotalCost']);
const feedScopes=['public','family','private','mine','following','favorites'];
function feedWhere(scope:string):string {
 if(scope==='following')return "p.visibility='public' AND p.status='approved' AND EXISTS(SELECT 1 FROM social_follow f WHERE f.follower_id=$1 AND f.following_id=p.user_id)";
 if(scope==='favorites')return "EXISTS(SELECT 1 FROM social_favorite f WHERE f.user_id=$1 AND f.post_id=p.id) AND (p.user_id=$1 OR (p.visibility='public' AND p.status='approved') OR (p.visibility='family' AND p.status='approved' AND EXISTS(SELECT 1 FROM family_member m WHERE m.family_id=p.family_id AND m.user_id=$1)))";
 if(scope==='mine')return 'p.user_id=$1';
 if(scope==='private')return "p.visibility='private' AND p.user_id=$1";
 if(scope==='family')return "p.visibility='family' AND p.status='approved' AND EXISTS(SELECT 1 FROM family_member m WHERE m.family_id=p.family_id AND m.user_id=$1)";
 return "p.visibility='public' AND p.status='approved'";
}
interface FeedCursor {v:number;scope:string;t:string;id:string;}
function parseFeedCursor(text:string,scope:string):FeedCursor|null {
 if(!text)return null;
 try{if(text.length>700||!/^[a-zA-Z0-9_-]+$/.test(text))throw new Error();const cursor=JSON.parse(Buffer.from(text,'base64url').toString('utf8')) as FeedCursor;
  if(cursor.v!==1||cursor.scope!==scope||typeof cursor.t!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(cursor.t)||!Number.isFinite(Date.parse(cursor.t))||new Date(cursor.t).toISOString().slice(0,19)!==cursor.t.slice(0,19)||typeof cursor.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(cursor.id))throw new Error();return cursor;
 }catch(_){throw new BadRequestException('翻页位置无效，请刷新列表');}
}
function cursorPage(rows:Record<string,any>[],scope:string,social:SocialService,user:Identity):Record<string,unknown>{
 const selected=rows.slice(0,20),hasMore=rows.length>20,last=selected[selected.length-1];
 const nextCursor=hasMore&&last?Buffer.from(JSON.stringify({v:1,scope,t:last.cursor_time,id:last.id})).toString('base64url'):'';
 return {items:selected.map(row=>{const {cursor_time,...post}=row;return social.present(post,user);}),hasMore,nextCursor,pageSize:20};
}
const cursorProjection=`to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_time,EXISTS(SELECT 1 FROM users a WHERE a.id=p.user_id AND a.demo_seed_batch IS NOT NULL) AS demo_data`;
function publicPayload(value:unknown,prices:boolean):unknown {
 if(Array.isArray(value))return value.map(v=>publicPayload(v,prices));
 if(value!==null&&typeof value==='object'){const out:Record<string,unknown>={};for(const [k,v] of Object.entries(value))if(publicFields.has(k)&&(prices||!priceFields.has(k)))out[k]=publicPayload(v,prices);return out;}return value;
}
export function redactPrices(value:unknown):unknown {return publicPayload(value,false);}
@Injectable()
export class SocialService {
 constructor(private readonly db:Database){}
 async accessible(user:Identity,id:string):Promise<Record<string,unknown>>{
  const [post]=await this.db.query(`SELECT ${postProjection} FROM social_post p WHERE p.id=$1 AND (p.user_id=$2 OR (p.visibility='public' AND p.status='approved') OR (p.visibility='family' AND p.status='approved' AND EXISTS(SELECT 1 FROM family_member m WHERE m.family_id=p.family_id AND m.user_id=$2)))`,[id,user.userId]);if(!post)throw new NotFoundException();return this.present(post,user);
 }
 present(post:Record<string,unknown>,user:Identity):Record<string,unknown>{const copy={...post};if(post.user_id!==user.userId)copy.payload=publicPayload(copy.payload,Boolean(post.show_price));return copy;}
 private async activeActor(c:PoolClient,user:Identity):Promise<void>{const row=await c.query('SELECT id FROM users WHERE id=$1 AND deleted_at IS NULL FOR KEY SHARE',[user.userId]);if(!row.rowCount)throw new ForbiddenException('账号不可用');}
 private async lockedPost(c:PoolClient,user:Identity,id:string):Promise<Record<string,any>>{
  await this.activeActor(c,user);
  const [post]=(await c.query("SELECT p.* FROM social_post p WHERE p.id=$1 AND (p.user_id=$2 OR (p.visibility='public' AND p.status='approved') OR (p.visibility='family' AND p.status='approved' AND EXISTS(SELECT 1 FROM family_member m WHERE m.family_id=p.family_id AND m.user_id=$2))) FOR UPDATE",[id,user.userId])).rows;
  if(!post)throw new NotFoundException();return post;
 }
 private async notify(c:PoolClient,recipient:string,actor:string,kind:string,event:string,post?:string,comment?:string):Promise<void>{
  if(recipient===actor)return;
  await c.query("INSERT INTO social_notification(id,user_id,actor_id,kind,event_key,post_id,comment_id) SELECT $1,$2,$3,$4,$5,$6,$7 WHERE EXISTS(SELECT 1 FROM users WHERE id=$2 AND deleted_at IS NULL) ON CONFLICT(user_id,event_key) DO NOTHING",[randomUUID(),recipient,actor,kind,event,post||null,comment||null]);
 }
 async favorite(user:Identity,id:string,enabled:boolean):Promise<unknown>{return this.db.transaction(async c=>{
  if(enabled){await this.lockedPost(c,user,id);await c.query('INSERT INTO social_favorite(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,user.userId]);}
  else await c.query('DELETE FROM social_favorite WHERE post_id=$1 AND user_id=$2',[id,user.userId]);
  return {favorited:enabled};
 });}
 async follow(user:Identity,target:string,enabled:boolean):Promise<unknown>{
  if(target===user.userId)throw new BadRequestException('不能关注自己');
  return this.db.transaction(async c=>{
   await this.activeActor(c,user);
   const [account]=(await c.query('SELECT id FROM users WHERE id=$1 AND deleted_at IS NULL FOR KEY SHARE',[target])).rows;if(!account)throw new NotFoundException();
   if(enabled){const added=await c.query('INSERT INTO social_follow(follower_id,following_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING follower_id',[user.userId,target]);if(added.rowCount)await this.notify(c,target,user.userId,'follow','follow:'+user.userId);}
   else {await c.query('DELETE FROM social_follow WHERE follower_id=$1 AND following_id=$2',[user.userId,target]);await c.query("DELETE FROM social_notification WHERE user_id=$1 AND actor_id=$2 AND kind='follow'",[target,user.userId]);}
   return {following:enabled};
  });
 }
 async like(user:Identity,id:string,enabled:boolean):Promise<unknown>{return this.db.transaction(async c=>{
  const post=await this.lockedPost(c,user,id);
  if(enabled){const added=await c.query('INSERT INTO social_like(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING user_id',[id,user.userId]);if(added.rowCount)await this.notify(c,String(post.user_id),user.userId,'like','like:'+id+':'+user.userId,id);}
  else {await c.query('DELETE FROM social_like WHERE post_id=$1 AND user_id=$2',[id,user.userId]);await c.query("DELETE FROM social_notification WHERE post_id=$1 AND actor_id=$2 AND kind='like'",[id,user.userId]);}
  return {liked:enabled};
 });}
 async comment(user:Identity,id:string,d:CommentDto):Promise<unknown>{return this.db.transaction(async c=>{
  const post=await this.lockedPost(c,user,id);let parent:Record<string,any>|undefined;
  if(d.parentId){parent=(await c.query('SELECT user_id FROM social_comment WHERE id=$1 AND post_id=$2',[d.parentId,id])).rows[0];if(!parent)throw new BadRequestException('回复不属于当前动态');}
  const cid=randomUUID();await c.query('INSERT INTO social_comment(id,post_id,user_id,parent_id,body) VALUES($1,$2,$3,$4,$5)',[cid,id,user.userId,d.parentId||null,d.body.trim()]);
  await this.notify(c,String(post.user_id),user.userId,'comment','comment:'+cid,id,cid);
  if(parent&&parent.user_id!==post.user_id)await this.notify(c,String(parent.user_id),user.userId,'reply','reply:'+cid,id,cid);
  return {id:cid};
 });}
 async notifyFollowers(c:PoolClient,post:Record<string,any>):Promise<void>{
  if(post.visibility!=='public'||post.status!=='approved')return;
  await c.query("INSERT INTO social_notification(id,user_id,actor_id,kind,event_key,post_id) SELECT gen_random_uuid(),f.follower_id,$1,'new-post','new-post:'||$2::text,$2::uuid FROM social_follow f JOIN users u ON u.id=f.follower_id WHERE f.following_id=$1 AND u.deleted_at IS NULL ON CONFLICT(user_id,event_key) DO NOTHING",[post.user_id,post.id]);
 }
 async publish(user:Identity,d:PublishDto):Promise<unknown>{
  if(!d.confirmed)throw new BadRequestException('发布前必须二次确认');
  const table=d.kind==='meal'?'meal_records':'recipes';const [record]=await this.db.query(`SELECT payload FROM ${table} WHERE id=$1 AND user_id=$2 AND NOT deleted`,[d.sourceId,user.userId]);if(!record)throw new ForbiddenException();
  if(d.visibility==='family'){if(!d.familyId)throw new BadRequestException();const [m]=await this.db.query('SELECT 1 FROM family_member WHERE family_id=$1 AND user_id=$2',[d.familyId,user.userId]);if(!m)throw new ForbiddenException();}
  const id=randomUUID();await this.db.query('INSERT INTO social_post(id,user_id,family_id,source_id,kind,visibility,status,show_price,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,user.userId,d.visibility==='family'?d.familyId:null,d.sourceId,d.kind,d.visibility,d.visibility==='public'?'pending':'approved',d.showPrice,record.payload]);return {id,status:d.visibility==='public'?'pending':'approved'};
 }
}
@Controller('community') @UseGuards(AuthGuard)
export class SocialController {
 constructor(private readonly db:Database,private readonly social:SocialService,private readonly cache:Cache){}
 @Post('posts') publish(@User() u:Identity,@Body() d:PublishDto):Promise<unknown>{return this.social.publish(u,d);}
 @Get('posts/page') async page(@User() u:Identity,@Query('scope') scope='public',@Query('cursor') text='',@Query('recipeId') recipeId='',@Query('region') region='',@Query('outcome') outcome='',@Query('data') data='all',@Query('q') query=''):Promise<unknown>{
  if(typeof query!=='string'||query.length>80){throw new BadRequestException('搜索词最多80个字符');}const q=query.trim();
  if(recipeId.length>100||region.length>40||!['','成功','需改进'].includes(outcome)||!['all','real','demo'].includes(data)){throw new BadRequestException('筛选条件无效');}
  if(!feedScopes.includes(scope))throw new BadRequestException('动态分区无效');const filterScope=recipeId||region||outcome||data!=='all'||q?scope+':'+createHash('sha256').update(JSON.stringify(q?[recipeId,region,outcome,data,q]:[recipeId,region,outcome,data])).digest('hex').slice(0,24):scope;const cursor=parseFeedCursor(text,filterScope);
  const rows=await this.db.query(`SELECT ${postProjection.replaceAll('$2','$1')},${cursorProjection} FROM social_post p WHERE (${feedWhere(scope)}) AND ($4::text='' OR p.payload->>'recipeId'=$4 OR p.payload->'items' @> jsonb_build_array(jsonb_build_object('recipeId',$4::text)) OR (p.kind='recipe' AND p.source_id::text=$4)) AND ($5::text='' OR EXISTS(SELECT 1 FROM recipe_catalog c WHERE (c.region=$5 OR c.payload->>'cuisine'=$5) AND (c.id::text=p.payload->>'recipeId' OR p.payload->'items' @> jsonb_build_array(jsonb_build_object('recipeId',c.id::text)) OR (p.kind='recipe' AND c.id=p.source_id)))) AND ($6::text='' OR p.payload->>'trialOutcome'=$6) AND ($7='all' OR ($7='demo')=EXISTS(SELECT 1 FROM users author WHERE author.id=p.user_id AND author.demo_seed_batch IS NOT NULL)) AND ($8::text='' OR strpos(lower(concat_ws(' ',p.payload->>'name',p.payload->>'notes',p.payload->>'tags',p.payload->>'trialFailure',p.payload->>'trialSubstitution')),lower($8))>0) AND ($2::timestamptz IS NULL OR (p.created_at,p.id)<($2::timestamptz,$3::uuid)) ORDER BY p.created_at DESC,p.id DESC LIMIT 21`,[u.userId,cursor?.t||null,cursor?.id||null,recipeId,region,outcome,data,q]);
  return cursorPage(rows,filterScope,this.social,u);
 }
 @Get('recipes/:recipeId/trials') async trials(@Param('recipeId') recipeId:string):Promise<unknown>{
  if(!recipeId.trim()||recipeId.length>100){throw new BadRequestException('菜谱标识无效');}
  const [stats]=await this.db.query(`WITH latest AS (SELECT DISTINCT ON (p.user_id) p.user_id,p.payload FROM social_post p JOIN users u ON u.id=p.user_id WHERE p.kind='meal' AND p.visibility='public' AND p.status='approved' AND u.deleted_at IS NULL AND u.demo_seed_batch IS NULL AND p.payload->>'trialOutcome' IN ('成功','需改进') AND CASE WHEN jsonb_typeof(p.payload->'items')='array' THEN jsonb_array_length(p.payload->'items') ELSE 0 END<=1 AND (p.payload->>'recipeId'=$1 OR p.payload->'items' @> jsonb_build_array(jsonb_build_object('recipeId',$1::text))) ORDER BY p.user_id,p.created_at DESC,p.id DESC) SELECT count(*)::int AS participants,count(*) FILTER(WHERE payload->>'trialOutcome'='成功')::int AS success,count(*) FILTER(WHERE payload->>'trialOutcome'='需改进')::int AS needs_improvement,round(avg(CASE WHEN jsonb_typeof(payload->'actualMinutes')='number' AND (payload->>'actualMinutes')::numeric BETWEEN 1 AND 2880 THEN (payload->>'actualMinutes')::numeric END))::int AS average_minutes FROM latest`,[recipeId]);
  return {...stats,recipeId,evidence:'用户自报',verified:false,excludesDemo:true,deduplication:'每位用户最近一次公开试做'};
 }
 @Get('recipes/:recipeId/works/page') async worksPage(@User() u:Identity,@Param('recipeId') recipeId:string,@Query('cursor') text=''):Promise<unknown>{
  if(!recipeId.trim()||recipeId.length>100)throw new BadRequestException();const scope='recipe:'+recipeId,cursor=parseFeedCursor(text,scope);
  const rows=await this.db.query(`SELECT ${postProjection},${cursorProjection} FROM social_post p WHERE p.visibility='public' AND p.status='approved' AND p.kind='meal' AND (p.payload->>'recipeId'=$1 OR p.payload->'items' @> jsonb_build_array(jsonb_build_object('recipeId',$1::text))) AND EXISTS(SELECT 1 FROM meal_photo ph JOIN meal_records m ON m.id=ph.meal_id WHERE ph.id::text=p.payload->>'photoId' AND ph.status='uploaded' AND m.id=p.source_id AND NOT m.deleted) AND ($3::timestamptz IS NULL OR (p.created_at,p.id)<($3::timestamptz,$4::uuid)) ORDER BY p.created_at DESC,p.id DESC LIMIT 21`,[recipeId,u.userId,cursor?.t||null,cursor?.id||null]);
  return cursorPage(rows,scope,this.social,u);
 }
 @Get('posts') async list(@User() u:Identity,@Query('scope') scope='public'):Promise<unknown>{
  if(!['public','family','private','mine','following','favorites'].includes(scope))throw new BadRequestException();
  if(scope==='following'||scope==='favorites'){
   const rows=await this.db.query(`SELECT ${postProjection.replaceAll('$2','$1')} FROM social_post p WHERE ${scope==='following'?"p.visibility='public' AND p.status='approved' AND EXISTS(SELECT 1 FROM social_follow f WHERE f.follower_id=$1 AND f.following_id=p.user_id)":"EXISTS(SELECT 1 FROM social_favorite f WHERE f.user_id=$1 AND f.post_id=p.id) AND (p.user_id=$1 OR (p.visibility='public' AND p.status='approved') OR (p.visibility='family' AND p.status='approved' AND EXISTS(SELECT 1 FROM family_member m WHERE m.family_id=p.family_id AND m.user_id=$1)))"} ORDER BY p.created_at DESC,p.id LIMIT 100`,[u.userId]);return rows.map(p=>this.social.present(p,u));
  }
  const rows=await this.db.query(`SELECT ${postProjection.replaceAll('$2','$1')} FROM social_post p WHERE (($2='mine' AND p.user_id=$1) OR (p.visibility=$2 AND (($2='public' AND p.status='approved') OR ($2='private' AND p.user_id=$1) OR ($2='family' AND p.status='approved' AND EXISTS(SELECT 1 FROM family_member m WHERE m.family_id=p.family_id AND m.user_id=$1))))) ORDER BY p.created_at DESC LIMIT 100`,[u.userId,scope]);return rows.map(p=>this.social.present(p,u));
 }
 @Get('recipes/:recipeId/works') async recipeWorks(@User() u:Identity,@Param('recipeId') recipeId:string):Promise<unknown>{
  if(!recipeId.trim()||recipeId.length>100)throw new BadRequestException();
  const rows=await this.db.query(`SELECT ${postProjection} FROM social_post p WHERE p.visibility='public' AND p.status='approved' AND p.kind='meal' AND (p.payload->>'recipeId'=$1 OR p.payload->'items' @> jsonb_build_array(jsonb_build_object('recipeId',$1::text))) AND EXISTS(SELECT 1 FROM meal_photo ph JOIN meal_records m ON m.id=ph.meal_id WHERE ph.id::text=p.payload->>'photoId' AND ph.status='uploaded' AND m.id=p.source_id AND NOT m.deleted) ORDER BY p.created_at DESC LIMIT 30`,[recipeId,u.userId]);return rows.map(p=>this.social.present(p,u));
 }
 @Get('users/:id') async profile(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{const rows=await this.db.query(`SELECT ${postProjection} FROM social_post p WHERE p.user_id=$1 AND p.visibility='public' AND p.status='approved' ORDER BY p.created_at DESC LIMIT 100`,[id,u.userId]);return rows.map(p=>this.social.present(p,u));}
 @Delete('posts/:id') async remove(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{const rows=await this.db.query("UPDATE social_post SET status='rejected' WHERE id=$1 AND (user_id=$2 OR $3='admin') RETURNING id",[id,u.userId,u.role]);if(!rows.length)throw new ForbiddenException();return {withdrawn:true};}
 @Post('admin/reports/:id/review') async reviewReport(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:ReviewDto):Promise<unknown>{if(u.role!=='admin')throw new ForbiddenException();return this.db.transaction(async c=>{const report=(await c.query('UPDATE reports SET status=$1 WHERE id=$2 RETURNING post_id',[d.status,id])).rows[0];if(!report)throw new NotFoundException();if(d.status==='approved')await c.query("UPDATE social_post SET status='rejected' WHERE id=$1",[report.post_id]);return {reviewed:true};});}
 @Get('users/:id/relationship') async relationship(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{
  const [account]=await this.db.query('SELECT id FROM users WHERE id=$1 AND deleted_at IS NULL',[id]);if(!account)throw new NotFoundException();
  const [row]=await this.db.query('SELECT EXISTS(SELECT 1 FROM social_follow WHERE follower_id=$1 AND following_id=$2) AS following,(SELECT count(*)::int FROM social_follow WHERE following_id=$2) AS followers,(SELECT count(*)::int FROM social_follow WHERE follower_id=$2) AS following_count',[u.userId,id]);return row;
 }
 @Post('users/:id/follow') follow(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.social.follow(u,id,true);}
 @Delete('users/:id/follow') unfollow(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.social.follow(u,id,false);}
 @Post('posts/:id/favorite') favorite(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.social.favorite(u,id,true);}
 @Delete('posts/:id/favorite') unfavorite(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.social.favorite(u,id,false);}
 @Get('notifications') async notifications(@User() u:Identity,@Query('unread') unread='false'):Promise<unknown>{
  if(!['true','false'].includes(unread))throw new BadRequestException('消息筛选无效');
  const accessible="n.user_id=$1 AND a.deleted_at IS NULL AND (n.post_id IS NULL OR (p.status='approved' AND (p.user_id=$1 OR p.visibility='public' OR (p.visibility='family' AND EXISTS(SELECT 1 FROM family_member m WHERE m.family_id=p.family_id AND m.user_id=$1)))))";
  const rows=await this.db.query(`SELECT n.id,n.kind,n.actor_id,n.post_id,n.comment_id,n.read_at,n.created_at,COALESCE(pr.display_name,'小怪朋友') AS actor_name FROM social_notification n JOIN users a ON a.id=n.actor_id LEFT JOIN user_profile pr ON pr.user_id=n.actor_id LEFT JOIN social_post p ON p.id=n.post_id WHERE ${accessible} AND ($2='false' OR n.read_at IS NULL) ORDER BY n.created_at DESC,n.id LIMIT 100`,[u.userId,unread]);
  const [counts]=await this.db.query(`SELECT count(*)::int AS count FROM social_notification n JOIN users a ON a.id=n.actor_id LEFT JOIN social_post p ON p.id=n.post_id WHERE ${accessible} AND n.read_at IS NULL`,[u.userId]);
  return {items:rows,unreadCount:counts.count};
 }
 @Post('notifications/read') readAllCompatible(@User() u:Identity):Promise<unknown>{return this.readAll(u);}
 @Post('notifications/:id/read') readOneCompatible(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.readOne(u,id);}
 @Patch('notifications/read') async readAll(@User() u:Identity):Promise<unknown>{await this.db.query('UPDATE social_notification SET read_at=now() WHERE user_id=$1 AND read_at IS NULL',[u.userId]);return {read:true};}
 @Patch('notifications/:id/read') async readOne(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{const rows=await this.db.query('UPDATE social_notification SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING id',[id,u.userId]);if(!rows.length)throw new NotFoundException();return {read:true};}
 @Get('posts/:id') detail(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.social.accessible(u,id);}
 @Get('posts/:id/likes') async likeCount(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{await this.social.accessible(u,id);let count=await this.cache.get<number>('likes:'+id);if(count===null){const [row]=await this.db.query('SELECT count(*) FROM social_like WHERE post_id=$1',[id]);count=Number(row.count);await this.cache.set('likes:'+id,count,30);}return {count};}
 @Post('posts/:id/like') async like(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{const result=await this.social.like(u,id,true);await this.cache.drop('likes:'+id);return result;}
 @Delete('posts/:id/like') async unlike(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{const result=await this.social.like(u,id,false);await this.cache.drop('likes:'+id);return result;}
 @Get('posts/:id/comments') async comments(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{await this.social.accessible(u,id);return this.db.query('SELECT id,user_id,parent_id,body,created_at FROM social_comment WHERE post_id=$1 ORDER BY created_at LIMIT 200',[id]);}
 @Post('posts/:id/comments') comment(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:CommentDto):Promise<unknown>{return this.social.comment(u,id,d);}
 @Post('posts/:id/reports') async report(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:ReportDto):Promise<unknown>{await this.social.accessible(u,id);const rid=randomUUID();await this.db.query('INSERT INTO reports(id,post_id,user_id,reason) VALUES($1,$2,$3,$4)',[rid,id,u.userId,d.reason]);return {id:rid};}
 @Get('admin/pending') async pending(@User() u:Identity):Promise<unknown>{if(u.role!=='admin')throw new ForbiddenException();return {posts:await this.db.query("SELECT * FROM social_post WHERE status='pending' ORDER BY created_at LIMIT 100"),reports:await this.db.query("SELECT * FROM reports WHERE status='pending' ORDER BY created_at LIMIT 100")};}
 @Post('admin/posts/:id/review') async review(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string,@Body() d:ReviewDto):Promise<unknown>{if(u.role!=='admin')throw new ForbiddenException();return this.db.transaction(async c=>{const [row]=(await c.query('UPDATE social_post SET status=$1 WHERE id=$2 RETURNING *',[d.status,id])).rows;if(!row)throw new NotFoundException();await this.social.notifyFollowers(c,row);return {id:row.id,status:row.status};});}
}
