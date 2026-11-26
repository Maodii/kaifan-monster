import { ClientTelemetry } from './ClientTelemetry';
import { pollingDelay, transientAssistantFailure } from './AssistantInteraction';
// Shared privacy boundary for both clients. Conversation stays in memory only.
export const COMMUNITY_ENABLED:boolean=false;
export function socialPath(path:string):boolean{return /^\/(community|discovery)(\/|\?|$)/.test(path)||/^\/catalog\/(submissions|public)(\/|\?|$)/.test(path);}
export function socialRoute(route:string):boolean{return ['community','community-search','post','publish','publicProfile','notifications','public-recipes','publicRecipes','gallery','recipe-works'].includes(route);}
export class AssistantRequest {requestId:string='ai_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);task:string='ask';webSearch:boolean=false;people:number=2;maxMinutes?:number;maxCost:number=0;excluded:string[]=[];region:string='';startDate?:string;days:number=7;history:AssistantTurn[]=[];prompt:string='';consent:boolean=false;includeInventory:boolean=false;inventoryNames:string[]=[];}
export class AssistantReference {id:string='';name:string='';minutes:number=0;estimatedCost:number=0;}
export class AssistantFeedback {eventId:string='';vote:string='';reason:string='';}
export class AssistantWebSource {title:string='';url:string='';}
export class AssistantRetrieval {status:string='not_requested';sources:AssistantWebSource[]=[];fetchedAt:number=0;}
export class AssistantEstimate {name:string='';portion:string='';kcalMin:number=0;kcalMax:number=0;proteinMin:number=0;proteinMax:number=0;costMin:number=0;costMax:number=0;assumptions:string[]=[];}
export class AssistantGeneratedIngredient {name:string='';quantity:number=0;unit:string='g';}
export class AssistantGeneratedRecipe extends AssistantEstimate {people:number=2;minutes:number=15;ingredients:AssistantGeneratedIngredient[]=[];steps:string[]=[];}
export class AssistantResult {generatedRecipe:AssistantGeneratedRecipe|null=null;estimate:AssistantEstimate|null=null;retrieval:AssistantRetrieval=new AssistantRetrieval();analyticsId:string='';task:string='ask';plans:AssistantPlan[]=[];mealDraft:AssistantMeal|null=null;inventoryUsed:number=0;expiredExcluded:number=0;proposalSource:string='';source:string='';reason:string='';text:string='';requires_review:boolean=true;references:AssistantReference[]=[];}
export const ASSISTANT_PRESETS:string[]=['20分钟内能做什么晚餐？','番茄和鸡蛋怎么做好吃？','帮我安排一顿清淡的两人餐','豆腐有哪些种类，怎么挑？'];
export class AssistantTurn {role:string='user';text:string='';constructor(role:string,text:string){this.role=role;this.text=text.length<=1200?text:text.slice(0,390)+'…'+text.slice(-800);}}
export class AssistantPlan {recipeId:string='';name:string='';date:string='';occasion:string='晚餐';people:number=2;minutes:number=0;estimatedCost:number=-1;}
export class AssistantMeal {recordedAt:string='';name:string='';mealType:string='晚餐';diningMode:string='外食';estimatedCost:number=-1;calories:number=-1;rating:number=0;place:string='';}
export const ASSISTANT_TASKS:string[]=['ask','create','estimate','week','rescue','meal'];
export const ASSISTANT_TASK_LABELS:string[]=['问做法','AI做新菜','估营养花费','一周灵感','库存先吃','一句话记餐'];
export function assistantPrompts(task:string):string[]{if(task==='create'){return ['用鸡蛋和番茄设计一道不一样的家常菜','用我的库存设计一道简单晚餐'];}if(task==='estimate'){return ['一碗牛肉面，估算一人份热量、蛋白质和花费范围','鸡胸肉沙拉一份，估算营养和价格'];}if(task==='week'){return ['安排不重样的晚餐主菜','安排清淡家常晚餐主菜'];}if(task==='rescue'){return ['优先用掉库存，可以做什么？','库存食材怎么搭配更省事？'];}if(task==='meal'){return ['午餐吃了牛肉面，实付25元，4星','晚餐外卖鸡腿饭，620大卡'];}return ASSISTANT_PRESETS;}
/** Retry identity stays only in memory, and changes as soon as options or consent change. */
export class AssistantRetry {
 private key:string='';private id:string='';
 bind(request:AssistantRequest):void{const fresh:string=request.requestId;request.requestId='';const key:string=JSON.stringify(request);if(this.key===key&&this.id){ClientTelemetry.record('ai_retry','assistant',request.task);}request.requestId=this.key===key&&this.id?this.id:fresh;this.key=key;this.id=request.requestId;}
 clear():void{this.key='';this.id='';}
}

/** Explicitly selected recipe context only; never includes stock, photos or account data. */
export class AssistantDish {
 id:string='';name:string='';people:number=2;minutes:number=0;ingredients:string[]=[];steps:string[]=[];
}
export function assistantDishPrompt(question:string,dishes:AssistantDish[],people:number=2):string{
 const selected:AssistantDish[]=dishes.slice(0,3);if(!selected.length){return question.trim().slice(0,2500);}
 const context:string=selected.map((d:AssistantDish)=>d.name.slice(0,30)+'（原方'+d.people+'人，约'+d.minutes+'分钟；食材：'+d.ingredients.slice(0,6).map((v:string)=>v.slice(0,12)).join('、')+'）').join('；').slice(0,270);
 const method:string=selected.length===1?'；做法摘录：'+selected[0].steps.slice(0,2).join('；').slice(0,110):'';
 const prefix:string='当前选菜：'+context+method+'。本餐'+Math.max(1,Math.min(20,Math.round(people)||2))+'人。\n';
 return prefix+question.trim().slice(0,2800-prefix.length);
}
export function assistantDishQuestion(kind:string):string{
 if(kind==='swap'){return '这道菜的食材可以怎么替换？说明口感差异和需要调整的操作。';}
 if(kind==='menu'){return '按这些菜安排备菜与制作顺序，哪些可以提前准备？';}
 return '结合当前菜谱讲清做法要点、火候和容易失败的地方。';
}

export class AssistantJobUpdate {id:string='';state:string='';delta:string='';position:number=0;result:AssistantResult|null=null;firstDeltaMs:number=-1;elapsedMs:number=0;}
/** Incremental model output over short, authenticated cursor requests; no simulated typing. */
export class AssistantLive {
 private telemetryScope:string='';private telemetryTask:string='';private telemetryStarted:number=0;
 private revision:number=0;private id:string='';private send:((path:string,method:string,body:Object|null)=>Promise<string>)|null=null;
 async cancel():Promise<void>{if(this.id&&this.telemetryScope){ClientTelemetry.record('ai_cancel','assistant',this.telemetryTask,'cancelled',Date.now()-this.telemetryStarted,-1,this.telemetryScope);}this.telemetryScope='';this.revision++;const id:string=this.id;const send=this.send;this.id='';this.send=null;if(id&&send){try{await send('/ai/assist/jobs/'+id,'DELETE',null);}catch(_){}}}
 async run(request:AssistantRequest,send:(path:string,method:string,body:Object|null)=>Promise<string>,update:(text:string)=>void,progress:((elapsed:number)=>void)|null=null):Promise<AssistantResult>{
  this.telemetryScope=ClientTelemetry.scope();this.telemetryTask=request.task;this.telemetryStarted=Date.now();if(this.telemetryScope){ClientTelemetry.record('ai_send','assistant',request.task,'',0,-1,this.telemetryScope);}
  const revision:number=++this.revision;this.id=request.requestId;this.send=send;let position:number=0;let text:string='';let empty:number=0;let firstToken:number=-1;const started:number=Date.now();const scope:string=this.telemetryScope;
  try{
   const raw:string=await send('/ai/assist/jobs','POST',request);let next:AssistantJobUpdate=JSON.parse(raw) as AssistantJobUpdate;const direct:AssistantResult=JSON.parse(raw) as AssistantResult;
   // Compatibility with a legacy response or an offline host adapter, never fabricated deltas.
   if(revision!==this.revision){throw new Error('已取消等待');}if(direct.source){if(scope){ClientTelemetry.record('ai_complete','assistant',request.task,direct.source==='model'?'model':'fallback',Date.now()-started,-1,scope);}return direct;}
   for(let count:number=0;count<100;count++){
    if(revision!==this.revision){throw new Error('已取消等待');}
    if(!Number.isInteger(next.position)||next.position!==position+(next.delta||'').length){throw new Error('助手读取位置无效');}
    if(progress){progress(Date.now()-started);}empty=next.delta?0:empty+1;
    if(next.delta){if(firstToken<0){firstToken=Date.now()-started;}text+=next.delta;if(text.length>8000){throw new Error('回复过长，请缩小问题范围');}update(text);}
    position=next.position;
    if(next.state==='done'&&next.result){if(scope){ClientTelemetry.record('ai_complete','assistant',request.task,next.result.source==='model'?'model':'fallback',Date.now()-started,firstToken,scope);}return next.result;}
    if(next.state==='cancelled'){throw new Error('已取消等待');}
    if(next.state==='error'){throw new Error('助手请求已结束，请稍后重试');}
    if(next.state!=='running'){throw new Error('助手返回格式无效');}
    await new Promise<void>((resolve)=>{setTimeout(resolve,pollingDelay(empty));});
    if(revision!==this.revision){throw new Error('已取消等待');}
    let rawNext:string='';
    for(let retry:number=0;retry<3;retry++){
     if(revision!==this.revision){throw new Error('已取消等待');}
     try{rawNext=await send('/ai/assist/jobs/'+request.requestId+'?after='+position,'GET',null);break;}
     catch(error){if(revision!==this.revision){throw new Error('已取消等待');}if(retry>=2||!transientAssistantFailure((error as Error).message)){throw new Error((error as Error).message);}await new Promise<void>((resolve)=>{setTimeout(resolve,400*(retry+1));});}
    }
    next=JSON.parse(rawNext) as AssistantJobUpdate;
   }
   throw new Error('等待超时，请稍后重试');
  }catch(error){if(scope&&revision===this.revision){ClientTelemetry.record('ai_complete','assistant',request.task,'error',Date.now()-started,firstToken,scope);}throw new Error((error as Error).message);}finally{if(revision===this.revision){this.telemetryScope='';this.id='';this.send=null;}}
 }
}

export function assistantUsesWeb(task:string,prompt:string,requested:boolean=false):boolean{
 if(!['ask','create','estimate'].includes(task)||/(不要联网|不联网|无需联网|离线回答|只用本地)/.test(prompt)){return false;}
 if(requested||task==='create'){return true;}
 if(task==='estimate'){return /(联网|搜索|查一下|查查|最新|实时|现在.*价格|今日.*价|行情)/.test(prompt);}
 return /(联网|搜索|查一下|查查|最新|实时|时令|推荐|吃什么|能做什么|怎么|做法|菜谱|价格|行情|营养|蛋白|热量)/.test(prompt);
}
