import assert from 'node:assert/strict';
import {ingredientMatches,recipeHasIngredient} from '../src/ingredient-discovery-core';
import {RecipeFilterOptions,normalizeRecipeFilter,matchesRecipeFilter,FilterRecipe} from '../src/recipe-filter-core';
import {estimateNutrition} from '../src/nutrition-core';
import {RankingOptions,matchesRankingConstraints} from '../src/recommend-core';
import {DrawOptions,drawMenu,MenuRecipe} from '../src/usability-core';
const pork:FilterRecipe={id:'pork',name:'小炒肉',category:'家常菜',minutes:20,people:2,estimatedCost:12,costKnown:true,difficulty:'简单',ingredients:[{name:'五花肉',quantity:200,unit:'g'},{name:'青椒',quantity:100,unit:'g'}]};
assert(ingredientMatches('猪里脊','pork'));assert(!ingredientMatches('牛里脊','pork'));assert(ingredientMatches('西红柿','番茄'));assert(!recipeHasIngredient(pork,'beef'));assert(recipeHasIngredient(pork,'pork'));
const legacy=normalizeRecipeFilter({ingredients:['pork','pork']} as RecipeFilterOptions);assert.deepEqual(legacy.excludedIngredients,[]);assert.deepEqual(legacy.ingredients,['pork']);assert.equal(legacy.costPeople,2);assert(matchesRecipeFilter(pork,legacy));
const f=new RecipeFilterOptions();f.ingredients=['pork','鸡蛋'];assert(!matchesRecipeFilter(pork,f));f.ingredientMode='any';assert(matchesRecipeFilter(pork,f));f.excludedIngredients=['pork'];assert(!matchesRecipeFilter(pork,f));f.excludedIngredients=[];f.difficulties=['困难'];assert(!matchesRecipeFilter(pork,f));f.difficulties=['简单'];
for(const people of [1,2,4,6])for(const budget of [5,12,24,50])for(const minutes of [10,20,30]){f.costPeople=people;f.maxCost=budget;f.maxMinutes=minutes;assert.equal(matchesRecipeFilter(pork,f),12*people/2<=budget&&minutes>=20);}
const n=estimateNutrition([{name:'鸡蛋',quantity:2,unit:'个'},{name:'食用油',quantity:10,unit:'g'},{name:'盐',quantity:1,unit:'g'}],2);assert(n.complete);assert.equal(n.kcal,234);assert.equal(n.perServingKcal,117);assert.equal(n.perServingProtein,6.7);
const partial=estimateNutrition([{name:'豆腐',quantity:100,unit:'g'},{name:'食用油',quantity:1,unit:'勺'}],2);assert(!partial.complete);assert.equal(partial.missing.length,2);for(const people of [0,21,NaN,1.5])assert.throws(()=>estimateNutrition([],people));
const make=(id:string,category:string):MenuRecipe=>({...pork,id,name:id,category,estimatedCost:5} as MenuRecipe);
const rows=[make('a','家常菜'),make('b','家常菜'),make('c','家常菜'),make('s','汤类')];const o=Object.assign(new DrawOptions(),{dishes:2,soups:1,people:2,budget:30,minutes:90,seed:'lock-test'});
o.lockedIds=['a','s'];const locked=drawMenu(rows,o);assert.equal(locked.ids.length,3);assert(locked.ids.includes('a')&&locked.ids.includes('s'));o.lockedIds=locked.ids;assert.deepEqual(drawMenu(rows,o).ids,locked.ids);
o.lockedIds=['a','s'];o.disliked=['a'];assert.equal(drawMenu(rows,o).ids.length,0);o.disliked=[];o.lockedIds=['missing'];assert.equal(drawMenu(rows,o).ids.length,0);o.lockedIds=['a','a'];assert.equal(drawMenu(rows,o).ids.length,0);o.lockedIds=['a','s'];o.budget=1;assert.equal(drawMenu(rows,o).ids.length,0);
console.log('PASS ingredient aliases/groups, all-any-exclusion precedence, legacy drafts, 48 budget/time/person combinations, partial nutrition, menu locks and conflicts');

assert(!matchesRankingConstraints(pork,Object.assign(new RankingOptions(),{excluded:['猪肉']})));assert(!matchesRankingConstraints({...pork,ingredients:[{name:'牛腩',quantity:200,unit:'g'}]},Object.assign(new RankingOptions(),{excluded:['牛肉']})));assert(!matchesRankingConstraints({...pork,ingredients:[{name:'葱、花生',quantity:20,unit:'g'}]},Object.assign(new RankingOptions(),{excluded:['花生']})));assert(recipeHasIngredient({...pork,ingredients:[{name:'葱、姜、蒜',quantity:10,unit:'g'}]},'姜'));
