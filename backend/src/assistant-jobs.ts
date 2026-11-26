import { createHash } from 'node:crypto';
import { runtimeConfig } from './runtime-config';
import { BadRequestException, ConflictException, HttpException, NotFoundException } from '@nestjs/common';
interface Job {hash:string;controller:AbortController;text:string;state:string;result:unknown;until:number;first:number;started:number;}
function canonical(value:unknown):string {if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';return JSON.stringify(value)??'null';}
/** One API process; partial output is private, bounded and never persisted. */
export class AssistantJobs {
 private jobs=new Map<string,Job>();
 constructor(private readonly now:()=>number=Date.now,private readonly capacity=Infinity){}
 private key(owner:string,id:string):string {if(!/^[A-Za-z0-9_-]{8,80}$/.test(id))throw new BadRequestException('请求标识无效');return owner+'|'+id;}
 private prune():void {for(const [key,j] of this.jobs)if(j.until<=this.now()){j.controller.abort();this.jobs.delete(key);}}
 start(owner:string,id:string,body:unknown,work:(signal:AbortSignal,append:(delta:string)=>void)=>Promise<unknown>,unlimited=false,waitMs=25000):unknown {
  const duration=Math.min(35000,Math.max(1000,waitMs));
  this.prune();const key=this.key(owner,id),hash=createHash('sha256').update(canonical(body)).digest('hex'),old=this.jobs.get(key);
  if(old){if(old.hash&&old.hash!==hash)throw new ConflictException('请求内容已变化，请重新发送');return this.snapshot(old,0,id);}
  const own=[...this.jobs.entries()].filter(([k])=>k.startsWith(owner+'|'));
  if(runtimeConfig().ai.limitsEnabled&&!unlimited&&own.some(([,j])=>j.state==='running'))throw new HttpException('请先结束当前助手请求',429);
  if(own.length>=8){const oldest=own.find(([,j])=>j.state!=='running');if(oldest)this.jobs.delete(oldest[0]);}
  if(runtimeConfig().ai.limitsEnabled&&!unlimited&&this.jobs.size>=Math.min(this.capacity,runtimeConfig().ai.maxJobs))throw new HttpException('助手任务较多，请稍后重试',429);
  const started=this.now(),j:Job={hash,controller:new AbortController(),text:'',state:'running',result:null,until:started+duration+5000,first:0,started};this.jobs.set(key,j);
  const deadline=setTimeout(()=>{if(j.state==='running'){j.controller.abort();j.state='error';j.until=this.now()+60000;}},duration);deadline.unref?.();
  Promise.resolve().then(()=>work(j.controller.signal,(delta)=>{if(j.state!=='running'||j.controller.signal.aborted)return;if(j.text.length+delta.length>8000){j.controller.abort();throw new Error('response_too_large');}if(delta&&!j.first)j.first=this.now();j.text+=delta;})).then(result=>{if(j.state==='running'){j.result=result;j.state='done';j.until=this.now()+60000;}},()=>{if(j.state==='running'){j.state='error';j.until=this.now()+60000;}}).finally(()=>clearTimeout(deadline));
  return this.snapshot(j,0,id);
 }
 read(owner:string,id:string,after:number):unknown {this.prune();const j=this.jobs.get(this.key(owner,id));if(!j)throw new NotFoundException('对话结果已过期，请重新提问');if(!Number.isInteger(after)||after<0||after>j.text.length)throw new BadRequestException('读取位置无效');return this.snapshot(j,after,id);}
 cancel(owner:string,id:string,unlimited=false):unknown {this.prune();const key=this.key(owner,id);let j=this.jobs.get(key);if(!j){const own=[...this.jobs.entries()].filter(([k])=>k.startsWith(owner+'|'));if(own.length>=8){const old=own.find(([,v])=>v.state!=='running');if(old)this.jobs.delete(old[0]);else if(runtimeConfig().ai.limitsEnabled&&!unlimited)throw new HttpException('助手任务较多',429);}if(runtimeConfig().ai.limitsEnabled&&!unlimited&&this.jobs.size>=Math.min(this.capacity,runtimeConfig().ai.maxJobs))throw new HttpException('助手任务较多',429);j={hash:'',controller:new AbortController(),text:'',state:'cancelled',result:null,until:this.now()+60000,first:0,started:this.now()};this.jobs.set(key,j);}j.controller.abort();j.state='cancelled';j.result=null;j.text='';j.until=this.now()+60000;return {id,state:'cancelled'};}
 private snapshot(j:Job,after:number,id:string):unknown {return {id,state:j.state,delta:j.text.slice(after),position:j.text.length,result:j.result,firstDeltaMs:j.first?j.first-j.started:null,elapsedMs:this.now()-j.started};}
}
