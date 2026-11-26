import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Database} from '../src/database';
const base='http://127.0.0.1:3000/api/v1';let uid='';
(async()=>{try{
 const reg=await fetch(base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`stock-${randomUUID()}@example.test`,password:'stock-history-password-2026',deviceName:'stock-test'})});assert.equal(reg.status,201);const user=await reg.json() as any;uid=user.userId;const id=randomUUID();
 const payload={name:'历史鸡蛋',quantity:0,unit:'个',expiryDate:'2099-01-01',purchasedAt:'2026-11-03',purchasedQuantity:10,purchasePrice:20,estimatedPrice:0,consumedCost:20,archived:true,archiveReason:'consumed',movements:[{id:randomUUID(),date:new Date().toISOString(),quantity:10,cost:20,before:10,after:0,reason:'consumed',recipeName:'蒸蛋'}]};
 const headers={Authorization:`Bearer ${user.accessToken}`,'Content-Type':'application/json'};const ch={changeId:randomUUID(),entityId:id,entityType:'food_items',operation:'upsert',baseVersion:0,modifiedAt:new Date().toISOString(),payload};
 const push=await fetch(base+'/sync/push',{method:'POST',headers,body:JSON.stringify({changes:[ch]})});assert.equal(push.status,201);assert.equal((await push.json() as any).accepted.length,1);
 const records=await fetch(base+'/records/food_items',{headers});const rows=await records.json() as any[];assert.deepEqual(rows.find(r=>r.id===id).payload.movements,payload.movements);assert.equal(rows.find(r=>r.id===id).payload.purchasedQuantity,10);
 const invalid=await fetch(base+'/sync/push',{method:'POST',headers,body:JSON.stringify({changes:[{...ch,entityId:randomUUID(),changeId:randomUUID(),payload:{...payload,movements:[{...payload.movements[0],after:9}]}}]})});assert.equal(invalid.status,400);
 console.log('PASS API sync purchase snapshot and complete archive ledger roundtrip; rejects inconsistent before/after quantities');
 }finally{if(uid){const db=new Database();try{await db.transaction(async c=>{await c.query('DELETE FROM food_change_logs WHERE user_id=$1',[uid]);await c.query('DELETE FROM food_items WHERE user_id=$1',[uid]);await c.query('DELETE FROM users WHERE id=$1',[uid]);});}finally{await db.onModuleDestroy();}}}})().catch(e=>{console.error(e);process.exitCode=1});
