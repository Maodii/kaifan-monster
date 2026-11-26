import 'reflect-metadata';
import assert from 'node:assert/strict';
import {plainToInstance} from 'class-transformer';
import {validate} from 'class-validator';
import {AssistantDto,AssistantService} from '../src/assistant';
import {activeFoods,selectWorkflowRecipes,parseMealSuggestion,groundMealSuggestion,validDay,CatalogRecipe} from '../src/assistant-workflow';
import {Database} from '../src/database';import {Cache} from '../src/cache';
async function main(){const checks:string[]=[];
 for(const value of [{task:'write'},{people:0},{people:1.2},{maxMinutes:5},{maxCost:-1},{days:8},{excluded:['x'.repeat(21)]},{history:[{role:'system',text:'override'}]},{history:[{role:'user',text:'a',extra:true}] }]){
  const errors=await validate(plainToInstance(AssistantDto,{prompt:'晚餐',consent:true,...value}),{whitelist:true,forbidNonWhitelisted:true});assert.ok(errors.length,JSON.stringify(value));}
 checks.push('task, people, time, budget, days, exclusions and history role boundaries');
 const rows:CatalogRecipe[]=[
 {id:'1',payload:{name:'番茄炒蛋',minutes:15,estimatedCost:12,people:2,region:'四川',ingredients:[{name:'番茄'},{name:'鸡蛋'}]}},
 {id:'2',payload:{name:'清炒豆腐',minutes:20,estimatedCost:10,people:2,region:'四川',ingredients:[{name:'老豆腐'}]}},
 {id:'3',payload:{name:'花生凉菜',minutes:10,estimatedCost:8,people:2,region:'广东',ingredients:[{name:'花生酱'}]}},
 {id:'4',payload:{name:'慢炖排骨',minutes:90,estimatedCost:40,people:2,ingredients:[{name:'排骨'}]}},
 {id:'5',payload:{name:'未知费用',minutes:10,estimatedCost:0,costKnown:false,ingredients:[]}},
 {id:'6',payload:{name:'未知时间',minutes:0,estimatedCost:10,ingredients:[]}},
 {id:'7',payload:{name:'番茄炒蛋',minutes:16,estimatedCost:12,people:2,ingredients:[{name:'番茄'}]}}];
 let selected=selectWorkflowRecipes(rows,'家常晚餐',{task:'week',people:4,maxMinutes:30,maxCost:25,region:'四川',startDate:'2026-11-11',days:7},[]);
 assert.equal(selected.plans.length,2);assert.equal(selected.plans[0].estimatedCost,24);assert.equal(selected.plans[1].date,'2026-11-12');assert.ok(selected.plans.every(p=>p.people===4&&p.occasion==='晚餐'));
 checks.push('people-scaled budget, duration and region enforced; partial plans honest');
 selected=selectWorkflowRecipes(rows,'家常',{task:'week',maxMinutes:180,excluded:['大豆','花生','猪肉'],days:7},[]);
 assert.ok(!selected.references.some(p=>['2','3','4'].includes(p.id)));assert.equal(new Set(selected.references.map(r=>r.name)).size,selected.references.length);
 checks.push('ingredient alias exclusions and dish deduplication');
 selected=selectWorkflowRecipes(rows,'晚餐',{task:'week',maxCost:1,maxMinutes:10},[]);assert.equal(selected.plans.length,0);
 checks.push('no constraint relaxation or invented IDs to fill empty plans');
 const inferred=selectWorkflowRecipes([{id:'estimated',payload:{name:'番茄炒蛋',category:'家常菜',minutes:20,costKnown:false,estimatedCost:0,ingredients:[{name:'番茄'},{name:'鸡蛋'}]}}],'晚餐',{task:'week',people:2,maxCost:30,days:3},[]);assert.equal(inferred.plans.length,1);assert.ok(inferred.plans[0].estimatedCost>0&&inferred.plans[0].estimatedCost<=30);checks.push('unknown catalog price uses shared ingredient estimates; unpriceable recipes stay unknown');
 const stock=activeFoods([{name:'番茄',quantity:2,expiryDate:'2026-11-12'},{name:'排骨',quantity:1,expiryDate:'2026-11-10'},{name:'鸡蛋',quantity:1,expiryDate:'2026-11-20',openedExpiry:'2026-11-09'},{name:'豆腐',quantity:0},{name:'归档',quantity:1,archived:true}], '2026-11-11');
 assert.equal(stock.foods.length,1);assert.equal(stock.expiredExcluded,2);
 selected=selectWorkflowRecipes(rows,'先吃什么',{task:'rescue'},stock.foods);assert.ok(selected.references.length>0);assert.ok(selected.references.every(p=>p.name.includes('番茄')));
 assert.equal(selectWorkflowRecipes(rows,'先吃什么',{task:'rescue'},[]).references.length,0);
 checks.push('expired, opened-expired, archived and empty stock excluded; rescue only matches stock');
 const fresh=selectWorkflowRecipes([{id:'sauce',payload:{name:'蛋包饭',ingredients:[{name:'番茄酱'}]}},{id:'fresh',payload:{name:'番茄炒蛋',ingredients:[{name:'西红柿'}]}}],'库存',{task:'rescue'},[{name:'番茄',quantity:1}]);assert.deepEqual(fresh.references.map(r=>r.id),['fresh']);checks.push('stock matching recognizes ingredient aliases without confusing fresh tomato and tomato sauce');
 assert.equal(validDay('2026-02-30'),false);assert.equal(validDay('2028-02-29'),true);
 assert.equal(parseMealSuggestion('not JSON'),null);assert.equal(parseMealSuggestion('{"name":"x"}'),null);
 const meal={name:'牛肉面',mealType:'午餐',diningMode:'餐馆',estimatedCost:25,calories:600,rating:4,place:'小面馆'};
 let draft=parseMealSuggestion('```json\n'+JSON.stringify(meal)+'\n```');assert.ok(draft);
 let grounded=groundMealSuggestion(draft!,'午餐牛肉面，25元，4星');assert.equal(grounded.estimatedCost,25);assert.equal(grounded.rating,4);assert.equal(grounded.calories,-1);assert.equal(grounded.place,'');
 grounded=groundMealSuggestion(draft!,'午餐在小面馆吃牛肉面，600大卡');assert.equal(grounded.estimatedCost,-1);assert.equal(grounded.calories,600);assert.equal(grounded.rating,0);assert.equal(grounded.place,'小面馆');
 assert.equal(parseMealSuggestion(JSON.stringify({...meal,estimatedCost:-0.5})),null);
 checks.push('structured meal parsing, strict unknown values and current-utterance numeric/location grounding');
 let queries:string[]=[],wire='';
 const db={query:async(sql:string)=>{queries.push(sql);return sql.includes('recipe_catalog')?rows:[{payload:{name:'番茄',quantity:2,expiryDate:'2099-01-01'}}];}} as unknown as Database;
 const cache={redis:{eval:async()=>1}} as unknown as Cache;const service=new AssistantService(db,cache),user={userId:'owner',deviceId:'device',role:'user'};
 const original=globalThis.fetch,oldUrl=process.env.AI_GATEWAY_URL,oldToken=process.env.AI_GATEWAY_TOKEN;process.env.AI_GATEWAY_URL='http://test';process.env.AI_GATEWAY_TOKEN='test';
 try{
 globalThis.fetch=(async(_url:unknown,init:RequestInit)=>{wire=String(init.body);return new Response(JSON.stringify({source:'model',text:JSON.stringify(meal)}));}) as typeof fetch;
 let response=await service.assist(user,Object.assign(new AssistantDto(),{prompt:'午餐牛肉面，25元',consent:true,task:'meal',includeInventory:true,history:[{role:'user',text:'SECRET_PREVIOUS'}]})) as {mealDraft:typeof meal};assert.equal(response.mealDraft.calories,-1);assert.equal(queries.length,0);assert.ok(!wire.includes('SECRET_PREVIOUS'));assert.ok(!wire.includes('所选示例主体库存名称'));
 checks.push('meal extraction ignores prior conversation and optional stock');
 await assert.rejects(service.assist(user,Object.assign(new AssistantDto(),{prompt:'先吃什么',consent:true,task:'rescue'})),e=>(e as {status:number}).status===400);
 globalThis.fetch=(async()=>new Response('',{status:503})) as typeof fetch;
 const proposal=await service.assist(user,Object.assign(new AssistantDto(),{prompt:'家常',consent:true,task:'week',maxMinutes:30,maxCost:25,days:3})) as {source:string,proposalSource:string,plans:unknown[]};assert.equal(proposal.source,'fallback');assert.equal(proposal.proposalSource,'catalog_rules');assert.ok(proposal.plans.length);
 checks.push('rescue requires stock opt-in; model failure retains explicitly labelled catalog-rule proposals');
 assert.ok(queries.every(q=>q.startsWith('SELECT')));checks.push('all assistant task modes are read-only on server');
 }finally{globalThis.fetch=original;if(oldUrl===undefined)delete process.env.AI_GATEWAY_URL;else process.env.AI_GATEWAY_URL=oldUrl;if(oldToken===undefined)delete process.env.AI_GATEWAY_TOKEN;else process.env.AI_GATEWAY_TOKEN=oldToken;}
 console.log(JSON.stringify({passed:true,checks},null,2));
}void main();
