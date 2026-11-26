import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { CoreRecipe, RankingOptions, rankPersonalized, matchesRankingConstraints } from '../src/recommend-core';
import { MenuRecipe } from '../src/usability-core';
import { CUISINE_GROUPS, searchRecipe, compareRecipeOrder, groupRecipeVariants, recipeGroupKey, recipeCuisineGroup } from '../src/recipe-discovery-core';
import { RecipeFilterOptions, matchesRecipeFilter } from '../src/recipe-filter-core';

const egg: MenuRecipe={id:'egg',name:'西红柿炒鸡蛋',aliases:['番茄炒蛋'],region:'广东',cuisine:'广东',category:'家常菜',taste:'酸甜',minutes:15,people:2,estimatedCost:6,ingredients:[{name:'番茄',quantity:200,unit:'g'},{name:'鸡蛋',quantity:2,unit:'个'}]};
const soup: MenuRecipe={...egg,id:'soup',name:'番茄鸡蛋汤',aliases:[],category:'汤类',minutes:30,estimatedCost:9};
assert(searchRecipe(egg,'  西红柿   鸡蛋，粤菜 ').matched);
assert(searchRecipe(egg,'番茄炒蛋').matched);
assert(searchRecipe({...egg,aliases:[]},'番茄炒蛋').matched);
assert(searchRecipe({...egg,aliases:['Tomato Egg']},' ＴＯＭＡＴＯ  egg ').matched);
assert(searchRecipe({...egg,name:'土豆炖牛肉',ingredients:[]},'马铃薯').matched);
assert(searchRecipe(egg,'西红柿炒鸡蛋').score>searchRecipe(soup,'西红柿炒鸡蛋').score);
assert(searchRecipe(egg,'鸡蛋').score<searchRecipe({...egg,name:'鸡蛋'},'鸡蛋').score);
assert(!searchRecipe(egg,'番茄 牛肉').matched);
assert(!searchRecipe({...egg,name:'甲',region:'乙',cuisine:'',ingredients:[]},'甲乙').matched);
assert(!searchRecipe({...egg,region:undefined,cuisine:undefined},'undefined').matched);
assert(searchRecipe(egg,' \t\n，').matched);
assert.deepEqual(searchRecipe(egg,'番茄 番茄'),searchRecipe(egg,'番茄'));
assert(!searchRecipe({...egg,name:'鸡蛋汤',aliases:[],ingredients:[{name:'鸡蛋',quantity:1,unit:'个'}]},'西红柿').matched);
console.log('PASS search: whitespace/fullwidth/case, AND terms, aliases, field boundaries, relevance, no invented fields');

assert.equal(CUISINE_GROUPS.length,9);
assert.equal(recipeCuisineGroup(egg),'粤菜');
assert.equal(recipeCuisineGroup({...egg,cuisine:'川菜',region:'广东'}),'川菜');
assert.equal(recipeCuisineGroup({...egg,cuisine:'',region:'东北'}),'其他地方菜');
for (const value of ['通用家常','异国风味','未知','']) { assert.equal(recipeCuisineGroup({...egg,region:value,cuisine:value}),''); }
const filters=new RecipeFilterOptions(); filters.cuisines=['粤菜']; filters.categories=['家常菜']; filters.occasions=['dinner']; filters.search='番茄 鸡蛋';
assert(matchesRecipeFilter(egg,filters));
assert(!matchesRecipeFilter({...egg,region:'',cuisine:''},filters));
filters.cuisines=['川菜']; assert(!matchesRecipeFilter(egg,filters));
filters.cuisines=['粤菜']; filters.categories=['汤类']; assert(!matchesRecipeFilter(egg,filters));
console.log('PASS nine product groups: independent cuisine/category/meal dimensions; unknown/generic/foreign remain unclassified');

