import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Cache } from '../src/cache';
import { Database } from '../src/database';
const base='http://127.0.0.1:3000/api/v1';
interface Tokens {accessToken:string;refreshToken:string;userId:string;deviceId:string;role:string;}
const users:string[]=[];
async function request(path:string,method='GET',body?:unknown,token?:string):Promise<{status:number;data:any}>{
 const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json()};
}
async function register():Promise<Tokens>{const r=await request('/auth/register','POST',{email:`env-${randomUUID()}@example.test`,password:'test-password-very-long1',deviceName:'integration'});assert.equal(r.status,201);users.push(r.data.userId);return r.data;}
async function main():Promise<void>{
 const a=await register(),b=await register();
 const cache=new Cache();try{await new Promise<void>(resolve=>cache.redis.status==='ready'?resolve():cache.redis.once('ready',resolve));await cache.redis.set('sync-lock:'+a.userId,'other-device','PX',30000);assert.equal((await request('/sync/push','POST',{changes:[]},a.accessToken)).status,409);await cache.redis.del('sync-lock:'+a.userId);}finally{await cache.onModuleDestroy();}

 assert.equal((await request('/devices')).status,401);
 assert.equal((await request('/auth/register','POST',{email:'invalid',password:'x',deviceName:''})).status,400);
 const id=randomUUID(),changeId=randomUUID();
 const ch={changeId,entityId:id,entityType:'food_items',operation:'upsert',baseVersion:0,modifiedAt:new Date().toISOString(),payload:{name:'鸡蛋',quantity:6,unit:'个',expiryDate:'2026-11-20'}};
 const push=await request('/sync/push','POST',{changes:[ch]},a.accessToken);assert.equal(push.status,201);assert.equal(push.data.accepted[0].version,1);
 const retry=await request('/sync/push','POST',{changes:[ch]},a.accessToken);assert.equal(retry.status,201);assert.equal((await request('/sync/pull','GET',undefined,a.accessToken)).data.changes.length,1);
 const stale=await request('/sync/push','POST',{changes:[{...ch,changeId:randomUUID(),payload:{name:'不应覆盖'},baseVersion:0}]},a.accessToken);assert.equal(stale.data.conflicts.length,1);
 const records=await request('/records/food_items','GET',undefined,a.accessToken);assert.equal(records.data[0].payload.name,'鸡蛋');
 const other=await request('/records/food_items','GET',undefined,b.accessToken);assert.equal(other.data.length,0);
 assert.equal((await request('/sync/push','POST',{changes:[{...ch,changeId:randomUUID(),baseVersion:1}]},b.accessToken)).status,403);
 const f=await request('/families','POST',{name:'测试家庭'},a.accessToken);assert.equal(f.status,201);
 assert.equal((await request(`/families/${f.data.id}/members`,'GET',undefined,b.accessToken)).status,403);
 await request('/families/join','POST',{inviteCode:f.data.inviteCode},b.accessToken);
 assert.equal((await request(`/families/${f.data.id}/members`,'GET',undefined,b.accessToken)).data.length,2);
 assert.equal((await request(`/families/${f.data.id}/invite`,'GET',undefined,b.accessToken)).status,403);
 const rotated=await request(`/families/${f.data.id}/invite`,'POST',{},a.accessToken);assert.equal(rotated.status,201);assert.notEqual(rotated.data.inviteCode,f.data.inviteCode);assert.equal((await request('/families/join','POST',{inviteCode:f.data.inviteCode},b.accessToken)).status,404);f.data.inviteCode=rotated.data.inviteCode;
 const familyCh={...ch,entityId:randomUUID(),changeId:randomUUID(),familyId:f.data.id};
 assert.equal((await request('/sync/push','POST',{changes:[familyCh]},a.accessToken)).status,201);
 assert.equal((await request(`/records/food_items?familyId=${f.data.id}`,'GET',undefined,b.accessToken)).data.length,1);
 const later=await register(); await request('/families/join','POST',{inviteCode:f.data.inviteCode},later.accessToken); const history=await request('/sync/pull','GET',undefined,later.accessToken); assert.equal(history.data.changes.length,1); assert.equal(history.data.changes[0].entity_id,familyCh.entityId);
 const familyEdit={...familyCh,changeId:randomUUID(),baseVersion:1,payload:{...ch.payload,quantity:5}}; const edit=await request('/sync/push','POST',{changes:[familyEdit]},b.accessToken); assert.equal(edit.status,201); assert.equal(edit.data.accepted[0].version,2); const repeatEdit=await request('/sync/push','POST',{changes:[familyEdit]},b.accessToken); assert.equal(repeatEdit.data.accepted[0].version,2);
 const deviceRename=await request('/devices/'+b.deviceId,'PATCH',{name:'更新设备名'},b.accessToken); assert.equal(deviceRename.status,200);
 await request(`/families/${f.data.id}/members/${b.userId}`,'DELETE',undefined,a.accessToken);
 assert.equal((await request(`/records/food_items?familyId=${f.data.id}`,'GET',undefined,b.accessToken)).data.length,0);
 assert.equal((await request('/sync/pull','GET',undefined,b.accessToken)).data.changes.length,0);
 const next=await request('/auth/password','POST',{currentPassword:'test-password-very-long1',newPassword:'test-password-updated-long1'},later.accessToken);assert.equal(next.status,201);assert.equal((await request('/devices','GET',undefined,later.accessToken)).status,401);
 const fresh=await request('/auth/refresh','POST',{refreshToken:a.refreshToken});assert.equal(fresh.status,201);
 assert.equal((await request('/auth/refresh','POST',{refreshToken:a.refreshToken})).status,401);
 assert.equal((await request('/auth/logout','POST',{},fresh.data.accessToken)).status,201);
 assert.equal((await request('/devices','GET',undefined,fresh.data.accessToken)).status,401);
 console.log('PASS auth / validation / private isolation / idempotent sync / conflict preservation / family access / removal / refresh replay / logout');
}
async function cleanup():Promise<void>{const db=new Database();try{await db.transaction(async c=>{
 await c.query('DELETE FROM food_change_logs WHERE user_id=ANY($1::uuid[])',[users]);
 for(const table of ['food_items','barcode_lib','shopping_list','recipes','recipe_favorites','meal_records'])await c.query(`DELETE FROM ${table} WHERE user_id=ANY($1::uuid[])`,[users]);
 await c.query('DELETE FROM family_group WHERE owner_id=ANY($1::uuid[])',[users]);
 await c.query('DELETE FROM devices WHERE user_id=ANY($1::uuid[])',[users]);await c.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[users]);
 });}finally{await db.onModuleDestroy();}}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(cleanup);
