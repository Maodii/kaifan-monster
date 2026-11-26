import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir,readFile,writeFile } from 'node:fs/promises';
import { JwtService } from '@nestjs/jwt';
import { Database } from '../src/database';
import { AuthService } from '../src/auth';
import { AccountLifecycle } from '../src/account-lifecycle';
import { SocialService,SocialController } from '../src/social';
import type { Cache } from '../src/cache';
async function main(){
 const adminDb=new Database(),db=new Database(),schema='community_test_'+randomUUID().replaceAll('-','');db.pool.options.options='-c search_path='+schema;let created=false,passed=false;const checks:string[]=[];
 const cache={get:async()=>null,set:async()=>{},drop:async()=>{}} as unknown as Cache;
 const auth=new AuthService(db,new JwtService({secret:'isolated-community-test-long-secret-credentials'}),cache),social=new SocialService(db),controller=new SocialController(db,social,cache);
 const password='community-test-password-long1';
 try{
  await adminDb.query('CREATE SCHEMA '+schema);created=true;for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await db.query(await readFile('migrations/'+f,'utf8'));
  const users=[];for(let i=0;i<3;i++){const session:any=await auth.register(`community-${i}@example.test`,password,'synthetic-device');users.push({userId:session.userId,deviceId:session.deviceId,role:'user'});}
  const [a,b,c]=users,admin={...a,role:'admin'};
  async function post(visibility:'public'|'private'|'family',familyId?:string){const id=randomUUID();await db.query('INSERT INTO meal_records(id,user_id,device_id,payload) VALUES($1,$2,$3,$4)',[id,a.userId,a.deviceId,{name:'synthetic-meal',estimatedCost:99,items:[{name:'synthetic-dish',estimatedCost:99}]}]);return await social.publish(a,{sourceId:id,kind:'meal',visibility,showPrice:false,confirmed:true,...(familyId?{familyId}:{})}) as any;}
  const pending=await post('public'),privatePost=await post('private');await assert.rejects(()=>social.accessible(b,pending.id));await assert.rejects(()=>social.favorite(b,privatePost.id,true));checks.push('Pending/private posts inaccessible to other accounts');
  await social.follow(b,a.userId,true);await social.follow(b,a.userId,true);await assert.rejects(()=>social.follow(a,a.userId,true));assert.equal((await controller.relationship(b,a.userId) as any).followers,1);assert.equal((await controller.list(b,'following') as any[]).length,0);
  await assert.rejects(()=>controller.review(b,pending.id,{status:'approved'}));await controller.review(admin,pending.id,{status:'approved'});await controller.review(admin,pending.id,{status:'approved'});
  assert.equal((await controller.list(b,'following') as any[]).length,1);assert.equal((await controller.notifications(b) as any).items.filter((n:any)=>n.kind==='new-post').length,1);assert.equal((await controller.notifications(c) as any).items.length,0);checks.push('Follow idempotency/self-follow prevention, approval-only following feed, one new-post message after repeated review');
  await social.favorite(b,pending.id,true);await social.favorite(b,pending.id,true);const detail:any=await social.accessible(b,pending.id);assert.equal(detail.favorite_count,1);assert.equal(detail.favorited,true);assert.equal(detail.payload.estimatedCost,undefined);assert.equal(detail.payload.items[0].estimatedCost,undefined);assert.equal((await controller.list(b,'favorites') as any[]).length,1);assert.equal((await controller.list(c,'favorites') as any[]).length,0);checks.push('Favorites isolated/idempotent with visible real counts; nested price privacy preserved');
  await social.like(b,pending.id,true);await social.like(b,pending.id,true);assert.equal((await controller.notifications(a) as any).items.filter((n:any)=>n.kind==='like').length,1);
  const comment:any=await social.comment(b,pending.id,{body:'synthetic-comment'});await social.comment(a,pending.id,{body:'synthetic-reply',parentId:comment.id});const second=await post('public');await controller.review(admin,second.id,{status:'approved'});await assert.rejects(()=>social.comment(c,second.id,{body:'bad-parent',parentId:comment.id}));
  const bNotifications:any=await controller.notifications(b);assert(bNotifications.items.some((n:any)=>n.kind==='reply'));const owned=bNotifications.items[0];await assert.rejects(()=>controller.readOne(c,owned.id));await controller.readOne(b,owned.id);await controller.readAll(b);assert.equal((await controller.notifications(b,'true') as any).unreadCount,0);checks.push('Like/comment/reply messages, cross-post parent rejection, per-account read/mark-all isolation');
  await social.like(b,pending.id,false);assert.equal((await controller.notifications(a) as any).items.filter((n:any)=>n.kind==='like').length,0);
  await controller.remove(a,pending.id);await assert.rejects(()=>social.accessible(b,pending.id));await assert.rejects(()=>social.favorite(b,pending.id,true));await assert.rejects(()=>social.like(b,pending.id,true));assert.equal((await controller.list(b,'favorites') as any[]).length,0);assert(!(await controller.notifications(b) as any).items.some((n:any)=>n.post_id===pending.id));await social.favorite(b,pending.id,false);checks.push('Withdrawn posts disappear from favorites/notifications, reject later interactions, allow removal of stale favorite');
  const family=randomUUID();await db.query('INSERT INTO family_group(id,name,owner_id,invite_code) VALUES($1,$2,$3,$4)',[family,'synthetic-family',a.userId,randomUUID()]);for(const u of [a,b])await db.query('INSERT INTO family_member VALUES($1,$2,$3)',[family,u.userId,u===a?'admin':'member']);const familyPost=await post('family',family);await social.favorite(b,familyPost.id,true);const familyComment:any=await social.comment(b,familyPost.id,{body:'family-comment'});await social.comment(a,familyPost.id,{body:'family-reply',parentId:familyComment.id});assert((await controller.notifications(b) as any).items.some((n:any)=>n.post_id===familyPost.id));
  await db.query('DELETE FROM family_member WHERE family_id=$1 AND user_id=$2',[family,b.userId]);await assert.rejects(()=>social.accessible(b,familyPost.id));assert.equal((await controller.list(b,'favorites') as any[]).length,0);assert(!(await controller.notifications(b) as any).items.some((n:any)=>n.post_id===familyPost.id));checks.push('Family revocation immediately hides saved posts and reply messages');
  await social.follow(b,a.userId,false);assert.equal((await controller.relationship(b,a.userId) as any).following,false);await social.follow(b,a.userId,true);await social.favorite(b,second.id,true);await new AccountLifecycle(db).close(b,password,'注销我的账号');
  for(const table of ['social_favorite','social_notification'])assert.equal((await db.query(`SELECT count(*)::int AS count FROM ${table} WHERE user_id=$1`,[b.userId]))[0].count,0);assert.equal((await db.query('SELECT count(*)::int AS count FROM social_follow WHERE follower_id=$1 OR following_id=$1',[b.userId]))[0].count,0);await assert.rejects(()=>social.follow(c,b.userId,true));checks.push('Account closure removes follow/favorite/message relationships; closed targets cannot be followed');
  passed=true;
 }finally{
  await db.onModuleDestroy();if(created)await adminDb.query('DROP SCHEMA '+schema+' CASCADE');await adminDb.onModuleDestroy();await writeFile('../work/reports/community-relations-integration.json',JSON.stringify({passed,checks,scope:'Real PostgreSQL isolated schema, synthetic users and content, service/controller calls; no existing user data or objects touched',cleanup:'Temporary schema removed',limits:['No native community UI or system push notification validation']},null,2)+'\n');
 }
 console.log('PASS community relations:',checks.length,'groups');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