const unknown: MenuRecipe={id:'unknown',name:'未知',ingredients:[],costKnown:false};
assert.equal(compareRecipeOrder({...unknown,prepMinutes:5},egg,'耗时升序'),1);
for (const order of ['价格升序','价格降序','耗时升序','耗时降序']) {
 const rows=[unknown,soup,egg].sort((a,b)=>compareRecipeOrder(a,b,order));
 assert.equal(rows[2].id,'unknown'); assert.equal(rows[0].id,order.endsWith('降序')?'soup':'egg');
 assert(Number.isFinite(compareRecipeOrder(unknown,{...unknown,id:'other'},order)));
}
assert.equal(compareRecipeOrder(egg,{...egg,id:'variant'},'推荐'),0);
assert(compareRecipeOrder(egg,soup,'推荐','西红柿炒鸡蛋')<0);
assert.deepEqual([soup,egg].sort((a,b)=>compareRecipeOrder(a,b,'综合排序')).map(r=>r.id),[egg,soup].sort((a,b)=>compareRecipeOrder(a,b,'综合排序')).map(r=>r.id));
const inferred: MenuRecipe={...egg,id:'inferred',costKnown:false,estimatedCost:0};
assert(compareRecipeOrder(inferred,unknown,'价格降序')<0);
console.log('PASS sorting: both directions, known/inferred cost, unknowns last, finite comparator, stable complete-library ties');

const red: CoreRecipe[]=['徽派红烧肉','湖南家常红烧肉','南派红烧肉','简易红烧肉'].map((name,i)=>({id:'red'+i,name,ingredients:[]}));
const groups=groupRecipeVariants([...red,egg,soup]);
assert.equal(groups.length,3); assert.deepEqual(groups[0].recipes.map(r=>r.id),red.map(r=>r.id)); assert.equal(groups[0].recipes[0],red[0]);
assert.equal(recipeGroupKey(egg),recipeGroupKey({...egg,name:'番茄炒蛋'}));
assert.notEqual(recipeGroupKey(egg),recipeGroupKey(soup));
assert.notEqual(recipeGroupKey({...egg,name:'煎鸡蛋'}),recipeGroupKey({...egg,name:'蒸鸡蛋'}));
assert.notEqual(recipeGroupKey({...egg,name:'土豆炖牛肉'}),recipeGroupKey({...egg,name:'土豆炖牛肉（咖喱版）'}));
assert.equal(recipeGroupKey({...egg,dishGroupId:'explicit-dish'}),recipeGroupKey({...soup,dishGroupId:'explicit-dish'}));
assert.equal(groupRecipeVariants([egg,{...egg,id:'second-source'}])[0].recipes.length,2);
console.log('PASS grouping: all independent IDs and object references retained, explicit ID wins, conservative cooking-style boundaries');

