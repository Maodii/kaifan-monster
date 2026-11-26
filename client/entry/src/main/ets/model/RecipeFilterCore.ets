import { CoreRecipe, CoreFood, CoreIngredient, coreExpiry, canonicalName, compatibleUnit, recipeMinutes } from './RecommendationCore';
import { searchRecipe, recipeCuisineGroup } from './RecipeDiscoveryCore';
import { recipeHasIngredient, ingredientLabel } from './IngredientDiscoveryCore';
import { estimateRecipeCost, MenuRecipe } from './UsabilityCore';
/** Meal occasions are an independent editorial suggestion, never a replacement for category. */
export interface FilterRecipe extends CoreRecipe { mealOccasions?: string[]; difficulty?:string; people?:number; estimatedCost?:number; costKnown?:boolean; }
export class RecipeFilterOptions {
 occasions: string[] = []; categories: string[] = []; regions: string[] = []; cuisines: string[] = []; tastes: string[] = []; goals: string[] = [];
 maxMinutes: number = 0; availability: string = 'any'; ingredients: string[] = []; search: string = '';
 ingredientMode:string='all'; excludedIngredients:string[]=[]; difficulties:string[]=[];
 minCost:number=0; maxCost:number=0; costPeople:number=2;
}
/** Upgrade persisted drafts without letting absent new fields break the panel. */
export function normalizeRecipeFilter(input:RecipeFilterOptions):RecipeFilterOptions {
 const out=new RecipeFilterOptions();if(!input){return out;}
 const strings=(values:string[]):string[]=>Array.isArray(values)?values.filter((v:string)=>typeof v==='string'&&v.trim().length>0).map((v:string)=>v.trim()).filter((v:string,i:number,a:string[])=>a.indexOf(v)===i).slice(0,30):[];
 out.occasions=strings(input.occasions);out.categories=strings(input.categories);out.regions=strings(input.regions);out.cuisines=strings(input.cuisines);out.tastes=strings(input.tastes);out.goals=strings(input.goals);out.ingredients=strings(input.ingredients);out.excludedIngredients=strings(input.excludedIngredients);out.difficulties=strings(input.difficulties);
 out.ingredientMode=input.ingredientMode==='any'?'any':'all';out.availability=['ready','partial'].includes(input.availability)?input.availability:'any';out.search=typeof input.search==='string'?input.search.slice(0,80):'';
 out.maxMinutes=Number.isFinite(input.maxMinutes)?Math.max(0,Math.min(1440,input.maxMinutes)):0;
 out.minCost=Number.isFinite(input.minCost)?Math.max(0,input.minCost):0;out.maxCost=Number.isFinite(input.maxCost)?Math.max(0,input.maxCost):0;
 out.costPeople=Number.isInteger(input.costPeople)&&input.costPeople>=1&&input.costPeople<=20?input.costPeople:2;
 return out;
}
export class MealOccasion { id: string; label: string; constructor(id: string,label: string) { this.id=id;this.label=label; } }
export const MEAL_OCCASIONS: MealOccasion[] = [new MealOccasion('breakfast','早餐'),new MealOccasion('lunch','午餐'),new MealOccasion('dinner','晚餐'),new MealOccasion('snack','加餐')];
export class OccasionSuggestion { tags: string[] = []; inferred: boolean = true; explanation: string = ''; }
export function recipeOccasions(recipe: FilterRecipe): OccasionSuggestion {
 const out: OccasionSuggestion = new OccasionSuggestion();
 const explicit: string[] = (recipe.mealOccasions || []).filter((v: string) => MEAL_OCCASIONS.some((m: MealOccasion) => m.id === v));
 if (explicit.length) { out.tags=explicit.filter((v: string,i: number) => explicit.indexOf(v) === i);out.inferred=false;out.explanation='菜谱已标注餐次';return out; }
 if (recipe.category === '早餐') { out.tags=['breakfast'];out.explanation='按早餐类别建议'; }
 else if (recipe.category === '甜点' || recipe.category === '饮品') { out.tags=['snack'];out.explanation='按甜点或饮品类别建议加餐'; }
 else if (recipe.category === '粥类') { out.tags=['breakfast','lunch','dinner'];out.explanation='粥类可作为早午晚餐搭配'; }
 else if (/三明治|吐司|煎蛋|蒸蛋|燕麦|馒头|包子|豆浆|鸡蛋饼/.test(recipe.name)) { out.tags=['breakfast','lunch','dinner'];out.explanation='按菜名中的常见早餐形式建议，也可搭配正餐'; }
 else { out.tags=['lunch','dinner'];out.explanation='按正餐菜谱建议午晚餐，餐次可自由搭配'; }
 return out;
}
export class IngredientAvailability { required: number = 0; covered: number = 0; present: number = 0; unknown: number = 0; }
export function recipeAvailability(recipe: FilterRecipe,foods: CoreFood[],today: string): IngredientAvailability {
 const out: IngredientAvailability=new IngredientAvailability();
 const main: CoreIngredient[]=recipe.ingredients.filter((i: CoreIngredient) => !i.optional);
 out.required=main.length;
 // Aggregate repeated requirements; one stock amount cannot cover the same ingredient twice.
 const groups: CoreIngredient[]=[];
 for(const ingredient of main){
  const same: CoreIngredient|undefined=groups.find((i: CoreIngredient)=>canonicalName(i.name)===canonicalName(ingredient.name)&&compatibleUnit(ingredient.unit,i.unit)>0);
  if(same){if(same.quantity>0&&ingredient.quantity>0){same.quantity+=ingredient.quantity*compatibleUnit(ingredient.unit,same.unit);}else{same.quantity=0;}}
  else {groups.push({name:ingredient.name,quantity:ingredient.quantity,unit:ingredient.unit});}
 }
 out.required=groups.length;
 for(const i of groups){
  const stock: number=foods.filter((f: CoreFood)=>!f.archived&&Number.isFinite(f.quantity)&&f.quantity>0&&/^\d{4}-\d{2}-\d{2}$/.test(coreExpiry(f))&&Number.isFinite(Date.parse(coreExpiry(f)+'T12:00:00Z'))&&new Date(coreExpiry(f)+'T12:00:00Z').toISOString().slice(0,10)===coreExpiry(f)&&coreExpiry(f)>=today&&canonicalName(f.name)===canonicalName(i.name)&&compatibleUnit(f.unit,i.unit)>0).reduce((sum: number,f: CoreFood)=>sum+f.quantity*compatibleUnit(f.unit,i.unit),0);
  if(stock>0){out.present++;}if(!Number.isFinite(i.quantity)||i.quantity<=0){out.unknown++;}else if(stock>=i.quantity){out.covered++;}
 }
 return out;
}
function selected(values: string[],value: string): boolean { return !values.length||values.includes(value); }
export function matchesRecipeFilter(recipe: FilterRecipe,options: RecipeFilterOptions,foods: CoreFood[] = [],today: string = ''): boolean {
 if(!today){const d:Date=new Date();today=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
 if(options.occasions.length&&!recipeOccasions(recipe).tags.some((v: string)=>options.occasions.includes(v))){return false;}
 if(options.categories.length&&!options.categories.some((v: string)=>v===recipe.category||(recipe.dietTags||[]).includes(v)||(v==='快手菜'&&recipeMinutes(recipe)>0&&recipeMinutes(recipe)<=20))){return false;}
 if(!selected(options.regions,recipe.region||recipe.cuisine||'')||!selected(options.tastes,recipe.taste||'')){return false;}
 if((options.cuisines||[]).length&&!options.cuisines.includes(recipeCuisineGroup(recipe))){return false;}
 if(options.maxMinutes>0&&(recipeMinutes(recipe)<=0||recipeMinutes(recipe)>options.maxMinutes)){return false;}
 if(options.goals.length&&!options.goals.some((goal: string)=>(recipe.dietTags||[]).includes(goal==='控制热量'?'减脂餐':goal))){return false;}
 if(!searchRecipe(recipe,options.search).matched){return false;}
 if((options.excludedIngredients||[]).some((name:string)=>recipeHasIngredient(recipe,name))){return false;}
 if(options.ingredients.length){const has=(name:string):boolean=>recipeHasIngredient(recipe,name);if(options.ingredientMode==='any'?!options.ingredients.some(has):!options.ingredients.every(has)){return false;}}
 if((options.difficulties||[]).length&&!options.difficulties.includes(recipe.difficulty||'')){return false;}
 if(options.minCost>0||options.maxCost>0){const cost=estimateRecipeCost(recipe as MenuRecipe,options.costPeople||2);if(!cost.usable||cost.total<(options.minCost||0)||(options.maxCost>0&&cost.total>options.maxCost)){return false;}}
 if(options.availability!=='any'){
  const stock:IngredientAvailability=recipeAvailability(recipe,foods,today);
  if(options.availability==='ready'){if(!stock.required||stock.covered!==stock.required||stock.unknown>0){return false;}}
  else if(options.availability==='partial'){if(stock.present===0){return false;}}
  else{return false;}
 }
 return true;
}
/** OR within one dimension, AND across dimensions; requested ingredients require all. Order is preserved. */
export function filterRecipes(recipes: FilterRecipe[],options: RecipeFilterOptions,foods: CoreFood[] = [],today: string = ''): FilterRecipe[] { return recipes.filter((r: FilterRecipe)=>matchesRecipeFilter(r,options,foods,today)); }
export function recipeFilterSummary(options: RecipeFilterOptions): string {
 const parts: string[]=options.occasions.map((id: string)=>{const m:MealOccasion|undefined=MEAL_OCCASIONS.find((v:MealOccasion)=>v.id===id);return m?m.label:id;}).concat(options.categories,options.regions,options.cuisines||[],options.tastes,options.goals,options.ingredients.map(ingredientLabel));
 if(options.maxMinutes>0){parts.push(options.maxMinutes+'分钟内');}if(options.availability==='ready'){parts.push('主料够用');}else if(options.availability==='partial'){parts.push('用上现有食材');}if(options.search.trim()){parts.push('“'+options.search.trim()+'”');}
 parts.push(...(options.difficulties||[]));if(options.maxCost>0){parts.push((options.costPeople||2)+'人约'+options.maxCost+'元内');}if(options.minCost>0){parts.push('约'+options.minCost+'元起');}if((options.excludedIngredients||[]).length){parts.push('不含'+options.excludedIngredients.map(ingredientLabel).join('、'));}
 return parts.length?parts.join(' · '):'全部餐次 · 不限条件';
}
