import { canonicalName } from './recommend-core';
import { estimateRecipeCost } from './usability-core';
/** Catalog rules enforce constraints; model prose never controls IDs or writes. */
export interface AssistantOptions {task?:string;people?:number;maxMinutes?:number;maxCost?:number;excluded?:string[];region?:string;startDate?:string;days?:number;}
export interface CatalogRecipe {id:string;payload:{name?:string;category?:string;taste?:string;dishGroupId?:string;minutes?:number;people?:number;estimatedCost?:number;costKnown?:boolean;region?:string;ingredients?:{name:string}[];steps?:string[];};}
export interface AssistantFood {name:string;expiryDate?:string;openedExpiry?:string;quantity?:number;archived?:boolean;}
export interface WorkflowReference {id:string;name:string;minutes:number;estimatedCost:number;}
export interface PlanSuggestion {recipeId:string;name:string;date:string;occasion:string;people:number;minutes:number;estimatedCost:number;}
export interface MealSuggestion {name:string;mealType:string;diningMode:string;estimatedCost:number;calories:number;rating:number;place:string;}
export function validDay(value:string):boolean{return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function chinaDay():string{return new Date(Date.now()+8*3600000).toISOString().slice(0,10);}
export function nextDay(day:string,n:number):string{return new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);}
export function activeFoods(foods:AssistantFood[],today:string):{foods:AssistantFood[],expiredExcluded:number}{
 let expiredExcluded=0;
 const safe=foods.filter(f=>{if(f.archived||!f.name||!Number.isFinite(Number(f.quantity))||Number(f.quantity)<=0)return false;
  const dates=[f.expiryDate,f.openedExpiry].filter((d):d is string=>!!d&&validDay(d));
  // Unknown expiration is retained without claiming that it is safe to eat.
  if(dates.some(d=>d<today)){expiredExcluded++;return false;}return true;
 });
 const expiry=(f:AssistantFood)=>[f.expiryDate,f.openedExpiry].filter((d):d is string=>!!d&&validDay(d)).sort()[0]||'9999';
 safe.sort((a,b)=>expiry(a).localeCompare(expiry(b)));return {foods:safe.slice(0,20),expiredExcluded};
}
function normalized(s:string):string{return s.normalize('NFKC').toLowerCase().replace(/\s/g,'');}
export const aliases:Record<string,string[]>={'花生':['花生','花生油','花生酱'],'牛奶':['牛奶','奶油','奶酪','黄油','乳酪'],'鸡蛋':['鸡蛋','蛋黄','蛋清','鹌鹑蛋'],'大豆':['大豆','黄豆','豆腐','豆干','豆皮','腐竹','豆浆','酱油','豆瓣酱'],'猪肉':['猪肉','五花肉','里脊','排骨','猪肝','腊肉','培根','肉末'],'海鲜':['虾','蟹','鱼','贝','蚝','蛤','鱿鱼','海鲜']};
export function recipeText(r:CatalogRecipe):string{return normalized((r.payload.name||'')+' '+(r.payload.ingredients||[]).map(i=>i.name).join(' '));}
export function selectWorkflowRecipes(rows:CatalogRecipe[],question:string,options:AssistantOptions,foods:AssistantFood[]):{references:WorkflowReference[],plans:PlanSuggestion[]}{
 const task=options.task||'ask',people=options.people||2;const light=task==='week'&&/清淡/.test(question);
 const terms=question.match(/[\u4e00-\u9fff]{2,}|[a-zA-Z]+/g)||[];
 const tokens=Array.from(new Set(terms.flatMap(t=>t.length>2&&/^[\u4e00-\u9fff]+$/.test(t)?Array.from({length:t.length-1},(_,i)=>t.slice(i,i+2)):[t]).map(normalized)));
 const excluded=(options.excluded||[]).flatMap(s=>aliases[s]||[s]).map(normalized).filter(Boolean);
 const candidates=rows.map(r=>{const text=recipeText(r),p=r.payload;const minutes=Number(p.minutes)||0;
  const estimated=estimateRecipeCost({...p,id:r.id,name:p.name||'',ingredients:(p.ingredients||[]).map(i=>({...i,quantity:Number((i as {quantity?:number}).quantity)||0,unit:String((i as {unit?:string}).unit||'g')}))},people);const cost=estimated.usable?estimated.total:-1;
  const matches=foods.reduce((n,f,i)=>n+((p.ingredients||[]).some(ingredient=>canonicalName(ingredient.name)===canonicalName(f.name))?30+(20-i):0),0);
  return {r,text,minutes,cost,matches,score:tokens.reduce((n,t)=>n+(text.includes(t)?5:0),0)+matches};
 }).filter(c=>!excluded.some(t=>c.text.includes(t)))
 .filter(c=>task!=='week'||!c.r.payload.category||['家常菜','大菜','主食'].includes(c.r.payload.category))
 .filter(c=>!light||c.r.payload.taste==='清淡')
 .filter(c=>!options.maxMinutes||(c.minutes>0&&c.minutes<=options.maxMinutes))
 .filter(c=>!options.maxCost||(c.cost>=0&&c.cost<=options.maxCost))
 .filter(c=>!options.region||options.region==='不限'||(c.r.payload.region||'').includes(options.region))
 .filter(c=>task==='rescue'?c.matches>0:task==='week'||c.score>0)
 .sort((a,b)=>b.score-a.score||a.minutes-b.minutes||a.r.id.localeCompare(b.r.id));
 // Do not fill an over-constrained plan with repeated or off-policy dishes.
 const group=(c:typeof candidates[number])=>c.r.payload.dishGroupId||normalized((c.r.payload.name||'').replace(/[（(].*$/,''));
 const pool=candidates.filter((r,i,a)=>a.findIndex(x=>group(x)===group(r))===i);
 const unique:typeof candidates=[];
 const protein=(text:string)=>['牛肉','鸡肉','鸡腿','鸡胸','猪肉','排骨','鱼','虾','豆腐','鸡蛋'].find(s=>text.includes(s))||'蔬菜或其他';
 while(pool.length&&unique.length<(task==='week'?(options.days||7):3)){
  if(task==='week'){const adjusted=(c:typeof candidates[number])=>c.score-unique.filter(old=>protein(old.text)===protein(c.text)).length*25-(unique.length&&protein(unique[unique.length-1].text)===protein(c.text)?35:0);pool.sort((a,b)=>adjusted(b)-adjusted(a)||a.minutes-b.minutes||a.r.id.localeCompare(b.r.id));}
  unique.push(pool.shift()!);
 }
 const references=unique.map(c=>({id:c.r.id,name:String(c.r.payload.name||''),minutes:c.minutes,estimatedCost:c.cost}));
 const plans=task==='week'?unique.map((c,i)=>({recipeId:c.r.id,name:String(c.r.payload.name||''),date:nextDay(options.startDate||chinaDay(),i),occasion:'晚餐',people,minutes:c.minutes,estimatedCost:c.cost})):[];
 return {references,plans};
}
export function parseMealSuggestion(text:string):MealSuggestion|null{
 try{
  const raw=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const p:unknown=JSON.parse(raw);if(!p||typeof p!=='object'||Array.isArray(p))return null;const v=p as Record<string,unknown>;
  if(typeof v.name!=='string'||!v.name.trim()||v.name.length>80)return null;
  if(!['早餐','午餐','晚餐','加餐'].includes(String(v.mealType))||!['在家做','餐馆','食堂','外卖','外食'].includes(String(v.diningMode)))return null;
  const number=(key:string,max:number)=>typeof v[key]==='number'&&Number.isFinite(v[key])&&((v[key] as number)===-1||(v[key] as number)>=0)&&(v[key] as number)<=max;
  if(!number('estimatedCost',100000)||!number('calories',30000)||!number('rating',5))return null;
  if(Number(v.rating)!==-1&&(!Number.isInteger(v.rating)||Number(v.rating)<0))return null;
  if(typeof v.place!=='string'||v.place.length>80)return null;
  return {name:v.name.trim(),mealType:String(v.mealType),diningMode:String(v.diningMode),estimatedCost:Number(v.estimatedCost),calories:Number(v.calories),rating:Math.max(0,Number(v.rating)),place:v.place.trim()};
 }catch{return null;}
}
/** Numbers and locations must be explicitly present in the current utterance. */
export function groundMealSuggestion(draft:MealSuggestion,question:string):MealSuggestion{
 const money=Array.from(question.matchAll(/(?:花费?|支付|实付|人均|一共|价格|费用|[￥¥])\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:元|块)/g)).map(m=>Number(m[1]||m[2]));
 const kcal=Array.from(question.matchAll(/(\d+(?:\.\d+)?)\s*(?:千卡|大卡|kcal|卡路里)/gi)).map(m=>Number(m[1]));
 const rating=Array.from(question.matchAll(/([1-5])\s*(?:星|分)/g)).map(m=>Number(m[1]));
 return {...draft,estimatedCost:money.includes(draft.estimatedCost)?draft.estimatedCost:-1,calories:kcal.includes(draft.calories)?draft.calories:-1,rating:rating.includes(draft.rating)?draft.rating:0,place:draft.place&&question.includes(draft.place)?draft.place:''};
}
