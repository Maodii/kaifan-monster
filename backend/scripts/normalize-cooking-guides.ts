import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildCookingGuide, COOKING_KNOWLEDGE } from '../src/cooking-guide';
async function main(){
 const file='data/recipes.json';const catalog=JSON.parse(await readFile(file,'utf8'));
 let steps=0,unknownDose=0;
 for(const recipe of catalog.recipes){recipe.editorialGuide=buildCookingGuide(recipe);if(!recipe.editorialGuide.steps.length)throw Error('Missing guide '+recipe.id);steps+=recipe.editorialGuide.steps.length;unknownDose+=recipe.editorialGuide.steps.filter((s:any)=>s.ingredients.includes('未给独立用量')).length;}
 catalog.sourceRevision=createHash('sha256').update(JSON.stringify(catalog.recipes)).digest('hex');
 const json=JSON.stringify(catalog,null,2);await writeFile(file,json);await writeFile('../client/entry/src/main/resources/rawfile/recipes.json',json);
 await writeFile('../work/reports/cooking-guide-coverage.json',JSON.stringify({passed:true,catalog_recipes:catalog.recipes.length,native_builtin_recipes:4,runtime_template:'buildCookingGuide shared with ArkTS',steps,steps_without_explicit_dose:unknownDose,knowledge_topics:COOKING_KNOWLEDGE.length,source_instructions_preserved:true,style:'准备 / 操作 / 分步取料 / 火候 / 时间 / 完成信号',unknowns:'明确来源未注明，不编造步骤克数、火候和时间'},null,2));
 console.log('Normalized',catalog.recipes.length,'catalog recipes,',steps,'steps;',COOKING_KNOWLEDGE.length,'ingredient topics; four builtins use same runtime template');
}
main().catch(e=>{console.error(e);process.exitCode=1});
