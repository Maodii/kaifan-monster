import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { CoreRecipe, recipeMinutes } from '../src/recommend-core';
import { parseRecipeQuery, matchesRecipeQueryIntent } from '../src/recipe-query-intent';
import { RecipeSearchIndex, searchRecipeCatalog } from '../src/recipe-search-core';

const names=['鸡蛋','番茄','西红柿','花生','辣椒','牛肉','香菜','花生油'];
const basic:CoreRecipe={id:'eggs',name:'鸡蛋羹',taste:'清淡',minutes:10,ingredients:[{name:'鸡蛋',quantity:2,unit:'个'}]};
const spicy:CoreRecipe={...basic,id:'spicy',name:'鸡蛋辣椒羹',ingredients:[...basic.ingredients,{name:'辣椒',quantity:1,unit:'个',optional:true}]};
const peanut:CoreRecipe={...basic,id:'peanut',name:'花生炒鸡蛋',ingredients:[...basic.ingredients,{name:'花生油',quantity:1,unit:'g',optional:true}]};
for(const query of ['不辣','不要辣','不要 辣','不能吃辣','想吃不辣的鸡蛋']){
 const intent=parseRecipeQuery(query,names);assert(intent.nonSpicy,query);assert(matchesRecipeQueryIntent(basic,intent));assert(!matchesRecipeQueryIntent(spicy,intent));assert(!matchesRecipeQueryIntent({...basic,taste:undefined},intent));
}
for(const query of ['十分钟内','10分钟以内','最多十分钟','不超过十分钟','10 分钟之内做好']){const intent=parseRecipeQuery(query,names);assert.equal(intent.maxMinutes,10,query);assert(intent.hasTimeLimit);assert(matchesRecipeQueryIntent(basic,intent));assert(!matchesRecipeQueryIntent({...basic,minutes:11},intent));assert(!matchesRecipeQueryIntent({...basic,minutes:undefined},intent));}
assert.equal(parseRecipeQuery('半小时内',names).maxMinutes,30);
assert.equal(parseRecipeQuery('一小时以内',names).maxMinutes,60);
assert.equal(parseRecipeQuery('十五分钟内，不超过十分钟',names).maxMinutes,10);
assert.equal(parseRecipeQuery('十分钟炖牛肉',names).hasTimeLimit,false);
for(const query of ['0分钟内','2000分钟内','不吃火星粉','不要花生和火星粉','有鸡蛋不要鸡蛋']){assert(parseRecipeQuery(query,names).invalidReason,query);}
for(const query of ['不要花生','不吃 花生','不放花生','不含花生','不能吃花生']){const intent=parseRecipeQuery(query,names);assert.deepEqual(intent.excludedIngredients,['花生']);assert(!matchesRecipeQueryIntent(peanut,intent));assert(matchesRecipeQueryIntent(basic,intent));}
const excludePeppers=parseRecipeQuery('不要辣椒',names);assert.deepEqual(excludePeppers.excludedIngredients,['辣椒']);assert.equal(excludePeppers.nonSpicy,false);
assert.deepEqual(parseRecipeQuery('不要 花生 和 牛肉 的菜',names).excludedIngredients,['花生','牛肉']);
const pantry=parseRecipeQuery('有鸡蛋没番茄',names);assert.deepEqual(pantry.requiredIngredients,['鸡蛋']);assert.deepEqual(pantry.excludedIngredients,['番茄']);assert.equal(pantry.text,'');
assert(!matchesRecipeQueryIntent({...basic,ingredients:[]},pantry));
assert(!matchesRecipeQueryIntent({...basic,ingredients:[...basic.ingredients,{name:'西红柿',quantity:1,unit:'个'}]},pantry));
console.log('PASS explicit demand parsing: Chinese time, spacing, conjunctions, unknown exclusions, conflicts, missing metadata, optional spices and compound exclusions');

