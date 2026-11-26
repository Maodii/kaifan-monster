import { Food, Meal, Recipe, dateString, validDate } from './Models';
import { MealPlan } from './MealPlan';
import { canonicalName, RankingOptions, matchesRankingConstraints, rankPersonalized } from './RecommendationCore';
import { shiftDay } from './DailyExperienceCore';
export class LeftoverEvent {id:string='';date:string='';portions:number=0;action:string='eat';mealId:string='';}
export class LeftoverBatch {id:string='';sourceMealId:string='';name:string='';total:number=1;remaining:number=1;container:string='';storage:string='冷藏';preparedDate:string='';expiryDate:string='';events:LeftoverEvent[]=[];modifiedAt:string='';}
export function validateLeftover(b:LeftoverBatch):void {
 if(!b.name.trim()||b.name.length>200||!Number.isFinite(b.total)||b.total<=0||b.total>100||!Number.isFinite(b.remaining)||b.remaining<0||b.remaining>b.total||!validDate(b.preparedDate)||!validDate(b.expiryDate)||b.expiryDate<b.preparedDate||!['冷藏','冷冻'].includes(b.storage)||b.container.length>80||!Array.isArray(b.events)||b.events.length>500||Math.abs(b.total*1000-Math.round(b.total*1000))>0.000001||Math.abs(b.remaining*1000-Math.round(b.remaining*1000))>0.000001||!/^[a-f0-9-]{36}$/.test(b.sourceMealId)){throw new Error('请核对份数、容器与手动保质日期');}
 let used:number=0;for(const e of b.events){if(!e||!['eat','discard'].includes(e.action)||!Number.isFinite(e.portions)||e.portions<=0||!Number.isFinite(Date.parse(e.date))){throw new Error('剩菜处理记录无效');}used+=e.portions;}if(Math.abs(b.total-b.remaining-used)>0.0001){throw new Error('剩菜处理记录与余量不一致');}
}
export function takeLeftover(batch:LeftoverBatch,quantity:number,action:string,today:string):LeftoverBatch {
 validateLeftover(batch);if(!validDate(today)||!['eat','discard'].includes(action)||!Number.isFinite(quantity)||quantity<0.001||Math.abs(quantity*1000-Math.round(quantity*1000))>0.000001||quantity>batch.remaining||batch.events.length>=500){throw new Error('本次份数不能超过剩余份数');}
 if(action==='eat'&&(today<batch.preparedDate||today>batch.expiryDate)){throw new Error('不在标注的食用日期内，请检查后处理');}
 const next:LeftoverBatch=JSON.parse(JSON.stringify(batch)) as LeftoverBatch;next.remaining=Math.round((next.remaining-quantity)*1000)/1000;return next;
}
export class NutritionDay {date:string='';known:number=0;unknown:number=0;kcal:number=0;label:number=0;estimated:number=0;}
export class NutritionWeek {days:NutritionDay[]=[];known:number=0;unknown:number=0;totalKcal:number=0;recordedDays:number=0;averageKnownKcal:number=-1;}
export function nutritionWeek(meals:Meal[],end:string):NutritionWeek {
 if(!validDate(end)){throw new Error('统计日期无效');}const out:NutritionWeek=new NutritionWeek();
 for(let n=6;n>=0;n--){const d:NutritionDay=new NutritionDay();d.date=shiftDay(end,-n);for(const m of meals){if(dateString(new Date(m.date))!==d.date){continue;}if(Number.isFinite(m.calories)&&m.calories>=0){d.known++;d.kcal+=m.calories;if(m.calorieSource==='包装标签'){d.label++;}else{d.estimated++;}}else{d.unknown++;}}d.kcal=Math.round(d.kcal);out.days.push(d);out.known+=d.known;out.unknown+=d.unknown;out.totalKcal+=d.kcal;if(d.known+d.unknown>0){out.recordedDays++;}}
 if(out.known){out.averageKnownKcal=Math.round(out.totalKcal/out.known);}return out;
}
export class DiningPlace {name:string='';visits:number=0;paid:number=0;estimated:number=0;lastDate:string='';lastMealId:string='';combos:string[]=[];}
export function diningPlaces(meals:Meal[]):DiningPlace[] {
 const out:DiningPlace[]=[];for(const m of meals.slice().sort((a:Meal,b:Meal)=>b.date.localeCompare(a.date))){const name:string=(m.place||'').trim();if(!name||!['外食','外卖','餐馆','食堂'].includes(m.diningMode)){continue;}let p:DiningPlace|undefined=out.find((v:DiningPlace)=>v.name===name);if(!p){p=new DiningPlace();p.name=name;p.lastDate=m.date;p.lastMealId=m.id;out.push(p);}p.visits++;const cost:number=m.personalCost>=0?m.personalCost:m.estimatedCost;if(Number.isFinite(cost)&&cost>=0){if(m.costType==='实付'){p.paid+=cost;}else{p.estimated+=cost;}}if(!p.combos.includes(m.name)&&p.combos.length<5){p.combos.push(m.name);}}
 for(const p of out){p.paid=Math.round(p.paid*100)/100;p.estimated=Math.round(p.estimated*100)/100;}return out.sort((a:DiningPlace,b:DiningPlace)=>b.visits-a.visits||b.lastDate.localeCompare(a.lastDate)).slice(0,50);
}
export class WeeklyProposal {plans:MealPlan[]=[];unfilled:string[]=[];}
/** Nonmutating proposal, skips occupied slots and hard exclusions; never promises inventory sufficiency. */
export function suggestWeek(recipes:Recipe[],foods:Food[],meals:Meal[],existing:MealPlan[],start:string,occasion:string,people:number,options:RankingOptions):WeeklyProposal {
 if(!validDate(start)||!['早餐','午餐','晚餐','加餐'].includes(occasion)||!Number.isInteger(people)||people<1||people>20){throw new Error('请核对日期、餐次及人数');}
 const out:WeeklyProposal=new WeeklyProposal();const used:string[]=existing.filter((p:MealPlan)=>p.date>=start&&p.date<=shiftDay(start,6)).map((p:MealPlan)=>p.recipeId);const groups:string[]=[];
 const recent:string[]=meals.filter((m:Meal)=>m.date.slice(0,10)>=shiftDay(start,-7)&&m.date.slice(0,10)<start).map((m:Meal)=>m.recipeId);
 for(let n=0;n<7;n++){const day:string=shiftDay(start,n);if(existing.some((p:MealPlan)=>p.date===day&&p.occasion===occasion)){continue;}
 const eligible:Recipe[]=recipes.filter((r:Recipe)=>matchesRankingConstraints(r,options)&&!used.includes(r.id)&&!recent.includes(r.id)&&!groups.includes(r.dishGroupId||canonicalName(r.name)));
 const ranked=rankPersonalized(eligible,foods,meals,[],options,new Date(day+'T12:00:00').getTime());const chosen:Recipe|undefined=ranked.length?eligible.find((r:Recipe)=>r.id===ranked[0].recipeId):undefined;
 if(!chosen){out.unfilled.push(day);continue;}const p:MealPlan=new MealPlan();p.date=day;p.occasion=occasion;p.people=people;p.recipeId=chosen.id;p.mode='在家做';out.plans.push(p);used.push(chosen.id);groups.push(chosen.dishGroupId||canonicalName(chosen.name));}
 return out;
}
export class TrashEntry {id:string='';kind:string='';name:string='';payload:string='';deletedAt:number=0;}
