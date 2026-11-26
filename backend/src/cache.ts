import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
@Injectable()
export class Cache implements OnModuleDestroy {
 readonly redis=new Redis({host:process.env.REDIS_HOST||'127.0.0.1',port:Number(process.env.REDIS_PORT||6379),password:process.env.REDIS_PASSWORD,lazyConnect:true,maxRetriesPerRequest:1,enableOfflineQueue:false,connectTimeout:2000,retryStrategy:()=>2000});
 constructor(){this.redis.on('error',()=>{});void this.redis.connect().catch(()=>{});}
 async get<T>(key:string):Promise<T|null>{try{const v=await this.redis.get(key);return v?JSON.parse(v) as T:null;}catch{return null;}}
 async set(key:string,value:unknown,seconds=60):Promise<void>{try{await this.redis.set(key,JSON.stringify(value),'EX',seconds);}catch{/* PostgreSQL仍是事实来源。 */}}
 async drop(key:string):Promise<void>{try{await this.redis.del(key);}catch{}}
 async withSyncLock<T>(userId:string,action:()=>Promise<T>):Promise<T>{
  const key='sync-lock:'+userId,token=randomUUID();let available=true,acquired=false;
  try{acquired=(await this.redis.set(key,token,'PX',30000,'NX'))==='OK';}catch{available=false;}
  if(available&&!acquired)throw new ConflictException('同步正在进行，请稍后重试');
  try{return await action();}finally{if(acquired){try{await this.redis.eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",1,key,token);}catch{}}}
 }
 async onModuleDestroy():Promise<void>{this.redis.disconnect();}
}
