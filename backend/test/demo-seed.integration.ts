import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { Database } from '../src/database';

async function main(){
 const db=new Database(),checks:string[]=[];
 const digest=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
 const normal=()=>db.query('SELECT id,email,password_hash,deleted_at,global_version FROM users WHERE demo_seed_batch IS NULL ORDER BY id');
 let passed=false;
 try{
  const before=digest(await normal());
  const beforeRows=JSON.parse(await readFile('../work/reports/demo-seed.json','utf8'));
  const rerun=spawnSync(process.execPath,['--env-file=../.env','--import','tsx','scripts/seed-demo.ts'],{encoding:'utf8',timeout:60000});
  assert.equal(rerun.status,0,rerun.stderr);
  const afterRows=JSON.parse(await readFile('../work/reports/demo-seed.json','utf8'));
  for(const key of ['accounts','posts','comments','recipe_favorites','searches'])assert.equal(afterRows[key],beforeRows[key],key);
  assert.equal(digest(await normal()),before);checks.push('Repeated seed is idempotent; ordinary identities unchanged');
  const accounts=await db.query("SELECT u.id,u.email,u.role,u.email_verified_at,p.display_name,p.bio FROM users u JOIN user_profile p ON p.user_id=u.id WHERE u.demo_seed_batch='example-seed-batch' ORDER BY u.email");
  assert.equal(accounts.length,24);
  assert(accounts.every(a=>a.role==='user'&&a.email.endsWith('@kaifan.example.test')&&a.display_name.startsWith('演示·')&&!a.email_verified_at));
  checks.push('24 ordinary-role demo identities, reserved test domains, no false email verification');
  const posts=await db.query("SELECT p.payload,p.status,p.visibility FROM social_post p JOIN users u ON u.id=p.user_id WHERE u.demo_seed_batch='example-seed-batch'");
  assert.equal(posts.length,24);assert(posts.every(p=>p.status==='approved'&&p.visibility==='public'&&p.payload.name.startsWith('【演示】')&&p.payload.notes.startsWith('【虚构演示内容】')));
  checks.push('Every synthetic public story carries visible demo attribution');
  const password=JSON.parse(await readFile('../work/demo-seed-credentials.json','utf8')).password;
  for(const port of [3000,3001]){
   const base=`http://127.0.0.1:${port}/api/v1`;
   const login=await fetch(base+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:accounts[0].email,password,deviceName:'demo-seed-verification'})});
   assert.equal(login.status,201);const session:any=await login.json();
   const get=async(path:string)=>{const r=await fetch(base+path,{headers:{authorization:'Bearer '+session.accessToken}});assert.equal(r.status,200,path);return await r.json() as any;};
   try{
    const feed=await get('/community/posts');assert(feed.filter((p:any)=>p.author_name.startsWith('演示·')).length>=24);assert(feed.some((p:any)=>p.like_count>0&&p.comment_count>0&&p.favorite_count>0));
    const following=await get('/community/posts?scope=following');assert(following.length>0);
    const inbox=await get('/community/notifications');assert(inbox.items.length>0);
    const discovery=await get('/discovery/summary');assert.equal(discovery.demoData,true);assert.equal(discovery.favorites[0].count,24);assert(discovery.hotSearches.length>=8);
    const ranking=await get('/catalog/recipes?sort=favorites');assert(Array.isArray(ranking));assert(ranking.length>1);assert(ranking[0].favoriteCount>=ranking[1].favoriteCount);
    checks.push(`HTTP ${port}: login, labeled feed/interactions, following, inbox, demo flag, hot searches and favorite ranking`);
   }finally{
    await fetch(base+'/auth/logout',{method:'POST',headers:{authorization:'Bearer '+session.accessToken}});
    await db.query("DELETE FROM devices WHERE id=$1 AND user_id=$2 AND name='demo-seed-verification'",[session.deviceId,accounts[0].id]);
   }
  }
  passed=true;
 }finally{
  await db.onModuleDestroy();
  await writeFile('../work/reports/demo-seed-verification.json',JSON.stringify({passed,checks,scope:'Actual local PostgreSQL and both HTTP services; synthetic accounts only',nativeVerified:false},null,2)+'\n');
 }
 console.log('PASS demo seed:',checks.length,'groups');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
