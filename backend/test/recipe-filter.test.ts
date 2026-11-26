import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RecipeFilterOptions, FilterRecipe, filterRecipes, recipeOccasions, recipeAvailability, recipeFilterSummary } from '../src/recipe-filter-core';
import { CoreFood } from '../src/recommend-core';
const recipe:FilterRecipe={id:'eggs',name:'番茄炒蛋',category:'家常菜',region:'广东',taste:'酸甜',minutes:20,dietTags:['高蛋白'],ingredients:[{name:'番茄',quantity:200,unit:'g'},{name:'鸡蛋',quantity:2,unit:'个'},{name:'盐',quantity:1,unit:'g',optional:true}]};
const stock:CoreFood[]=[{name:'西红柿',quantity:0.2,unit:'kg',expiryDate:'2027-01-01'},{name:'鸡蛋',quantity:2,unit:'个',expiryDate:'2027-01-01'}];
const f=new RecipeFilterOptions();assert.equal(filterRecipes([recipe],f).length,1);
f.occasions=['breakfast'];assert.equal(filterRecipes([recipe],f).length,0);f.occasions=['breakfast','dinner'];assert.equal(filterRecipes([recipe],f).length,1);assert.equal(recipe.category,'家常菜');
f.categories=['汤类'];assert.equal(filterRecipes([recipe],f).length,0);f.categories=['家常菜','汤类'];f.regions=['广东'];f.tastes=['酸甜'];f.goals=['高蛋白'];f.maxMinutes=20;f.availability='ready';assert.equal(filterRecipes([recipe],f,stock,'2026-11-04').length,1);
assert.equal(filterRecipes([recipe],f,stock,'2028-01-01').length,0);assert.equal(filterRecipes([recipe],f,[{...stock[0],archived:true},stock[1]],'2026-11-04').length,0);assert.equal(filterRecipes([recipe],f,[stock[0],{...stock[1],quantity:1}],'2026-11-04').length,0);
f.availability='partial';assert.equal(filterRecipes([recipe],f,[{...stock[1],quantity:1}],'2026-11-04').length,1);
f.availability='ready';assert.equal(filterRecipes([{...recipe,ingredients:[{name:'鸡蛋',quantity:0,unit:'个'}]}],f,stock,'2026-11-04').length,0);
assert.equal(recipeAvailability({...recipe,ingredients:[{name:'鸡蛋',quantity:2,unit:'个'},{name:'鸡蛋',quantity:1,unit:'个'}]},stock,'2026-11-04').covered,0);
f.availability='any';f.maxMinutes=19;assert.equal(filterRecipes([recipe],f).length,0);f.maxMinutes=20;f.goals=['减脂餐'];assert.equal(filterRecipes([recipe],f).length,0);
assert.deepEqual(recipeOccasions({...recipe,mealOccasions:['snack','breakfast','snack','invalid']}).tags,['snack','breakfast']);assert.equal(recipeOccasions({...recipe,mealOccasions:['snack']}).inferred,false);assert.deepEqual(recipeOccasions({...recipe,category:'粥类'}).tags,['breakfast','lunch','dinner']);
const catalog:FilterRecipe[]=JSON.parse(readFileSync('data/recipes.json','utf8')).recipes;
const counts:Record<string,number>={};for(const occasion of ['breakfast','lunch','dinner','snack']){const o=new RecipeFilterOptions();o.occasions=[occasion];counts[occasion]=filterRecipes(catalog,o).length;assert(counts[occasion]>0);}
assert.equal(filterRecipes(catalog,new RecipeFilterOptions()).length,catalog.length);assert(recipeFilterSummary(f).includes('高蛋白')===false);console.log('PASS OR-within/AND-across filters; independent explicit/inferred meal tags; metadata-only goals; strict known/aggregated quantities, aliases, expired/archived stock; all catalog meal groups:',counts);
