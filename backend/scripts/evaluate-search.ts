import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { CoreRecipe, recipeMinutes } from '../src/recommend-core';
import { RecipeSearchIndex, searchRecipeCatalog } from '../src/recipe-search-core';
export interface SearchEvaluationCase { query: string; expectedTopNames?: string[]; forbiddenIngredients?: string[]; requiredIngredients?: string[]; nonSpicy?: boolean; maxMinutes?: number; expectedMode?: string; expectNonEmpty?: boolean; }
const recipes:CoreRecipe[]=JSON.parse(readFileSync('data/recipes.json','utf8')).recipes;
const cases:SearchEvaluationCase[]=JSON.parse(readFileSync('test/search-evaluation-cases.json','utf8'));
const index=new RecipeSearchIndex(recipes);const durations:number[]=[];let successes=0;let retrievalCases=0;let top3=0;let reciprocalRank=0;let constraintCases=0;let constraintSuccesses=0;
const details=cases.map(test=>{
 const start=performance.now();const result=searchRecipeCatalog(index,test.query);durations.push(performance.now()-start);
 const checks:boolean[]=[];
 if(test.expectedTopNames){retrievalCases++;const rank=result.recipes.findIndex(recipe=>test.expectedTopNames!.includes(recipe.name));const hit=result.mode==='matched'&&rank>=0&&rank<3;if(hit)top3++;if(result.mode==='matched'&&rank>=0)reciprocalRank+=1/(rank+1);checks.push(hit);}
 const constraints:boolean[]=[];
 if(test.forbiddenIngredients){constraints.push(result.recipes.every(recipe=>recipe.ingredients.every(ingredient=>!test.forbiddenIngredients!.some(word=>ingredient.name.includes(word)))));}
 if(test.requiredIngredients){constraints.push(result.recipes.every(recipe=>test.requiredIngredients!.every(word=>recipe.ingredients.some(ingredient=>ingredient.name.includes(word)))));}
 if(test.maxMinutes!==undefined){constraints.push(result.recipes.every(recipe=>recipeMinutes(recipe)>0&&recipeMinutes(recipe)<=test.maxMinutes!));}
 if(test.nonSpicy){constraints.push(result.recipes.every(recipe=>!!recipe.taste&&!/辣|麻/.test(recipe.taste)&&!recipe.ingredients.some(ingredient=>/辣椒|小米辣|朝天椒|辣酱|豆瓣酱|辣油|红油|剁椒|泡椒|青椒|尖椒|花椒|胡椒/.test(ingredient.name))));}
 if(constraints.length){constraintCases++;if(constraints.every(Boolean)&&(!test.expectNonEmpty||result.recipes.length>0))constraintSuccesses++;checks.push(...constraints);}
 if(test.expectedMode){checks.push(result.mode===test.expectedMode);}if(test.expectNonEmpty){checks.push(result.recipes.length>0);}
 const pass=checks.every(Boolean);if(pass)successes++;return {query:test.query,pass,mode:result.mode,top:result.recipes.slice(0,3).map(recipe=>recipe.name)};
});
durations.sort((a,b)=>a-b);
const report={cases:cases.length,passed:successes,top3Recall:top3/retrievalCases,meanReciprocalRank:reciprocalRank/retrievalCases,constraintPassRate:constraintSuccesses/constraintCases,p95Milliseconds:Math.round(durations[Math.ceil(durations.length*0.95)-1]*100)/100,details};
const output=process.argv.slice(2).find(value=>!value.startsWith('--'));
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--check')&&successes!==cases.length)process.exitCode=1;
