import 'reflect-metadata';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,renameSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runtimeReader,DEFAULT_RUNTIME,validateRuntime} from '../src/runtime-config';
import {AssistantJobs} from '../src/assistant-jobs';
import {AssistantFlights} from '../src/assistant-transport';
async function main(){
 const dir=mkdtempSync(join(tmpdir(),'kaifan-runtime-')),file=join(dir,'config.json');
 try{
 const read=runtimeReader(()=>file),value=JSON.parse(JSON.stringify(DEFAULT_RUNTIME));
 assert.equal(read().ai.limitsEnabled,true);value.ai.limitsEnabled=false;writeFileSync(file,JSON.stringify(value));assert.equal(read().ai.limitsEnabled,false);
 writeFileSync(file,'{');assert.equal(read().ai.limitsEnabled,false);
 value.ai.globalMinute=30;writeFileSync(join(dir,'next'),JSON.stringify(value));renameSync(join(dir,'next'),file);assert.equal(read().ai.globalMinute,30);
 assert.throws(()=>validateRuntime({...value,unknown:true}));assert.throws(()=>validateRuntime({...value,ai:{...value.ai,maxJobs:0}}));
 process.env.RUNTIME_CONFIG_FILE=file;
 const jobs=new AssistantJobs(),flights=new AssistantFlights();let calls=0;const work=async()=>{calls++;return {source:'model'};};
 for(let i=0;i<12;i++)jobs.start('same-owner','request-'+i,{},work);
 await Promise.all(Array.from({length:12},(_,i)=>flights.run('same-owner','flight-'+i,{},work)));
 await Promise.all([flights.run('same-owner','dedup',{},work),flights.run('same-owner','dedup',{},work)]);assert.equal(calls,25);
 console.log(JSON.stringify({passed:true,checks:['validation','hot read','atomic replacement','last good fallback','12 same-owner jobs and flights','deduplication']}));
 }finally{delete process.env.RUNTIME_CONFIG_FILE;rmSync(dir,{recursive:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
