import { CoreFood, CoreIngredient, CoreRecipe, CoreMeal, CoreRank, RankingOptions, PreferenceEvent, rankPersonalized } from './recommend-core';
export interface FoodInput extends CoreFood {}
export interface IngredientInput extends CoreIngredient {}
export interface RecipeInput extends CoreRecipe { taste:string; }
export interface MealInput extends CoreMeal { recipeId:string; }
export interface RankedRecipe {recipe:RecipeInput;urgent:number;matched:number;missing:IngredientInput[];recent:boolean;score:number;coverage:number;reasons:string[];learned:number;}
export function rankRecipes(recipes:RecipeInput[],foods:FoodInput[],meals:MealInput[],excluded:string[],taste:string,recentDays:number,now:number=Date.now(),options?:RankingOptions,events:PreferenceEvent[]=[]):RankedRecipe[]{
 const opts=options||new RankingOptions();opts.excluded=excluded;opts.taste=taste;opts.recentDays=recentDays;
 return rankPersonalized(recipes,foods,meals,events,opts,now).map((r:CoreRank)=>({recipe:recipes.find(v=>v.id===r.recipeId)!,urgent:r.urgent,matched:r.matched,missing:r.missing,recent:r.recent,score:r.score,coverage:r.coverage,reasons:r.reasons,learned:r.learned}));
}
