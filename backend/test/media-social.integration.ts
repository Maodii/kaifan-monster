import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../src/database';
import {PhotoService} from '../src/photos';
const base='http://127.0.0.1:3000/api/v1';
const users:string[]=[];const db=new Database();
type Data=Record<string,any>;
async function req(path:string,method='GET',body?:unknown,token?:string):Promise<{status:number;data:Data}>{const r=await fetch(base+path,{method,headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json() as Data};}
async function reg():Promise<Data>{const r=await req('/auth/register','POST',{email:`media-${randomUUID()}@example.test`,password:'test-password-very-long1',deviceName:'media-test'});assert.equal(r.status,201);users.push(r.data.userId);const email=(await db.query('SELECT email FROM users WHERE id=$1',[r.data.userId]))[0].email;const login=await req('/auth/login','POST',{email,password:'test-password-very-long1',deviceName:'media-login'});assert.equal(login.status,201);assert.equal(login.data.userId,r.data.userId);return login.data;}
async function main():Promise<void>{
 const a=await reg(),b=await reg(),admin=await reg();await db.query("UPDATE users SET role='admin' WHERE id=$1",[admin.userId]);const id=randomUUID();
 async function push(entityId:string,type:string,payload:unknown,version=0,op='upsert'){return req('/sync/push','POST',{changes:[{changeId:randomUUID(),entityId,entityType:type,operation:op,baseVersion:version,modifiedAt:new Date().toISOString(),payload}]},a.accessToken);}
 assert.equal((await push(randomUUID(),'food_items',{name:'非法数量',quantity:-1,unit:'个',expiryDate:'2026-11-20'})).status,400);
 assert.equal((await push(randomUUID(),'food_items',{name:'非法日期',quantity:1,unit:'个',expiryDate:'2026-02-30'})).status,400);
 assert.equal((await push(id,'meal_records',{name:'测试餐',date:new Date().toISOString(),estimatedCost:25,visibility:'private',items:[{name:'汤',estimatedPrice:25,estimatedCost:25}]})).status,201);
 assert.equal((await push(randomUUID(),'meal_records',{name:'金额不一致',date:new Date().toISOString(),estimatedCost:10,items:[{name:'菜',estimatedCost:11}]})).status,400);
 assert.equal((await req('/community/posts')).status,401);
 assert.equal((await req('/community/posts','POST',{sourceId:id,kind:'meal',visibility:'public',showPrice:false,confirmed:true},b.accessToken)).status,403);
 const privatePost=await req('/community/posts','POST',{sourceId:id,kind:'meal',visibility:'private',showPrice:true,confirmed:true},a.accessToken);assert.equal(privatePost.status,201);
 assert.equal((await req(`/community/posts/${privatePost.data.id}`,'GET',undefined,b.accessToken)).status,404);
 assert.equal((await req(`/community/posts/${privatePost.data.id}`,'DELETE',undefined,b.accessToken)).status,403);
 const family=await req('/families','POST',{name:'社区联调家庭'},a.accessToken);assert.equal(family.status,201);
 assert.equal((await req('/families/join','POST',{inviteCode:family.data.inviteCode},b.accessToken)).status,201);
 assert.equal((await req('/community/posts','POST',{sourceId:id,kind:'meal',visibility:'family',showPrice:true,confirmed:true},a.accessToken)).status,400);
 const familyPost=await req('/community/posts','POST',{sourceId:id,kind:'meal',visibility:'family',familyId:family.data.id,showPrice:true,confirmed:true},a.accessToken);assert.equal(familyPost.status,201);assert.equal(familyPost.data.status,'approved');
 assert.equal((await req(`/community/posts/${familyPost.data.id}`,'GET',undefined,b.accessToken)).status,200);
 assert.equal((await req(`/community/posts/${familyPost.data.id}`,'GET',undefined,admin.accessToken)).status,404);
 assert.equal((await req('/community/posts?scope=family','GET',undefined,b.accessToken)).data.some((p:Data)=>p.id===familyPost.data.id),true);
 assert.equal((await req(`/community/posts/${familyPost.data.id}`,'DELETE',undefined,a.accessToken)).status,200);
 assert.equal((await req(`/community/posts/${familyPost.data.id}`,'GET',undefined,b.accessToken)).status,404,'withdrawn family post must be inaccessible');
 assert.equal((await req('/community/posts?scope=family','GET',undefined,b.accessToken)).data.some((p:Data)=>p.id===familyPost.data.id),false,'withdrawn family post must disappear from feed');
 assert.equal((await req('/community/posts?scope=mine','GET',undefined,a.accessToken)).data.find((p:Data)=>p.id===familyPost.data.id).status,'rejected');

 const ps=await req('/photos/presign','POST',{mealId:id,contentType:'image/jpeg'},a.accessToken);assert.equal(ps.status,201);
 assert.equal((await req('/photos/presign','POST',{mealId:id,contentType:'image/jpeg'},b.accessToken)).status,403);
 // 内存中的最小JPEG验证对象直传；服务端不接收图片二进制。
 const jpeg=Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdAB//2Q==','base64');
 assert.equal((await fetch(ps.data.uploadUrl,{method:'PUT',headers:{'content-type':'image/jpeg'},body:jpeg})).status,200);
 assert.equal((await req(`/photos/${ps.data.id}/complete`,'POST',{},a.accessToken)).status,201);
 assert.equal((await req(`/photos/${ps.data.id}/download`,'GET',undefined,b.accessToken)).status,403);
 const read=await req(`/photos/${ps.data.id}/download`,'GET',undefined,a.accessToken);assert.equal(read.status,200);assert.equal((await fetch(read.data.url)).status,200);
 assert.equal((await push(id,'meal_records',{name:'测试餐',date:new Date().toISOString(),estimatedCost:25,visibility:'private',photoId:ps.data.id,items:[{name:'汤',estimatedPrice:25,estimatedCost:25,recipeId:'soup'}]},1)).status,201);
 const familyPhoto=await req('/community/posts','POST',{sourceId:id,kind:'meal',visibility:'family',familyId:family.data.id,showPrice:false,confirmed:true},a.accessToken);assert.equal(familyPhoto.status,201);
 assert.equal((await req(`/photos/${ps.data.id}/download`,'GET',undefined,b.accessToken)).status,200);
 assert.equal((await req(`/photos/${ps.data.id}/download`,'GET',undefined,admin.accessToken)).status,403);
 assert.equal((await req(`/community/posts/${familyPhoto.data.id}`,'DELETE',undefined,a.accessToken)).status,200);
 assert.equal((await req(`/photos/${ps.data.id}/download`,'GET',undefined,b.accessToken)).status,403);

 assert.equal((await req('/community/recipes/soup/works','GET',undefined,b.accessToken)).data.length,0);
 assert.equal((await req('/community/posts','POST',{sourceId:id,kind:'meal',visibility:'public',showPrice:false,confirmed:false},a.accessToken)).status,400);
 const post=await req('/community/posts','POST',{sourceId:id,kind:'meal',visibility:'public',showPrice:false,confirmed:true},a.accessToken);assert.equal(post.data.status,'pending');assert.equal((await req('/community/posts?scope=mine','GET',undefined,a.accessToken)).data.find((p:Data)=>p.id===post.data.id).status,'pending');assert.equal((await req('/community/posts?scope=public','GET',undefined,b.accessToken)).data.some((p:Data)=>p.id===post.data.id),false);
 assert.equal((await req(`/community/posts/${post.data.id}`,'GET',undefined,b.accessToken)).status,404);
 assert.equal((await req(`/community/admin/posts/${post.data.id}/review`,'POST',{status:'approved'},b.accessToken)).status,403);
 assert.equal((await req(`/community/admin/posts/${post.data.id}/review`,'POST',{status:'approved'},admin.accessToken)).status,201);
 const works=await req('/community/recipes/soup/works','GET',undefined,b.accessToken);assert.equal(works.status,200);assert.equal(works.data.length,1);assert.equal(works.data[0].payload.photoId,ps.data.id);assert.equal('estimatedCost' in works.data[0].payload,false);assert.equal((await req('/community/recipes/greens/works','GET',undefined,b.accessToken)).data.length,0);
 const publicPost=await req(`/community/posts/${post.data.id}`,'GET',undefined,b.accessToken);assert.equal(publicPost.status,200);assert.equal('estimatedCost' in publicPost.data.payload,false);assert.equal('estimatedPrice' in publicPost.data.payload.items[0],false);
 assert.equal((await req(`/photos/${ps.data.id}/download`,'GET',undefined,b.accessToken)).status,200);
 await req(`/community/posts/${post.data.id}/like`,'POST',{},b.accessToken);await req(`/community/posts/${post.data.id}/like`,'POST',{},b.accessToken);
 assert.equal(Number((await db.query('SELECT count(*) FROM social_like WHERE post_id=$1',[post.data.id]))[0].count),1);
 const likedDetail=await req(`/community/posts/${post.data.id}`,'GET',undefined,b.accessToken);assert.equal(likedDetail.data.liked,true);assert.equal(likedDetail.data.like_count,1);assert.equal((await req(`/community/posts/${post.data.id}`,'GET',undefined,a.accessToken)).data.liked,false);assert.equal(typeof likedDetail.data.author_name,'string');
 const authorFeed=await req('/community/users/'+a.userId,'GET',undefined,b.accessToken);assert.equal(authorFeed.data.find((p:Data)=>p.id===post.data.id).liked,true);
 const feed=await req('/community/posts?scope=public','GET',undefined,b.accessToken);assert.equal(feed.data.find((p:Data)=>p.id===post.data.id).liked,true);
 assert.equal((await req(`/community/posts/${post.data.id}/comments`,'POST',{body:'   '},b.accessToken)).status,400);
 assert.equal((await req(`/community/posts/${post.data.id}/reports`,'POST',{reason:'   '},b.accessToken)).status,400);
 const c=await req(`/community/posts/${post.data.id}/comments`,'POST',{body:'这是一条评论'},b.accessToken);assert.equal(c.status,201);
 assert.equal((await req(`/community/posts/${post.data.id}`,'GET',undefined,b.accessToken)).data.comment_count,1);assert.equal((await req(`/community/posts/${post.data.id}/comments`,'GET',undefined,a.accessToken)).data.some((row:Data)=>row.id===c.data.id&&row.body==='这是一条评论'),true);
 assert.equal((await req(`/community/posts/${post.data.id}/like`,'DELETE',undefined,b.accessToken)).status,200);assert.equal((await req(`/community/posts/${post.data.id}`,'GET',undefined,b.accessToken)).data.liked,false);
 const withdrawn=await req('/community/posts','POST',{sourceId:id,kind:'meal',visibility:'public',showPrice:false,confirmed:true},a.accessToken);await req(`/community/admin/posts/${withdrawn.data.id}/review`,'POST',{status:'approved'},admin.accessToken);assert.equal((await req(`/community/posts/${withdrawn.data.id}`,'DELETE',undefined,a.accessToken)).status,200);assert.equal((await req(`/community/posts/${withdrawn.data.id}`,'GET',undefined,b.accessToken)).status,404);
 const report=await req(`/community/posts/${post.data.id}/reports`,'POST',{reason:'集成测试举报'},b.accessToken);assert.equal(report.status,201);
 await req(`/community/admin/posts/${post.data.id}/review`,'POST',{status:'rejected'},admin.accessToken);
 assert.equal((await req(`/community/posts/${post.data.id}`,'GET',undefined,b.accessToken)).status,404);
 assert.equal((await req(`/photos/${ps.data.id}/download`,'GET',undefined,b.accessToken)).status,403);
 assert.equal((await req('/community/recipes/soup/works','GET',undefined,b.accessToken)).data.length,0);
 const barcode=randomUUID();assert.equal((await push(barcode,'barcode_lib',{name:'私有牛奶模板',barcode:'6901234567892',days:7,category:'蛋奶',location:'冷藏室',unit:'盒'})).status,201);
 assert.equal((await req('/catalog/barcodes/6901234567892','GET',undefined,b.accessToken)).data.length,0);
 const submission=await req('/catalog/submissions','POST',{sourceId:barcode,kind:'barcode',confirmed:true},a.accessToken);assert.equal(submission.data.status,'pending');
 await req(`/catalog/admin/${submission.data.id}/review`,'POST',{status:'approved'},admin.accessToken);
 assert.equal((await req('/catalog/barcodes/6901234567892','GET',undefined,b.accessToken)).data.length,1);
 const backup=await req('/insights/backups','POST',{},a.accessToken);assert.equal(backup.status,201);assert.equal((await req(`/insights/backups/${backup.data.id}`,'GET',undefined,b.accessToken)).status,403);
 assert.equal((await push(id,'meal_records',{},2,'delete')).status,201);await db.query("UPDATE object_deletion_jobs SET available_at=now() WHERE photo_id=$1",[ps.data.id]);const cleaner=new PhotoService(db);try{await cleaner.cleanup();assert.equal((await db.query('SELECT id FROM meal_photo WHERE id=$1',[ps.data.id])).length,0);assert.equal((await fetch(read.data.url)).status,404);}finally{cleaner.onModuleDestroy();}
 console.log('PASS payload/date validation / direct private object upload / media authorization / approval / price redaction / likes / comments / reports / barcode review / backup isolation / delete-object queue / approved recipe work gallery / viewer-specific like state / whitespace comment and report rejection / credential login / private and family isolation / family and public withdrawal / family photo access / pending feed isolation / unlike / comment list');
}
async function cleanup(){try{await db.transaction(async c=>{await c.query('DELETE FROM reports WHERE user_id=ANY($1::uuid[])',[users]);await c.query('DELETE FROM social_post WHERE user_id=ANY($1::uuid[])',[users]);await c.query('DELETE FROM catalog_submission WHERE user_id=ANY($1::uuid[])',[users]);await c.query('DELETE FROM user_backup WHERE user_id=ANY($1::uuid[])',[users]);await c.query('DELETE FROM food_change_logs WHERE user_id=ANY($1::uuid[])',[users]);for(const t of ['meal_records','barcode_lib'])await c.query(`DELETE FROM ${t} WHERE user_id=ANY($1::uuid[])`,[users]);await c.query('DELETE FROM family_group WHERE owner_id=ANY($1::uuid[])',[users]);await c.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[users]);});}finally{await db.onModuleDestroy();}}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(cleanup);
