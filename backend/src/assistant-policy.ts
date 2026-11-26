// Deterministic business gate, not a substitute for authorization or confirmation.
export function assistantSafetyReason(input:string):string {
 const q:string=input.normalize('NFKC').replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g,'').toLowerCase();
 if(/sk-[a-z0-9._-]{8,}|bearer\s+[a-z0-9._-]{12,}|-----begin.*private key/.test(q)){return '请勿发送密钥、令牌或私钥。小怪不需要这些信息。';}
 if(/忽略.{0,12}(指令|规则|限制|提示)|绕过.{0,12}(限制|安全|审核|鉴权)|系统提示词|开发者提示词|泄露.{0,10}(密钥|密码|令牌)|导出.{0,10}(账号|用户|数据库)|其他用户.{0,10}(库存|数据|账号)|(system|developer)\s*:|<\/?(system|instruction)|ignore.{0,30}(instruction|rule|previous)|reveal.{0,20}(prompt|secret|token)|jailbreak|越狱|删除全部|清空.{0,8}(库存|数据|账号)|重置.{0,8}(数据库|账号)|转账|支付|sudo\s|drop\s+table|curl\s|执行.{0,12}(脚本|命令|代码|sql)|发送.{0,12}(库存|数据|密码).{0,12}(网址|网站|邮箱)/.test(q)){return '这类请求涉及越权或修改助手规则，不能执行。可以继续问菜谱、库存、采购和用餐计划。';}
 if(/写.{0,6}(代码|程序|论文|小说)|编程|股票|炒股|彩票|赌博|政治宣传|色情|黑客|破解|盗号|挖矿|write.{0,15}(code|essay)|hack|malware|crypto trading/.test(q)){return '小怪仅用于做饭、食材、采购和用餐记录，不能作为通用聊天或编程服务。';}
 return '';
}
// Short, ordinary replies can inherit a cooking topic only from the preceding exchange.
export function cookingFollowup(input:string):boolean {
 return /^(?:请)?(?:继续(?:说|讲|推荐|写下去)?|接着(?:说|讲)|然后呢|下一步呢?|再来一个|换一个|具体一点|详细点)[吧呢嘛啊吗。？！?!\s]*$/.test(input.normalize('NFKC').trim());
}
export function assistantInScope(input:string):boolean {
 if(/(?:\d+(?:\.\d+)?|半|[一二三四五六七八九十两]+)\s*(?:分钟|小时|刻钟).*?(?:能做什么|可以做什么|做点什么|能做啥|够做什么|推荐什么)/.test(input.normalize('NFKC')))return true;
 return /(西兰花|花椰菜|芦笋|莲藕|莴笋|茄子|蘑菇|香菇|木耳|菠菜|白菜|萝卜|芹菜|焯水|汆水|解冻|腌制|焯多久|多久熟|火大一点|再详细一点|换一种做法|家常|鸡|鸭|鹅|牛|猪|羊|椒|葱|姜|蒜|饺|饼|馒头|包子|土豆|番茄|菜|饭|餐|食|吃|喝|烹|煮|炒|蒸|烤|炖|煎|炸|焖|粥|汤|面|米|肉|鱼|虾|蛋|奶|豆|蔬|瓜|果|油|盐|糖|辣|酸|甜|咸|冰箱|库存|采购|补货|保质|过期|减脂|健身|营养|热量|大卡|蛋白|备菜|做法|便宜|快一点|少辣|清淡|换一道|怎么做|多少钱|火候|口味|洗碗|厨房|饱|饿|recipe|cook|meal|food|pantry|ingredient|calorie|nutrition|grocery|dinner|breakfast|lunch)/i.test(input.normalize('NFKC'));
}
