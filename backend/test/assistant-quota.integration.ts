/** Isolated Redis counters/markers only; no users, prompts or inference. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { RESERVE_SCRIPT, SETTLE_SCRIPT } from '../src/assistant-budget';
const redis=new Redis({host:process.env.REDIS_HOST||'127.0.0.1',port:Number(process.env.REDIS_PORT||6379),password:process.env.REDIS_PASSWORD,maxRetriesPerRequest:1,retryStrategy:()=>null});redis.on('error',()=>{});
async function main(){
 const prefix='ai:audit:'+randomUUID(),all:string[]=[];
 function keys(owner:string,id:string,token:string){const k=['m:'+owner,'d:'+owner,'g','gm','active:'+owner,'seen:'+id,'r:'+token].map(x=>prefix+':'+x);all.push(...k);return k;}
 const a=keys('a','req-a','ta'),b=keys('b','req-b','tb');
 try{
  const take=(k:string[],t:string)=>redis.eval(RESERVE_SCRIPT,7,...k,t,JSON.stringify({limitsEnabled:true,perUserMinute:3,perUserDay:100,globalMinute:10,globalDay:500}));
  const end=(k:string[],t:string,charge=false,attempted=false)=>redis.eval(SETTLE_SCRIPT,7,...k,t,charge?'charge':'refund',attempted?'attempted':'not_attempted','limited');
  const first=await Promise.all([take(a,'ta'),take(a,'ta')]);assert.equal(first.filter(x=>Number(x)===1).length,1);assert.equal(Number(await take(b,'tb')),1);
  await end(a,'wrong');assert.equal(await redis.get(a[1]),'1');await end(a,'ta');await end(a,'ta');assert.equal(await redis.get(a[1]),'0');assert.equal(await redis.get(a[2]),'1');
  assert.equal(Number(await take(a,'ta')),1);await end(a,'ta',true,true);assert.equal(Number(await take(a,'ta')),-2);
  await end(b,'tb',false,true);assert.equal(await redis.get(b[1]),'0');assert.equal(await redis.get(a[2]),'2');
  const c=keys('c','req-c','tc');await redis.set(c[1],100,'EX',60);assert.equal(Number(await take(c,'tc')),0);assert.equal(await redis.get(c[4]),null);assert.ok((await redis.ttl(a[5]))>0);
  console.log(JSON.stringify({passed:true,checks:['atomic reservation','owner fairness','wrong-token settlement','refund once','durable replay marker','conservative provider budget','daily limit','bounded TTL']}));
 }finally{await redis.del(...new Set(all));await redis.quit();}
}
main().catch(e=>{console.error(e.message);redis.disconnect();process.exitCode=1;});
