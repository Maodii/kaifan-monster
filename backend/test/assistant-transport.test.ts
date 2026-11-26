import 'reflect-metadata';
import assert from 'node:assert/strict';
import { AssistantFlights,AssistantCatalog } from '../src/assistant-transport';
import { catalogCompression } from '../src/network';
import express from 'express';
import { request,createServer } from 'node:http';
import { gunzipSync } from 'node:zlib';
async function main(){
 const checks:string[]=[];let now=100,calls=0;const flights=new AssistantFlights(()=>now,3,60);
 let release!:(v:unknown)=>void;const work=()=>{calls++;return new Promise(resolve=>{release=resolve;});};
 const a=flights.run('A','request-1',{prompt:'番茄',task:'ask'},work),b=flights.run('A','request-1',{task:'ask',prompt:'番茄'},work);await Promise.resolve();assert.equal(calls,1);release({source:'model',text:'a'});assert.deepEqual(await a,await b);
 await flights.run('A','request-1',{prompt:'番茄',task:'ask'},async()=>{throw Error('duplicate');});
 await assert.rejects(flights.run('A','request-1',{prompt:'鸡蛋'},work),e=>(e as {status:number}).status===409);
 const other=await flights.run('B','request-1',{prompt:'番茄',task:'ask'},async()=>({source:'model',text:'b'}));assert.equal((other as {text:string}).text,'b');checks.push('concurrent/replayed requests share one inference; fingerprint and owner isolation');
 now+=61;await flights.run('A','request-1',{prompt:'鸡蛋'},async()=>({source:'model'}));checks.push('replay retention expires with bounded capacity');
 let fallbackCalls=0;for(let i=0;i<2;i++)await flights.run('C','fallback-1',{},async()=>{fallbackCalls++;return {source:'fallback'};});assert.equal(fallbackCalls,2);
 await assert.rejects(flights.run('C','failure-1',{},async()=>{throw Error('offline');}));await flights.run('C','failure-1',{},async()=>({source:'model'}));checks.push('failed and fallback requests can be retried without a poisoned cache');
 const capped=new AssistantFlights(()=>0,1);let finish!:(v:unknown)=>void;const pending=capped.run('A','busy-1',{},()=>new Promise(resolve=>{finish=resolve;}));await Promise.resolve();await assert.rejects(capped.run('B','busy-2',{},async()=>({source:'model'})),e=>(e as {status:number}).status===429);finish({source:'model'});await pending;checks.push('in-flight capacity is bounded');
 const catalog=new AssistantCatalog<{id:string}>(()=>now,30);let loads=0;const load=async()=>{loads++;await Promise.resolve();return [{id:'public'}];};await Promise.all([catalog.get(load),catalog.get(load),catalog.get(load)]);assert.equal(loads,1);now+=31;await catalog.get(load);assert.equal(loads,2);checks.push('public catalog load coalescing and TTL refresh');
 const broken=new AssistantCatalog();await assert.rejects(broken.get(async()=>{throw Error('db');}));assert.deepEqual(await broken.get(async()=>[1]),[1]);checks.push('catalog load failure clears the pending request');
 const app=express();app.use(catalogCompression());const value={recipes:Array.from({length:200},(_,i)=>({id:i,name:'番茄炒蛋',steps:['先准备食材，再分步烹饪，最后确认熟透。']}))};app.get('/api/v1/catalog/recipes',(_req,res)=>res.json(value));app.get('/api/v1/ai/private',(_req,res)=>res.json(value));const server=createServer(app);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const port=(server.address() as {port:number}).port;
 const wire=(path:string,encoding:string)=>new Promise<{headers:Record<string,unknown>,bytes:Buffer}>((resolve,reject)=>{request({host:'127.0.0.1',port,path,headers:{'Accept-Encoding':encoding}},res=>{const chunks:Buffer[]=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({headers:res.headers,bytes:Buffer.concat(chunks)}));}).on('error',reject).end();});
 let identityBytes=0,gzipBytes=0;
 try{const plain=await wire('/api/v1/catalog/recipes','identity'),zipped=await wire('/api/v1/catalog/recipes','gzip'),privateBody=await wire('/api/v1/ai/private','gzip');identityBytes=plain.bytes.length;gzipBytes=zipped.bytes.length;assert.equal(zipped.headers['content-encoding'],'gzip');assert.deepEqual(gunzipSync(zipped.bytes),plain.bytes);assert.ok(gzipBytes<identityBytes*0.5);assert.equal(privateBody.headers['content-encoding'],undefined);checks.push('catalog gzip preserves exact JSON bytes and leaves private endpoints uncompressed');}finally{await new Promise<void>(r=>server.close(()=>r()));}
 console.log(JSON.stringify({passed:true,checks,hostFixtureBytes:{identity:identityBytes,gzip:gzipBytes},scope:'unit and local HTTP fixture; cloud transfer measured separately'},null,2));
}void main();
