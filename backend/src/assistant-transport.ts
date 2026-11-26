import { createHash } from 'node:crypto';
import { runtimeConfig } from './runtime-config';
import { ConflictException, HttpException } from '@nestjs/common';
interface Flight {hash:string;expires:number;promise:Promise<unknown>;}
/** Per-process, owner-scoped replay protection; never writes prompts or answers to disk. */
export class AssistantFlights {
 private entries=new Map<string,Flight>();
 constructor(private readonly now:()=>number=Date.now,private readonly capacity:number=Infinity,private readonly ttl:number=60000){}
 async run(owner:string,id:string|undefined,body:unknown,work:()=>Promise<unknown>,unlimited=false):Promise<unknown>{
  if(!id)return work();
  const now=this.now();for(const [key,value] of this.entries)if(value.expires<=now)this.entries.delete(key);
  const key=owner+'|'+id,hash=createHash('sha256').update(stable(body)).digest('hex'),old=this.entries.get(key);
  if(old){if(old.hash!==hash)throw new ConflictException('请求内容已变化，请重新发送');return old.promise;}
  if(runtimeConfig().ai.limitsEnabled&&!unlimited&&this.entries.size>=Math.min(this.capacity,runtimeConfig().ai.maxJobs))throw new HttpException('助手正在处理较多请求，请稍后重试',429);
  const entry:Flight={hash,expires:Infinity,promise:Promise.resolve()};
  // Schedule after registration so simultaneous requests share exactly one inference.
  entry.promise=Promise.resolve().then(work).then(result=>{if((result as {source?:string})?.source==='model')entry.expires=this.now()+this.ttl;else this.entries.delete(key);return result;},error=>{this.entries.delete(key);throw error;});
  this.entries.set(key,entry);return entry.promise;
 }
}
function stable(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([key,v])=>key!=='requestId'&&v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>JSON.stringify(key)+':'+stable(v)).join(',')+'}';
 return JSON.stringify(value)??'null';
}
/** Public catalog only. Stock remains a fresh owner-scoped query on every request. */
export class AssistantCatalog<T> {
 private rows:T[]=[];private until=0;private pending:Promise<T[]>|null=null;
 constructor(private readonly now:()=>number=Date.now,private readonly ttl=30000){}
 async get(load:()=>Promise<T[]>):Promise<T[]>{
  if(this.until>this.now())return this.rows;if(this.pending)return this.pending;
  const pending=load().then(rows=>{if(Buffer.byteLength(JSON.stringify(rows))<=8*1024*1024){this.rows=rows;this.until=this.now()+this.ttl;}return rows;}).finally(()=>{this.pending=null;});this.pending=pending;return pending;
 }
}
