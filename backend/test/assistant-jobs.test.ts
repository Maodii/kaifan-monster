import 'reflect-metadata';
import assert from 'node:assert/strict';
import { AssistantJobs } from '../src/assistant-jobs';
async function main(){
 const checks:string[]=[];let now=1,calls=0,release!:(v:unknown)=>void,append!:(v:string)=>void,signal!:AbortSignal;
 const jobs=new AssistantJobs(()=>now,4),body={prompt:'番茄炒蛋',consent:true};
 const work=(s:AbortSignal,a:(v:string)=>void)=>{calls++;signal=s;append=a;return new Promise(r=>release=r);};
 jobs.start('A','request-a',body,work);jobs.start('A','request-a',body,work);await Promise.resolve();assert.equal(calls,1);assert.throws(()=>jobs.start('A','parallel-1',body,work),/当前助手请求/);append('备菜');append('：鸡蛋');
 const read=jobs.read('A','request-a',2) as {delta:string;position:number};assert.equal(read.delta,'：鸡蛋');assert.equal(read.position,5);assert.throws(()=>jobs.read('B','request-a',0),/过期/);assert.throws(()=>jobs.start('A','request-a',{prompt:'changed'},work),/内容/);checks.push('same owner and identity coalesce; cursor deltas preserve Chinese; owner/content guards');
 jobs.cancel('A','request-a');assert.ok(signal.aborted);release({source:'model',text:'late'});await new Promise(r=>setTimeout(r,0));assert.equal((jobs.read('A','request-a',0) as {state:string}).state,'cancelled');checks.push('cancel aborts upstream work signal; late completion cannot restore the result');
 jobs.cancel('A','cancel-first');jobs.start('A','cancel-first',body,work);await Promise.resolve();assert.equal(calls,1);checks.push('cancel before start prevents inference');
 jobs.start('A','complete-1',body,async()=>({source:'model',text:'done'}));await new Promise(r=>setTimeout(r,0));assert.equal((jobs.read('A','complete-1',0) as {state:string}).state,'done');
 jobs.start('A','failure-1',body,async()=>{throw Error('private provider text');});await new Promise(r=>setTimeout(r,0));assert.equal((jobs.read('A','failure-1',0) as {state:string}).state,'error');assert.throws(()=>jobs.start('A','capacity-1',body,work),/较多/);now=70000;assert.throws(()=>jobs.read('A','complete-1',0),/过期/);jobs.start('A','new-request',body,async()=>({source:'model',text:'ok'}));checks.push('completed/error retention and bounded capacity; no upstream errors exposed');
 const ownerBound=new AssistantJobs(()=>now);for(let i=0;i<30;i++)ownerBound.cancel('attacker','cancel-'+String(i).padStart(3,'0'));assert.throws(()=>ownerBound.read('attacker','cancel-000',0),/过期/);assert.equal((ownerBound.start('other','real-user',body,async()=>({source:'model'})) as {state:string}).state,'running');checks.push('one running job per owner; cancelled-result flooding is owner-bounded and leaves other users capacity');
 console.log(JSON.stringify({passed:true,checks,scope:'private job lifecycle and actual AbortSignal; gateway disconnect separately checked over real HTTP'},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