const now=Date.parse('2026-11-04T12:00:00+08:00');
const repeated: CoreRecipe={id:'repeated',name:'蛋羹',ingredients:[{name:'鸡蛋',quantity:2,unit:'个'},{name:'鸡蛋',quantity:1,unit:'个'}]};
const stock=[{name:'鸡蛋',quantity:2,unit:'个',expiryDate:'2026-11-05'}];
const options=new RankingOptions();options.learning=false;
const coverage=rankPersonalized([repeated],stock,[],[],options,now)[0];
assert.equal(coverage.coverage,0);assert.equal(coverage.missing.length,1);assert.equal(coverage.missing[0].quantity,1);
assert.equal(repeated.ingredients[0].quantity,2);
for(const quantity of [NaN,Infinity,0,-1]) {
 const row=rankPersonalized([{...repeated,ingredients:[{name:'鸡蛋',quantity,unit:'个'}]}],stock,[],[],options,now)[0];
 assert.equal(row.coverage,0);assert.equal(row.missing[0].unknown,true);assert(Number.isFinite(row.score));
}
for(const expiryDate of ['2026-02-30','','invalid','2026-11-03']) {assert.equal(rankPersonalized([repeated],[{...stock[0],quantity:4,expiryDate}],[],[],options,now)[0].coverage,0);}
assert.equal(rankPersonalized([repeated],[{...stock[0],quantity:Infinity}],[],[],options,now)[0].coverage,0);
const recentMeal=[{date:'2026-11-03',recipeId:'red0',name:'徽派红烧肉'}];
assert(rankPersonalized(red,[],recentMeal,[],options,now).every(r=>r.recent));
assert.equal(rankPersonalized(red,[],[{...recentMeal[0],date:'2030-01-01'}],[],options,now).some(r=>r.recent),false);
const bounded=Object.assign(new RankingOptions(),{learning:false,batch:9});
for(const row of rankPersonalized(red,[],[],[],bounded,now)){const initial=rankPersonalized(red,[],[],[],options,now).find(r=>r.recipeId===row.recipeId)!;assert(Math.abs(row.score-initial.score)<=3);}
options.excluded=['番茄'];assert(!matchesRankingConstraints(egg,options));
options.excluded=['鸡蛋'];assert(!matchesRankingConstraints({...egg,ingredients:[]},options));
options.excluded=[];assert.equal(red.filter(r=>matchesRankingConstraints(r,options)).length,red.length);
console.log('PASS recommendation: aggregate quantities, unknown/invalid stock, variant-aware recent penalties, bounded deterministic rotation, shared hard exclusions');

const catalog: CoreRecipe[]=JSON.parse(readFileSync('data/recipes.json','utf8')).recipes;
const catalogGroups=groupRecipeVariants(catalog);
assert.equal(catalogGroups.reduce((sum,g)=>sum+g.recipes.length,0),catalog.length);
assert.equal(new Set(catalogGroups.flatMap(g=>g.recipes.map(r=>r.id))).size,catalog.length);
assert(catalogGroups.some(g=>g.recipes.length===4&&g.recipes.every(r=>r.name.includes('红烧肉'))));
const counts=CUISINE_GROUPS.map(g=>[g.id,catalog.filter(r=>recipeCuisineGroup(r)===g.id).length]);
assert(counts.every(([,count])=>Number(count)>0));
assert(catalog.some(r=>searchRecipe(r,'番茄 鸡蛋').matched));
console.log('PASS real 450-recipe catalog: lossless grouping and all nine cuisine groups:',counts);

// Execute the actual ArkTS mirror modules, with their real dependency graph, for parity.
const modules: Record<string,Record<string,any>>={};
function native(name: string): Record<string,any> {
 if(modules[name])return modules[name];
 const source=readFileSync('../client/entry/src/main/ets/model/'+name+'.ets','utf8');
 const module={exports:{} as Record<string,any>};modules[name]=module.exports;
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports:module.exports,require:(path:string)=>native(path.replace('./','')),Date,Math,Number,String,Set,Map,Array});
 return module.exports;
}
const discovery=native('RecipeDiscoveryCore');
for(const query of ['番茄 鸡蛋','粤菜','ＴＯＭＡＴＯ',' \t','甲乙']) {assert.equal(JSON.stringify(discovery.searchRecipe(egg,query)),JSON.stringify(searchRecipe(egg,query)));}
assert.equal(JSON.stringify(native('RecommendationCore').rankPersonalized([repeated],stock,[],[],options,now)),JSON.stringify(rankPersonalized([repeated],stock,[],[],options,now)));
assert.equal(native('RecipeFilterCore').matchesRecipeFilter(egg,filters),matchesRecipeFilter(egg,filters));
assert.equal(discovery.compareRecipeOrder(soup,egg,'耗时降序'),compareRecipeOrder(soup,egg,'耗时降序'));
assert.equal(JSON.stringify(discovery.groupRecipeVariants(red)),JSON.stringify(groupRecipeVariants(red)));
console.log('PASS actual ArkTS mirror execution parity: search, sorting, grouping, filters and recommendations');
