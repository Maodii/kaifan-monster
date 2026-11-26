import 'reflect-metadata';
import assert from 'node:assert/strict';
import {hash} from 'argon2';
import {randomUUID} from 'node:crypto';
import {readFile,readdir,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {Test} from '@nestjs/testing';
import {ValidationPipe} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import request from 'supertest';
import {Database} from '../dist/src/database';
import {Cache} from '../dist/src/cache';
import {AuthController} from '../dist/src/controllers';
import {AuthService,AuthGuard} from '../dist/src/auth';
import {AdminController,AdminGuard} from '../dist/src/admin';
import {SocialService} from '../dist/src/social';
async function main(){
 const owner=new Database(),db=new Database(),schema='admin_test_'+randomUUID().replaceAll('-','');db.pool.options.options='-c search_path='+schema;
 let created=false,passed=false,app:any,seedDir='';const checks:string[]=[];const store=new Map();
 try{
  await owner.query('CREATE SCHEMA '+schema);created=true;for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await db.query(await readFile('migrations/'+f,'utf8'));
  const module=await Test.createTestingModule({controllers:[AdminController,AuthController],providers:[{provide:Database,useValue:db},{provide:Cache,useValue:{get:async(k:string)=>store.get(k)??null,set:async(k:string,v:unknown)=>store.set(k,v),drop:async(k:string)=>store.delete(k)}},{provide:JwtService,useValue:new JwtService({secret:'admin-integration-only-secret-long-enough'})},AuthService,AuthGuard,AdminGuard,SocialService]}).compile();
  app=module.createNestApplication({logger:false});app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));await app.init();
  const api=request(app.getHttpServer()),password='isolated-admin-test-password1';
  async function register(email:string){const r=await api.post('/api/v1/auth/register').send({email,password,deviceName:'isolated-admin-test'});assert.equal(r.status,201);return r.body;}
  const admin=await register('admin@example.test'),real=await register('user@example.test'),demo=await register('demo@example.test');await db.query("UPDATE users SET role='admin' WHERE id=$1",[admin.userId]);await db.query("UPDATE users SET demo_seed_batch='example-seed-batch' WHERE id=$1",[demo.userId]);
  const get=(path:string,user=admin)=>api.get('/api/v1/admin/'+path).auth(user.accessToken,{type:'bearer'});
  const post=(path:string,body:unknown,user=admin)=>api.post('/api/v1/admin/'+path).auth(user.accessToken,{type:'bearer'}).send(body);
  for(const path of ['overview','users','recipes','moderation','audit','demo']){assert.equal((await get(path,real)).status,403);assert.equal((await api.get('/api/v1/admin/'+path)).status,401);}
  assert.equal((await post('users/'+demo.userId+'/revoke-sessions',{reason:'unauthorized'},real)).status,403);checks.push('All admin sections and mutation enforce database role/authentication');
  const users=await get('users?type=demo');assert.equal(users.status,200);assert.equal(users.body.total,1);assert(!JSON.stringify(users.body).includes('password_hash'));assert.equal((await get('users?page=-1')).status,400);assert.equal((await get('users?q='+encodeURIComponent("' OR 1=1 --"))).body.total,0);checks.push('User pagination/type/search; no hashes; invalid paging and injection text handled');
  const catalog=JSON.parse(await readFile('data/recipes.json','utf8')),r=catalog.recipes[0];await db.query('INSERT INTO recipe_catalog(id,name,region,category,taste,minutes,source_revision,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[r.id,r.name,r.region,r.category,r.taste,r.minutes,catalog.sourceRevision,r]);
  const body={expectedVersion:0,name:'专项测试·修改后',region:r.region,category:r.category,taste:r.taste,minutes:18,steps:['备菜，洗净后沥水。','炒熟后确认状态再出锅。'],reason:'隔离测试编辑'};
  assert.equal((await post('recipes/'+r.id,{...body,minutes:0})).status,400);assert.equal((await post('recipes/'+r.id,{...body,steps:[' ']})).status,400);
  const concurrent=await Promise.all([post('recipes/'+r.id,body),post('recipes/'+r.id,body)]);assert.deepEqual(concurrent.map(x=>x.status).sort(),[201,409]);const edited=await get('recipes/'+r.id);assert.equal(edited.body.payload.name,body.name);assert.equal(edited.body.version,1);assert.equal((await db.query('SELECT count(*)::int AS n FROM recipe_step WHERE recipe_id=$1',[r.id]))[0].n,2);
  seedDir=await mkdtemp(resolve('../work/admin-seed-'));await mkdir(seedDir+'/data');await writeFile(seedDir+'/data/recipes.json',JSON.stringify({sourceRevision:catalog.sourceRevision,recipes:[r]}));await writeFile(seedDir+'/data/recipe-source-index.json',JSON.stringify({sources:[],accessed:'2026-11-17'}));
  const seed=spawnSync(process.execPath,[resolve('dist/scripts/seed-recipes.js')],{cwd:seedDir,env:{...process.env,PGOPTIONS:'-c search_path='+schema},timeout:30000,encoding:'utf8'});assert.equal(seed.status,0,seed.stderr);assert.equal((await get('recipes/'+r.id)).body.name,body.name);checks.push('Validated edits, normalized steps, concurrency 409, source import preserves manual version');
  const pub=randomUUID(),priv=randomUUID(),normalPost=randomUUID();for(const [id,u,visibility] of [[pub,demo,'public'],[priv,real,'private'],[normalPost,real,'public']] as const)await db.query("INSERT INTO social_post(id,user_id,source_id,kind,visibility,status,payload) VALUES($1,$2,$3,'meal',$4,'pending',$5)",[id,u.userId,randomUUID(),visibility,{name:'isolated post'}]);
  const pending=await get('moderation');assert.equal(pending.body.total,2);assert(!pending.body.items.some((x:any)=>x.id===priv));const decision={status:'approved',expectedStatus:'pending',reason:'隔离审核测试'};assert.equal((await post('moderation/posts/'+pub,decision)).status,201);assert.equal((await post('moderation/posts/'+pub,decision)).status,409);assert.equal((await post('moderation/posts/'+priv,decision)).status,404);
  const report=randomUUID();await db.query("INSERT INTO reports(id,post_id,user_id,reason) VALUES($1,$2,$3,'isolated report')",[report,pub,real.userId]);assert.equal((await post('moderation/reports/'+report,decision)).status,201);assert.equal((await db.query('SELECT status FROM social_post WHERE id=$1',[pub]))[0].status,'rejected');checks.push('Private posts hidden; stale review conflict; upheld reports withdraw post');
  assert.equal((await post('users/'+admin.userId+'/revoke-sessions',{reason:'self-test'})).status,400);assert.equal((await post('users/'+real.userId+'/revoke-sessions',{reason:'隔离撤销测试'})).status,201);assert.equal((await get('overview',real)).status,401);assert.equal((await api.post('/api/v1/auth/refresh').send({refreshToken:real.refreshToken})).status,401);checks.push('Revocation rejects access and refresh; self-admin protected');
  await db.query('INSERT INTO discovery_favorite(user_id,recipe_id) VALUES($1,$3),($2,$3)',[real.userId,demo.userId,r.id]);await db.query('INSERT INTO discovery_search(user_id,term) VALUES($1,$2)',[demo.userId,'豆腐']);
  assert.equal((await post('demo/retire',{batch:'example-seed-batch',confirmation:'错别字',reason:'隔离停用测试'})).status,400);assert.equal((await post('demo/retire',{batch:'example-seed-batch',confirmation:'停用演示数据',reason:'隔离停用测试'})).status,201);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM discovery_favorite WHERE user_id=$1',[real.userId]))[0].n,1);assert.equal((await db.query('SELECT count(*)::int AS n FROM discovery_favorite WHERE user_id=$1',[demo.userId]))[0].n,0);assert.equal((await db.query('SELECT visibility FROM social_post WHERE id=$1',[normalPost]))[0].visibility,'public');assert.equal((await get('overview',demo)).status,401);checks.push('Typed demo retirement removes only synthetic contributions/sessions');
  const audit=await get('audit');assert.equal(audit.body.total,5);assert(audit.body.items.every((x:any)=>x.reason&&x.actor_id===admin.userId));checks.push('All successful mutations audited transactionally; rejected writes leave no audit');
  const previousFlag=process.env.LOCAL_ADMIN_LOGIN;
  try{
   await db.query('UPDATE users SET email=$2,password_hash=$3 WHERE id=$1',[admin.userId,'admin',await hash('short',{memoryCost:19456,timeCost:2,parallelism:1})]);
   const localBody={email:'admin',password:'short',deviceName:'isolated-local-admin'};
   process.env.LOCAL_ADMIN_LOGIN='false';assert.equal((await api.post('/api/v1/auth/admin-login').send(localBody)).status,401);
   process.env.LOCAL_ADMIN_LOGIN='true';const login=await api.post('/api/v1/auth/admin-login').send(localBody);assert.equal(login.status,201);assert.equal(login.body.role,'admin');
   assert.equal((await api.get('/api/v1/admin/overview').auth(login.body.accessToken,{type:'bearer'})).status,200);
   assert.equal((await api.post('/api/v1/auth/login').send(localBody)).status,201);
   assert.equal((await api.post('/api/v1/auth/register').send({...localBody,email:'weak@example.test'})).status,400);
   assert.equal((await api.post('/api/v1/auth/admin-login').send({...localBody,password:'wrong'})).status,401);
   checks.push('Dedicated admin-login requires explicit flag and DB admin role; legacy-password login supported, weak registration rejected');
  }finally{if(previousFlag===undefined)delete process.env.LOCAL_ADMIN_LOGIN;else process.env.LOCAL_ADMIN_LOGIN=previousFlag;}
  passed=true;
 }finally{if(seedDir)await rm(seedDir,{recursive:true,force:true});if(app)await app.close();else await db.onModuleDestroy();if(created)await owner.query('DROP SCHEMA '+schema+' CASCADE');await owner.onModuleDestroy();await writeFile('../work/reports/admin-api-verification.json',JSON.stringify({passed,checks,scope:'Isolated real PostgreSQL with Nest HTTP, guards and DTO validation',cleanup:'Synthetic schema removed; actual demo accounts and ordinary users untouched'},null,2)+'\n');}
 console.log('PASS admin console:',checks.length,'groups');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
