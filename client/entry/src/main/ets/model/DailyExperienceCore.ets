import { MenuRecipe, estimateRecipeCost } from './UsabilityCore';
export class DisplayCost { total:number=0; people:number=2; basis:string='食材估算'; }
/** Display forecasts are explicit estimates; the strict menu budget gate remains unchanged. */
export function displayCost(recipe:MenuRecipe,people:number=2):DisplayCost {
 const out:DisplayCost=new DisplayCost();out.people=Math.min(20,Math.max(1,Math.round(people)||2));
 const strict=estimateRecipeCost(recipe,out.people);
 if(strict.usable&&Number.isFinite(strict.total)&&strict.total>0){out.total=Math.max(1,Math.round(strict.total));out.basis=strict.inferred?'食材估算':'菜谱参考';return out;}
 const text=recipe.name+' '+recipe.ingredients.map(i=>i.name).join(' ');let base:number=8;
 if(/牛|羊|排骨|猪骨/.test(text)){base=26;}else if(/虾|蟹|贝|鲍|海参/.test(text)){base=30;}else if(/鱼|鳝/.test(text)){base=22;}else if(/肉|鸡|鸭|鹅|肝/.test(text)){base=18;}else if(/蛋|奶|酸奶|豆腐|豆干/.test(text)){base=10;}
 if(recipe.category==='大菜'){base=Math.max(base,32);}else if(recipe.category==='汤类'){base=Math.max(base,12);}else if(recipe.category==='粥类'){base=Math.max(7,base*0.75);}
 out.total=Math.max(2,Math.round(base*Math.pow(out.people/2,0.9)));out.basis='同类估算';return out;
}
export function shiftDay(date:string,delta:number):string {const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+delta);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
export function weekDates(date:string):string[]{const d=new Date(date+'T12:00:00');const offset=(d.getDay()+6)%7;const out:string[]=[];for(let n=0;n<7;n++){out.push(shiftDay(date,n-offset));}return out;}
export const FOOD_SLOGANS:string[]=[
'面要多吃，面要多见。','好好吃饭，烦恼减半。','生活有点忙，记得喝碗汤。','今天好好吃，明天有好事。','一口小馄饨，日子不混沌。','饺子趁热吃，好事不延迟。','吃口小甜点，快乐多一点。','米饭冒热气，生活有底气。','豆腐软乎乎，心事慢慢舒。','青菜绿油油，好运在前头。',
'番茄炒个蛋，快乐不落单。','汤圆圆又圆，惦记在心间。','喝粥慢一点，日子甜一点。','吃饭别着急，好运在排队。','炒菜滋啦响，快乐正开场。','小碗装热汤，大胃装梦想。','一口热乎饭，心情转个弯。','今天不将就，明天有奔头。','吃好这一顿，日子慢慢顺。','饭香飘一飘，烦恼抛一抛。',
'把面拌一拌，把心暖一暖。','日子有滋味，三餐有人陪。','馒头白又胖，心情亮又亮。','麻烦先放放，吃饭要香香。','煎蛋翻个面，好运见个面。','生活慢慢炖，开心一顿顿。','给胃一点暖，给心一点软。','小菜来两盘，快乐不打烊。','不怕路途远，先吃一碗面。','鲜汤咕嘟响，好事慢慢酿。',
'好菜慢慢嚼，好梦慢慢描。','早饭不缺席，元气不迟到。','包子热腾腾，日子有盼头。','生活别太赶，留点时间干饭。','粥有千般味，人有小确幸。','有空多见面，没空记得吃面。','一勺小布丁，心事按暂停。','炒出一锅香，装下小日常。','热锅冒点烟，快乐冒个尖。','今天吃得香，明天更闪亮。',
'一碗米饭白，开心自然来。','萝卜炖一炖，心情顺一顺。','糖醋酸甜甜，生活有新篇。','饭要一口口，路要一步步。','冰箱有点绿，生活有点趣。','一口小酥肉，快乐不漏兜。','筷子动一动，烦恼空一空。','豆芽脆生生，日子亮晶晶。','早晨有豆浆，心里有阳光。','早餐吃得好，元气来报到。',
'吃碗热汤面，和好心情见面。','煮一锅热粥，赶走小忧愁。','香菇炖个鸡，快乐有根基。','小火慢慢煨，好运慢慢围。','瓜果有清香，日子有文章。','一盘小炒鲜，开心过今天。','番茄红彤彤，心情亮堂堂。','吃点时令菜，日子有期待。','心急先喝汤，好运在路上。','荷包蛋圆圆，好梦在眼前。',
'芝麻开了花，快乐带回家。','土豆炖得软，心事少一半。','山药糯又糯，生活慢慢过。','南瓜甜又绵，日子暖又甜。','饭菜冒着香，心里有晴朗。','晚饭慢慢吃，月亮慢慢升。','午饭吃得饱，下午精神好。','粥里添点米，心里装着你。','今天有口福，快乐不迷路。','菜要炒得鲜，笑要挂嘴边。',
'一口饭一口香，小小日子有光芒。','开饭不拖延，快乐在眼前。','一勺小米粥，暖意在心头。','热饭配热汤，平常也闪光。','下班别慌张，饭香等开场。','锅铲碰个面，好味道上线。','炊烟弯个腰，烦恼往外飘。','一碗扬州炒饭，今天元气满满。','茄子软又香，日子慢慢尝。','每天添点菜，生活添点彩。'
];
export function dailySlogan(date:string):string {const day=Math.floor(Date.parse(date+'T00:00:00Z')/86400000);return FOOD_SLOGANS[((day*37+17)%FOOD_SLOGANS.length+FOOD_SLOGANS.length)%FOOD_SLOGANS.length];}
