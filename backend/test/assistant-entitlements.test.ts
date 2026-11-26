import 'reflect-metadata';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {AssistantService,AssistantDto} from '../src/assistant';
import {AssistantBudget} from '../src/assistant-budget';
import {FeatureAccessGuard} from '../src/feature-access';
import {isWhitelistedAdmin} from '../src/runtime-config';
import type {Database} from '../src/database';
import type {Cache} from '../src/cache';
import type {AuthGuard} from '../src/auth';
import type {ExecutionContext} from '@nestjs/common';
async function main(){
 const folder=mkdtempSync(join(tmpdir(),'kaifan-entitlements-')),file=join(folder,'config.json');
 const config=JSON.parse(readFileSync('../infra/runtime-config.json','utf8'));writeFileSync(file,JSON.stringify(config));process.env.RUNTIME_CONFIG_FILE=file;
 const admin={userId:config.ai.adminUserIds[0],deviceId:'d',role:'admin'},normal={userId:'normal',deviceId:'d',role:'user'};
 let current=normal,mode='',lastConfig:any,answer=-3;const evaluated:unknown[]=[];
 const cache={redis:{eval:async(script:string,...args:unknown[])=>{evaluated.push(args);if(script.includes('local old=')){lastConfig=JSON.parse(String(args.at(-1)));return answer;}mode=String(args.at(-1));return 1;}}} as unknown as Cache;
 const db={query:async()=>[]} as unknown as Database;
 const oldURL=process.env.AI_GATEWAY_URL,oldToken=process.env.AI_GATEWAY_TOKEN; const oldFetch=globalThis.fetch;
 process.env.AI_GATEWAY_URL='http://mock';process.env.AI_GATEWAY_TOKEN='fake';
 try{
 assert.ok(isWhitelistedAdmin(admin));assert.ok(!isWhitelistedAdmin({...admin,role:'user'}));assert.ok(!isWhitelistedAdmin({...admin,userId:'other'}));
 const req={originalUrl:'/api/v1/discovery/recipes',identity:undefined as unknown};
 const auth={canActivate:async()=>{req.identity=current;return true;}} as unknown as AuthGuard;
 const guard=new FeatureAccessGuard(auth),ctx={switchToHttp:()=>({getRequest:()=>req})} as unknown as ExecutionContext;
 await assert.rejects(guard.canActivate(ctx),/暂未开放/);current=admin;assert.ok(await guard.canActivate(ctx));current={...admin,userId:'unlisted'};await assert.rejects(guard.canActivate(ctx),/暂未开放/);
 req.originalUrl='/api/v1/health';assert.ok(await guard.canActivate(ctx));
 let upstream=0;globalThis.fetch=async(_,options)=>{upstream++;assert.equal(JSON.parse(String(options?.body)).unlimited,true);return new Response(JSON.stringify({source:'model',text:'蒸鸡蛋'}));};
 const service=new AssistantService(db,cache),d=Object.assign(new AssistantDto(),{prompt:'鸡蛋怎么蒸',consent:true,requestId:'quota-test-123'});
 const result=await service.assist(normal,d) as {reason:string;text:string;quota:{limit:number;resetAt:string}};assert.equal(result.reason,'daily_limit');assert.ok(result.text.includes('50'));assert.ok(result.text.includes('北京时间零点'));assert.equal(result.quota.limit,50);assert.equal(upstream,0);
 answer=1;await service.assist(admin,d);assert.equal(upstream,1);assert.equal(lastConfig.unlimited,true);assert.equal(mode,'unlimited');
 const budget=new AssistantBudget(cache),reservation=await budget.reserve('ordinary','normal-id');await reservation.finish(false,false);assert.equal(mode,'daily');assert.equal(lastConfig.unlimited,false);
 answer=-3;const start=service.start(normal,{...d,requestId:'job-quota-123'}) as {state:string};assert.equal(start.state,'running');await new Promise(r=>setTimeout(r,0));const job=await service.read(normal,'job-quota-123',0) as {state:string;result:{reason:string;text:string}};assert.equal(job.state,'done');assert.equal(job.result.reason,'daily_limit');assert.ok(job.result.text.includes('50'));
 console.log(JSON.stringify({passed:true,checks:['whitelist requires database admin role and exact ID','closed feature authorization','50-per-day direct prompt','job prompt works with existing client','trusted upstream unlimited flag','daily refund mode']}));
 }finally{globalThis.fetch=oldFetch;delete process.env.RUNTIME_CONFIG_FILE;for(const [key,value] of Object.entries({AI_GATEWAY_URL:oldURL,AI_GATEWAY_TOKEN:oldToken}))if(value===undefined)delete process.env[key];else process.env[key]=value;rmSync(folder,{recursive:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
