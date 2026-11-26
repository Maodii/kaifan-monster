import { BadRequestException, Body, CallHandler, Controller, ExecutionContext, Get, Injectable, NestInterceptor, OnModuleDestroy, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { Throttle } from '@nestjs/throttler';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsString, Matches, Max, Min, ValidateNested, IsIn, IsUUID } from 'class-validator';
import { createHash, randomUUID } from 'node:crypto';
import { tap } from 'rxjs';
import { AuthGuard, AuthedRequest, Identity, User } from './auth';
import { Database } from './database';
export interface Measurement { id?:string; userId?:string; name:string; route:string; status:number; duration:number; firstToken?:number; task?:string; outcome?:string; code?:string; }
@Injectable()
export class Telemetry implements OnModuleDestroy {
 private queue:Measurement[]=[];private flight:Promise<void>|null=null;private lastCleanup=0;
 dropped=0;writeFailures=0;
 private timer=setInterval(()=>{void this.flush();},5000).unref();
 constructor(private readonly db:Database){}
 record(event:Measurement):string {
  const id=event.id||randomUUID();if(this.queue.length>=500){this.dropped++;return id;}
  this.queue.push({...event,id,duration:Math.min(86400000,Math.max(0,Math.round(event.duration)))});return id;
 }
 flush():Promise<void>{if(this.flight)return this.flight;this.flight=this.persist().finally(()=>{this.flight=null;});return this.flight;}
 private async persist(){
  const batch=this.queue.splice(0,100);if(!batch.length)return;
  try{await this.db.query(`INSERT INTO telemetry_event(id,user_id,is_test,event_name,route,status,duration_ms,first_token_ms,task,outcome,code)
   SELECT x.id,x.uid,COALESCE(u.role='admin' OR u.demo_seed_batch IS NOT NULL,false),x.name,x.route,x.status,x.duration,x.first_token,x.task,x.outcome,x.code
   FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,uid uuid,name text,route text,status int,duration int,first_token int,task text,outcome text,code text)
   LEFT JOIN users u ON u.id=x.uid WHERE x.uid IS NULL OR (u.id IS NOT NULL AND u.deleted_at IS NULL) ON CONFLICT(id) DO NOTHING`,[JSON.stringify(batch.map(e=>({id:e.id,uid:e.userId||null,name:e.name,route:e.route,status:e.status,duration:e.duration,first_token:e.firstToken==null?null:Math.round(e.firstToken),task:e.task||null,outcome:e.outcome||null,code:e.code||null})))]);
   if(Date.now()-this.lastCleanup>3600000){this.lastCleanup=Date.now();await this.db.query("DELETE FROM telemetry_event WHERE id IN (SELECT id FROM telemetry_event WHERE created_at < now()-interval '90 days' ORDER BY created_at LIMIT 5000)");}
  }catch{this.writeFailures++;this.dropped+=batch.length;}
 }
 health(){return {queued:this.queue.length,dropped:this.dropped,writeFailures:this.writeFailures,retentionDays:90};}
 async onModuleDestroy(){clearInterval(this.timer);if(this.flight)await this.flight;while(this.queue.length)await this.flush();}
}
const knownCodes=new Set(['daily_limit','scope_restricted','not_configured','no_matches','busy','unavailable','timeout','cancelled','invalid_meal','dietary_conflict','disabled','circuit_open','truncated','content_filtered','incomplete','upstream_unavailable','empty']);
export function measurementCode(code:unknown){return typeof code==='string'&&knownCodes.has(code)?code:'other';}
@Injectable()
export class TelemetryInterceptor implements NestInterceptor {
 constructor(private readonly telemetry:Telemetry){}
 intercept(context:ExecutionContext,next:CallHandler){
  const req=context.switchToHttp().getRequest<AuthedRequest>(),res=context.switchToHttp().getResponse();
  const path=String(req.route?.path||'');const trace=randomUUID();res.setHeader('X-Request-ID',trace);
  // Only route templates are stored; identifiers, URLs, prompts and query strings are excluded.
  const capture=path.startsWith('/api/v1/')&&!/^\/api\/v1\/(admin|telemetry|health|ready)(\/|$)/.test(path)&&!path.startsWith('/api/v1/ai/');
  const started=performance.now();
  const save=(data:any,error?:any)=>{if(!capture)return;const status=error?Number(error.getStatus?.()||500):res.statusCode;const auth=['/api/v1/auth/register','/api/v1/auth/login','/api/v1/auth/admin-login'].includes(path);
   this.telemetry.record({id:trace,userId:req.identity?.userId||(auth&&status<400?data?.userId:undefined),name:path.endsWith('/auth/register')?'register':path.endsWith('/auth/login')||path.endsWith('/auth/admin-login')?'login':'api_request',route:req.method+' '+path,status,duration:performance.now()-started});};
  return next.handle().pipe(tap({next:data=>save(data),error:error=>save(null,error)}));
 }
}
class ClientEventDto {
 @IsUUID('4') id!:string;
 @IsIn(['app_open','page_view','ai_send','ai_cancel','ai_retry','ai_complete','photo_upload']) name!:string;
 @IsIn(['','today','recipes','pantry','diary','account','shopping','assistant','recipe','meal_editor','stats','plans','other']) page!:string;
 @IsIn(['','ask','week','rescue','meal']) task!:string;
 @IsIn(['','success','error','cancelled','model','fallback']) outcome!:string;
 @IsInt() @Min(0) @Max(86400000) durationMs!:number;
 @IsInt() @Min(-1) @Max(86400000) firstTokenMs!:number;
 @IsInt() @Min(0) @Max(8640000000000000) occurredAt!:number;
}
class ClientBatchDto {
 @IsIn(['android','harmony']) platform!:string;
 @IsString() @Matches(/^[0-9A-Za-z .()_-]{1,40}$/) version!:string;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>ClientEventDto) events!:ClientEventDto[];
}
function scopedEventId(user:string,id:string):string{const h=createHash('sha256').update('client|'+user+'|'+id).digest('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);}
class FeedbackDto { @IsUUID() eventId!:string; @IsIn(['up','down']) vote!:string; @IsIn(['helpful','inaccurate','too_slow','irrelevant','other']) reason!:string; }
@Controller('telemetry') @UseGuards(AuthGuard)
export class TelemetryController {
 constructor(private readonly db:Database,private readonly telemetry:Telemetry){}
 @Post('events') @Throttle({default:{limit:12,ttl:60000}})
 async clientEvents(@User() u:Identity,@Body() d:ClientBatchDto){
  const now=Date.now();
  for(const e of d.events){if(Math.abs(now-e.occurredAt)>86400000||e.firstTokenMs>e.durationMs)throw new BadRequestException('事件时间无效');}
  const rows=d.events.map(e=>({id:scopedEventId(u.userId,e.id),name:'client_'+e.name,page:e.page,task:e.task,outcome:e.outcome,duration:e.durationMs,first:e.firstTokenMs<0?null:e.firstTokenMs,at:new Date(e.occurredAt).toISOString()}));
  const saved=await this.db.query(`INSERT INTO telemetry_event(id,user_id,is_test,event_name,route,status,duration_ms,first_token_ms,task,outcome,platform,app_version,occurred_at)
   SELECT x.id,u.id,u.role='admin' OR u.demo_seed_batch IS NOT NULL,x.name,x.page,200,x.duration,x.first,x.task,x.outcome,$3,$4,x.at FROM jsonb_to_recordset($1::jsonb) AS x(id uuid,name text,page text,task text,outcome text,duration int,first int,at timestamptz)
   JOIN users u ON u.id=$2 AND u.deleted_at IS NULL ON CONFLICT(id) DO NOTHING RETURNING id`,[JSON.stringify(rows),u.userId,d.platform,d.version]);
  return {accepted:d.events.length,inserted:saved.length};
 }
 @Post('feedback') async feedback(@User() u:Identity,@Body() d:FeedbackDto){
  if((d.vote==='up')!==(d.reason==='helpful'))throw new BadRequestException('反馈选项无效');
  await this.telemetry.flush();
  const rows=await this.db.query(`INSERT INTO telemetry_feedback(event_id,user_id,vote,reason) SELECT id,$2,$3,$4 FROM telemetry_event WHERE id=$1 AND user_id=$2 AND event_name='ai_answer' AND outcome='model' ON CONFLICT(event_id) DO UPDATE SET vote=excluded.vote,reason=excluded.reason,updated_at=now() RETURNING event_id`,[d.eventId,u.userId,d.vote,d.reason]);
  if(!rows.length)throw new BadRequestException('此回答暂不可反馈，请稍后重试');return {saved:true};
 }
}
