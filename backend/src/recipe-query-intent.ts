import { CoreRecipe, CoreIngredient, recipeMinutes } from './recommend-core';
import { equivalentText } from './recipe-discovery-core';

/** Only explicit, supported constraints are extracted; unsupported exclusions fail visibly. */
export class RecipeQueryIntent {
 text: string = ''; excludedIngredients: string[] = []; requiredIngredients: string[] = [];
 nonSpicy: boolean = false; maxMinutes: number = 0; hasTimeLimit: boolean = false;
 explanations: string[] = []; invalidReason: string = '';
}
function chineseNumber(value: string): number {
 if(/^\d+(?:\.\d+)?$/.test(value)){return Number(value);}if(value==='半'){return 0.5;}
 const normalized: string=value.replace(/两/g,'二').replace(/〇/g,'零');const digits: string='零一二三四五六七八九';
 if(!/[十百]/.test(normalized)){let arabic: string='';for(const char of normalized){const digit: number=digits.indexOf(char);if(digit<0){return NaN;}arabic+=String(digit);}return Number(arabic);}
 let sum: number=0;let digit: number=0;
 for(const char of normalized){const known: number=digits.indexOf(char);if(known>=0){digit=known;}else if(char==='十'||char==='百'){sum+=(digit||1)*(char==='十'?10:100);digit=0;}else{return NaN;}}
 return sum+digit;
}
class IngredientPhrase { consumed: number = 0; names: string[] = []; incomplete: boolean = false; }
function ingredientPrefix(text: string,at: number,names: string[]): string | undefined {
 const exact: string | undefined=names.find((candidate: string)=>text.startsWith(candidate,at));if(exact){return exact;}
 // Generic ingredient names can occur inside compound metadata, e.g. 花生 in 花生油.
 for(let end: number=Math.min(text.length,at+20);end>at;end--){const part: string=text.slice(at,end);if((part.length>=2||'糖盐油葱姜蒜蛋奶虾鱼蟹米'.includes(part))&&/^[\u4e00-\u9fff]+$/.test(part)&&names.some((name: string)=>name.includes(part))){return part;}}
 return undefined;
}
function ingredientPhrase(text: string,names: string[]): IngredientPhrase {
 const out: IngredientPhrase=new IngredientPhrase();let at: number=0;
 while(at<text.length){
  const name: string | undefined=ingredientPrefix(text,at,names);
  if(!name){break;}out.names.push(name);at+=name.length;out.consumed=at;
  const separator: RegExpMatchArray | null=text.slice(at).match(/^(?:和|及|与|、)/);
  if(separator){at+=separator[0].length;if(!ingredientPrefix(text,at,names)){out.incomplete=true;break;}}
 }
 return out;
}
export function parseRecipeQuery(query: string,ingredientNames: string[]): RecipeQueryIntent {
 const out: RecipeQueryIntent=new RecipeQueryIntent();let text: string=equivalentText(query).replace(/\s*(和|及|与|、)\s*/g,'$1');
 const names: string[]=ingredientNames.map((name: string) => equivalentText(name)).filter((name: string,i: number,all: string[]) => !!name&&all.indexOf(name)===i).sort((a: string,b: string) => b.length-a.length||a.localeCompare(b));
 text=text.replace(/(?:(?:不能吃|不要|不吃|不放|不加)\s*辣|不辣|无辣)(?!椒|酱|油|粉|子)/g,()=>{out.nonSpicy=true;return ' ';});
 const applyTime=(amount: string,unit: string): string=>{const minutes: number=chineseNumber(amount)*(unit==='小时'?60:1);if(!Number.isFinite(minutes)||minutes<=0||minutes>1440){out.invalidReason='时间需大于0且不超过1440分钟';}else{out.maxMinutes=out.hasTimeLimit?Math.min(out.maxMinutes,minutes):minutes;out.hasTimeLimit=true;}return ' ';};
 text=text.replace(/(?:不超过|最多|限时)\s*([零〇一二两三四五六七八九十百半\d.]+)\s*(分钟|小时)/g,(_whole: string,amount: string,unit: string)=>applyTime(amount,unit));
 text=text.replace(/([零〇一二两三四五六七八九十百半\d.]+)\s*(分钟|小时)\s*(?:以内|之内|以下|内)(?:做好|做完|完成)?/g,(_whole: string,amount: string,unit: string)=>applyTime(amount,unit));
 text=text.replace(/(?:不要|不吃|不放|不加|不含|不能吃|不用|去掉|没有|没)\s*([^，,。；;\s]+)/g,(whole: string,tail: string)=>{
  const phrase: IngredientPhrase=ingredientPhrase(tail,names);
  if(!phrase.names.length||phrase.incomplete){out.invalidReason='未能确认要排除的原料，请使用具体原料名称';return whole;}
  for(const name of phrase.names){if(!out.excludedIngredients.includes(name)){out.excludedIngredients.push(name);}}
  return ' '+tail.slice(phrase.consumed);
 });
 text=text.replace(/(?:含有|有(?!机)|用)\s*([^，,。；;\s]+)/g,(whole: string,tail: string)=>{
  const phrase: IngredientPhrase=ingredientPhrase(tail,names);if(!phrase.names.length||phrase.incomplete){out.invalidReason='未能确认要包含的原料，请使用具体原料名称';return whole;}
  for(const name of phrase.names){if(!out.requiredIngredients.includes(name)){out.requiredIngredients.push(name);}}
  return ' '+tail.slice(phrase.consumed);
 });
 text=text.replace(/(?:我想吃|我想做|想吃|想做|帮我找|给我找|来一道|做一道)/g,' ').replace(/(?:的菜谱|的做法|的菜)(?=$|[\s，,。；;])/g,' ').replace(/(?:并且|而且|同时)/g,' ').replace(/(^|[\s，,。；;])的/g,'$1').replace(/[，,。；;]+/g,' ').replace(/\s+/g,' ').trim();
 out.text=text;
 if(out.nonSpicy){out.explanations.push('不辣');}if(out.hasTimeLimit){out.explanations.push(out.maxMinutes+'分钟内');}
 if(out.requiredIngredients.length){out.explanations.push('需要'+out.requiredIngredients.join('、'));}if(out.excludedIngredients.length){out.explanations.push('排除'+out.excludedIngredients.join('、'));}
 if(out.requiredIngredients.some((name: string)=>out.excludedIngredients.some((excluded: string)=>name.includes(excluded)))){out.invalidReason='同一原料同时被要求包含和排除，请调整搜索条件';}
 return out;
}
export function matchesRecipeQueryIntent(recipe: CoreRecipe,intent: RecipeQueryIntent): boolean {
 if(intent.invalidReason){return false;}
 if(intent.hasTimeLimit&&(recipeMinutes(recipe)<=0||recipeMinutes(recipe)>intent.maxMinutes)){return false;}
 if(intent.nonSpicy&&(!recipe.taste||/辣|麻/.test(recipe.taste)||recipe.ingredients.some((i: CoreIngredient)=>/辣椒|小米辣|朝天椒|辣酱|豆瓣酱|辣油|红油|剁椒|泡椒|青椒|尖椒|花椒|胡椒/.test(i.name)))){return false;}
 if(intent.excludedIngredients.some((word: string)=>recipe.ingredients.some((i: CoreIngredient)=>equivalentText(i.name).includes(word))||equivalentText(recipe.name).includes(word))){return false;}
 if(!intent.requiredIngredients.every((word: string)=>recipe.ingredients.some((i: CoreIngredient)=>equivalentText(i.name).includes(word)))){return false;}
 return true;
}
