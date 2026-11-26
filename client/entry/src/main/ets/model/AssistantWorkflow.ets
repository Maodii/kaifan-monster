import { AssistantPlan, AssistantResult, AssistantMeal } from './AssistantCore';
import { assistantSafetyReason } from './AssistantNative';
import { MealPlan } from './MealPlan';
import { Recipe, Meal, MealItem } from './Models';
export function assistantPlanKey(plan:AssistantPlan):string{return plan.date+'|'+plan.occasion+'|'+plan.recipeId;}
export function assistantPlanSnapshot(plans:MealPlan[]):string{return JSON.stringify(plans);}
export function assistantDraftPlans(result:AssistantResult,recipes:Recipe[],existing:MealPlan[],selected:string[]):MealPlan[]{
 if(result.task!=='week'||result.proposalSource!=='catalog_rules'){throw new Error('请先生成晚餐主菜草案');}
 const plans:MealPlan[]=[];
 for(const row of result.plans.slice(0,7)){
  if(!selected.includes(assistantPlanKey(row))){continue;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date+'T12:00:00'))||new Date(row.date+'T12:00:00Z').toISOString().slice(0,10)!==row.date||row.occasion!=='晚餐'||!Number.isInteger(row.people)||row.people<1||row.people>12){throw new Error('计划字段无效，请重新生成');}
  if(!recipes.some((r:Recipe)=>r.id===row.recipeId)){throw new Error('请先更新菜谱目录，再加入计划');}
  // Preserve every occupied dinner slot, including a manual or different-recipe plan.
  if(existing.some((p:MealPlan)=>p.date===row.date&&p.occasion===row.occasion)||plans.some((p:MealPlan)=>p.date===row.date&&p.occasion===row.occasion)){continue;}
  const p:MealPlan=new MealPlan();p.date=row.date;p.occasion=row.occasion;p.people=row.people;p.recipeId=row.recipeId;p.note='小怪助手主菜草案 · 自行补充蔬菜主食';plans.push(p);
 }
 return plans;
}
export function assistantMealForEditor(draft:AssistantMeal):Meal{
 if(!draft.name.trim()||draft.name.length>80||!['早餐','午餐','晚餐','加餐'].includes(draft.mealType)||!['在家做','餐馆','食堂','外卖','外食'].includes(draft.diningMode)){throw new Error('记餐草稿无效，请重新解析');}
 const m:Meal=new Meal();m.name=draft.name;m.mealType=draft.mealType;m.diningMode=draft.diningMode;m.date=draft.recordedAt&&Number.isFinite(Date.parse(draft.recordedAt))?draft.recordedAt:new Date().toISOString();m.estimatedCost=Number.isFinite(draft.estimatedCost)&&draft.estimatedCost>=0?draft.estimatedCost:0;m.items=[new MealItem(m.name,m.estimatedCost)];m.costType=draft.estimatedCost>=0?'实付':'估算';m.calories=Number.isFinite(draft.calories)&&draft.calories>=0?draft.calories:-1;m.calorieSource=m.calories>=0?'手动估算':'未记录';m.rating=Number.isInteger(draft.rating)&&draft.rating>=1&&draft.rating<=5?draft.rating:0;m.place=draft.place.slice(0,80);m.notes='AI解析草稿，请核对餐次、金额和份量。'+(draft.estimatedCost<0?'原文未提供花费，待填写。':'');return m;
}

// Route only explicit current-utterance meal commands. No model output, album access or writes.
export function assistantMealCommand(input:string,now:Date=new Date()):AssistantResult|null{
 const q:string=input.normalize('NFKC').trim();
 if(!/(记入|记到|记录|记下|记一餐|帮我记|添加.{0,4}(餐|饮食))/.test(q)||!/(吃|餐|喝)/.test(q)||assistantSafetyReason(q)){return null;}
 if(/不要|别|取消|不需要|如果|假如|比如|例如|怎么|如何|能否|能不能|可以吗|[“”"`？?]/.test(q)){return null;}
 const result:AssistantResult=new AssistantResult();result.source='native';result.task='meal';
 if(/前天|上周|上个月|\d{1,4}[年/月日-]|明天|后天|下周/.test(q)){result.text='请进入记餐选择具体日期，再填写这一餐。';return result;}
 let name:string='';const eaten:RegExpMatchArray|null=q.match(/(?:吃了|喝了|吃的是|喝的是)\s*(.+?)(?=帮我|请|记入|记到|记录|记下|[，,。;；]|$)/);
 const record:RegExpMatchArray|null=q.match(/(?:记录|记下|记一餐|帮我记)(?:一下|一笔|一餐)?[：:\s]*(?:今天|昨天)?(?:的)?(?:早餐|午餐|晚餐|加餐)?[：:\s]*(.+?)(?=[，,。;；]|$)/);
 name=(eaten?eaten[1]:record?record[1]:'').replace(/(?:并|然后|顺便|帮我|请|\s)+$/g,'').trim();
 name=name.replace(/(?:花了|花费|用了|共|实付|消费)\s*\d+(?:\.\d+)?\s*(?:元|块钱|块).*$/,'').trim();
 const types:string[]=Array.from(new Set(q.match(/早餐|午餐|晚餐|加餐/g)||[]));
 if(!name||name.length>60||/同步|图片|照片|记入|记到|记录|帮我|删除|扣除|减少|库存/.test(name)||types.length>1||/(并|然后|同时).*(扣|减少|删除|加入.*计划)/.test(q)){result.text='想记哪一餐、吃了什么？例如“今天吃了辣椒炒肉，帮我记入晚餐”。';return result;}
 const meal:AssistantMeal=new AssistantMeal();meal.name=name;meal.mealType=types[0]||(/今晚/.test(q)?'晚餐':/中午/.test(q)?'午餐':/早上/.test(q)?'早餐':'晚餐');
 meal.diningMode=/在家|自己做|家里做/.test(q)?'在家做':/外卖/.test(q)?'外卖':/食堂/.test(q)?'食堂':/餐馆|饭店/.test(q)?'餐馆':'外食';
 const day:Date=new Date(now.getTime());if(/昨天|昨晚/.test(q)){day.setDate(day.getDate()-1);}meal.recordedAt=day.toISOString();
 const cost:RegExpMatchArray|null=q.match(/(?:花了|花费|实付|消费|共)\s*(\d+(?:\.\d{1,2})?)\s*(?:元|块钱|块)/);if(cost&&Number(cost[1])<=100000){meal.estimatedCost=Number(cost[1]);}
 result.mealDraft=meal;result.text='已整理成'+(/昨天|昨晚/.test(q)?'昨天':'今天')+'的记餐草稿，核对后保存。'+(/图片|照片|拍照|相册/.test(q)?'进入后可拍照或从相册选图；照片尚未选择或上传。':'')+' 用餐方式、花费和热量可在记录中调整。';return result;
}
