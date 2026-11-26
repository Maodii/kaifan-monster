import 'reflect-metadata';
import assert from 'node:assert/strict';
import { AssistantService, AssistantDto } from '../src/assistant';
import { assistantContext,violatesExclusions } from '../src/assistant-context';
import { budgetDay } from '../src/assistant-budget';
import { assistantInScope } from '../src/assistant-policy';
import type { Database } from '../src/database';
import type { Cache } from '../src/cache';
async function main(){
 assert.equal(budgetDay(new Date('2026-11-15T15:59:59Z')),'2026-11-15');assert.equal(budgetDay(new Date('2026-11-15T16:00:00Z')),'2026-11-16');
 assert.ok(assistantInScope('西兰花焯水多久？'));assert.ok(!assistantInScope('帮我买股票'));
 const prompt=assistantContext('推荐晚餐',{people:5,maxMinutes:25,maxCost:88,excluded:['花生'],region:'广东'},'按条件推荐','旧问题'.repeat(400),'库存'.repeat(3000),'菜谱'.repeat(3000));
 assert.ok(prompt.length<=8000);for(const value of ['花生','"people":5','"maxMinutes":25','"maxCost":88','广东'])assert.ok(prompt.includes(value));
 assert.ok(violatesExclusions('可以放花生油',['花生']));assert.ok(violatesExclusions('放酱油',['大豆']));assert.ok(!violatesExclusions('蒸鸡蛋',['花生']));
 let reservations=0,settlements:string[]=[];let result={source:'model',text:'蒸鸡蛋'};
 const db={query:async(sql:string)=>sql.includes('recipe_catalog')?[{id:'r1',payload:{name:'蒸鸡蛋',minutes:10,ingredients:[{name:'鸡蛋'}]}}]:[]} as unknown as Database;
 const cache={redis:{get:async()=> 'completed',eval:async(script:string,...args:unknown[])=>{if(script.includes('local old='))reservations++;else settlements.push(String(args.at(-3)));return 1;}}} as unknown as Cache;
 const s=new AssistantService(db,cache),user={userId:'a',deviceId:'d',role:'user'};
 const oldFetch=globalThis.fetch,oldURL=process.env.AI_GATEWAY_URL,oldToken=process.env.AI_GATEWAY_TOKEN;
 process.env.AI_GATEWAY_URL='http://mock.invalid';process.env.AI_GATEWAY_TOKEN='fake';
 globalThis.fetch=async()=>new Response(JSON.stringify(result));
 try{
  await assert.rejects(s.assist(user,Object.assign(new AssistantDto(),{prompt:'安排晚餐',consent:true,startDate:'2026-02-31'})));assert.equal(reservations,0);
  await s.assist(user,Object.assign(new AssistantDto(),{prompt:'鸡蛋怎么做',consent:true}));assert.equal(settlements.at(-1),'charge');
  const ask=(prompt:string,history?:{role:string,text:string}[])=>s.assist(user,Object.assign(new AssistantDto(),{prompt,history,consent:true})) as Promise<{source:string,reason:string}>;
  assert.equal((await ask('推荐页里面29分钟能做什么')).source,'model');
  assert.equal((await ask('继续')).reason,'clarify');
  assert.equal((await ask('继续',[{role:'user',text:'29分钟能做什么'},{role:'assistant',text:'推荐蒸鸡蛋'}])).source,'model');
  result={source:'fallback',text:'暂不可用'};await s.assist(user,Object.assign(new AssistantDto(),{prompt:'鸡蛋怎么做',consent:true}));assert.equal(settlements.at(-1),'refund');
  result={source:'model',text:'用花生油炒鸡蛋'};const blocked=await s.assist(user,Object.assign(new AssistantDto(),{prompt:'鸡蛋怎么做',consent:true,excluded:['花生']})) as {reason:string;text:string};assert.equal(blocked.reason,'dietary_conflict');assert.ok(!blocked.text.includes('花生油'));assert.equal(settlements.at(-1),'refund');
  const restarted=await s.read(user,'request-123',4) as {state:string;position:number};assert.equal(restarted.state,'error');assert.equal(restarted.position,4);
 }finally{globalThis.fetch=oldFetch;for(const [key,value] of Object.entries({AI_GATEWAY_URL:oldURL,AI_GATEWAY_TOKEN:oldToken}))if(value===undefined)delete process.env[key];else process.env[key]=value;}
 console.log(JSON.stringify({passed:true,checks:['China midnight','constraint budgeting','food scope','exclusion aliases','semantic validation before quota','charge/refund outcomes','dietary response guard','restart-safe cursor failure']}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
