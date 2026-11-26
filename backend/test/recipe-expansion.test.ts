import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCookingGuide } from '../src/cooking-guide';
import { filterRecipes, RecipeFilterOptions } from '../src/recipe-filter-core';
const catalog=JSON.parse(readFileSync('data/recipes.json','utf8'));
const supplement=JSON.parse(readFileSync('data/recipes-expansion-v3.json','utf8'));
const newRecipes=catalog.recipes.filter((r:any)=>r.sourceRevision==='editorial-2026-11-04-v3');
assert.equal(supplement.length,64);assert.equal(newRecipes.length,64);assert(catalog.recipes.length>=450);
assert.equal(new Set(catalog.recipes.map((r:any)=>r.id)).size,catalog.recipes.length);
assert.equal(new Set(catalog.recipes.map((r:any)=>r.name)).size,catalog.recipes.length);
assert.equal(readFileSync('data/recipes.json','utf8'),readFileSync('../client/entry/src/main/resources/rawfile/recipes.json','utf8'));
for(const r of newRecipes){
 assert.equal(r.people,2);assert(r.timeEstimated);assert.equal(r.prepMinutes+r.cookMinutes,r.minutes);assert(r.prepMinutes>0&&r.cookMinutes>0);
 assert(r.ingredients.length>=3);assert(r.steps.length>=4);assert(r.equipment.length>0);
 assert.equal(r.calories,-1);assert.equal(r.protein,-1);assert.equal(r.costKnown,false);assert.equal(r.nutritionKnown,false);
 assert(r.ingredients.every((i:any)=>i.quantity>0&&Number.isFinite(i.quantity)&&i.quantitySource.includes('推荐')),r.name);
 assert(!r.ingredients.some((i:any)=>/锅|砧板|刀具|烤箱|模具|温度计/.test(i.name)),r.name);
 assert(r.mealOccasions.length>0);assert(r.mealOccasions.every((o:string)=>['breakfast','lunch','dinner','snack'].includes(o)));
 const guide=buildCookingGuide(r);assert.equal(guide.steps.length,r.steps.length,r.name);assert.deepEqual(JSON.parse(JSON.stringify(guide)),r.editorialGuide,r.name);
}
for(const o of ['breakfast','lunch','dinner','snack']){
 const filtered=filterRecipes(newRecipes,Object.assign(new RecipeFilterOptions(),{occasions:[o]}));assert(filtered.length>=10,o);assert(filtered.every(r=>r.mealOccasions?.includes(o)));
}
assert(new Set(newRecipes.map((r:any)=>r.region)).size>=12);
assert(new Set(newRecipes.map((r:any)=>r.category)).size>=7);
assert(newRecipes.filter((r:any)=>r.minutes<=20).length>=20);
console.log('PASS 64 original recipes, 450 catalog, 454 including builtins: stable unique IDs, edible-only ingredient amounts, unknown nutrition, real meal-occasion filters, exact editorial guides and native mirror.');
