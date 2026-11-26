import { parseGeneratedRecipe, parseMealEstimate, CREATE_INSTRUCTION, ESTIMATE_INSTRUCTION } from './assistant-intelligence';
import { Telemetry, measurementCode } from './telemetry';
import { isWhitelistedAdmin, runtimeConfig } from './runtime-config';
import { assistantContext, violatesExclusions, assistantUsesWeb } from './assistant-context';
import { SkipThrottle } from '@nestjs/throttler';
import { createHash } from 'node:crypto';
import { AssistantBudget } from './assistant-budget';
import { assistantSafetyReason, assistantInScope, cookingFollowup } from './assistant-policy';
import { AssistantJobs } from './assistant-jobs';
import { AssistantFlights, AssistantCatalog } from './assistant-transport';
import { AssistantFood, CatalogRecipe, activeFoods, chinaDay, validDay, selectWorkflowRecipes, parseMealSuggestion, groundMealSuggestion } from './assistant-workflow';
import { Type } from 'class-transformer';
import { Body, Controller, Injectable, Optional, Post, Get, Delete, Param, Query, ServiceUnavailableException, HttpException, BadRequestException, UseGuards } from '@nestjs/common';
import { Equals, IsBoolean, IsOptional, IsString, MaxLength, MinLength, IsIn, IsInt, Min, Max, IsNumber, IsArray, ArrayMaxSize, ValidateNested, Matches } from 'class-validator';
import { AuthGuard, Identity, User } from './auth';
import { Database } from './database';
import { Cache } from './cache';
export class AssistantTurnDto { @IsIn(['user','assistant']) role!:string; @IsString() @MaxLength(1200) text!:string; }
export class AssistantDto {
 @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_-]{8,80}$/) requestId?:string;
 @IsOptional() @IsIn(['ask','week','rescue','meal','create','estimate']) task?:string;
 @IsOptional() @IsInt() @Min(1) @Max(12) people?:number;
 @IsOptional() @IsInt() @Min(10) @Max(180) maxMinutes?:number;
 @IsOptional() @IsNumber() @Min(0) @Max(300) maxCost?:number;
 @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({each:true}) @MaxLength(20,{each:true}) excluded?:string[];
 @IsOptional() @IsString() @MaxLength(40) region?:string;
 @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate?:string;
 @IsOptional() @IsIn([3,7]) days?:number;
 @IsOptional() @IsArray() @ArrayMaxSize(2) @ValidateNested({each:true}) @Type(()=>AssistantTurnDto) history?:AssistantTurnDto[];
 @IsString() @MinLength(1) @MaxLength(2800) prompt!:string;
 @Equals(true) consent!:boolean;
 @IsOptional() @IsBoolean() includeInventory?:boolean;
 @IsOptional() @IsBoolean() webSearch?:boolean;
 @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({each:true}) @MaxLength(30,{each:true}) inventoryNames?:string[];
}
export interface AssistantReference {id:string;name:string;minutes:number;estimatedCost:number;}
@Injectable()
export class AssistantService {
 private jobs=new AssistantJobs();
 start(user:Identity,d:AssistantDto):unknown{if(!d.requestId)throw new BadRequestException('缺少请求标识');return this.jobs.start(user.userId,d.requestId,d,(signal,append)=>this.execute(user,d,signal,append),isWhitelistedAdmin(user),assistantUsesWeb(d.task||'ask',d.prompt,d.webSearch)?35000:25000);}
 async read(user:Identity,id:string,after:number):Promise<unknown>{
  try{return this.jobs.read(user.userId,id,after);}catch(error){
   if((error as {status?:number}).status!==404)throw error;
   if(!Number.isInteger(after)||after<0||after>8000)throw new BadRequestException('读取位置无效');
   const key='ai:v2:seen:'+createHash('sha256').update(user.userId+'|'+id).digest('hex');
   try{if(await this.cache.redis.get(key))return {id,state:'error',reason:'interrupted',delta:'',position:after,result:null};}catch{}
   throw error;
  }
 }
 cancel(user:Identity,id:string):unknown{return this.jobs.cancel(user.userId,id,isWhitelistedAdmin(user));}
 private flights=new AssistantFlights();private catalog=new AssistantCatalog<CatalogRecipe>();
 constructor(private readonly db:Database,private readonly cache:Cache,@Optional() private readonly telemetry?:Telemetry){}
 async assist(user:Identity,d:AssistantDto):Promise<unknown>{return this.flights.run(user.userId,d.requestId,d,()=>this.execute(user,d),isWhitelistedAdmin(user));}
 private async execute(user:Identity,d:AssistantDto,signal?:AbortSignal,append?:(delta:string)=>void):Promise<unknown>{
  const started=performance.now();let firstToken:number|undefined;let result:any;let failure:any;
  try{result=await this.executeAnswer(user,d,signal,append?(delta)=>{if(firstToken===undefined)firstToken=performance.now()-started;append(delta);}:undefined);return result;}
  catch(error){failure=error;throw error;}
  finally{if(this.telemetry){const id=this.telemetry.record({userId:user.userId,name:'ai_answer',route:'AI '+(append?'stream':'direct'),status:failure?Number(failure.getStatus?.()||500):200,duration:performance.now()-started,firstToken,task:d.task||'ask',outcome:failure?'error':result?.source==='model'?'model':'fallback',code:failure?(signal?.aborted?'cancelled':'other'):result?.source==='model'?undefined:measurementCode(result?.reason)});if(result&&typeof result==='object')result.analyticsId=id;}}
 }
 private async executeAnswer(user:Identity,d:AssistantDto,signal?:AbortSignal,append?:(delta:string)=>void):Promise<unknown>{
  if(signal?.aborted)throw new Error('cancelled');
  if(!d.prompt.trim())return {source:'fallback',reason:'empty',text:'请先告诉我想吃什么。',requires_review:true,references:[]};
  const denial=assistantSafetyReason(d.prompt);
  if(denial)return {source:'fallback',reason:'scope_restricted',text:denial,requires_review:true,references:[]};
  let question=d.prompt;
  if(cookingFollowup(question)){
   const turns=d.history||[];
   if(turns.length!==2||turns[0].role!=='user'||turns[1].role!=='assistant'||turns.some(h=>assistantSafetyReason(h.text))||!turns.some(h=>assistantInScope(h.text))){
    return {source:'fallback',reason:'clarify',text:'你想接着看哪道菜，或者继续按多少分钟来推荐？',requires_review:true,references:[]};
   }
   question='继续上一轮饮食建议，从上次停下的位置接着讲。';
  }
  if(!assistantInScope(question))return {source:'fallback',reason:'scope_restricted',text:'小怪可以帮你挑菜、做饭、采购或记餐。你想先做哪件事？',requires_review:true,references:[]};
  const webSearch=assistantUsesWeb(d.task||'ask',d.prompt,d.webSearch);
  const task=d.task||'ask';const structured=task==='create'||task==='estimate';if(d.startDate&&!validDay(d.startDate))throw new BadRequestException('日期无效');
  if(task==='rescue'&&!d.includeInventory)throw new BadRequestException('请先同意附带已同步的示例主体库存名称');
  const rows:CatalogRecipe[]=(task==='meal'||structured)?[]:await this.catalog.get(()=>this.db.query<CatalogRecipe>('SELECT id,payload FROM recipe_catalog'));
  let foods:AssistantFood[]=[],expiredExcluded=0;
  if(d.includeInventory&&task!=='meal'){const stock=await this.db.query("SELECT payload FROM food_items WHERE user_id=$1 AND family_id IS NULL AND NOT deleted ORDER BY payload->>'expiryDate' NULLS LAST LIMIT 200",[user.userId]);const active=activeFoods(stock.map(r=>r.payload as AssistantFood),chinaDay());foods=active.foods;expiredExcluded=active.expiredExcluded;}
  if(d.includeInventory&&task!=='meal'&&d.inventoryNames?.length){const names=new Set(foods.map(f=>f.name));for(const name of d.inventoryNames){if(name.trim()&&!names.has(name.trim())){foods.push({name:name.trim(),quantity:1});names.add(name.trim());}}foods=foods.slice(0,20);}
  const minutes=task==='ask'?d.prompt.normalize('NFKC').match(/(\d{1,3})\s*分钟(?:内|左右)?(?:能|可以|够)?做/):null;
  const constraints=minutes?{...d,maxMinutes:Math.min(d.maxMinutes||Infinity,Math.max(1,Number(minutes[1])))}:d;
  let selected=(task==='meal'||structured)?{references:[],plans:[]}:selectWorkflowRecipes(rows,d.prompt,constraints,foods);
  if(task==='rescue'&&!foods.length){const replenish=selectWorkflowRecipes(rows,d.prompt,{...constraints,task:'week',days:3},[]);selected={references:replenish.references,plans:[]};}
  if(task==='ask'&&!selected.references.length&&/(库存|冰箱|推荐|吃什么|能做什么)/.test(d.prompt)){const generic=selectWorkflowRecipes(rows,d.prompt,{...constraints,task:'week',days:3},[]);selected={references:generic.references,plans:[]};}
  const references=selected.references,plans=selected.plans;
  const extras={task,plans,inventoryUsed:foods.length,expiredExcluded,proposalSource:structured?'model_knowledge':'catalog_rules',retrieval:{status:webSearch?'unavailable':'not_requested',sources:[]}};
  if((task==='week'||task==='rescue')&&!references.length)return {source:'fallback',reason:'no_matches',text:task==='rescue'?(foods.length?'库存暂无匹配菜谱，可调整地区、时长或预算；未放宽忌口条件。':'没有已同步且可推荐使用的示例主体库存。请先同步食材，过期记录已跳过。'):'当前条件没有匹配的晚餐主菜。可调整时间、预算、地区或忌口；未放宽任何条件。',requires_review:true,references,...extras};
  const inventory=d.includeInventory?(foods.length?'所选示例主体库存名称（未证明可食用）：'+foods.map(f=>f.name.slice(0,20)).join('、'):'已共享的云端示例主体库存暂无可用食材；本机可能尚未同步。请友好提醒补充或同步，并结合下方候选给出可采购的菜谱与少量补货清单，不要以空库存为由停止推荐。'):'本次未附带示例主体库存，不能推断库存为空或已经读取库存。遇到库存类问题，简短说明可授权附带库存，随后给出通用菜谱和按需采购建议，不要说无法推荐。';
  const history=(task==='meal'?[]:(d.history||[]).filter(h=>!assistantSafetyReason(h.text))).map(h=>h.role+':'+h.text).join('\n');
  const context=references.map(ref=>{const row=rows.find(r=>r.id===ref.id)!;return JSON.stringify({name:ref.name,minutes:ref.minutes,cost:ref.estimatedCost>=0?ref.estimatedCost:'未知',ingredients:(row.payload.ingredients||[]).slice(0,6).map(i=>i.name),steps:(row.payload.steps||[]).slice(0,3)});}).join('\n').slice(0,650);
  const instruction=task==='create'?CREATE_INSTRUCTION:task==='estimate'?ESTIMATE_INSTRUCTION:task==='meal'?'只输出一个JSON对象，禁止markdown及解释。字段：name食物名称，mealType早餐/午餐/晚餐/加餐，diningMode在家做/餐馆/食堂/外卖/外食，estimatedCost本人的花费，calories本人的大卡，rating整数1到5，place地点。金额、大卡、评分未明确说出必须填-1，不得估算或猜测；地点未给填空字符串，不猜日期；未说餐次按晚餐，未说就餐方式按外食。只提取用户当前问题，不从历史或参考菜谱添加字段。':task==='week'?'以下是已按人数、单菜预算和时间筛选的晚餐主菜草案，请用100字以内解释搭配并建议补充蔬菜主食，不改写菜名，不声称完整营养方案。':task==='rescue'?'根据匹配菜谱，简短说明怎样优先利用库存。库存为空时推荐适合采购后制作的菜谱和补货，不声称已经拥有这些食材。没有匹配时明确告知；不推荐已过期食品，不把有库存等同于安全可食用。':'根据问题决定篇幅，详细追问给出完整步骤，优先相关菜谱。不要因为未附带库存而拒绝推荐；可先给2到3个快手方案。';
  const prompt=assistantContext(question,constraints,instruction,history,inventory,context);
  const url=process.env.AI_GATEWAY_URL,token=process.env.AI_GATEWAY_TOKEN;
  if(!url||!token)return {...this.fallback('not_configured',references),...extras};
  if(signal?.aborted)throw new Error('cancelled');
  let reservation:Awaited<ReturnType<AssistantBudget['reserve']>>;
  const unlimited=isWhitelistedAdmin(user);
  try{reservation=await new AssistantBudget(this.cache).reserve(user.userId,d.requestId,unlimited,user.aiDailyLimit);}catch(error){
   const detail=error instanceof HttpException?error.getResponse():null;
   if(detail&&typeof detail==='object'&&'code' in detail&&detail.code==='daily_limit'){const quota=detail as unknown as {message:string;limit:number;remaining:number;resetAt:string};return {...this.fallback('daily_limit',[]),text:quota.message,quota:{limit:quota.limit,remaining:quota.remaining,resetAt:quota.resetAt}};}
   throw error;
  }let charge=false,attempted=true;
  try{
   const response=await fetch(url.replace(/\/$/,'')+(append?'/v1/assist/stream':'/v1/assist'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({prompt,question,unlimited,...(webSearch?{web_search:true}:{}),...(structured?{output_mode:task}: {})}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(webSearch?35000:20000)]):AbortSignal.timeout(webSearch?35000:20000),redirect:'error'});
   if(!response.ok){if([401,429,503].includes(response.status))attempted=false;return {...this.fallback(response.status===429?'busy':'unavailable',references),...extras};}
   const reader=response.body?.getReader();if(!reader)return {...this.fallback('unavailable',references),...extras};let text='',size=0,buffer='';let final:Record<string,unknown>|null=null;const decoder=new TextDecoder();
   try{while(true){const row=await reader.read();if(row.done)break;size+=row.value.byteLength;if(size>524288)throw new Error('response_too_large');const chunk=decoder.decode(row.value,{stream:true});if(append){buffer+=chunk;let newline:number;while((newline=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);if(!line.trim())continue;const event=JSON.parse(line);if(event.type==='delta'&&typeof event.text==='string'&&task!=='meal'&&!structured&&!d.excluded?.length){append(event.text);}if(event.type==='done')final=event.result;}}else{text+=chunk;}}if(append&&!final)throw new Error('incomplete_stream');text+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
   const result=(append?final!:JSON.parse(text)) as {source:string;text:string;reason?:string;retrieval?:{status:string;sources:{title:string;url:string}[];fetchedAt?:number}};if(!['model','fallback'].includes(result.source)||typeof result.text!=='string'||!result.text.trim()||result.text.length>8000)return {...this.fallback('unavailable',references),...extras};
   if(result.retrieval?.status==='searched'&&Array.isArray(result.retrieval.sources)){Object.assign(extras,{retrieval:result.retrieval});}
   charge=result.source==='model';
   if(result.source==='fallback'&&['disabled','not_configured','busy','circuit_open','scope_restricted'].includes(result.reason||''))attempted=false;
   if(violatesExclusions(result.text,d.excluded)){charge=false;return {...this.fallback('dietary_conflict',references),...extras,text:'回答可能与所选忌口冲突，已隐藏。请查看符合筛选条件的菜谱并核对食材。'};}
   if(structured&&result.source==='model'){const generatedRecipe=task==='create'?parseGeneratedRecipe(result.text,d.people||2,d.maxMinutes,d.maxCost):null;const estimate=task==='estimate'?parseMealEstimate(result.text):null;if(!generatedRecipe&&!estimate){charge=false;return {...this.fallback('invalid_draft',[]),...extras,text:'这次没有形成可靠草稿，请补充食材或份量再试。'};}return {...extras,source:'model',reason:null,requires_review:true,references:[],generatedRecipe,estimate,text:task==='create'?'已按你的条件整理新做法，尚未保存。做法与数值均为 AI 参考，请核对后使用。':'已按一人份整理估算区间，尚未写入记录。请核对份量、用油与价格假设。'};}
   const parsed=task==='meal'&&result.source==='model'?parseMealSuggestion(result.text):null;
   const mealDraft=parsed?groundMealSuggestion(parsed,d.prompt):null;
   if(task==='meal'&&!mealDraft){charge=false;return {...this.fallback('invalid_meal',references),...extras,text:'没有可靠解析出记餐草稿，请换一种说法，或直接手动记餐。'};}
   if(append&&d.excluded?.length&&task!=='meal'&&result.source==='model')append(result.text);
   return {...extras,mealDraft,source:result.source,reason:result.source==='model'?null:String(result.reason||'unavailable').slice(0,40),text:task==='meal'?'已整理为记餐草稿，请核对后进入编辑；尚未保存。':(task==='week'&&plans.length<(d.days||7)?'当前条件仅筛出'+plans.length+'天主菜，未放宽条件。\n':'')+result.text,requires_review:true,references};
  }catch{if(signal?.aborted)throw new Error('cancelled');return {...this.fallback('unavailable',references),...extras};}finally{await reservation.finish(charge,attempted);}
 }
 private fallback(reason:string,references:AssistantReference[]):{source:string;reason:string;text:string;requires_review:boolean;references:AssistantReference[]}{return {source:'fallback',reason,text:'小怪助手暂时没连上。可以先查看下方相关菜谱，或稍后重试。',requires_review:true,references};}
}
@Controller('ai') @UseGuards(AuthGuard) @SkipThrottle()
export class AssistantController {
 @Get('access') access(@User() u:Identity):unknown{const unlimited=isWhitelistedAdmin(u),ai=runtimeConfig().ai;return {role:u.role,whitelistedAdmin:unlimited,features:{community:unlimited,discovery:unlimited,admin:u.role==='admin'},ai:{unlimited,dailyLimit:unlimited?null:u.aiDailyLimit??(ai.dailyLimitEnabled?ai.perUserDay:null),resetTimezone:'Asia/Shanghai'}};}
 @Post('assist/jobs') start(@User() u:Identity,@Body() d:AssistantDto):unknown{return this.service.start(u,d);}
 @Get('assist/jobs/:id') read(@User() u:Identity,@Param('id') id:string,@Query('after') after:string='0'):unknown{return this.service.read(u,id,Number(after));}
 @Delete('assist/jobs/:id') cancel(@User() u:Identity,@Param('id') id:string):unknown{return this.service.cancel(u,id);}
 constructor(private readonly service:AssistantService){} @Post('assist') assist(@User() u:Identity,@Body() d:AssistantDto):Promise<unknown>{return this.service.assist(u,d);}}
