// Shared Android/Harmony client measurements. No durable queue, content, identifiers or SDK.
export class ClientEvent {
 id:string='';name:string='';page:string='';task:string='';outcome:string='';durationMs:number=0;firstTokenMs:number=-1;occurredAt:number=0;
}
export class ClientBatch {platform:string='';version:string='';events:ClientEvent[]=[];}
export class TelemetryContext {owner:string='';endpoint:string='';cloud:boolean=false;enabled:boolean=false;}
export function telemetryPage(route:string):string {
 if(['today','tab:0'].includes(route)){return 'today';}if(['recipes','tab:3'].includes(route)){return 'recipes';}
 if(['pantry','foods','tab:1'].includes(route)){return 'pantry';}if(['diary','meals','tab:4'].includes(route)){return 'diary';}
 if(['mine','account','auth','tab:5'].includes(route)){return 'account';}if(['shopping','tab:2'].includes(route)){return 'shopping';}
 if(['assistant','ai-assistant'].includes(route)){return 'assistant';}if(['recipe','guide','cook-guide'].includes(route)){return 'recipe';}
 if(['meal','meal-form'].includes(route)){return 'meal_editor';}if(['stats','statistics'].includes(route)){return 'stats';}
 if(['meal-plan','plans','plan'].includes(route)){return 'plans';}return 'other';
}
function eventId():string{return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,(key:string)=>{const n:number=Math.floor(Math.random()*16);return (key==='x'?n:(n&3)|8).toString(16);});}
export class ClientTelemetry {
 private static context:()=>TelemetryContext=()=>new TelemetryContext();
 private static send:((batch:ClientBatch)=>Promise<void>)|null=null;
 private static platform:string='';private static version:string='';private static owner:string='';private static endpoint:string='';
 private static queue:ClientEvent[]=[];private static timer:number=-1;private static flight:boolean=false;private static generation:number=0;
 private static failures:number=0;private static retryAt:number=0;private static lastPage:string='';private static active:boolean=true;private static opened:boolean=false;
 static configure(platform:string,version:string,context:()=>TelemetryContext,send:(batch:ClientBatch)=>Promise<void>):void{
  ClientTelemetry.clear();ClientTelemetry.platform=platform;ClientTelemetry.version=/^[0-9A-Za-z .()_-]{1,40}$/.test(version)?version:'unknown';ClientTelemetry.context=context;ClientTelemetry.send=send;ClientTelemetry.active=true;
 }
 static setVersion(version:string):void{ClientTelemetry.version=/^[0-9A-Za-z .()_-]{1,40}$/.test(version)?version:'unknown';}
 static clear():void{ClientTelemetry.generation++;ClientTelemetry.queue=[];ClientTelemetry.owner='';ClientTelemetry.endpoint='';ClientTelemetry.lastPage='';ClientTelemetry.opened=false;ClientTelemetry.failures=0;ClientTelemetry.retryAt=0;if(ClientTelemetry.timer>=0){clearTimeout(ClientTelemetry.timer);ClientTelemetry.timer=-1;}}
 private static allowed():boolean{
  const c:TelemetryContext=ClientTelemetry.context();if(!c.cloud||!c.enabled||!c.owner||!c.endpoint){ClientTelemetry.clear();return false;}
  if(ClientTelemetry.owner!==c.owner||ClientTelemetry.endpoint!==c.endpoint){ClientTelemetry.clear();ClientTelemetry.owner=c.owner;ClientTelemetry.endpoint=c.endpoint;}return true;
 }
 static scope():string{return ClientTelemetry.allowed()?ClientTelemetry.generation+'|'+ClientTelemetry.owner+'|'+ClientTelemetry.endpoint:'';}
 static record(name:string,page:string='',task:string='',outcome:string='',durationMs:number=0,firstTokenMs:number=-1,expectedScope:string=''):void{
  if(!ClientTelemetry.allowed()||!ClientTelemetry.active||!ClientTelemetry.send||(expectedScope&&expectedScope!==ClientTelemetry.scope())){return;}
  if(!['app_open','page_view','ai_send','ai_cancel','ai_retry','ai_complete','photo_upload'].includes(name)){return;}
  if(page&&!['today','recipes','pantry','diary','account','shopping','assistant','recipe','meal_editor','stats','plans','other'].includes(page)){return;}
  if(task&&!['ask','week','rescue','meal'].includes(task)){return;}
  if(outcome&&!['success','error','cancelled','model','fallback'].includes(outcome)){return;}
  if(!Number.isFinite(durationMs)||!Number.isFinite(firstTokenMs)){return;}
  if(!ClientTelemetry.opened){ClientTelemetry.opened=true;if(name!=='app_open'){ClientTelemetry.record('app_open');}}
  if(name==='page_view'){if(page===ClientTelemetry.lastPage){return;}ClientTelemetry.lastPage=page;}
  const e:ClientEvent=new ClientEvent();e.id=eventId();e.name=name;e.page=page;e.task=task;e.outcome=outcome;e.durationMs=Math.max(0,Math.min(86400000,Math.round(durationMs)));e.firstTokenMs=firstTokenMs<0?-1:Math.min(e.durationMs,Math.round(firstTokenMs));e.occurredAt=Date.now();
  if(ClientTelemetry.queue.length>=60){ClientTelemetry.queue.shift();}ClientTelemetry.queue.push(e);ClientTelemetry.schedule();
 }
 private static schedule():void{if(ClientTelemetry.timer>=0||!ClientTelemetry.active||!ClientTelemetry.queue.length){return;}ClientTelemetry.timer=setTimeout(()=>{ClientTelemetry.timer=-1;ClientTelemetry.flush().catch(()=>{});},Math.max(5000,ClientTelemetry.retryAt-Date.now()));}
 static async flush():Promise<void>{
  if(!ClientTelemetry.allowed()||ClientTelemetry.flight||!ClientTelemetry.send||!ClientTelemetry.queue.length){return;}if(Date.now()<ClientTelemetry.retryAt){ClientTelemetry.schedule();return;}
  const generation:number=ClientTelemetry.generation;const batch:ClientBatch=new ClientBatch();batch.platform=ClientTelemetry.platform;batch.version=ClientTelemetry.version;batch.events=ClientTelemetry.queue.splice(0,20);ClientTelemetry.flight=true;
  try{await ClientTelemetry.send(batch);if(generation===ClientTelemetry.generation){ClientTelemetry.failures=0;ClientTelemetry.retryAt=0;}}
  catch(_){if(ClientTelemetry.allowed()&&generation===ClientTelemetry.generation){ClientTelemetry.failures++;ClientTelemetry.retryAt=Date.now()+Math.min(60000,5000*Math.pow(2,ClientTelemetry.failures));if(ClientTelemetry.failures<3){ClientTelemetry.queue=batch.events.concat(ClientTelemetry.queue).slice(-60);}}}
  finally{ClientTelemetry.flight=false;if(ClientTelemetry.active){ClientTelemetry.schedule();}}
 }
 static foreground():void{ClientTelemetry.queue=ClientTelemetry.queue.filter((e:ClientEvent)=>Date.now()-e.occurredAt<86400000);ClientTelemetry.active=true;ClientTelemetry.lastPage='';ClientTelemetry.record('app_open');}
 static background():void{ClientTelemetry.active=false;if(ClientTelemetry.timer>=0){clearTimeout(ClientTelemetry.timer);ClientTelemetry.timer=-1;}ClientTelemetry.flush().catch(()=>{});}
}
