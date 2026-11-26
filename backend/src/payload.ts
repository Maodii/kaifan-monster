import { BadRequestException } from '@nestjs/common';
import { ChangeDto } from './dto';
const units=['g','kg','个','盒','瓶','L','袋','mL','根','片','瓣','块','只','碗','杯','把','条'];
function fail(message:string):never{throw new BadRequestException(message);}
function text(p:Record<string,unknown>,key:string,max=200,required=false):void{const v=p[key];if(v===undefined&&!required)return;if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail(`${key}无效`);}
function numeric(p:Record<string,unknown>,key:string,min=0,required=false):void{const v=p[key];if(v===undefined&&!required)return;if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>1e12)fail(`${key}无效`);}
function date(p:Record<string,unknown>,key:string,required=false):void{if(p[key]===undefined&&!required)return;const v=p[key];if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail(`${key}无效`);}
export function validatePayload(ch:ChangeDto):void{
 if(ch.operation==='delete')return;const p=ch.payload;
 // 同步元数据只由服务端生成，客户端携带的缓存值会被覆盖。
 if(ch.entityType!=='recipe_favorites')text(p,'name',200,true);
 if(['food_items','shopping_list'].includes(ch.entityType)){
  numeric(p,'quantity',0,true);if(!units.includes(String(p.unit)))fail('单位无效');text(p,'category',30);text(p,'location',100);text(p,'notes',10000);text(p,'tags',2000);
 }
 if(ch.entityType==='food_items'){
  date(p,'expiryDate',true);if(p.openedAt!==undefined&&p.openedAt!=='')date(p,'openedAt');if(p.openedExpiry!==undefined&&p.openedExpiry!=='')date(p,'openedExpiry');if(p.openedExpiry&&(!p.openedAt||String(p.openedExpiry)<String(p.openedAt)))fail('开封日期无效');date(p,'purchasedAt');numeric(p,'estimatedPrice');numeric(p,'purchasedQuantity',-1);numeric(p,'purchasePrice',-1);
  if(p.archived!==undefined&&typeof p.archived!=='boolean')fail('归档状态无效');
  if(p.movements!==undefined){if(!Array.isArray(p.movements)||p.movements.length>10000)fail('食材消耗历史无效');for(const m of p.movements){if(!m||typeof m!=='object')fail('食材消耗历史无效');text(m,'id',200,true);text(m,'date',100,true);if(!Number.isFinite(Date.parse(m.date)))fail('消耗日期无效');numeric(m,'quantity',0.000001,true);numeric(m,'cost',0,true);numeric(m,'before',0,true);numeric(m,'after',0,true);if(Math.abs((m.reason==='restored'?m.after-m.before:m.before-m.after)-m.quantity)>0.00001)fail('消耗前后数量不一致');if(!['consumed','wasted','restored'].includes(m.reason))fail('消耗原因无效');text(m,'recipeName',200);}}
 }
 if(ch.entityType==='meal_records'){
  numeric(p,'protein',-1);if(typeof p.protein==='number'&&p.protein>500)fail('蛋白质无效');text(p,'proteinSource',40);text(p,'aiEstimateRange',3000);
  text(p,'place',200);text(p,'sourceMealId',200);text(p,'trialOutcome',20);text(p,'trialSubstitution',200);text(p,'trialFailure',400);numeric(p,'actualMinutes');numeric(p,'leftoverPortions');numeric(p,'financeFood',-1);numeric(p,'deliveryFee');numeric(p,'discount');numeric(p,'mealTotal',-1);numeric(p,'personalCost',-1);for(const key of ['splitPeople','personalShares']){if(p[key]!==undefined&&(!Number.isInteger(p[key])||Number(p[key])<1||Number(p[key])>100))fail('分摊人数无效');}text(p,'calorieSource',200);numeric(p,'calories',-1);if(p.calories!==undefined&&Number(p.calories)>30000)fail('热量无效');if(p.rating!==undefined&&(!Number.isInteger(p.rating)||Number(p.rating)<0||Number(p.rating)>5))fail('评分无效');if(p.diningMode!==undefined&&!['在家做','外卖','餐馆','食堂','外食'].includes(String(p.diningMode)))fail('用餐方式无效');if(p.costType!==undefined&&!['估算','实付'].includes(String(p.costType)))fail('花费类型无效');
  if(p.portionSize!==undefined&&!['half','normal','large'].includes(String(p.portionSize)))fail('餐食份量无效');
  numeric(p,'energyReference',-1);numeric(p,'consumedFraction');
  if(p.consumedFraction!==undefined&&(Number(p.consumedFraction)<=0||Number(p.consumedFraction)>1))fail('食用比例无效');
  if(typeof p.energyReference==='number'&&p.energyReference>=0){if(p.energyReference>30000||!['手动估算','包装标签','称重计算','菜谱推算','AI估算'].includes(String(p.calorieSource))||typeof p.calories!=='number'||p.calories!==Math.round(p.energyReference*Number(p.consumedFraction??1)))fail('热量与来源或比例不一致');}
  if(p.sourceMealId&&!/^[a-f0-9-]{36}$/.test(String(p.sourceMealId)))fail('原餐标识无效');
  if(Number(p.actualMinutes||0)>2880||Number(p.leftoverPortions||0)>100)fail('试做耗时或剩菜份数无效');
  if(p.trialOutcome!==undefined&&!['未评价','成功','需改进'].includes(String(p.trialOutcome)))fail('试做结果无效');
  if(Number(p.personalShares||1)>Number(p.splitPeople||1))fail('示例主体份数不能超过总份数');
  if(typeof p.financeFood==='number'&&p.financeFood>=0){
   const cents=Math.round(p.financeFood*100)+Math.round(Number(p.deliveryFee||0)*100)-Math.round(Number(p.discount||0)*100);
   const personal=Math.floor(cents*Number(p.personalShares||1)/Number(p.splitPeople||1));
   if(cents<0||typeof p.mealTotal!=='number'||Math.round(p.mealTotal*100)!==cents||typeof p.personalCost!=='number'||Math.round(p.personalCost*100)!==personal)fail('费用合计或示例主体分摊不一致');
  }
  if(p.items!==undefined){if(!Array.isArray(p.items)||p.items.length>40)fail('用餐菜品无效');let cents=0;for(const item of p.items){if(!item||typeof item!=='object')fail('用餐菜品无效');text(item,'name',200,true);numeric(item,'estimatedCost',0,true);text(item,'category',60);cents+=Math.round(Number(item.estimatedCost)*100);}if(p.items.length&&Math.round(Number(p.estimatedCost)*100)!==cents)fail('菜品估算之和与总花费不一致');}
  numeric(p,'estimatedCost');if(typeof p.date!=='string'||!Number.isFinite(Date.parse(p.date)))fail('用餐时间无效');if(p.visibility!==undefined&&p.visibility!=='private'&&p.visibility!=='family')fail('公开发布必须走审核接口');}
 if(ch.entityType==='barcode_lib'){if(!/^(\d{8}|\d{12}|\d{13})$/.test(String(p.barcode)))fail('条码无效');numeric(p,'days',0,true);}
 if(ch.entityType==='recipes'){
  if(!Array.isArray(p.ingredients)||p.ingredients.length>100||!Array.isArray(p.steps)||p.steps.length>100)fail('菜谱用料与步骤无效');
  for(const i of p.ingredients){if(!i||typeof i!=='object')fail('用料无效');text(i,'name',200,true);numeric(i,'quantity',0.000001,true);if(!units.includes(String(i.unit)))fail('用料单位无效');}
  if(p.steps.some(v=>typeof v!=='string'||v.length>10000))fail('步骤无效');numeric(p,'estimatedCost');
 }
 if(ch.entityType==='recipe_favorites')text(p,'recipeId',200,true);
 for(const key of ['localPhoto','photoOriginal']){if(p[key]!==undefined)text(p,key,2048);}
}
