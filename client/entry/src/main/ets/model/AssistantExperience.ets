import { Recipe, Ingredient } from './Models';
import { DrawOptions, MenuResult, RecipeCost, drawMenu, estimateRecipeCost } from './UsabilityCore';
import { cookTimeline } from './KitchenWorkflowCore';
import { recipeMinutes } from './RecommendationCore';
import { buildCookingGuide, CookingGuide, GuideStep } from './CookingGuide';
export class ExperienceSection {key:string='';title:string='';lines:string[]=[];constructor(key:string,title:string,lines:string[]){this.key=key;this.title=title;this.lines=lines;}}
export function experienceSections(recipe:Recipe):ExperienceSection[]{const guide:CookingGuide=buildCookingGuide(recipe);return [new ExperienceSection('ingredients','食材',recipe.ingredients.map((i:Ingredient)=>i.name+' · '+(i.quantity>0?i.quantity+i.unit:'用量待核'))),new ExperienceSection('prepare','备菜',guide.preparation),new ExperienceSection('cook','烹饪',guide.steps.map((s:GuideStep)=>s.title+'：'+s.instruction+(s.heat?'；'+s.heat:''))),new ExperienceSection('tips','避坑',[recipe.tips,guide.note].filter((s:string)=>!!s))];}
export class ExperienceSwap {from:string='';to:string='';ratio:number=1;texture:string='';operation:string='';caution:string='';constructor(from:string,to:string,ratio:number,texture:string,operation:string,caution:string){this.from=from;this.to=to;this.ratio=ratio;this.texture=texture;this.operation=operation;this.caution=caution;}}
export const EXPERIENCE_SWAPS:ExperienceSwap[]=[new ExperienceSwap('老豆腐','嫩豆腐',1,'更滑嫩，也更容易碎','少翻动、轻推锅底，减少煎制；不用于需要定形的炸豆腐','此替换不适合炸、烤和需要坚实外壳的做法'),new ExperienceSwap('嫩豆腐','老豆腐',1,'更紧实，有嚼感','切小块，炖煮时核对汤汁；不用于要求细滑质地的蛋羹','豆制品过敏者不适用'),new ExperienceSwap('西兰花','菜花',1,'口感更脆，甜味更淡','切成相近大小，按厚度判断熟度','先确认新鲜度；时间不可直接照搬'),new ExperienceSwap('小米辣','彩椒',1,'甜脆、辣味明显降低','只替换配菜型辣椒，原菜的酱料仍需单独核对','并不保证完全无辣，不适合替代辣酱主体'),new ExperienceSwap('白胡椒','黑胡椒',0.5,'辛香更鲜明，颜色更深','从原方一半量开始，熟后少量补充','参考起点，研磨粗细会影响风味')];
export function experienceSwaps(recipe:Recipe):ExperienceSwap[]{return EXPERIENCE_SWAPS.filter((s:ExperienceSwap)=>recipe.ingredients.some((i:Ingredient)=>i.name.includes(s.from))&&!((s.from==='老豆腐')&&/炸|烤|煎/.test(recipe.name+recipe.steps.join(''))));}
export function experienceSwapDraft(recipe:Recipe,swap:ExperienceSwap):Recipe {if(!experienceSwaps(recipe).some((s:ExperienceSwap)=>s.from===swap.from&&s.to===swap.to)){throw new Error('当前菜谱不支持这项替换');}const draft:Recipe=JSON.parse(JSON.stringify(recipe)) as Recipe;draft.ingredients=draft.ingredients.map((i:Ingredient)=>{if(i.name.includes(swap.from)){i.name=i.name.replace(swap.from,swap.to);if(i.quantity>0){i.quantity=Math.round(i.quantity*swap.ratio*1000)/1000;}}return i;});draft.name=recipe.name+' · 本次替换';draft.steps=recipe.steps.map((s:string)=>s.split(swap.from).join(swap.to));draft.methodNotes=swap.operation+'；'+swap.caution;draft.estimatedCost=0;draft.costKnown=false;return draft;}
export function experienceAdjustmentOptions(recipes:Recipe[],current:string[],options:DrawOptions,kind:string):DrawOptions{
 const next:DrawOptions=JSON.parse(JSON.stringify(options)) as DrawOptions;next.attempt++;const selected:Recipe[]=recipes.filter((r:Recipe)=>current.includes(r.id));
 if(kind==='cheaper'){const costs=selected.map((r:Recipe)=>estimateRecipeCost(r,next.people));if(next.mode==='做饭'&&costs.some((c:RecipeCost)=>!c.usable)){throw new Error('当前有菜品费用待核，先确认预算再调整');}const total:number=next.mode==='外食'?next.outsidePerPerson*next.people:costs.reduce((n:number,c:RecipeCost)=>n+c.total,0);next.budget=Math.max(1,Math.floor(Math.min(next.budget||total,total)*0.85));if(next.mode==='外食'){next.outsidePerPerson=Math.floor(next.budget/next.people*100)/100;}}
 if(kind==='faster'){const currentMinutes:number=next.mode==='外食'?next.outsideOverhead:next.timeMode==='parallel'?cookTimeline(selected).parallelMinutes:selected.reduce((n:number,r:Recipe)=>n+recipeMinutes(r),0);if(!(currentMinutes>0)){throw new Error('当前餐单耗时待核');}next.minutes=Math.max(1,Math.floor(Math.min(next.minutes||currentMinutes,currentMinutes)*0.8));if(next.mode==='外食'){next.outsideOverhead=Math.min(next.outsideOverhead,next.minutes);}}
 if(kind==='mild'){next.excluded=Array.from(new Set(next.excluded.concat(['辣椒','辣酱','辣油'])));}
 if(kind==='replace'){const target:string=current.find((id:string)=>!next.lockedIds.includes(id))||'';if(!target){throw new Error('菜品均已锁定，请先解锁一道');}next.disliked=Array.from(new Set(next.disliked.concat([target])));}
 return next;
}
export function experienceAdjustMenu(recipes:Recipe[],current:string[],options:DrawOptions,kind:string):MenuResult{
 const next:DrawOptions=experienceAdjustmentOptions(recipes,current,options,kind);const working:DrawOptions=JSON.parse(JSON.stringify(next)) as DrawOptions;if(kind==='replace'){working.lockedIds=Array.from(new Set(working.lockedIds.concat(current.filter((id:string)=>!next.disliked.includes(id)))));}const result:MenuResult=drawMenu(recipes,working);if(!result.ids.length){throw new Error(result.message||'当前条件没有可替换菜品，已保留原餐单');}return result;
}
export function experiencePrompts(task:string,hasDish:boolean):string[]{if(hasDish){return ['火候怎么掌握？','这道菜能提前备哪些？'];}if(task==='meal'){return ['午餐外卖牛肉饭，28元，4星','晚餐吃了面，花了18元'];}if(task==='week'){return ['安排三天清淡晚餐主菜','安排七天家常晚餐主菜'];}if(task==='rescue'){return ['库存里哪些适合先吃？','用现有食材做一顿简单晚餐'];}return ['20分钟能做什么？','清淡的两人晚餐'];}

/** Only explicit selections are appended. Empty selections are skippable; no allergy inference. */
export function experienceQuestion(question:string,people:number,minutes:number,taste:string):string{
 const choices:string[]=[];if(people>0){choices.push(people+'人');}if(minutes>0){choices.push('备菜和烹饪共'+minutes+'分钟内');}if(['清淡','正常'].includes(taste)){choices.push(taste+'口味');}
 const prefix:string=choices.length?'本次选择：'+choices.join('，')+'。\n':'';return prefix+question.slice(0,Math.max(0,2500-prefix.length));
}
