import { cookTimeline } from './KitchenWorkflowCore';
import { CoreIngredient, CoreRecipe, CoreFood, coreExpiry, canonicalName, compatibleUnit, recipeMinutes, recipeGroupKey, excludedIngredientName } from './RecommendationCore';
import { recommendPortions, PortionOptions } from './PortionCore';
export interface MenuRecipe extends CoreRecipe { people?: number; estimatedCost?: number; costKnown?: boolean; }
export class DrawOptions {
 timeMode:string='sequential'; balance:boolean=false;
 people: number = 2; dishes: number = 2; soups: number = 1; minutes: number = 60; budget: number = 80;
 mode: string = '做饭'; outsideOverhead: number = 45; outsidePerPerson: number = 30; disliked: string[] = []; excluded: string[] = [];
 lockedIds:string[]=[]; seed: string = ''; attempt: number = 0;
}
export class DrawPreset { id:string='';label:string='';dishes:number=0;soups:number=0;constructor(id:string,label:string,dishes:number,soups:number){this.id=id;this.label=label;this.dishes=dishes;this.soups=soups;} }
export const DRAW_PRESETS:DrawPreset[]=[new DrawPreset('one-soup','一菜一汤',1,1),new DrawPreset('two-soup','两菜一汤',2,1),new DrawPreset('three-soup','三菜一汤',3,1),new DrawPreset('two-dishes','两道家常菜',2,0),new DrawPreset('one-dish','只抽一道菜',1,0),new DrawPreset('soup-only','只选一份汤',0,1)];
export function menuTitle(dishes:number,soups:number):string{return dishes===0?'一份汤':dishes+'道菜'+(soups?' + 一份汤':'');}
export class MenuAmount { name: string = ''; quantity: number = 0; unit: string = ''; optional: boolean = false; estimated: boolean = false; missing: number = 0; recipes: string[] = []; }
export class MenuResult { ids: string[] = []; minutes: number = 0; cost: number = 0; amounts: MenuAmount[] = []; message: string = ''; estimated: boolean = true; costComplete: boolean = true; }
function seedNumber(text: string): number { let n: number = 2166136261; for (let i: number = 0; i < text.length; i++) { n = Math.imul(n ^ text.charCodeAt(i),16777619); } return n >>> 0; }
export class RecipeCost { total:number=0; usable:boolean=false; inferred:boolean=true; }
export function estimateRecipeCost(r:MenuRecipe,people:number):RecipeCost {
 const out:RecipeCost=new RecipeCost();
 if(r.costKnown!==false && (r.estimatedCost||0)>0){out.total=Math.round((r.estimatedCost||0)*people/Math.max(1,r.people||2)*100)/100;out.usable=true;out.inferred=false;return out;}
 const options:PortionOptions=new PortionOptions();options.people=people;options.basePeople=r.people||2;
 const amounts=recommendPortions(r.ingredients,options);let main:number=0;
 for(const a of amounts){
  const name:string=a.name;let perKg:number=0;
  if(/盐|糖|油|醋|酱|胡椒|花椒|辣椒|料酒|葱|姜|蒜|香料|八角|桂皮|味精|鸡精/.test(name)&&a.optional){out.total+=0.4*people;continue;}
  if(/牛肉|牛腩|牛排/.test(name)){perKg=80;}else if(/羊/.test(name)){perKg=70;}else if(/虾/.test(name)){perKg=60;}else if(/蟹/.test(name)){perKg=80;}else if(/鱼|鳝/.test(name)){perKg=35;}else if(/贝|蛤|蛏|蚝/.test(name)){perKg=45;}else if(/排骨|猪骨/.test(name)){perKg=45;}else if(/猪|五花|瘦肉|里脊|肉末|肉馅/.test(name)){perKg=35;}else if(/鸡|鸭/.test(name)&&!/蛋/.test(name)){perKg=25;}else if(/蛋/.test(name)){perKg=20;}else if(/豆腐|豆干|豆皮/.test(name)){perKg=10;}else if(/奶|酸奶/.test(name)){perKg=12;}else if(/米|燕麦|杂粮|红豆|绿豆|面|粉条|粉丝/.test(name)){perKg=12;}else if(/干菇|干香菇|木耳|紫菜|菜干/.test(name)){perKg=70;}else if(/菜|菇|瓜|茄|土豆|萝卜|藕|笋|玉米|山药|洋葱|青椒|彩椒|菠菜|香芹|黄豆芽|豆角/.test(name)){perKg=10;}else if(/苹果|香蕉|柠檬/.test(name)){perKg=12;}else if(/花生|坚果/.test(name)){perKg=30;}else if(/水|清汤/.test(name)){continue;}
  if(!perKg||a.quantity<=0){if(a.optional){out.total+=0.4*people;continue;}return out;}
  let kg:number=0;
  if(a.unit==='kg'||a.unit==='L'){kg=a.quantity;}else if(['g','mL','ml','克','毫升'].includes(a.unit)){kg=a.quantity/1000;}
  else if(a.unit==='个'){kg=a.quantity*(/蛋/.test(name)?0.055:/番茄|西红柿/.test(name)?0.15:/土豆/.test(name)?0.18:/洋葱/.test(name)?0.2:0);}
  else if(a.unit==='瓣'&&/蒜/.test(name)){kg=a.quantity*0.005;}else if(a.unit==='根'&&/胡萝卜|黄瓜|玉米/.test(name)){kg=a.quantity*0.2;}else if(a.unit==='只'&&/虾/.test(name)){kg=a.quantity*0.02;}else if(a.unit==='只'&&/鸡翅/.test(name)){kg=a.quantity*0.05;}
  if(kg<=0){if(a.optional){out.total+=0.4*people;continue;}return out;}out.total+=perKg*kg;if(!a.optional){main++;}
 }
 out.total=Math.round(out.total*100)/100;out.usable=main>0&&out.total>0;return out;
}
export function scaledCost(r:MenuRecipe,people:number):number {return estimateRecipeCost(r,people).total;}
export function mergeMenuIngredients(recipes: MenuRecipe[], people: number, foods: CoreFood[] = [], today: string = ''): MenuAmount[] {
 const merged: MenuAmount[] = [];
 for (const r of recipes) {
  const opt: PortionOptions = new PortionOptions(); opt.people = people; opt.basePeople = r.people || 2;
  for (const amount of recommendPortions(r.ingredients,opt)) {
   const existing: MenuAmount | undefined = merged.find((m: MenuAmount) => canonicalName(m.name) === canonicalName(amount.name) && m.optional === amount.optional && compatibleUnit(amount.unit,m.unit) > 0);
   if (existing) { existing.quantity += amount.quantity * compatibleUnit(amount.unit,existing.unit); existing.estimated = existing.estimated || /估算/.test(amount.quantitySource); existing.recipes.push(r.name); }
   else { const m: MenuAmount = new MenuAmount(); m.name = amount.name; m.quantity = amount.quantity; m.unit = amount.unit; m.optional = amount.optional; m.estimated = /估算/.test(amount.quantitySource); m.recipes = [r.name]; merged.push(m); }
  }
 }
 for (const m of merged) {
  m.quantity = Math.round(m.quantity * 10) / 10;
  const available: number = foods.filter((f: CoreFood) => !f.archived && f.quantity > 0 && (!today || coreExpiry(f) >= today) && canonicalName(f.name) === canonicalName(m.name) && compatibleUnit(f.unit,m.unit) > 0).reduce((sum: number,f: CoreFood) => sum + f.quantity * compatibleUnit(f.unit,m.unit),0);
  m.missing = Math.round(Math.max(0,m.quantity - available) * 10) / 10;
 }
 return merged;
}
/** Bounded randomized combination search; constraints never relaxed silently. */
export function drawMenu(recipes: MenuRecipe[], options: DrawOptions, foods: CoreFood[] = [], today: string = ''): MenuResult {
 if (!['sequential','parallel'].includes(options.timeMode||'sequential') || !Number.isInteger(options.people) || options.people < 1 || options.people > 20 || !Number.isInteger(options.dishes) || options.dishes < 0 || options.dishes > 4 || (![0,1].includes(options.soups) || options.dishes+options.soups<1) || !Number.isFinite(options.minutes) || options.minutes < 0 || !Number.isFinite(options.budget) || options.budget < 0 || !['做饭','外食'].includes(options.mode) || !Number.isFinite(options.outsideOverhead) || options.outsideOverhead < 0 || !Number.isFinite(options.outsidePerPerson) || options.outsidePerPerson <= 0) { throw new Error('请检查人数、餐型、时间和整餐预算'); }
 const valid: MenuRecipe[] = recipes.filter((r: MenuRecipe) => !options.disliked.includes(r.id) && !options.excluded.some((x: string) => x && (canonicalName(r.name).includes(canonicalName(x)) || r.ingredients.some((i: CoreIngredient) => excludedIngredientName(i.name,x)))) && (options.mode === '外食' || !(options.budget > 0) || estimateRecipeCost(r,options.people).usable) && (options.mode !== '做饭' || !options.minutes || recipeMinutes(r) > 0));
 const soups: MenuRecipe[] = valid.filter((r: MenuRecipe) => r.category === '汤类');
 const dishes: MenuRecipe[] = valid.filter((r: MenuRecipe) => r.category !== '汤类' && r.category !== '粥类' && r.category !== '甜点' && r.category !== '饮品' && r.category !== '主食' && r.category !== '早餐');
 const result: MenuResult = new MenuResult();
 const locked:MenuRecipe[]=(options.lockedIds||[]).map((id:string)=>valid.find((r:MenuRecipe)=>r.id===id)).filter((r:MenuRecipe|undefined)=>r!==undefined) as MenuRecipe[];
 if(locked.length!==(options.lockedIds||[]).length||new Set(options.lockedIds||[]).size!==locked.length||new Set(locked.map((r:MenuRecipe)=>recipeGroupKey(r))).size!==locked.length||locked.filter((r:MenuRecipe)=>r.category==='汤类').length>options.soups||locked.filter((r:MenuRecipe)=>r.category!=='汤类').some((r:MenuRecipe)=>!dishes.some((d:MenuRecipe)=>d.id===r.id))||locked.filter((r:MenuRecipe)=>r.category!=='汤类').length>options.dishes){result.message='锁定菜品与当前筛选或餐型不兼容，请先解锁。';return result;}
 if (dishes.length < options.dishes || soups.length < options.soups) { result.message = '符合条件的菜或汤不足。可调整忌口、预算，或更换餐型；不喜欢的菜仍会排除。'; return result; }
 let seed: number = seedNumber(options.seed + '|' + options.attempt + '|' + options.mode + '|' + options.people);
 const random = (): number => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; };
 for (let trial: number = 0; trial < 2400; trial++) {
  const selected: MenuRecipe[] = locked.slice(); const used: string[] = locked.map((r:MenuRecipe)=>recipeGroupKey(r));
  for (let n: number = locked.filter((r:MenuRecipe)=>r.category!=='汤类').length; n < options.dishes; n++) { const pool: MenuRecipe[] = dishes.filter((r: MenuRecipe) => !used.includes(recipeGroupKey(r))); if(!pool.length){break;}const r: MenuRecipe = pool[Math.floor(random() * pool.length)]; selected.push(r); used.push(recipeGroupKey(r)); }
  if(selected.filter((r:MenuRecipe)=>r.category!=='汤类').length!==options.dishes){continue;}
  if (options.soups&&!locked.some((r:MenuRecipe)=>r.category==='汤类')) { selected.push(soups[Math.floor(random() * soups.length)]); }
  const minutes: number = options.mode === '做饭' ? (options.timeMode==='parallel'?cookTimeline(selected).parallelMinutes:selected.reduce((sum: number,r: MenuRecipe) => sum + recipeMinutes(r),0)) : options.outsideOverhead;
  const cost: number = options.mode === '外食' ? Math.round(options.outsidePerPerson * options.people * 100) / 100 : Math.round(selected.reduce((sum: number,r: MenuRecipe) => sum + scaledCost(r,options.people),0) * 100) / 100;
  if ((options.minutes > 0 && minutes > options.minutes) || (options.budget > 0 && cost > options.budget)) { continue; }
  if(options.balance&&options.dishes>=2){const mains:MenuRecipe[]=selected.filter((r:MenuRecipe)=>r.category!=='汤类');const meat=(r:MenuRecipe):boolean=>r.ingredients.some((i:CoreIngredient)=>/肉|鸡|鸭|鱼|虾|牛|羊|排骨/.test(i.name));if(!mains.some(meat)||!mains.some((r:MenuRecipe)=>!meat(r))){continue;}}
  result.costComplete = options.mode === '外食' || selected.every((r:MenuRecipe)=>estimateRecipeCost(r,options.people).usable);
  result.ids = selected.map((r: MenuRecipe) => r.id); result.minutes = minutes; result.cost = cost;
  result.amounts = mergeMenuIngredients(selected,options.people,foods,today);
  result.message = options.mode === '做饭' ? (options.timeMode==='parallel'?'双灶估时需独立锅具且能安全照看；未知拆分按保守值计算。':'')+'时间按所选模式参考，含各菜备料；并行操作可能更快。费用按菜谱记录或食材与调味基础单价规则估算，非实时行情；城市、季节及购买规格会影响价格。' : '外食菜名仅作点菜灵感；时间采用你设置的往返、候餐与用餐总时间，费用采用你设置的人均消费估计，非餐馆实时报价。';
  return result;
 }
 result.message = '暂未抽到同时符合时间与预算的整餐。可增加时间或预算再试，或减少菜数；不会自动突破条件。'; return result;
}
export interface HistoryFood extends CoreFood { purchasedQuantity?: number; purchasePrice?: number; estimatedPrice?: number; consumedCost?: number; wastedCost?: number; }
export function purchaseCost(food: HistoryFood): number { return food.purchasePrice !== undefined && food.purchasePrice >= 0 ? food.purchasePrice : Math.round(((food.estimatedPrice || 0) + (food.consumedCost || 0) + (food.wastedCost || 0)) * 100) / 100; }
