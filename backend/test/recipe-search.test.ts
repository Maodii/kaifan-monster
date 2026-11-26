import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import vm from 'node:vm';
import ts from 'typescript';
import { CoreRecipe, RankingOptions, matchesRankingConstraints } from '../src/recommend-core';
import { RecipeSearchIndex, RecipeSearchResult, searchRecipeCatalog, searchRecipeCandidates, segmentRecipeQuery, searchPronunciation, boundedSearchDistance } from '../src/recipe-search-core';

const egg: CoreRecipe={id:'egg',name:'西红柿炒鸡蛋',ingredients:[{name:'西红柿',quantity:200,unit:'g'},{name:'鸡蛋',quantity:2,unit:'个'}],region:'通用家常',cuisine:'通用家常',category:'家常菜'};
const chicken: CoreRecipe={id:'chicken',name:'宫保鸡丁',ingredients:[{name:'鸡肉',quantity:200,unit:'g'},{name:'花生',quantity:20,unit:'g',optional:true}],region:'四川',cuisine:'四川',category:'家常菜'};
const pork: CoreRecipe={id:'pork',name:'红烧肉',ingredients:[{name:'猪肉',quantity:300,unit:'g'}],region:'湖南',cuisine:'湖南',category:'家常菜'};
const recipes: CoreRecipe[]=[egg,chicken,pork];const index=new RecipeSearchIndex(recipes);
function includes(result: RecipeSearchResult,id: string): boolean { return result.mode==='matched'&&result.hits.some(hit=>hit.recipeId===id); }
for(const query of ['番茄鸡蛋','西红柿鸡蛋','鸡蛋西红柿','番茄 鸡蛋','番茄jidan','fanqiechaodan','xi hong shi chao ji dan','fan1qie2chao3dan4','fānqiéchǎodàn','fqcd','fanqiejidan','fan qie ji dan','fqjd','番茄 鸡旦']){assert(includes(searchRecipeCatalog(index,query),'egg'),query);}
for(const query of ['宫爆鸡丁','gongbaojiding','gongbaojidign','gbjd','宫保机丁']){assert(includes(searchRecipeCatalog(index,query),'chicken'),query);}
assert(includes(searchRecipeCatalog(index,'红少肉'),'pork'));
assert.deepEqual(segmentRecipeQuery(index,'番茄鸡蛋'),['番茄','鸡蛋']);
assert.deepEqual(segmentRecipeQuery(index,'番茄 鸡旦'),['番茄','鸡旦']);
assert(segmentRecipeQuery(index,'番茄火星').includes('火星'));
assert.equal(searchPronunciation('重庆').full,'chongqing');assert.equal(searchPronunciation('番茄').full,'fanqie');assert.equal(searchPronunciation('长豆角').full,'changdoujiao');
assert.equal(searchPronunciation('薄荷').full,'bohe');assert.equal(searchPronunciation('𠮷').complete,false);
console.log('PASS generated-vocabulary segmentation, mixed inputs, full/toned/spaced pinyin, initials, homophones, culinary polyphones');

assert.equal(boundedSearchDistance('gongbaojidign','gongbaojiding',2),1);
assert.equal(boundedSearchDistance('宫鸡丁','宫保鸡丁',1),1);
assert.equal(boundedSearchDistance('宫保鸡丁','宫爆鸡丁',1),1);
assert(boundedSearchDistance('牛肉','鸡蛋',1)>1);
assert.equal(searchRecipeCandidates([chicken],'牛肉').mode,'similar');
assert.equal(searchRecipeCandidates([egg],'番茄 牛肉').mode,'similar');
assert.equal(searchRecipeCandidates([egg],'undefined').mode,'similar');
assert.equal(searchRecipeCandidates([egg],'1').mode,'similar');
assert.equal(searchRecipeCandidates([egg],'甲乙').mode,'similar');
assert.equal(searchRecipeCandidates([egg],'🍕🚀').mode,'similar');
const typo: CoreRecipe={...chicken,id:'literal-typo',name:'宫爆鸡丁'};
const ranked=searchRecipeCandidates([chicken,typo],'宫爆鸡丁');assert.equal(ranked.hits[0].recipeId,typo.id);assert.equal(ranked.hits[0].level,'exact');assert.equal(ranked.hits[1].level,'pinyin');
const dynamic: CoreRecipe={id:'dynamic',name:'紫苏菱角羹',ingredients:[{name:'菱角',quantity:100,unit:'g'},{name:'紫苏',quantity:3,unit:'g'}]};
assert(includes(searchRecipeCandidates([dynamic],'菱角紫苏'),'dynamic'));
assert(includes(searchRecipeCandidates([dynamic],'zisu lingjiao'),'dynamic'));
console.log('PASS bounded typo distance, no unrelated short-word substitutions, exact over fuzzy, automatic new-recipe vocabulary');

