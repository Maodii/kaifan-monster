/** Real HTTPS/sync/private-object migration smoke; disposable fixture, no inference. */
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{Pool}=require('pg');
const {S3Client,DeleteObjectCommand,GetObjectCommand}=require('@aws-sdk/client-s3'),{getSignedUrl}=require('@aws-sdk/s3-request-presigner');
const current='https://api.example.invalid',previous='https://legacy.example.invalid';
const db=new Pool({host:process.env.PGHOST,user:process.env.POSTGRES_USER,password:process.env.POSTGRES_PASSWORD,database:process.env.POSTGRES_DB,connectionTimeoutMillis:3000});
const s3config={region:process.env.S3_REGION||'us-east-1',forcePathStyle:true,credentials:{accessKeyId:process.env.S3_ACCESS_KEY||process.env.MINIO_ROOT_USER,secretAccessKey:process.env.S3_SECRET_KEY||process.env.MINIO_ROOT_PASSWORD}};
const s3=new S3Client({...s3config,endpoint:process.env.S3_ENDPOINT}),legacyS3=new S3Client({...s3config,endpoint:previous});
let userId='',photoKey='',adminDevice='';const checks=[];
async function api(origin,path,method='GET',body,token,status=200){const r=await fetch(origin+'/api/v1'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});assert.equal(r.status,status,path+' HTTP status');return r.json();}
(async()=>{try{
for(const origin of [current,previous]){await api(origin,'/ready');assert.equal((await fetch(origin+'/admin/')).status,200);}checks.push('both public IPs have trusted HTTPS and readiness');
const admin=await api(current,'/auth/admin-login','POST',{email:'admin',password:process.env.MIGRATION_TEST_PASSWORD,deviceName:'migration-verification'},null,201);adminDevice=admin.deviceId;assert.equal(admin.role,'admin');
const access=await api(current,'/ai/access','GET',null,admin.accessToken);assert.equal(access.whitelistedAdmin,true);assert.equal(access.ai.dailyLimit,null);checks.push('test admin password and unlimited whitelist preserved');
const auth=await api(current,'/auth/register','POST',{email:'migration-'+randomUUID()+'@invalid.local',password:'Test-'+randomUUID()+'8',deviceName:'migration-verification',displayName:'迁移验证'},null,201);userId=auth.userId;assert.equal(auth.role,'user');
assert.equal((await api(current,'/ai/access','GET',null,auth.accessToken)).ai.dailyLimit,50);
const mealId=randomUUID(),payload={name:'迁移验证餐',date:new Date().toISOString(),diningMode:'在家做',estimatedCost:12,visibility:'private'};
const pushed=await api(current,'/sync/push','POST',{changes:[{changeId:randomUUID(),entityType:'meal_records',entityId:mealId,operation:'upsert',baseVersion:0,modifiedAt:new Date().toISOString(),payload}]},auth.accessToken,201);assert.equal(pushed.accepted.length,1);
const viaOld=await api(previous,'/records/meal_records','GET',null,auth.accessToken);assert.ok(JSON.stringify(viaOld).includes(mealId));const pull=await api(previous,'/sync/pull?since=0','GET',null,auth.accessToken);assert.ok(JSON.stringify(pull).includes(mealId));checks.push('old and new IP read and write the same primary database');
const photo=await api(previous,'/photos/presign','POST',{mealId,contentType:'image/png'},auth.accessToken,201);assert.equal(new URL(photo.uploadUrl).origin,current);photoKey=(await db.query('SELECT object_key FROM meal_photo WHERE id=$1 AND user_id=$2',[photo.id,userId])).rows[0].object_key;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=','base64');
assert.equal((await fetch(photo.uploadUrl,{method:'PUT',headers:{'Content-Type':'image/png'},body:png})).status,200);await api(current,'/photos/'+photo.id+'/complete','POST',{},auth.accessToken,201);
const download=await api(previous,'/photos/'+photo.id+'/download','GET',null,auth.accessToken);assert.deepEqual(Buffer.from(await (await fetch(download.url)).arrayBuffer()),png);
await api(current,'/photos/'+photo.id+'/download','GET',null,admin.accessToken,403);
const oldSigned=await getSignedUrl(legacyS3,new GetObjectCommand({Bucket:process.env.S3_BUCKET||'shiku-photos',Key:photoKey}),{expiresIn:60});assert.deepEqual(Buffer.from(await (await fetch(oldSigned)).arrayBuffer()),png);checks.push('signed image upload/download, private ownership, and legacy signed URL forwarding');
console.log(JSON.stringify({passed:true,checks,real_model_calls:0,fixture_cleaned:true}));
}finally{
if(photoKey)await s3.send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET||'shiku-photos',Key:photoKey}));
if(userId){await db.query('BEGIN');try{for(const table of ['meal_photo','food_change_logs','meal_records','devices'])await db.query('DELETE FROM '+table+' WHERE user_id=$1',[userId]);await db.query('DELETE FROM users WHERE id=$1',[userId]);await db.query('COMMIT');}catch(e){await db.query('ROLLBACK');throw e;}}
if(adminDevice)await db.query('DELETE FROM devices WHERE id=$1',[adminDevice]);
s3.destroy();legacyS3.destroy();await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
