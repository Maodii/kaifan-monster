import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Database } from '../src/database';
const base='http://127.0.0.1:3000/api/v1';const users:string[]=[];const jobs:string[]=[];
async function req(path:string,method='GET',body?:unknown,token=''){
 const r=await fetch(base+path,{method,headers:{...(body instanceof FormData?{}:{'Content-Type':'application/json'}),...(token?{Authorization:'Bearer '+token}:{})},body:body?(body instanceof FormData?body:JSON.stringify(body)):undefined});return {status:r.status,data:await r.json() as any};
}
async function register(fields:Record<string,string>={}){const r=await req('/auth/register','POST',{email:`profile-${randomUUID()}@example.test`,password:'profile-test-long-password',deviceName:'profile-test',...fields});if(r.status===201)users.push(r.data.userId);return r;}
async function main(){
 const a=await register({displayName:'食库测试者',regionCode:'510000',avatarPreset:'cat'}),b=await register();assert.equal(a.status,201);assert.equal(b.status,201);
 assert.equal((await req('/account/profile')).status,401);const initial=(await req('/account/profile','GET',undefined,a.data.accessToken)).data;assert.equal(initial.displayName,'食库测试者');assert.equal(initial.regionName,'四川');assert.equal(initial.avatarPreset,'cat');assert.equal(initial.version,1);assert(!('email' in initial));
 const patch={displayName:'新的昵称',regionCode:'440000',avatarPreset:'rice',bio:'喜欢清淡家常菜',dietGoal:'高蛋白',version:1};const saved=await req('/account/profile','PATCH',patch,a.data.accessToken);assert.equal(saved.status,200);assert.equal(saved.data.regionName,'广东');assert.equal(saved.data.version,2);
 assert.equal((await req('/account/profile','PATCH',patch,a.data.accessToken)).status,409);
 assert.equal((await req('/account/profile','PATCH',{...patch,version:2,regionCode:'999999'},a.data.accessToken)).status,400);
 const other=(await req('/account/profile','GET',undefined,b.data.accessToken)).data;assert.equal(other.displayName,'食库朋友');assert.equal(other.regionCode,'');
 assert.equal((await register({displayName:'  '})).status,400);
 const regions=await req('/regions');assert.equal(regions.status,200);assert.equal(regions.data.length,34);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','base64');const form=new FormData();form.append('avatar',new Blob([png],{type:'image/png'}),'avatar.png');const upload=await req('/account/avatar','POST',form,a.data.accessToken);assert.equal(upload.status,201);assert(upload.data.avatarId);jobs.push(upload.data.avatarId);
 const image=await req('/account/avatar/'+upload.data.avatarId,'GET',undefined,a.data.accessToken);assert.equal(image.status,200);assert.equal((await fetch(image.data.url)).status,200);assert.equal((await req('/account/avatar/'+upload.data.avatarId,'GET',undefined,b.data.accessToken)).status,403);
 const invalid=new FormData();invalid.append('avatar',new Blob(['not-a-png'],{type:'image/png'}),'bad.png');assert.equal((await req('/account/avatar','POST',invalid,a.data.accessToken)).status,400);
 const reset=await req('/account/profile','PATCH',{...patch,version:upload.data.version,avatarMode:'preset'},a.data.accessToken);assert.equal(reset.status,200);assert.equal(reset.data.avatarId,'');
 const db=new Database();try{const [counts]=await db.query('SELECT (SELECT count(*) FROM recipe_ingredient)::int AS ingredients,(SELECT count(*) FROM recipe_step)::int AS steps');assert(counts.ingredients>1000);assert(counts.steps>1000);const [bad]=await db.query('SELECT count(*)::int AS count FROM recipe_catalog c WHERE jsonb_array_length(c.payload->\'ingredients\')<>(SELECT count(*) FROM recipe_ingredient i WHERE i.recipe_id=c.id)');assert.equal(bad.count,0);}finally{await db.onModuleDestroy();}
 console.log('PASS profiles: registration, nickname/region/avatar, version conflict, private isolation, avatar upload/download, invalid files, normalized recipe integrity');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{const db=new Database();try{await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[users]);if(jobs.length)await db.query('UPDATE object_deletion_jobs SET available_at=now() WHERE photo_id=ANY($1::uuid[])',[jobs]);}finally{await db.onModuleDestroy();}});
