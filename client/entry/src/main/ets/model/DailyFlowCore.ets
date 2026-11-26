import { Food, Meal, Recipe, Ingredient, dateString } from './Models';
import { canonicalName, compatibleUnit } from './RecommendationCore';
export class HouseholdMember {id:string='';name:string='';appetite:number=1;excluded:string[]=[];enabled:boolean=true;}
export class HouseholdState {members:HouseholdMember[]=[];}
export function householdExclusions(state:HouseholdState):string[]{return Array.from(new Set<string>(state.members.filter((m:HouseholdMember)=>m.enabled).flatMap((m:HouseholdMember)=>m.excluded)));}
export function householdPeople(state:HouseholdState):number{return Math.round(state.members.filter((m:HouseholdMember)=>m.enabled).reduce((n:number,m:HouseholdMember)=>n+m.appetite,0)*10)/10;}
export class DeductionLine {foodId:string='';name:string='';batch:string='';quantity:number=0;unit:string='';expiryDate:string='';cost:number=0;remaining:number=0;}
export class DeductionPreview {lines:DeductionLine[]=[];errors:string[]=[];cost:number=0;}
export function previewDeduction(recipe:Recipe,foods:Food[],today:string):DeductionPreview{
 const out:DeductionPreview=new DeductionPreview();const stock:Food[]=JSON.parse(JSON.stringify(foods)) as Food[];
 for(const i of recipe.ingredients.filter((v:Ingredient)=>!v.optional)){
  if(!Number.isFinite(i.quantity)||i.quantity<=0){out.errors.push(i.name+'用量待确认');continue;}
  let left:number=i.quantity;
  const matches:Food[]=stock.filter((f:Food)=>!f.archived&&f.quantity>0&&effectiveExpiry(f)>=today&&canonicalName(f.name)===canonicalName(i.name)&&compatibleUnit(f.unit,i.unit)>0).sort((a:Food,b:Food)=>effectiveExpiry(a).localeCompare(effectiveExpiry(b)));
  for(const f of matches){if(left<=0){break;}const take:number=Math.min(f.quantity,left/compatibleUnit(f.unit,i.unit));const line:DeductionLine=new DeductionLine();line.foodId=f.id;line.name=f.name;line.batch=f.batch;line.quantity=take;line.unit=f.unit;line.expiryDate=effectiveExpiry(f);line.cost=f.quantity>0?Math.round(f.estimatedPrice*take/f.quantity*100)/100:0;line.remaining=Math.max(0,f.quantity-take);out.lines.push(line);out.cost+=Math.round(line.cost*100);f.quantity-=take;left-=take*compatibleUnit(f.unit,i.unit);}
  if(left>0.00001){out.errors.push(i.name+'不足 '+Math.round(left*100)/100+i.unit);}
 }out.cost/=100;return out;
}
export function effectiveExpiry(food:Food):string{return food.openedExpiry&&food.openedExpiry<food.expiryDate?food.openedExpiry:food.expiryDate;}
export class QualitySummary {label:string='资料较完整';issues:string[]=[];}
export function recipeQuality(recipe:Recipe):QualitySummary{const out:QualitySummary=new QualitySummary();if(!recipe.sourceUrl){out.issues.push('来源待补充');}if(recipe.ingredients.some((i:Ingredient)=>!i.optional&&!(i.quantity>0))){out.issues.push('主料量待核实');}if(recipe.timeEstimated){out.issues.push('时间为估计');}if(!recipe.costKnown){out.issues.push('费用待核实');}if(recipe.steps.some((s:string)=>s.trim().length<8)){out.issues.push('步骤待细化');}out.label=out.issues.length?'有'+out.issues.length+'项待核对':'资料较完整';return out;}
export class SubstituteOption {original:string='';replacement:string='';factor:number=1;note:string='';constructor(original:string,replacement:string,factor:number,note:string){this.original=original;this.replacement=replacement;this.factor=factor;this.note=note;}}
export const SUBSTITUTES:SubstituteOption[]=[new SubstituteOption('西兰花','菜花',1,'口感更绵，成熟时间需看切块大小'),new SubstituteOption('青菜','小白菜',1,'叶片更软，按实际熟度出锅'),new SubstituteOption('老豆腐','豆干',0.8,'更紧实偏咸，原方盐和酱油需重新确认'),new SubstituteOption('嫩豆腐','内酯豆腐',1,'更易碎，适合蒸煮，翻拌轻一些'),new SubstituteOption('鸡腿肉','鸡胸肉',1,'脂肪更少也更易柴，需确认熟透'),new SubstituteOption('香菇','口蘑',1,'香气更清淡，鲜品按净重参考'),new SubstituteOption('白糖','冰糖',1,'甜度及溶解速度有差异，少量试味')];
export function substituteOptions(name:string,excluded:string[]):SubstituteOption[]{return SUBSTITUTES.filter((s:SubstituteOption)=>s.original===name&&!excluded.some((x:string)=>canonicalName(s.replacement).includes(canonicalName(x))));}
export function substitutedRecipe(recipe:Recipe,option:SubstituteOption,excluded:string[]):Recipe{
 if(excluded.some((x:string)=>canonicalName(option.replacement).includes(canonicalName(x)))){throw new Error('替代食材与忌口冲突');}
 const out:Recipe=JSON.parse(JSON.stringify(recipe)) as Recipe;out.id='';out.version=0;out.familyId='';out.name=(recipe.name+' · '+option.replacement+'版').slice(0,200);out.ingredients=out.ingredients.map((i:Ingredient)=>{if(i.name===option.original){i.name=option.replacement;i.quantity=Math.round(i.quantity*option.factor*100)/100;i.quantitySource='示例主体替代建议，制作前确认';}return i;});out.steps=out.steps.map((s:string)=>s.split(option.original).join(option.replacement));out.methodNotes=(out.methodNotes||'')+'\n示例主体替代：'+option.note;return out;
}
export class MealFinance {food:number=0;delivery:number=0;discount:number=0;people:number=1;share:number=1;}
export class FinanceTotal {total:number=0;personal:number=0;others:number=0;}
export function mealFinance(value:MealFinance):FinanceTotal{if([value.food,value.delivery,value.discount,value.people,value.share].some((n:number)=>!Number.isFinite(n))||value.food<0||value.delivery<0||value.discount<0||!Number.isInteger(value.people)||value.people<1||value.people>100||!Number.isInteger(value.share)||value.share<1||value.share>value.people){throw new Error('请核对金额与分摊人数');}const cents:number=Math.round(value.food*100)+Math.round(value.delivery*100)-Math.round(value.discount*100);if(cents<0){throw new Error('优惠不能超过餐费和配送费合计');}const out:FinanceTotal=new FinanceTotal();out.total=cents/100;out.personal=Math.floor(cents*value.share/value.people)/100;out.others=(cents-Math.floor(cents*value.share/value.people))/100;return out;}
export class TrialNotes {outcome:string='未评价';actualMinutes:number=0;substitution:string='';failure:string='';}
export function trialText(value:TrialNotes):string{const lines:string[]=[];if(value.outcome!=='未评价'){lines.push('试做：'+value.outcome);}if(value.actualMinutes>0){lines.push('实际用时：'+value.actualMinutes+'分钟');}if(value.substitution.trim()){lines.push('替代材料：'+value.substitution.trim().slice(0,200));}if(value.failure.trim()){lines.push('经验：'+value.failure.trim().slice(0,400));}return lines.join('\n');}
export class UndoAction {id:string='';kind:string='';entityId:string='';before:string='';after:string='';createdAt:number=0;}
export class SyncState {pending:number=0;blocked:number=0;photos:number=0;conflicts:number=0;lastSuccess:string='';}