const index=new RecipeSearchIndex([basic,spicy,peanut]);
for(const query of ['不辣的火星菜','不超过十分钟的火星菜','不要花生的火星菜']){
 const result=searchRecipeCatalog(index,query);assert.equal(result.mode,'similar');assert(result.recipes.every(recipe=>matchesRecipeQueryIntent(recipe,result.intent)));
}
const noStock=searchRecipeCatalog(index,'有牛肉');assert.equal(noStock.mode,'empty'); // explicit required ingredients cannot be bypassed by fallback
assert.equal(searchRecipeCatalog(index,'不辣',[spicy.id]).mode,'empty');
assert.equal(searchRecipeCatalog(index,'不超过五分钟').mode,'empty');
assert.equal(searchRecipeCatalog(index,'有鸡蛋不要鸡蛋').mode,'empty');
assert.equal(searchRecipeCatalog(index,'不要 辣椒').recipes.includes(spicy),false);
assert.equal(searchRecipeCatalog(index,'不要花生和火星粉').mode,'empty');
const requiredNoPantry=new RecipeSearchIndex([{...basic,ingredients:[],name:'鸡蛋羹'},{...basic,id:'known',ingredients:basic.ingredients}]);
assert.deepEqual(searchRecipeCatalog(requiredNoPantry,'有鸡蛋').recipes.map(recipe=>recipe.id),['known']);
console.log('PASS natural constraints restrict direct, empty-query and fallback routes and remain inside the allow-list');

const frequent:CoreRecipe[]=Array.from({length:10},(_,i)=>({...basic,id:'common-'+i,name:'家常'+i}));
const unique:CoreRecipe={...basic,id:'rare',name:'香菜小菜',ingredients:[{name:'香菜',quantity:30,unit:'g'}]};
const frequencyIndex=new RecipeSearchIndex([...frequent,unique]);assert(frequencyIndex.termWeight('香菜')>frequencyIndex.termWeight('鸡蛋'));
const optional:CoreRecipe={id:'optional',name:'甲菜',ingredients:[{name:'香菜',quantity:1,unit:'g',optional:true}]};
const main:CoreRecipe={id:'main',name:'乙菜',ingredients:[{name:'香菜',quantity:50,unit:'g'}]};
assert.equal(searchRecipeCatalog(new RecipeSearchIndex([optional,main]),'香菜').hits[0].recipeId,'main');
const duplicateAlias=new RecipeSearchIndex([...frequent,{...unique,aliases:['香菜','香菜小菜','香菜']}]);assert.equal(duplicateAlias.termWeight('香菜'),frequencyIndex.termWeight('香菜'));
const longTitle:CoreRecipe={...basic,id:'long',name:'宫保鸡丁荞麦燕麦豆腐汤'};
assert.equal(searchRecipeCatalog(new RecipeSearchIndex([longTitle]),'gbj').mode,'similar');
const exactName:CoreRecipe={...basic,id:'exact',name:'宫保鸡丁'};
const initial=searchRecipeCatalog(new RecipeSearchIndex([exactName]),'gbjd');assert.equal(initial.mode,'matched');assert(initial.hits[0].confidence<1);
console.log('PASS document-frequency relevance, main ingredients ahead of optional garnish, alias deduplication and bounded initials confidence');

const catalog:CoreRecipe[]=JSON.parse(readFileSync('data/recipes.json','utf8')).recipes;const catalogIndex=new RecipeSearchIndex(catalog);
const queries=['想吃不辣的鸡蛋','十分钟内','不要花生的宫保鸡丁','有鸡蛋没番茄','不辣的麻婆豆腐','10分钟内的牛肉','不要辣椒，不超过十五分钟','不要 辣椒','不要花生和火星粉'];
for(const query of queries){const result=searchRecipeCatalog(catalogIndex,query);assert(result.recipes.every(recipe=>matchesRecipeQueryIntent(recipe,result.intent)),query);}
const ten=searchRecipeCatalog(catalogIndex,'十分钟内');assert(ten.recipes.length>0);assert(ten.recipes.every(recipe=>recipeMinutes(recipe)>0&&recipeMinutes(recipe)<=10));
const modules:Record<string,Record<string,any>>={};
function native(name:string):Record<string,any>{if(modules[name])return modules[name];const module={exports:{} as Record<string,any>};modules[name]=module.exports;const code=ts.transpileModule(readFileSync('../client/entry/src/main/ets/model/'+name+'.ets','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports:module.exports,require:(path:string)=>native(path.replace('./','')),Date,Math,Number,String,Set,Map,Array});return module.exports;}
const mirror=native('RecipeSearchCore');const nativeIndex=new mirror.RecipeSearchIndex(catalog);
for(const query of queries){assert.equal(JSON.stringify(mirror.searchRecipeCatalog(nativeIndex,query)),JSON.stringify(searchRecipeCatalog(catalogIndex,query)),query);}
console.log('PASS real catalog natural-language constraints and exact ArkTS mirror parity');
