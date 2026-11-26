import { CoreIngredient } from './RecommendationCore';
export interface PortionIngredient extends CoreIngredient { amountText?: string; quantitySource?: string; quantityBasis?: string; }
export class PortionAmount { name: string = ''; quantity: number = 0; unit: string = ''; optional: boolean = false; amountText: string = ''; quantitySource: string = ''; quantityBasis: string = ''; }
export class PortionOptions { people: number = 2; basePeople: number = 2; appetite: number = 1; seasoning: string = '标准'; spice: string = '原方'; }
function infer(name: string, people: number, proteinCount: number, vegetableCount: number): PortionAmount {
 const out: PortionAmount = new PortionAmount();out.name=name;out.unit='g';out.quantitySource='推荐估算';out.quantityBasis='食库两人餐分量经验规则；制作前按实际情况确认；不是营养处方';
 if (/盐/.test(name)) { out.quantity=people;out.optional=true; }
 else if (/食用油|植物油|花生油|菜籽油|橄榄油|香油|黄油|猪油|^油$/.test(name)) { out.quantity=people*7;out.optional=true; }
 else if (/糖|蜂蜜/.test(name)) { out.quantity=people*3;out.optional=true; }
 else if (/生抽|老抽|酱油|蚝油|醋|料酒/.test(name)) { out.quantity=people*5;out.unit='mL';out.optional=true; }
 else if (/辣椒|花椒|胡椒|八角|桂皮|香叶|香料/.test(name)) { out.quantity=people*2;out.optional=true; }
 else if (/葱|姜|蒜|香菜/.test(name)) { out.quantity=people*8;out.optional=true; }
 else if (/水|高汤|清汤/.test(name)) { out.quantity=people*300;out.unit='mL';out.optional=true; }
 else if (/鸡蛋|鸭蛋|皮蛋/.test(name)) { out.quantity=people;out.unit='个'; }
 else if (/肉|鸡|鸭|鱼|虾|牛|羊|猪|排骨|鳝|蟹|贝|蚝|蛏/.test(name)) { out.quantity=people*150/Math.max(1,proteinCount); }
 else if (/豆腐|豆干|豆皮/.test(name)) { out.quantity=people*120; }
 else if (/面粉|面条|米线|意面|粉丝|河粉|粉条/.test(name)) { out.quantity=people*80; }
 else if (/冷饭|米饭|熟饭/.test(name)) { out.quantity=people*180; }
 else if (/大米|糯米|小米|燕麦|绿豆|红豆|黑米/.test(name)) { out.quantity=people*65; }
 else if (/菜干|木耳|银耳|干香菇|紫菜|海带干/.test(name)) { out.quantity=people*8; }
 else if (/菜|菇|笋|瓜|茄|豆角|土豆|番茄|西红柿|萝卜|玉米|山药|藕|芹|莴|西兰花/.test(name)) { out.quantity=people*200/Math.max(1,vegetableCount); }
 else { out.quantity=0;out.quantityBasis='暂缺可靠分量规则，请填写实际用量'; }
 return out;
}
export function recommendPortions(items: PortionIngredient[], options: PortionOptions): PortionAmount[] {
 if (!Number.isInteger(options.people)||options.people<1||options.people>20||!Number.isFinite(options.basePeople)||options.basePeople<=0||!Number.isFinite(options.appetite)||options.appetite<0.5||options.appetite>1.5) { throw new Error('人数需为1至20，食量系数需为0.5至1.5'); }
 if (!['标准','清淡','浓郁'].includes(options.seasoning)||!['原方','不辣','微辣','重辣'].includes(options.spice)) { throw new Error('口味选项无效'); }
 const proteinCount: number = items.filter((i: PortionIngredient) => !i.optional && /肉|鸡|鸭|鱼|虾|牛|羊|猪|排骨/.test(i.name) && !/蛋/.test(i.name)).length;
 const vegetableCount: number = items.filter((i: PortionIngredient) => !i.optional && /菜|菇|笋|瓜|茄|豆角|土豆|萝卜|玉米|山药|藕|芹|莴/.test(i.name)).length;
 const ratio: number = options.people/options.basePeople;
 return items.map((item: PortionIngredient) => {
  let result: PortionAmount = new PortionAmount();result.name=item.name;result.unit=item.unit;result.optional=item.optional||false;result.amountText=item.amountText||'';
  if (item.quantity>0) { result.quantity=item.quantity*(item.optional && !/水|高汤|清汤|牛奶/.test(item.name)?Math.pow(ratio,0.8):ratio*options.appetite);result.quantitySource='推荐换算（基于'+(item.quantitySource||'菜谱来源用量')+'）';result.quantityBasis='按菜谱基准'+options.basePeople+'人份调整；来源未注明人数时基准为估计，调味缓增'; }
  else { result=infer(item.name,options.people,proteinCount,vegetableCount);result.optional=item.optional||result.optional;result.amountText=item.amountText||'';if(!result.optional)result.quantity*=options.appetite; }
  if (/盐|酱油|生抽|老抽|豆瓣|辣椒|花椒/.test(item.name)) { result.quantity*=options.seasoning==='清淡'?0.7:options.seasoning==='浓郁'?1.15:1; }
  if (/油/.test(item.name)&&!/酱油|蚝油/.test(item.name)) { result.quantity*=options.seasoning==='清淡'?0.8:1; }
  if (/辣椒|小米辣|朝天椒|辣油|辣酱/.test(item.name)) { result.quantity*=options.spice==='不辣'?0:options.spice==='微辣'?0.5:options.spice==='重辣'?1.4:1; }
  result.quantity=['个','根','只','片','瓣','块','把','条'].includes(result.unit)?(/鸡蛋|鸭蛋|鹌鹑蛋/.test(result.name)&&result.unit==='个'?Math.ceil(result.quantity):Math.round(result.quantity*2)/2):Math.round(result.quantity*10)/10;
  return result;
 });
}
