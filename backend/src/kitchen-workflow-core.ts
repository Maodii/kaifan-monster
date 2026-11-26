import { CoreRecipe, recipeMinutes } from './recommend-core';

export class KitchenTask {
 recipeId:string=''; name:string=''; order:number=0; prepMinutes:number=0; activeMinutes:number=0; waitMinutes:number=0; totalMinutes:number=0;
 timingKnown:boolean=false; splitKnown:boolean=false; passive:boolean=false; instruction:string='';
}
export class KitchenTimeline {
 tasks:KitchenTask[]=[]; prepMinutes:number=0; activeMinutes:number=0; elapsedMinutes:number=0; conservativeMinutes:number=0;
 parallelMinutes:number=0; complete:boolean=true; estimated:boolean=true;
 assumption:string='一人逐道完成为保守参考；双灶参考仅在锅具独立、可安全照看时使用，不能替代菜谱熟度判断。';
 warnings:string[]=[];
}
/** Only an explicit timed simmer/steam/bake instruction can provide a possible overlap window. */
function passiveWindow(recipe:CoreRecipe):number {
 let longest:number=0;
 for(const step of recipe.steps||[]){
  if(!/小火|中小火|蒸|炖|煲|烤|焖/.test(step)||/翻炒|不断|不停|持续搅|反复翻|一边/.test(step)){continue;}
  const pattern:RegExp=/(\d+(?:\.\d+)?)(?:\s*(?:-|～|~|至|到)\s*(\d+(?:\.\d+)?))?\s*(小时|分钟)/g;
  let match:RegExpExecArray|null=pattern.exec(step);
  while(match){const minutes:number=Number(match[1])*(match[3]==='小时'?60:1);if(Number.isFinite(minutes)){longest=Math.max(longest,minutes);}match=pattern.exec(step);}
 }
 return longest;
}
/** Unknown or inconsistent preparation splits stay unknown; no invented per-step timestamps. */
export function cookTimeline(recipes:CoreRecipe[]):KitchenTimeline {
 const out:KitchenTimeline=new KitchenTimeline();const seen:string[]=[];
 for(const recipe of recipes){
  if(seen.includes(recipe.id)){continue;}seen.push(recipe.id);
  const task:KitchenTask=new KitchenTask();task.recipeId=recipe.id;task.name=recipe.name;task.totalMinutes=recipeMinutes(recipe);task.timingKnown=task.totalMinutes>0;
  if(!task.timingKnown){out.complete=false;out.warnings.push(recipe.name+'：总耗时待补充');}
  const prep:number=recipe.prepMinutes===undefined?NaN:recipe.prepMinutes;const cook:number=recipe.cookMinutes===undefined?NaN:recipe.cookMinutes;
  task.splitKnown=Number.isFinite(prep)&&Number.isFinite(cook)&&prep>=0&&cook>=0&&Math.ceil(prep+cook)===task.totalMinutes&&task.timingKnown;
  if(task.splitKnown){task.prepMinutes=prep;task.waitMinutes=Math.max(0,Math.min(cook-2,passiveWindow(recipe)-2));}
  task.passive=task.waitMinutes>0;task.activeMinutes=Math.max(0,task.totalMinutes-task.waitMinutes);
  task.instruction=task.passive?'先备料并开始慢煮；等待时可处理下一道，出锅前回到本菜确认。':task.timingKnown?'提前备齐本菜用料，快炒或煎制时专心完成。':'先查看完整做法并补充时间，再安排与其他菜的先后。';
  out.tasks.push(task);out.prepMinutes+=task.prepMinutes;out.activeMinutes+=task.activeMinutes;out.conservativeMinutes+=task.totalMinutes;
 }
 out.tasks.sort((a:KitchenTask,b:KitchenTask)=>Number(b.passive)-Number(a.passive)||b.waitMinutes-a.waitMinutes||a.name.localeCompare(b.name));
 out.tasks.forEach((task:KitchenTask,index:number)=>{task.order=index+1;});
 out.elapsedMinutes=out.conservativeMinutes;
 // Only the longest explicit waiting window is reused, and never more than the other dishes' active work.
 const first:KitchenTask|undefined=out.tasks.find((task:KitchenTask)=>task.passive);
 const overlap:number=first?Math.min(first.waitMinutes,out.tasks.filter((task:KitchenTask)=>task.recipeId!==first.recipeId).reduce((sum:number,task:KitchenTask)=>sum+task.activeMinutes,0)):0;
 out.parallelMinutes=Math.max(out.activeMinutes,...out.tasks.map((task:KitchenTask)=>task.totalMinutes),out.conservativeMinutes-overlap);
 if(out.tasks.some((task:KitchenTask)=>!task.splitKnown)){out.warnings.push('部分菜谱缺少可靠备料/制作拆分，仅纳入已有总耗时。');}
 if(!out.complete){out.warnings.push('时间汇总仅含已知菜品，不能视为完整整餐耗时。');}
 return out;
}
