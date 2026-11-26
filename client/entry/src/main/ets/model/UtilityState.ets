import { Recipe, Food, Shopping, Ingredient, Meal, MealItem } from './Models';
import { coreExpiry, canonicalName, compatibleUnit } from './RecommendationCore';
// Bounded local preferences. No cloud writes, meal creation or stock mutation.
export class CookProgress {
 recipeId:string=''; signature:string=''; step:number=0; completed:number[]=[]; prepared:string[]=[]; updatedAt:number=0;
}
export class KitchenTimer {
 id:string=''; recipeId:string=''; label:string=''; deadline:number=0; reminderId:number=-1;
}
export class UtilityState {
 timers:KitchenTimer[]=[]; searches:string[]=[]; recent:string[]=[]; compare:string[]=[]; progress:CookProgress[]=[]; timer:KitchenTimer=new KitchenTimer();
}
export function rememberValue(values:string[],value:string,limit:number):string[]{const text:string=value.trim().slice(0,80);return text?[text].concat(values.filter((v:string)=>v!==text)).slice(0,limit):values.slice(0,limit);}
export function remainingSeconds(deadline:number,now:number):number{return Math.max(0,Math.ceil((deadline-now)/1000));}
export function countdownText(deadline:number,now:number):string{const s:number=remainingSeconds(deadline,now);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}

export function cookingSignature(recipe:Recipe):string{return JSON.stringify(recipe.steps)+JSON.stringify(recipe.ingredients);}
export function repeatMealDraft(source:Meal):Meal{const meal:Meal=new Meal();meal.portionSize=source.portionSize||'normal';meal.financeFood=source.financeFood===undefined?-1:source.financeFood;meal.mealTotal=source.mealTotal===undefined?-1:source.mealTotal;meal.deliveryFee=source.deliveryFee||0;meal.discount=source.discount||0;meal.splitPeople=source.splitPeople||1;meal.personalShares=source.personalShares||1;meal.personalCost=source.personalCost===undefined?-1:source.personalCost;meal.diningMode=source.diningMode||'在家做';meal.place=source.place||'';meal.costType=source.costType||'估算';meal.estimatedCost=source.estimatedCost;meal.calories=source.calories===undefined?-1:source.calories;meal.energyReference=source.energyReference===undefined?-1:source.energyReference;meal.consumedFraction=source.consumedFraction||1;meal.calorieSource=source.calorieSource||'手动估算';meal.items=JSON.parse(JSON.stringify(source.items||[])) as MealItem[];meal.name=source.name;return meal;}
// Compute the entire list before any database mutation; stock and pending purchases are counted once.
export function missingShopping(recipe:Recipe,foods:Food[],shopping:Shopping[],today:string):Shopping[]{
 const main:Ingredient[]=recipe.ingredients.filter((i:Ingredient)=>!i.optional);if(main.some((i:Ingredient)=>!Number.isFinite(i.quantity)||i.quantity<=0)){throw new Error('有主料用量待补充，请先核对菜谱');}
 const combined:Ingredient[]=[];
 for(const i of main){const found:Ingredient|undefined=combined.find((v:Ingredient)=>canonicalName(v.name)===canonicalName(i.name)&&compatibleUnit(i.unit,v.unit)>0);if(found){found.quantity+=i.quantity*compatibleUnit(i.unit,found.unit);}else{combined.push(new Ingredient(i.name,i.quantity,i.unit));}}
 const result:Shopping[]=[];
 for(const i of combined){const stock:number=foods.filter((f:Food)=>!f.archived&&f.quantity>0&&coreExpiry(f)>=today&&canonicalName(f.name)===canonicalName(i.name)&&compatibleUnit(f.unit,i.unit)>0).reduce((sum:number,f:Food)=>sum+f.quantity*compatibleUnit(f.unit,i.unit),0);const pending:number=shopping.filter((v:Shopping)=>!v.purchased&&!v.familyId&&canonicalName(v.name)===canonicalName(i.name)&&compatibleUnit(v.unit,i.unit)>0).reduce((sum:number,v:Shopping)=>sum+v.quantity*compatibleUnit(v.unit,i.unit),0);const missing:number=Math.round(Math.max(0,i.quantity-stock-pending)*1000)/1000;if(missing>0){const item:Shopping=new Shopping();item.name=i.name;item.unit=i.unit;item.quantity=missing;result.push(item);}}
 return result;
}
