import { RecipeFilterOptions, normalizeRecipeFilter, MEAL_OCCASIONS, MealOccasion } from './RecipeFilterCore';
import { ingredientLabel } from './IngredientDiscoveryCore';
import { canonicalName } from './RecommendationCore';

export class FilterToken {
 field:string=''; value:string=''; label:string='';
 constructor(field:string,value:string,label:string){this.field=field;this.value=value;this.label=label;}
}
export function filterTokens(input:RecipeFilterOptions):FilterToken[]{
 const f:RecipeFilterOptions=normalizeRecipeFilter(input);const rows:FilterToken[]=[];
 const add=(field:string,values:string[],prefix:string=''):void=>{values.forEach((value:string)=>rows.push(new FilterToken(field,value,prefix+(field==='occasions'?MEAL_OCCASIONS.find((m:MealOccasion)=>m.id===value)?.label||value:field==='ingredients'||field==='excludedIngredients'?ingredientLabel(value):value))));};
 add('occasions',f.occasions);add('categories',f.categories);add('regions',f.regions);add('cuisines',f.cuisines);add('tastes',f.tastes);add('goals',f.goals);add('ingredients',f.ingredients,'含 ');add('excludedIngredients',f.excludedIngredients,'不含 ');add('difficulties',f.difficulties);
 if(f.maxMinutes>0){rows.push(new FilterToken('maxMinutes',String(f.maxMinutes),f.maxMinutes+'分钟内'));}
 if(f.minCost>0){rows.push(new FilterToken('minCost',String(f.minCost),'约'+f.minCost+'元起'));}
 if(f.maxCost>0){rows.push(new FilterToken('maxCost',String(f.maxCost),f.costPeople+'人约'+f.maxCost+'元内'));}
 if(f.availability!=='any'){rows.push(new FilterToken('availability',f.availability,f.availability==='ready'?'主料够用':'用上库存'));}
 if(f.search){rows.push(new FilterToken('search',f.search,'搜索 '+f.search));}return rows;
}
/** Remove exactly one visible constraint; household exclusions are owned separately. */
export function removeFilterToken(input:RecipeFilterOptions,token:FilterToken):RecipeFilterOptions{
 const out:RecipeFilterOptions=normalizeRecipeFilter(input);
 if(token.field==='maxMinutes'){out.maxMinutes=0;}else if(token.field==='minCost'){out.minCost=0;}else if(token.field==='maxCost'){out.maxCost=0;}else if(token.field==='availability'){out.availability='any';}else if(token.field==='search'){out.search='';}
 else if(token.field==='occasions'){out.occasions=out.occasions.filter((v:string)=>v!==token.value);}else if(token.field==='categories'){out.categories=out.categories.filter((v:string)=>v!==token.value);}else if(token.field==='regions'){out.regions=out.regions.filter((v:string)=>v!==token.value);}else if(token.field==='cuisines'){out.cuisines=out.cuisines.filter((v:string)=>v!==token.value);}else if(token.field==='tastes'){out.tastes=out.tastes.filter((v:string)=>v!==token.value);}else if(token.field==='goals'){out.goals=out.goals.filter((v:string)=>v!==token.value);}else if(token.field==='ingredients'){out.ingredients=out.ingredients.filter((v:string)=>v!==token.value);}else if(token.field==='excludedIngredients'){out.excludedIngredients=out.excludedIngredients.filter((v:string)=>v!==token.value);}else if(token.field==='difficulties'){out.difficulties=out.difficulties.filter((v:string)=>v!==token.value);}return out;
}
/** These are definite contradictions, not guesses about the current catalogue. */
export function filterConflicts(input:RecipeFilterOptions,protectedExclusions:string[]=[]):string[]{
 const f:RecipeFilterOptions=normalizeRecipeFilter(input);const issues:string[]=[];
 if(f.minCost>0&&f.maxCost>0&&f.minCost>f.maxCost){issues.push('最低预算高于最高预算');}
 if(f.ingredientMode==='all'||f.ingredients.length===1){
  for(const name of f.ingredients){if(f.excludedIngredients.concat(protectedExclusions).some((v:string)=>canonicalName(v)===canonicalName(name))){issues.push(ingredientLabel(name)+'同时被要求包含和排除');}}
 }else if(f.ingredients.length&&f.ingredients.every((name:string)=>f.excludedIngredients.concat(protectedExclusions).some((v:string)=>canonicalName(v)===canonicalName(name)))){issues.push('想用的食材全部被排除');}
 return issues;
}
export const TASTE_FEELINGS:string[]=['不合口味','一般般','还不错','很好吃','想再吃'];
export const QUICK_AMOUNTS:number[]=[10,15,20,30,50];
export class ViewBookmark {route:string='';selected:string='';date:string='';offset:number=0;}
