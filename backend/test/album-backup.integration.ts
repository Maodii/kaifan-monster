import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
const { AppModule } = require('../dist/src/app.module') as typeof import('../src/app.module');
const { Database } = require('../dist/src/database') as typeof import('../src/database');
const { AlbumBackupService } = require('../dist/src/album-backup') as typeof import('../src/album-backup');
import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
const checks:string[]=[];
async function main():Promise<void>{
 const admin=new Database();const schema='album_test_'+randomUUID().replaceAll('-','');
 const app=await NestFactory.create(AppModule,{logger:['error']});const db=app.get(Database);
 db.pool.options.options='-c search_path='+schema;
 let base='';const tokens:string[]=[];const s3=new S3Client({endpoint:process.env.S3_ENDPOINT||`http://127.0.0.1:${process.env.MINIO_PORT||9000}`,region:process.env.S3_REGION||'us-east-1',forcePathStyle:true,credentials:{accessKeyId:process.env.S3_ACCESS_KEY||process.env.MINIO_ROOT_USER!,secretAccessKey:process.env.S3_SECRET_KEY||process.env.MINIO_ROOT_PASSWORD!}});
 async function req(path:string,method='GET',body?:unknown,token=''){
  const r=await fetch(base+path,{method,headers:{...(body instanceof FormData?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},body:body?(body instanceof FormData?body:JSON.stringify(body)):undefined});return {status:r.status,data:await r.json() as any};
 }
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','base64');
 function photo(bytes=png){const form=new FormData();form.append('photo',new Blob([bytes]),'synthetic.png');return form;}
 async function consent(token:string){const r=await req('/album-backup/consent','POST',{noticeVersion:'album-backup-v1',confirmed:true},token);assert.equal(r.status,201);return r.data.id as string;}
 let passed=false;
 try{
  await admin.query('CREATE SCHEMA '+schema);
  for(const file of (await readdir('migrations')).filter(n=>n.endsWith('.sql')).sort())await db.query(await readFile('migrations/'+file,'utf8'));
  app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));await app.listen(0,'127.0.0.1');base=(await app.getUrl())+'/api/v1';
  for(let i=0;i<2;i++){const r=await req('/auth/register','POST',{email:`album-${randomUUID()}@example.test`,password:'album-test-long-password',deviceName:'synthetic-test'});assert.equal(r.status,201);tokens.push(r.data.accessToken);}
  const [a,b]=tokens;
  assert.equal((await req('/album-backup')).status,401);
  assert.equal((await req('/album-backup/consent','POST',{noticeVersion:'album-backup-v1',confirmed:false},a)).status,400);
  assert.equal((await req('/album-backup/consent','POST',{noticeVersion:'wrong',confirmed:true},a)).status,400);
  assert.equal((await req('/album-backup/photos/'+randomUUID(),'POST',photo(),a)).status,403);checks.push('Anonymous, unconfirmed, stale notice and missing consent rejected');
  const ca=await consent(a),cb=await consent(b);
  assert.equal((await req('/album-backup/photos/'+ca,'POST',photo(),b)).status,403);checks.push('Other account cannot use consent');
  const one=await req('/album-backup/photos/'+ca,'POST',photo(),a);assert.equal(one.status,201);assert.equal(one.data.duplicate,false);
  const again=await req('/album-backup/photos/'+ca,'POST',photo(),a);assert.equal(again.data.duplicate,true);assert.equal(again.data.id,one.data.id);
  const both=await Promise.all([req('/album-backup/photos/'+ca,'POST',photo(),a),req('/album-backup/photos/'+ca,'POST',photo(),a)]);assert(both.every(r=>r.data.duplicate===true));
  assert.equal((await req('/album-backup','GET',undefined,a)).data.count,1);assert.equal((await req('/album-backup','GET',undefined,b)).data.count,0);checks.push('Original bytes stored, repeated/concurrent uploads deduplicated, summaries isolated');
  const download=await req('/album-backup/photos/'+one.data.id+'/download','GET',undefined,a);assert.equal(download.status,200);const downloaded=await fetch(download.data.url);assert.equal(downloaded.status,200);assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),png);
  assert.equal((await req('/album-backup/photos/'+one.data.id+'/download','GET',undefined,b)).status,403);checks.push('Owner signed download returns identical synthetic bytes; other account denied');
  assert.equal((await req('/album-backup/photos/'+ca,'POST',photo(Buffer.from('not-an-image-at-all')),a)).status,400);
  assert.equal((await req('/album-backup/photos/'+ca,'POST',photo(Buffer.alloc(50*1024*1024+1)),a)).status,413);checks.push('Invalid file and oversized upload rejected');
  await req('/album-backup/consent/'+ca,'DELETE',undefined,a);assert.equal((await req('/album-backup/photos/'+ca,'POST',photo(),a)).status,403);checks.push('Stopped consent cannot upload again');
  assert.equal((await req('/album-backup/photos/'+cb,'POST',photo(),b)).status,201);
  await req('/album-backup','DELETE',undefined,a);assert.equal((await req('/album-backup','GET',undefined,a)).data.count,0);assert.equal((await fetch(download.data.url)).status,404);assert.equal((await req('/album-backup','GET',undefined,b)).data.count,1);checks.push('Cloud delete removes object and metadata without affecting another account');
  const service=app.get(AlbumBackupService);const cc=await consent(a);const [identity]=await db.query('SELECT user_id,id FROM devices WHERE user_id=(SELECT user_id FROM album_backup_consent WHERE id=$1)',[cc]);
  const racing=await Promise.allSettled([service.upload({userId:identity.user_id,deviceId:identity.id,role:'user'},cc,{buffer:png}),service.clear({userId:identity.user_id,deviceId:identity.id,role:'user'})]);assert.equal(racing[1].status,'fulfilled');
  assert.equal((await req('/album-backup','GET',undefined,a)).data.count,0);assert.equal((await req('/album-backup/photos/'+cc,'POST',photo(),a)).status,403);checks.push('Concurrent stop/delete serializes with upload and invalidates consent');
  const cd=await consent(a);
  await db.query('ALTER TABLE album_backup_photo ADD CONSTRAINT test_reject CHECK(byte_size>100) NOT VALID');
  assert.equal((await req('/album-backup/photos/'+cd,'POST',photo(),a)).status,500);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM object_deletion_jobs'))[0].count,0);
  const leftover=await s3.send(new ListObjectsV2Command({Bucket:process.env.S3_BUCKET||'shiku-photos',Prefix:identity.user_id+'/album-backup/'}));assert.equal(leftover.KeyCount,0);
  await db.query('ALTER TABLE album_backup_photo DROP CONSTRAINT test_reject');
  checks.push('Database failure compensates uploaded object and removes cleanup job; no orphan synthetic image');
  passed=true;
 }finally{
  const objects=await db.query('SELECT object_key FROM album_backup_photo').catch(()=>[]);
  for(const object of objects)await s3.send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET||'shiku-photos',Key:object.object_key}));
  s3.destroy();await app.close();await admin.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');await admin.onModuleDestroy();
  await writeFile('../work/reports/album-backup-integration.json',JSON.stringify({passed,checks,scope:'Isolated PostgreSQL schema, ephemeral HTTP server, private object storage, generated 1x1 PNG only',cleanup:'Test schema and remaining synthetic objects removed',limits:['No phone album was read','Native permission/device upload not exercised']},null,2)+'\n');
 }
 console.log('PASS album backup: '+checks.join('; '));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
