import { Food, Recipe, Ingredient, unitFactor, dateString } from './Models';
// Deterministic business gate, not a substitute for authorization or confirmation.
export function assistantSafetyReason(input:string):string {
 const q:string=input.normalize('NFKC').replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g,'').toLowerCase();
 if(/sk-[a-z0-9._-]{8,}|bearer\s+[a-z0-9._-]{12,}|-----begin.*private key/.test(q)){return '请勿发送密钥、令牌或私钥。小怪不需要这些信息。';}
 if(/忽略.{0,12}(指令|规则|限制|提示)|绕过.{0,12}(限制|安全|审核|鉴权)|系统提示词|开发者提示词|泄露.{0,10}(密钥|密码|令牌)|导出.{0,10}(账号|用户|数据库)|其他用户.{0,10}(库存|数据|账号)|(system|developer)\s*:|<\/?(system|instruction)|ignore.{0,30}(instruction|rule|previous)|reveal.{0,20}(prompt|secret|token)|jailbreak|越狱|删除全部|清空.{0,8}(库存|数据|账号)|重置.{0,8}(数据库|账号)|转账|支付|sudo\s|drop\s+table|curl\s|执行.{0,12}(脚本|命令|代码|sql)|发送.{0,12}(库存|数据|密码).{0,12}(网址|网站|邮箱)/.test(q)){return '这类请求涉及越权或修改助手规则，不能执行。可以继续问菜谱、库存、采购和用餐计划。';}
 if(/写.{0,6}(代码|程序|论文|小说)|编程|股票|炒股|彩票|赌博|政治宣传|色情|黑客|破解|盗号|挖矿|write.{0,15}(code|essay)|hack|malware|crypto trading/.test(q)){return '小怪仅用于做饭、食材、采购和用餐记录，不能作为通用聊天或编程服务。';}
 return '';
}
export function assistantInScope(input:string):boolean {
 return /(家常|鸡|鸭|鹅|牛|猪|羊|椒|葱|姜|蒜|饺|饼|馒头|包子|土豆|番茄|菜|饭|餐|食|吃|喝|烹|煮|炒|蒸|烤|炖|煎|炸|焖|粥|汤|面|米|肉|鱼|虾|蛋|奶|豆|蔬|瓜|果|油|盐|糖|辣|酸|甜|咸|冰箱|库存|采购|补货|保质|过期|减脂|健身|营养|热量|大卡|蛋白|备菜|做法|便宜|快一点|少辣|清淡|换一道|怎么做|多少钱|火候|口味|洗碗|厨房|饱|饿|recipe|cook|meal|food|pantry|ingredient|calorie|nutrition|grocery|dinner|breakfast|lunch)/i.test(input.normalize('NFKC'));
}