const partial=searchRecipeCatalog(index,'川菜 火星菜');assert.equal(partial.mode,'similar');assert.equal(partial.hits[0].recipeId,chicken.id);assert(partial.message.includes('相似菜系'));assert(partial.hits.every(hit=>hit.level==='similar'));
const unrelated=searchRecipeCatalog(index,'火星飞船xyz');assert.equal(unrelated.mode,'similar');assert(!unrelated.message.includes('相似菜系'));assert.equal(unrelated.suggestedCuisines.length,0);
assert.equal(searchRecipeCatalog(index,'火星飞船xyz',[pork.id]).recipes[0],pork);
assert.equal(searchRecipeCandidates([pork],'火星飞船xyz',['湘菜']).message.includes('相似菜系'),true);
assert.equal(searchRecipeCatalog(index,'宫保鸡丁',[]).mode,'empty');
assert.equal(searchRecipeCatalog(index,'',[]).mode,'empty');
assert.equal(searchRecipeCatalog(index,'').mode,'all');
assert.deepEqual(searchRecipeCatalog(index,' \t，').recipes,recipes);
assert.equal(searchRecipeCatalog(index,'x',[egg.id],1).recipes.length,1);
const exclusions=new RankingOptions();exclusions.excluded=['花生'];
const eligible=recipes.filter(recipe=>matchesRankingConstraints(recipe,exclusions));assert(!eligible.includes(chicken));
for(const query of ['宫保鸡丁','gbjd','川菜 火星菜','火星飞船xyz','']){
 const result=searchRecipeCandidates(eligible,query);assert(result.recipes.every(recipe=>eligible.includes(recipe)));assert(!result.hits.some(hit=>hit.recipeId===chicken.id));
}
const constrained=searchRecipeCatalog(index,'宫保鸡丁',[egg.id,pork.id]);assert.equal(constrained.mode,'similar');assert(constrained.recipes.every(recipe=>recipe.id!==chicken.id));
assert.equal(egg.name,'西红柿炒鸡蛋');assert.equal(chicken.ingredients[1].optional,true);
console.log('PASS explicit fallback state, evidence-based cuisine message, immutable hard allow-list/exclusions, original references, empty candidate boundary');

const catalog: CoreRecipe[]=JSON.parse(readFileSync('data/recipes.json','utf8')).recipes;
let started=performance.now();const catalogIndex=new RecipeSearchIndex(catalog);const indexMs=performance.now()-started;
const queries=['番茄鸡蛋','番茄 鸡旦','fanqiechaodan','fqcd','宫爆鸡丁','gongbaojidign','红少肉','土逗','番茄jidan','川采'];
const timings:number[]=[];
for(const query of queries){started=performance.now();const result=searchRecipeCatalog(catalogIndex,query);timings.push(performance.now()-started);assert.equal(result.mode,'matched',query);assert(result.recipes.length>0);}
const potato=searchRecipeCatalog(catalogIndex,'土逗');assert(potato.recipes.some(recipe=>recipe.name.includes('土豆')));
const shuffled=new RecipeSearchIndex(catalog.slice().reverse());
for(const query of ['宫爆鸡丁','番茄鸡蛋','火星飞船xyz']){assert.deepEqual(searchRecipeCatalog(catalogIndex,query).hits,searchRecipeCatalog(shuffled,query).hits);}
const noMatch=searchRecipeCatalog(catalogIndex,'火星飞船xyz');assert.equal(noMatch.hits.length,12);assert.equal(noMatch.mode,'similar');
assert(searchRecipeCatalog(catalogIndex,'番茄鸡蛋',catalog.filter(recipe=>recipe.ingredients.some(i=>i.name.includes('鸡蛋'))).map(recipe=>recipe.id)).recipes.every(recipe=>recipe.ingredients.some(i=>i.name.includes('鸡蛋'))));
assert(indexMs<2000);assert(Math.max(...timings)<2000);
console.log('PASS real catalog retrieval, deterministic order, bounded fallback, filter preservation; index/query ms:',Math.round(indexMs),timings.map(ms=>Math.round(ms)));

const modules:Record<string,Record<string,any>>={};
function native(name:string):Record<string,any>{
 if(modules[name])return modules[name];const module={exports:{} as Record<string,any>};modules[name]=module.exports;
 const code=ts.transpileModule(readFileSync('../client/entry/src/main/ets/model/'+name+'.ets','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports:module.exports,require:(path:string)=>native(path.replace('./','')),Date,Math,Number,String,Set,Map,Array});return module.exports;
}
const mirror=native('RecipeSearchCore');const nativeIndex=new mirror.RecipeSearchIndex(recipes);
for(const query of [...queries,'火星飞船xyz','川菜 火星菜','']){assert.equal(JSON.stringify(mirror.searchRecipeCatalog(nativeIndex,query)),JSON.stringify(searchRecipeCatalog(index,query)),query);}
console.log('PASS actual ArkTS mirror dependency execution parity: segmentation/pinyin/typo/ranking/fallback');
