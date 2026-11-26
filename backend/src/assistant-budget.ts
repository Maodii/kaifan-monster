import { createHash, randomUUID } from 'node:crypto';
import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { Cache } from './cache';
import { runtimeConfig } from './runtime-config';
export function budgetDay(now=new Date()):string{return new Date(now.getTime()+8*3600000).toISOString().slice(0,10);}
export const RESERVE_SCRIPT=`
local old=redis.call('GET',KEYS[6]); if old then return -2 end
local config=cjson.decode(ARGV[2]);local limited=config.limitsEnabled
local daily=config.dailyLimitEnabled and not config.unlimited
if config.unlimited then limited=false end
if limited and redis.call('EXISTS',KEYS[5])==1 then return -1 end
local m=tonumber(redis.call('GET',KEYS[1]) or '0'); local d=tonumber(redis.call('GET',KEYS[2]) or '0'); local g=tonumber(redis.call('GET',KEYS[3]) or '0');local gm=tonumber(redis.call('GET',KEYS[4]) or '0')
if daily and d>=config.perUserDay then return -3 end
if limited and (m>=config.perUserMinute or gm>=config.globalMinute or d>=config.perUserDay or g>=config.globalDay) then return 0 end
if limited then
 for i=1,4 do local n=redis.call('INCR',KEYS[i]);if n==1 then redis.call('EXPIRE',KEYS[i],(i==1 or i==4) and 60 or 172800) end end
 redis.call('SET',KEYS[5],ARGV[1],'EX',30)
elseif daily then
 local n=redis.call('INCR',KEYS[2]);if n==1 then redis.call('EXPIRE',KEYS[2],172800) end
end
redis.call('SET',KEYS[6],ARGV[1],'EX',86400);redis.call('SET',KEYS[7],ARGV[1],'EX',120);return 1`;
export const SETTLE_SCRIPT=`
if redis.call('GET',KEYS[7])~=ARGV[1] then return 0 end
redis.call('DEL',KEYS[7]);if redis.call('GET',KEYS[5])==ARGV[1] then redis.call('DEL',KEYS[5]) end
if ARGV[2]=='refund' then
 if ARGV[4]=='limited' or ARGV[4]=='daily' then
  local n=tonumber(redis.call('GET',KEYS[2]) or '0');if n>0 then redis.call('DECR',KEYS[2]) end
  if ARGV[4]=='limited' and ARGV[3]=='not_attempted' then local g=tonumber(redis.call('GET',KEYS[3]) or '0');if g>0 then redis.call('DECR',KEYS[3]) end end
 end
 redis.call('DEL',KEYS[6])
else redis.call('SET',KEYS[6],'completed','EX',86400) end
return 1`;
/** Redis stores counters and opaque replay markers only, never prompts or replies. */
export class AssistantBudget {
 constructor(private cache:Cache){}
 async reserve(owner:string,id:string|undefined,unlimited=false,dailyLimit?:number|null):Promise<{finish:(charge:boolean,attempted?:boolean)=>Promise<void>}> {
  const day=budgetDay(),who=createHash('sha256').update(owner).digest('hex'),token=randomUUID();
  const replay=id?createHash('sha256').update(owner+'|'+id).digest('hex'):randomUUID();
  const keys=['ai:v2:minute:'+who,'ai:v2:day:'+day+':'+who,'ai:v2:global:day:'+day,'ai:v2:global:minute','ai:v2:active:'+who,'ai:v2:seen:'+replay,'ai:v2:reservation:'+token];
  let value:number;
  const config={...runtimeConfig().ai,unlimited};if(dailyLimit!==undefined&&dailyLimit!==null){if(!Number.isInteger(dailyLimit)||dailyLimit<0||dailyLimit>100000)throw new ServiceUnavailableException('账号额度配置无效');config.perUserDay=dailyLimit;config.dailyLimitEnabled=true;}
  const mode=unlimited?'unlimited':config.limitsEnabled?'limited':config.dailyLimitEnabled?'daily':'unlimited';
  try{value=Number(await this.cache.redis.eval(RESERVE_SCRIPT,7,...keys,token,JSON.stringify(config)));}catch{throw new ServiceUnavailableException('助手暂时繁忙，请稍后再试');}
  if(value===-3)throw new HttpException({code:'daily_limit',message:'今日 '+config.perUserDay+' 次问答额度已用完，请明天再来（北京时间零点恢复）。',limit:config.perUserDay,remaining:0,resetAt:new Date(Date.parse(day+'T00:00:00+08:00')+86400000).toISOString()},429);
  if(value===-2)throw new HttpException('本次请求已处理或服务曾中断，请用新问题标识重新提交',409);
  if(value!==1)throw new HttpException(value===-1?'请先结束当前助手请求':'提问次数已达当前配置限制（每日额度北京时间零点重置）',429);
  return {finish:async (charge,attempted=true)=>{try{await this.cache.redis.eval(SETTLE_SCRIPT,7,...keys,token,charge?'charge':'refund',attempted?'attempted':'not_attempted',mode);}catch{/* Keep conservative charge and expiring lease during outages; never duplicate refund. */}}};
 }
}
