/** Model suggestions are data, never executable tool calls or catalog identities. */
export interface GeneratedIngredient {name:string;quantity:number;unit:string;}
export interface GeneratedRecipe {name:string;people:number;minutes:number;ingredients:GeneratedIngredient[];steps:string[];costMin:number;costMax:number;kcalMin:number;kcalMax:number;proteinMin:number;proteinMax:number;assumptions:string[];}
export interface MealEstimate {name:string;portion:string;kcalMin:number;kcalMax:number;proteinMin:number;proteinMax:number;costMin:number;costMax:number;assumptions:string[];}
function text(v:unknown,max:number):v is string{return typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[<>\u0000-\u0008]/.test(v);}
function object(raw:string):Record<string,unknown>|null{try{const p=JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));return p&&typeof p==='object'&&!Array.isArray(p)?p:null;}catch{return null;}}
function range(p:Record<string,unknown>,a:string,b:string,max:number):boolean{return typeof p[a]==='number'&&typeof p[b]==='number'&&Number.isFinite(p[a])&&Number.isFinite(p[b])&&p[a]>=0&&p[b]>=p[a]&&p[b]<=max;}
function base(p:Record<string,unknown>):boolean{return text(p.name,60)&&range(p,'kcalMin','kcalMax',10000)&&range(p,'proteinMin','proteinMax',500)&&range(p,'costMin','costMax',3000)&&Array.isArray(p.assumptions)&&p.assumptions.length>=1&&p.assumptions.length<=5&&p.assumptions.every(x=>text(x,120));}
export function parseGeneratedRecipe(raw:string,people:number,maxMinutes=0,maxCost=0):GeneratedRecipe|null{
 const p=object(raw);if(!p||!base(p)||p.people!==people||!Number.isInteger(p.minutes)||Number(p.minutes)<1||Number(p.minutes)>180||maxMinutes>0&&Number(p.minutes)>maxMinutes||maxCost>0&&Number(p.costMax)>maxCost)return null;
 if(!Array.isArray(p.ingredients)||p.ingredients.length<1||p.ingredients.length>20||!p.ingredients.every(i=>i&&text(i.name,30)&&typeof i.quantity==='number'&&Number.isFinite(i.quantity)&&i.quantity>0&&i.quantity<=10000&&['g','kg','个','盒','瓶','L','袋','mL','根','片','瓣','块','只','碗','杯','把','条'].includes(i.unit)))return null;
 if(!Array.isArray(p.steps)||p.steps.length<2||p.steps.length>12||!p.steps.every(s=>text(s,240)))return null;
 // Deliberately discard model-provided URLs, IDs, HTML and unrelated fields.
 return {name:String(p.name).trim(),people,minutes:Number(p.minutes),ingredients:p.ingredients.map(i=>({name:i.name.trim(),quantity:i.quantity,unit:i.unit.trim()})),steps:p.steps as string[],costMin:p.costMin as number,costMax:p.costMax as number,kcalMin:p.kcalMin as number,kcalMax:p.kcalMax as number,proteinMin:p.proteinMin as number,proteinMax:p.proteinMax as number,assumptions:p.assumptions as string[]};
}
export function parseMealEstimate(raw:string):MealEstimate|null{
 const p=object(raw);if(!p||!base(p)||!text(p.portion,120))return null;
 return {name:String(p.name).trim(),portion:p.portion,costMin:p.costMin as number,costMax:p.costMax as number,kcalMin:p.kcalMin as number,kcalMax:p.kcalMax as number,proteinMin:p.proteinMin as number,proteinMax:p.proteinMax as number,assumptions:p.assumptions as string[]};
}
export const CREATE_INSTRUCTION='不受候选菜谱库限制，设计一份符合条件的家常菜，可优先利用已授权库存，缺少的食材列明但不要声称已拥有。只输出JSON：name,people(等于明确人数),minutes(含备菜),ingredients数组[{name,quantity正数,unit(仅g/kg/个/碗/mL等常见单位，调料用g)],steps数组(2至8步，清楚火候和熟度),costMin,costMax(整道菜人民币估算区间),kcalMin,kcalMax,proteinMin,proteinMax(每人热量大卡与蛋白质克数区间),assumptions数组(份量、生熟重、用油和地区价格假设)。不得编造来源链接；是否联网由服务工具结果决定；所有数值是估算，不是实测或实付。';
export const ESTIMATE_INSTRUCTION='估算用户描述的一人实际食用份量，不查库也可给参考，但不要虚构称重或实付。只输出JSON：name,portion(明确假设的一人份量、生熟重),kcalMin,kcalMax(大卡),proteinMin,proteinMax(克),costMin,costMax(本人人民币参考区间),assumptions数组(1至5条，包括用油、份量、地区或餐馆溢价等不确定性)。缺少重量时使用常见一人份并注明。不给确定单值，不声称检测或实时物价；是否联网由服务工具结果决定。';