// Only the current user utterance can propose an operation. Model text is never executable.
export class AssistantNativeDraft {
 kind:string='';targetId:string='';quantity:number=0;unit:string='';expected:string='';message:string='';choices:string[]=[];ready:boolean=false;
}
function amountNumber(value:string):number{
 if(/^\d+(\.\d+)?$/.test(value)){return Number(value);}
 const digits:string='零一二三四五六七八九';if(value==='两'){return 2;}if(value==='半'){return 0.5;}
 const v:string=value.replace(/两/g,'二');const parts:string[]=v.split('十');
 if(parts.length===2){return (parts[0]?digits.indexOf(parts[0]):1)*10+(parts[1]?digits.indexOf(parts[1]):0);}
 return v.length===1?digits.indexOf(v):-1;
}
function normalizedUnit(unit:string):string{if(['克','g'].includes(unit)){return 'g';}if(['千克','公斤','kg'].includes(unit)){return 'kg';}if(['毫升','ml','mL'].includes(unit)){return 'mL';}if(['升','l','L'].includes(unit)){return 'L';}if(['枚','颗'].includes(unit)){return '个';}return unit;}
export function assistantNativeDraft(question:string,foods:Food[],recipes:Recipe[],contextIds:string[]=[]):AssistantNativeDraft{
 const d:AssistantNativeDraft=new AssistantNativeDraft();const q:string=question.trim();
 const blocked:string=assistantSafetyReason(q);if(blocked){d.kind='advice';d.message=blocked;return d;}
 const help:AssistantNativeDraft=assistantLocalHelp(q,foods,recipes,contextIds);if(help.kind){return help;}
 if(!q||/不要|别|禁止|不需要|取消|假如|如果|例如|比如|[“”"`]|(怎么|如何).*(扣|减|加入|添加|收藏)/.test(q)){return d;}
 const consume:boolean=/(减少|减去|扣除|扣减|扣掉|用掉|用去|用了|消耗|吃掉)/.test(q);
 const addRecipe:boolean=/(加入|添加|保存|收进).*(我的菜谱|私房菜|私人菜谱)/.test(q);
 if(!consume&&!addRecipe){return d;}
 d.kind=consume?'consume':'recipe';
 if(consume&&addRecipe||/[，,；;。].*(减少|减去|扣除|扣减|用掉|消耗|加入|添加|保存)/.test(q)){d.message='一次先处理一项，请分别说明要扣减的库存或保存的菜谱。';return d;}
 if(consume){
  const rows:Food[]=foods.filter((f:Food)=>!f.archived&&f.quantity>0&&!f.familyId&&q.includes(f.name));
  if(!rows.length){d.message='没有找到对应的示例主体库存。可以先添加食材，或写出库存里的完整名称。';return d;}
  const names:string[]=Array.from(new Set(rows.map((f:Food)=>f.name)));if(names.length!==1){d.message='检测到多种食材，请一次说明一种及其数量。';return d;}
  const amounts:RegExpMatchArray|null=q.match(/([0-9]+(?:\.[0-9]+)?|[一二两三四五六七八九十]+|半)\s*(千克|公斤|kg|毫升|mL|ml|克|g|升|L|l|个|枚|颗|袋|盒|根|份|瓶|块|片|只|条|斤)/g);
  if(!amounts||amounts.length!==1){d.message='请写清扣减数量和单位，例如“用掉鸡蛋2个”或“猪肉减少200克”。';return d;}
  const match:RegExpMatchArray|null=amounts[0].match(/^([0-9]+(?:\.[0-9]+)?|[一二两三四五六七八九十]+|半)\s*(.+)$/);if(!match){return d;}
  let quantity:number=amountNumber(match[1]);let unit:string=normalizedUnit(match[2]);if(unit==='斤'){quantity*=500;unit='g';}
  if(!Number.isFinite(quantity)||quantity<=0){d.message='扣减数量需要大于0。';return d;}
  if(rows.length>1){d.choices=rows.map((f:Food)=>f.id);d.quantity=quantity;d.unit=unit;d.message='同名食材有多个批次，请选择这次使用的那一批。';return d;}
  return assistantNativeBatch(d,rows[0],quantity,unit);
 }
 const named:Recipe[]=recipes.filter((r:Recipe)=>q.includes(r.name));const matches:Recipe[]=named.length?named:/(这道|这个)/.test(q)?recipes.filter((r:Recipe)=>contextIds.includes(r.id)):[];
 const distinct:Recipe[]=matches.filter((r:Recipe,i:number,a:Recipe[])=>a.findIndex((v:Recipe)=>v.id===r.id)===i);
 if(distinct.length!==1){d.message=distinct.length?'找到多个同名/不同地区的做法，请先打开想保存的那道菜，再说“把这道菜加入我的菜谱”。':'请说出菜名，或先打开菜谱，再说“把这道菜加入我的菜谱”。';return d;}
 const r:Recipe=distinct[0];if(r.ingredients.some((i)=>!Number.isFinite(i.quantity)||i.quantity<=0)||!r.ingredients.length||!r.steps.length){d.message='这份菜谱还有用量待核对，请先进入菜谱编辑补齐，再保存为私房菜。';return d;}
 d.targetId=r.id;d.expected=JSON.stringify(r);d.ready=true;d.message='将“'+r.name+'”保存为你的私房菜，保留做法和来源。确认后才会保存。';return d;
}
export function assistantNativeBatch(draft:AssistantNativeDraft,food:Food,quantity:number=draft.quantity,unit:string=draft.unit):AssistantNativeDraft{
 const d:AssistantNativeDraft=new AssistantNativeDraft();d.kind='consume';
 const factor:number=unitFactor(unit,food.unit);if(!factor||!Number.isFinite(factor)||factor<=0){d.message='数量单位与这批库存不匹配，请使用“'+food.unit+'”重新说明数量。';return d;}
 const used:number=Number((quantity*factor).toFixed(8));if(!Number.isFinite(used)||used<=0||used>food.quantity){d.message='这批库存只有'+food.quantity+food.unit+'，请调整扣减量。';return d;}
 if(food.familyId||food.archived){d.message='请选择仍在使用的示例主体库存批次。';return d;}
 d.targetId=food.id;d.expected=JSON.stringify(food);d.quantity=used;d.unit=food.unit;d.ready=true;d.message=food.name+'：'+food.quantity+food.unit+' → '+Number((food.quantity-used).toFixed(8))+food.unit+'。将记为已消耗，并保留批次和费用流水。';return d;
}
export function assistantPrivateRecipe(source:Recipe):Recipe{
 const r:Recipe=JSON.parse(JSON.stringify(source)) as Recipe;r.originRecipeId=source.id;r.id='';r.version=0;r.familyId='';r.status='private';r.modifiedAt='';return r;
}
export function assistantLocalStockHint(question:string,foods:Food[]):string{
 if(!/(库存|冰箱|现有食材|家里.*食材)/.test(question)){return '';}
 return foods.some((f:Food)=>!f.archived&&f.quantity>0)?'':'你的本机库存还是空的。可以先补充鸡蛋、当季蔬菜和常用主食；下面也可以选一道菜，按需采购。';
}

// Read-only helpers: no network, writes, household stock or model-generated action IDs.
function assistantFoodDay(f:Food):string {
 const dates:string[]=[f.expiryDate,f.openedExpiry].filter((v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(new Date(v+'T12:00:00').getTime())&&dateString(new Date(v+'T12:00:00'))===v);return dates.sort()[0]||'';
}
export function assistantLocalHelp(question:string,foods:Food[],recipes:Recipe[],contextIds:string[],today:string=dateString(new Date())):AssistantNativeDraft {
 const d:AssistantNativeDraft=new AssistantNativeDraft();const q:string=question.trim();
 const stock:boolean=/^(帮我|请)?(做个|做一次|看看|查看|检查)?(库存体检|库存检查|临期食材|快过期的食材)[。！!？?]?$/.test(q);
 const shopping:boolean=/(采购清单|缺什么食材)/.test(q);const prep:boolean=/(备菜顺序|备菜清单)/.test(q);
 if(!stock&&!shopping&&!prep){return d;}
 // A mixed free-form command must not be mistaken for a read-only helper.
 if(!stock&&!/^(帮我|请)?(看看|查看|生成|列出)?(这道菜|这个菜|.{1,30}的)(采购清单|缺什么食材|备菜顺序|备菜清单)[。！!？?]?$/.test(q)){return d;}
 d.kind='advice';const personal:Food[]=foods.filter((f:Food)=>!f.archived&&!f.familyId&&Number.isFinite(f.quantity)&&f.quantity>0);
 if(stock){
  if(!personal.length){d.message='你的示例主体库存还是空的。先按一餐补充主食、鸡蛋或豆制品、当季蔬菜；再选一道快手菜，按需购买。';return d;}
  const soon:string=dateString(new Date(new Date(today+'T12:00:00').getTime()+3*86400000));
  const expired:Food[]=personal.filter((f:Food)=>!!assistantFoodDay(f)&&assistantFoodDay(f)<today);
  const urgent:Food[]=personal.filter((f:Food)=>!!assistantFoodDay(f)&&assistantFoodDay(f)>=today&&assistantFoodDay(f)<=soon).sort((a:Food,b:Food)=>assistantFoodDay(a).localeCompare(assistantFoodDay(b)));
  d.message='示例主体库存 '+personal.length+' 批\n'+(urgent.length?'近3天到期：\n'+urgent.slice(0,10).map((f:Food)=>f.name+' '+f.quantity+f.unit+' · '+assistantFoodDay(f)).join('\n'):'近3天没有已记录到期的食材。')+'\n'+(expired.length?'已过期 '+expired.length+' 批，请检查处理，不用于推荐。':'没有已记录过期的批次。')+'\n未记保质期 '+personal.filter((f:Food)=>!assistantFoodDay(f)).length+' 批。日期只用于提醒，不能判断食品是否安全。';return d;
 }
 const named:Recipe[]=recipes.filter((v:Recipe)=>q.includes(v.name));const matches:Recipe[]=named.length?named:recipes.filter((v:Recipe)=>contextIds.includes(v.id));
 if(matches.length!==1){d.message='先打开一份具体菜谱，再点“采购清单”或“备菜顺序”；同名做法请先选定。';return d;}
 const recipe:Recipe=matches[0];
 if(prep){d.message=recipe.name+' · 备菜与制作\n参考总时长 '+recipe.minutes+' 分钟（含备菜，以实际操作为准）\n先准备：'+recipe.ingredients.slice(0,20).map((i)=>i.name).join('、')+'\n'+recipe.steps.slice(0,20).map((step:string,i:number)=>(i+1)+'. '+step).join('\n')+'\n生熟分开；此清单沿用菜谱做法，不自动创建计时或扣库存。';return d;}
 const requirements:Ingredient[]=[];
 for(const ingredient of recipe.ingredients){
  const same:Ingredient|undefined=requirements.find((i:Ingredient)=>!i.optional&&!ingredient.optional&&i.name===ingredient.name&&unitFactor(ingredient.unit,i.unit)>0);
  if(same){same.quantity=Number.isFinite(same.quantity)&&same.quantity>0&&Number.isFinite(ingredient.quantity)&&ingredient.quantity>0?same.quantity+ingredient.quantity*unitFactor(ingredient.unit,same.unit):0;same.amountText='重复用量待核对';}
  else{const item:Ingredient=new Ingredient(ingredient.name,ingredient.quantity,ingredient.unit);item.optional=ingredient.optional;item.amountText=ingredient.amountText;requirements.push(item);}
 }
 d.message=recipe.name+' · '+recipe.people+'人份采购核对\n'+requirements.slice(0,30).map((i:Ingredient)=>{
  const has:number=personal.filter((f:Food)=>f.name===i.name&&!!assistantFoodDay(f)&&assistantFoodDay(f)>=today).reduce((n:number,f:Food)=>n+f.quantity*unitFactor(f.unit,i.unit),0);
  if(!Number.isFinite(i.quantity)||i.quantity<=0){return i.name+'：'+(i.amountText||'用量待核对');}
  if(i.optional){return i.name+'：可选 '+i.quantity+i.unit+'，按需准备（不抵扣库存）';}
  const missing:number=Math.max(0,Number((i.quantity-has).toFixed(3)));
  return i.name+'：需 '+i.quantity+i.unit+'，'+(missing?'建议补 '+missing+i.unit:'已记录数量足够')+(i.optional?'（可选）':'');
 }).join('\n')+'\n仅抵扣同名、单位兼容且保质期有效的示例主体库存；未记日期或不同品类请手动核对。尚未添加采购或扣库存。';return d;
}
