import { RecipeFilterOptions, normalizeRecipeFilter } from './RecipeFilterCore';
import { Meal, Recipe, Food, Shopping, Ingredient, dateString } from './Models';
import { MealPlan } from './MealPlan';
import { coreExpiry, canonicalName, compatibleUnit } from './RecommendationCore';
import { PortionOptions, recommendPortions } from './PortionCore';

export class RecipeCollection { name:string=''; ids:string[]=[]; }
export class SavedRecipeFilter { name:string=''; options:RecipeFilterOptions=new RecipeFilterOptions(); favorites:boolean=false; order:string='综合排序'; }
export class ExperienceState { collections:RecipeCollection[]=[]; filters:SavedRecipeFilter[]=[]; }
export class SpendingSummary { paid:number=0; estimated:number=0; meals:number=0; calories:number=0; calorieMeals:number=0; days:number=0; }
export function spendingSummary(meals:Meal[]):SpendingSummary {
 const out:SpendingSummary=new SpendingSummary();const dates:string[]=[];
 for(const meal of meals){out.meals++;const cents:number=Math.round(Math.max(0,Number(meal.personalCost!==undefined&&meal.personalCost>=0?meal.personalCost:meal.estimatedCost)||0)*100);if(meal.costType==='实付'){out.paid+=cents;}else{out.estimated+=cents;}if(Number.isFinite(meal.calories)&&meal.calories>=0){out.calories+=meal.calories;out.calorieMeals++;}const date:string=dateString(new Date(meal.date));if(!dates.includes(date)){dates.push(date);}}
 out.paid/=100;out.estimated/=100;out.days=dates.length;return out;
}
export function normalizeExperience(value:ExperienceState):ExperienceState {
 const out:ExperienceState=new ExperienceState();
 out.collections=(Array.isArray(value.collections)?value.collections:[]).filter((v:RecipeCollection)=>Boolean(v)&&typeof v.name==='string'&&v.name.trim().length>0&&Array.isArray(v.ids)).slice(0,30).map((v:RecipeCollection)=>{const c:RecipeCollection=new RecipeCollection();c.name=v.name.trim().slice(0,24);c.ids=Array.from(new Set(v.ids.filter((id:string)=>typeof id==='string'))).slice(0,1000);return c;});
 out.filters=(Array.isArray(value.filters)?value.filters:[]).filter((v:SavedRecipeFilter)=>Boolean(v)&&typeof v.name==='string'&&v.name.trim().length>0&&Boolean(v.options)).slice(0,12).map((v:SavedRecipeFilter)=>{const f:SavedRecipeFilter=new SavedRecipeFilter();f.name=v.name.trim().slice(0,24);f.options=normalizeRecipeFilter(v.options);f.favorites=v.favorites===true;f.order=['综合排序','价格升序','价格降序','耗时升序','耗时降序','收藏最多'].includes(v.order)?v.order:'综合排序';return f;});return out;
}
export function shoppingCategory(name:string):string {
 if(/盐|糖|酱|醋|油|料酒|胡椒|花椒|八角|桂皮/.test(name)){return '调味品';}
 if(/肉|鸡胸|鸡腿|鸡翅|排骨|猪骨|鱼|虾|蟹|贝|鸭|牛腩/.test(name)){return '肉禽水产';}
 if(/蛋|奶|酸奶|奶酪/.test(name)){return '蛋奶';}
 if(/米|面|干木耳|干香菇|粉丝|燕麦|干货/.test(name)){return '干货';}
 if(/苹果|香蕉|橙|橘|梨|桃|西瓜|葡萄/.test(name)){return '水果';}
 if(/菜|瓜|茄|薯|土豆|笋|豆腐|豆芽|萝卜|葱|姜|蒜|菇|藕|山药|椒/.test(name)){return '蔬菜';}return '其他';
}
export class ProcurementLine { name:string=''; unit:string=''; required:number=0; stock:number=0; pending:number=0; missing:number=0; optional:boolean=false; unknown:boolean=false; sources:string[]=[]; category:string='其他'; }
export class ProcurementPreview { lines:ProcurementLine[]=[]; unknownRecipes:string[]=[]; planCount:number=0; }
/** Entire selected range is merged before inventory is deducted once. Unknown source amounts are not inferred for purchasing. */
export function previewProcurement(plans:MealPlan[],recipes:Recipe[],foods:Food[],shopping:Shopping[],today:string):ProcurementPreview {
 const out:ProcurementPreview=new ProcurementPreview();
 for(const p of plans.filter((v:MealPlan)=>!v.completed&&(!v.mode||v.mode==='在家做'))){const r:Recipe|undefined=recipes.find((v:Recipe)=>v.id===p.recipeId);if(!r){out.unknownRecipes.push('已移除菜谱');continue;}out.planCount++;const options:PortionOptions=new PortionOptions();options.people=p.people;options.basePeople=r.people||2;
  const amounts=recommendPortions(r.ingredients,options);
  r.ingredients.forEach((ingredient:Ingredient,index:number)=>{const amount=amounts[index];let line:ProcurementLine|undefined=out.lines.find((v:ProcurementLine)=>canonicalName(v.name)===canonicalName(ingredient.name)&&v.optional===Boolean(ingredient.optional)&&compatibleUnit(amount.unit,v.unit)>0);if(!line){line=new ProcurementLine();line.name=ingredient.name;line.unit=amount.unit;line.optional=Boolean(ingredient.optional);line.category=shoppingCategory(ingredient.name);out.lines.push(line);}if(!(ingredient.quantity>0)||!Number.isFinite(ingredient.quantity)){line.unknown=true;if(!out.unknownRecipes.includes(r.name)){out.unknownRecipes.push(r.name);}}else{line.required+=amount.quantity*compatibleUnit(amount.unit,line.unit);}if(!line.sources.includes(r.name)){line.sources.push(r.name);}});
 }
 for(const line of out.lines){line.required=Math.round(line.required*1000)/1000;line.stock=foods.filter((f:Food)=>!f.archived&&f.quantity>0&&coreExpiry(f)>=today&&canonicalName(f.name)===canonicalName(line.name)&&compatibleUnit(f.unit,line.unit)>0).reduce((sum:number,f:Food)=>sum+f.quantity*compatibleUnit(f.unit,line.unit),0);line.pending=shopping.filter((s:Shopping)=>!s.purchased&&!s.familyId&&canonicalName(s.name)===canonicalName(line.name)&&compatibleUnit(s.unit,line.unit)>0).reduce((sum:number,s:Shopping)=>sum+s.quantity*compatibleUnit(s.unit,line.unit),0);line.missing=Math.round(Math.max(0,line.required-line.stock-line.pending)*1000)/1000;}return out;
}
export function duplicatePurchase(item:Shopping,items:Shopping[]):boolean{return items.some((other:Shopping)=>other.id!==item.id&&other.purchased&&other.familyId===item.familyId&&canonicalName(other.name)===canonicalName(item.name)&&Date.now()-Date.parse(other.modifiedAt)<86400000);}
