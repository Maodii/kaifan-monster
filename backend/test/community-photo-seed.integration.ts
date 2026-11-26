import 'reflect-metadata';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {Database} from '../src/database';
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
async function main(){const db=new Database(),checks:string[]=[];let passed=false;try{
 const seed=JSON.parse(await readFile('../work/reports/community-photo-seed.json','utf8'));assert.equal(seed.count,8);assert.equal(new Set(seed.items.map((x:any)=>x.photoId)).size,8);assert.equal(new Set(seed.items.map((x:any)=>x.sha256)).size,8);
 const fingerprint=async()=>sha(Buffer.from(JSON.stringify(await db.query('SELECT id,email,password_hash,global_version,deleted_at FROM users WHERE demo_seed_batch IS NULL ORDER BY id'))));const before=await fingerprint();
 const rerun=spawnSync(process.execPath,['--env-file=../.env','--import','tsx','scripts/seed-community-photos.ts'],{encoding:'utf8',timeout:60000});assert.equal(rerun.status,0,rerun.stderr);assert.equal(await fingerprint(),before);const again=JSON.parse(await readFile('../work/reports/community-photo-seed.json','utf8'));assert.deepEqual(again.items.map((x:any)=>[x.postId,x.photoId,x.sha256]),seed.items.map((x:any)=>[x.postId,x.photoId,x.sha256]));checks.push('8 unique photos/posts; repeated seed reuses IDs; ordinary identities unchanged');
 const rows=await db.query("SELECT p.user_id,p.payload,m.payload AS meal,ph.status,ph.user_id AS photo_owner FROM social_post p JOIN meal_records m ON m.id=p.source_id JOIN meal_photo ph ON ph.id::text=p.payload->>'photoId' JOIN users u ON u.id=p.user_id WHERE p.payload->>'demoBatch'=$1 AND p.visibility='public' AND p.status='approved' AND u.demo_seed_batch='example-seed-batch'",[seed.batch]);assert.equal(rows.length,8);assert(rows.every(x=>x.user_id===x.photo_owner&&x.status==='uploaded'&&x.payload.photoId===x.meal.photoId&&typeof x.payload.tags==='string'&&x.payload.notes.includes('AI生成配图')));checks.push('Photo ownership/meal linkage and native-compatible strings; visible AI attribution');
 const password=JSON.parse(await readFile('../work/demo-seed-credentials.json','utf8')).password;
 for(const port of [3000,3001]){const base=`http://127.0.0.1:${port}/api/v1`;const login=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'demo09@kaifan.example.test',password,deviceName:'community-photo-verification'})});assert.equal(login.status,201);const s:any=await login.json(),headers={Authorization:'Bearer '+s.accessToken};try{
  const feed=await (await fetch(base+'/community/posts',{headers})).json() as any[];assert(seed.items.every((x:any)=>feed.slice(0,20).some(p=>p.id===x.postId&&p.payload.photoId===x.photoId)));let works=0;
  for(const item of seed.items){assert.equal((await fetch(base+'/photos/'+item.photoId+'/download')).status,401);const read=await fetch(base+'/photos/'+item.photoId+'/download',{headers});assert.equal(read.status,200);const info:any=await read.json();const image=await fetch(info.url);assert.equal(image.status,200);assert(image.headers.get('content-type')?.includes('image/jpeg'));assert.equal(sha(Buffer.from(await image.arrayBuffer())),item.sha256);const unsigned=new URL(info.url);unsigned.search='';assert.equal((await fetch(unsigned)).status,403);
   if(item.recipeId){const result=await fetch(base+'/community/recipes/'+item.recipeId+'/works',{headers});assert.equal(result.status,200);assert((await result.json() as any[]).some(p=>p.id===item.postId));works++;}
  }checks.push(`HTTP ${port}: 8 first-page photos, signed JPEG hashes, denied anonymous reads, ${works} matching recipe showcases`);
 }finally{await fetch(base+'/auth/logout',{method:'POST',headers});await db.query("DELETE FROM devices WHERE id=$1 AND user_id=$2 AND name='community-photo-verification'",[s.deviceId,s.userId]);}}
 passed=true;
 }finally{await db.onModuleDestroy();await writeFile('../work/reports/community-photo-verification.json',JSON.stringify({passed,checks,scope:'Actual local PostgreSQL, private object storage and both APIs; synthetic posts only',nativeVerified:false},null,2)+'\n');}console.log('PASS community photos:',checks.length,'groups');}
main().catch(e=>{console.error(e);process.exitCode=1;});
