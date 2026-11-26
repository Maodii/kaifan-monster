import 'reflect-metadata';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {Test} from '@nestjs/testing';
import {ValidationPipe} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import request from 'supertest';
import {Database} from '../dist/src/database';
import {Cache} from '../dist/src/cache';
import {AuthController} from '../dist/src/controllers';
import {AuthService,AuthGuard} from '../dist/src/auth';
import {CatalogController} from '../dist/src/catalog';
import {buildCatalogDelivery,catalogHash} from '../dist/src/catalog-delivery-core';
async function main(){
 const owner=new Database(),db=new Database(),schema='catalog_delivery_test_'+randomUUID().replaceAll('-','');db.pool.options.options='-c search_path='+schema;
 let created=false,passed=false,app:any;const checks:string[]=[];
 try{
  await owner.query('CREATE SCHEMA '+schema);created=true;for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await db.query(await readFile('migrations/'+f,'utf8'));
  const module=await Test.createTestingModule({controllers:[CatalogController,AuthController],providers:[{provide:Database,useValue:db},{provide:Cache,useValue:{get:async()=>null,set:async()=>{},drop:async()=>{}}},{provide:JwtService,useValue:new JwtService({secret:'delivery-integration-only-secret-long-enough'})},AuthService,AuthGuard]}).compile();
  app=module.createNestApplication({logger:false});app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));await app.init();
  const api=request(app.getHttpServer());const login=await api.post('/api/v1/auth/register').send({email:'catalog-reader@example.test',password:'isolated-catalog-test-password',deviceName:'catalog-delivery-test'});assert.equal(login.status,201);
  const get=(path:string)=>api.get('/api/v1/catalog/'+path).auth(login.body.accessToken,{type:'bearer'});const download=(body:unknown)=>api.post('/api/v1/catalog/offline/download').auth(login.body.accessToken,{type:'bearer'}).send(body);
  assert.equal((await api.get('/api/v1/catalog/offline/manifest')).status,401);
  const empty=await get('offline/manifest');assert.equal(empty.status,200);assert.equal(empty.body.count,0);assert.equal(empty.body.version,catalogHash('[]'));checks.push('Authenticated endpoint, deterministic valid empty manifest');
  const data=JSON.parse(await readFile('data/recipes.json','utf8'));for(const recipe of data.recipes.slice(0,30))await db.query('INSERT INTO recipe_catalog(id,name,region,category,taste,minutes,source_revision,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[recipe.id,recipe.name,recipe.region,recipe.category,recipe.taste,recipe.minutes,data.sourceRevision,recipe]);
  const first=await get('offline/manifest');assert.equal(first.status,200);assert.equal(first.body.count,30);assert.equal(first.body.items.length,30);assert.equal(first.body.totalBytes,first.body.items.reduce((sum:number,item:any)=>sum+item.bytes,0));assert.deepEqual(first.body.items.map((x:any)=>x.id),first.body.items.map((x:any)=>x.id).sort());assert.equal(first.body.version,catalogHash(JSON.stringify(first.body.items)));
  const page=await download({version:first.body.version,ids:first.body.items.slice(0,25).map((item:any)=>item.id)});assert.equal(page.status,201);assert.equal(page.body.records.length,25);for(const record of page.body.records){assert.equal(catalogHash(record.payload),record.sha256);assert.equal(Buffer.byteLength(record.payload),record.bytes);assert.equal(JSON.parse(record.payload).id,record.id);}checks.push('30-row stable sorted manifest; root and individual UTF-8 content checksums; bounded 25-row page');
  const id=first.body.items[0].id;assert.equal((await download({version:first.body.version,ids:[id,id]})).status,400);assert.equal((await download({version:first.body.version,ids:first.body.items.slice(0,26).map((item:any)=>item.id)})).status,400);assert.equal((await download({version:'broken',ids:[id]})).status,400);assert.equal((await download({version:first.body.version,ids:[randomUUID()]})).status,400);checks.push('Reject duplicate/unknown IDs, oversized pages and malformed versions before download');
  await db.query("UPDATE recipe_catalog SET payload=jsonb_set(payload,'{name}',to_jsonb($2::text)),name=$2,updated_at=now() WHERE id=$1",[id,'新版菜名·校验测试']);const second=await get('offline/manifest');assert.notEqual(second.body.version,first.body.version);assert.equal(second.body.items.filter((item:any)=>!first.body.items.some((old:any)=>old.id===item.id&&old.sha256===item.sha256)).length,1);assert.equal((await download({version:first.body.version,ids:[id]})).status,409);const updated=await download({version:second.body.version,ids:[id]});assert.equal(updated.status,201);assert.equal(JSON.parse(updated.body.records[0].payload).name,'新版菜名·校验测试');checks.push('Administrator payload edit changes one delta item; old version gets 409 and cannot mix snapshots');
  const unchanged=await get('offline/manifest');assert.deepEqual(unchanged.body,second.body);await db.query('UPDATE recipe_catalog SET updated_at=now()');assert.deepEqual((await get('offline/manifest')).body,second.body);checks.push('Unchanged content/timestamp-only writes do not force downloads');
  const a=buildCatalogDelivery([{id,payload:{name:'A',id:'wrong',steps:['完成'],nested:{z:1,a:2}}}]),b=buildCatalogDelivery([{id,payload:{nested:{a:2,z:1},steps:['完成'],id:'other',name:'A'}}]);assert.equal(a.manifest.version,b.manifest.version);assert.equal(JSON.parse(a.records[0].payload).id,id);assert.throws(()=>buildCatalogDelivery([{id,payload:{x:1}},{id,payload:{x:2}}]));checks.push('Canonical wire encoding is JSON key-order independent; primary key wins; duplicate identity rejected');
  await db.query('DELETE FROM recipe_catalog WHERE id=$1',[id]);const retired=await get('offline/manifest');assert.equal(retired.body.count,29);assert(!retired.body.items.some((item:any)=>item.id===id));assert.notEqual(retired.body.version,second.body.version);checks.push('Retirement changes manifest without recycling recipe IDs');passed=true;
 }finally{if(app)await app.close();else await db.onModuleDestroy();if(created)await owner.query('DROP SCHEMA '+schema+' CASCADE');await owner.onModuleDestroy();await writeFile('../work/reports/catalog-delivery-api.json',JSON.stringify({passed,checks,scope:'Real isolated PostgreSQL and Nest HTTP with guards/DTO; content-addressed recipe catalog only',cleanup:'Synthetic schema removed; real catalog unchanged'},null,2)+'\n');}
 console.log('PASS catalog delivery:',checks.length,'groups');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
