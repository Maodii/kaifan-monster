import { CoreIngredient, CoreRecipe } from './RecommendationCore';
export class IngredientKnowledge {
 key: string = ''; aliases: string[] = []; title: string = ''; selection: string = ''; texture: string = ''; use: string = ''; substitution: string = ''; caution: string = '';
 constructor(key: string, aliases: string[], title: string, selection: string, texture: string, use: string, substitution: string, caution: string) { this.key=key;this.aliases=aliases;this.title=title;this.selection=selection;this.texture=texture;this.use=use;this.substitution=substitution;this.caution=caution; }
}
export const COOKING_KNOWLEDGE: IngredientKnowledge[] = [
 new IngredientKnowledge('tofu',['豆腐'],'豆腐怎么选','嫩豆腐：含水多、组织细；老豆腐：较紧实、易定形；内酯豆腐：凝胶细软，包装须确认是否可直接食用；日本豆腐通常是蛋制品。','嫩豆腐滑嫩，老豆腐有嚼感、煎后易形成外壳。','蒸、羹、麻婆类偏嫩；煎、炖、炒偏老。未注明品类时先按做法选择。','可替换但口感和出水不同，嫩豆腐小心翻动，老豆腐不一定适合细滑羹。','鸡蛋过敏者留意日本豆腐标签；各种豆腐都按包装保存和食用要求处理。'),
 new IngredientKnowledge('soy',['生抽','老抽','酱油'],'生抽与老抽','生抽主要提鲜增咸；老抽主要加深颜色并有酱香；普通酱油介于两者。','生抽多了会咸；老抽多了易发黑、酱味重。','先少量加生抽，老抽为上色分次加，最后尝味再补盐。','不能把同毫升老抽当作生抽直接替换。薄盐产品仍含钠。','不同品牌咸度不同；已加酱油、豆瓣、蚝油时减少另加盐。'),
 new IngredientKnowledge('vinegar',['醋'],'醋的区别','米醋较清爽；陈醋香味醇厚、颜色深；白醋酸味直接、色浅；香醋适合点香。','早加并加热会让酸味变柔，起锅少量点醋香气更鲜明。','凉拌按次少加，热菜按酸度需求决定下锅时机。','按酸度和颜色选替代品，不按名称等量替换。','不能用醋替代充分加热或安全储存。'),
 new IngredientKnowledge('starch',['淀粉','生粉'],'淀粉与面粉','玉米淀粉常用于腌肉、勾芡；土豆淀粉糊化黏性强、炸壳偏脆；面粉有面筋。','裹糊、上浆、勾芡分别影响外壳、嫩度和汤汁黏度。','水淀粉先用冷水调散，沿锅边少量加入并搅匀。','面粉不能等量替代勾芡用淀粉；配方有具体种类时优先遵循。','淀粉会沉淀，入锅前再搅匀；不要一次加到过稠。'),
 new IngredientKnowledge('oil',['食用油','花生油','菜籽油','橄榄油','植物油'],'食用油怎么选','按包装标注选择可炒菜的油；初榨橄榄油有果香，精炼油风味较轻。','油量影响润泽度与油腻感，减油可能更容易粘锅。','常规炒菜先热锅再加油，避免长时间空烧至冒浓烟。','不同油烟点与风味有差异，不强行等同。','花生过敏者留意油品来源；不要把冒烟当作所有菜的下锅标准。'),
 new IngredientKnowledge('sesame',['香油','芝麻油'],'香油是点香','熟芝麻香油味浓，通常用作末端调味。','少量坚果烘烤香，多了会掩盖原料味。','起锅或凉拌时少量滴入。','不宜把菜谱的炒菜油全部换成香油。','芝麻过敏者避用。'),
 new IngredientKnowledge('oyster',['蚝油'],'蚝油提鲜也增咸','蚝油通常含盐和糖；素蚝油常用菌菇风味。','增加鲜甜、酱香和轻微浓稠感。','食材快熟时拌匀，先尝味再另加盐。','不能把蚝油当作纯鲜味剂无限加。','贝类过敏留意配料与交叉污染声明。'),
 new IngredientKnowledge('wine',['料酒','黄酒'],'料酒与黄酒','烹饪料酒可能含盐，饮用黄酒甜度、香气各异。','帮助带出香气，过量会有酒味。','通常在热锅、肉类周围加入并加热；清蒸蛋等无需一律加。','不能用高度白酒等量替代。','烹饪不保证酒精完全去除；需严格避酒者直接省略。'),
 new IngredientKnowledge('pepper',['胡椒'],'白胡椒与黑胡椒','白胡椒辛香偏温暖，黑胡椒香气更鲜明、颗粒感明显。','少量去腥提味，多了会有辛辣刺激。','汤羹常用白胡椒，煎烤肉可选现磨黑胡椒。','可按喜好替换，但颜色与辛香不同。','少量分次加入，不能替代食材新鲜度检查。'),
 new IngredientKnowledge('chili',['辣椒','小米辣','辣油','辣酱'],'辣椒先选辣度','彩椒偏甜；青椒依品种有差异；小米辣通常更辣；干辣椒提供干香。','保留辣椒籽与白色内筋通常更辣。','不吃辣可用彩椒替换配菜型辣椒，辣酱类需考虑同时带入的盐。','辣椒油不能当作清炒油等量使用。','处理后洗手避免揉眼；不靠颜色判断辣度。'),
 new IngredientKnowledge('beanpaste',['豆瓣酱','豆瓣'],'豆瓣酱怎么用','郫县豆瓣偏咸辣、发酵香；其他豆瓣酱不一定辣。','能带来红油色、咸鲜和发酵香。','中小火煸出香气，避免大火焦黑发苦。','想减辣不能只减少辣椒，还需选不辣酱或减少豆瓣。','含盐较高；豆类与小麦过敏者查标签。'),
 new IngredientKnowledge('sugar',['白糖','冰糖','白砂糖','糖'],'糖不只增甜','白糖易溶；冰糖需要更长溶化时间；糖色与调味是不同操作。','少量平衡酸咸，增加挂汁光泽；不能消除食材风险。','调味少量分次加；炒糖色时小火并留意迅速变色。','代糖受热性质不同，不能直接用于同样的糖色或焦糖步骤。','热糖温度高，避免溅水、徒手尝热糖。'),
 new IngredientKnowledge('salt',['盐'],'盐最后校准','细盐与粗盐按重量比按勺更可靠。','增咸并影响食材出水。','有酱油、蚝油、豆瓣的菜，最后再尝味补盐。','不要因清淡就把其他含盐酱料用量加倍。','尝味须在肉蛋等完全熟透后；生腌汁勿直接尝。'),
 new IngredientKnowledge('ginger',['姜'],'姜与蒜葱分工','姜偏辛香，老姜味更浓；嫩姜辛辣较轻。','为肉汤去腥提香，也会有温暖辛辣。','拍姜煲汤、切丝蒸鱼、切末腌肉按步骤选择。','姜粉与鲜姜水分和强度不同，不直接等量替换。','明显霉烂腐败的姜不要食用。'),
 new IngredientKnowledge('garlic',['蒜'],'蒜的香气变化','蒜末释放香气快，蒜瓣经焖炖更柔和。','生蒜辛辣、熟蒜甘甜，炸过头会苦。','爆香用中小火、变浅金黄即可接续下料。','蒜粉不能按蒜瓣数量直接换算。','生蒜泡油不能长时间常温存放。'),
 new IngredientKnowledge('rice',['大米','小米','糯米','燕麦'],'米和杂粮的口感','大米适合饭粥，小米易煮成粥，糯米更黏，燕麦依整粒或即食处理。','杂粮吸水速度和软化时间不同。','整粒杂粮、豆类可先浸泡或预煮；即食燕麦通常末段加入。','水米比受锅具、米种与浓稠喜好影响，不用一种比例覆盖全部。','米饭熟后尽快食用或冷藏，勿长期常温放置。'),
 new IngredientKnowledge('noodle',['面条','荞麦面','刀削面','米线','粉条'],'面条先看干湿','鲜面、干面、熟面需水量和煮制时间不同；荞麦面可能含小麦。','粗细与淀粉种类决定筋道、滑度和汤汁浑浊度。','包装标示优先；另锅煮可减少汤汁浑浊，炒面需沥水。','不能把干面克数等同于熟面重量。','对小麦过敏需查配料；无筋度不能作为未熟唯一判断。'),
 new IngredientKnowledge('egg',['鸡蛋','鸭蛋'],'蛋液和蒸蛋','普通鸡蛋、鸭蛋风味不同；蒸蛋的加水倍数指蛋液体积。','水多偏滑嫩，但过多不易成形；火过大易蜂窝。','过筛、盖耐热盖，按容器深度调蒸制时间。','鸡蛋大小不同，蛋液量比固定个数更能保持比例。','常规鸡蛋应充分加热，不仅依靠固定分钟数判断熟透。'),
 new IngredientKnowledge('mushroom',['香菇','白玉菇','金针菇','菌菇','蘑菇'],'鲜菇与干菇','鲜香菇清香，干香菇泡发后香气浓；白玉菇、金针菇形态和熟化不同。','干菇更耐炖，细嫩菌菇口感较柔。','用正规可食用栽培菇，干菇按包装冷藏泡发并清洗。','干重与泡发后重量不等价，别把50g干菇直接当50g鲜菇。','不采食不明野菇；所有需熟制的菌菇充分加热。'),
 new IngredientKnowledge('wood-ear',['木耳'],'木耳干湿有别','干木耳体积小，泡发后明显膨胀；鲜湿木耳按包装保存。','熟后脆弹，炖太久会更软。','短时冷藏泡发，及时洗净煮熟。','干重与泡发重量不可直接互换。','不要长时间常温泡发；异味、发黏或变质直接丢弃。'),
 new IngredientKnowledge('beef',['牛肉','牛腩','牛排'],'牛肉部位决定做法','里脊偏嫩适合快炒；牛腩有筋膜脂肪适合炖；牛排看厚度与部位。','快炒部位嫩，炖肉部位慢煮才软。','快炒逆纹切薄片；牛腩分块并预留足够炖煮时间。','不能以同样15分钟把牛腩替代牛里脊。','肉末、注脂或重组肉需充分熟透，生熟器具分开。'),
 new IngredientKnowledge('pork',['猪肉','五花肉','里脊','瘦肉'],'猪肉选肥瘦','里脊、瘦肉适合快炒；五花肉肥瘦分层适合红烧或煸炒。','五花更润，纯瘦肉久煮容易柴。','快炒切薄，炖烧切块；解冻后沥水再处理。','五花改瘦肉需减少煸油、调整炖煮，口感不会完全一样。','猪肉充分熟透，肉汁颜色不是唯一安全判断。'),
 new IngredientKnowledge('chicken',['鸡胸','鸡腿','鸡肉','鸡翅'],'鸡胸与鸡腿','鸡胸脂肪较少、易柴；鸡腿更润；带骨鸡块熟化慢于同厚度去骨肉。','腌制上浆可改善鸡胸口感，过熟仍会变干。','按大小切均匀，优先用食品温度计检查最厚处。','鸡胸替鸡腿需留意烹饪时间与油量。','禽肉中心温度参考74°C；腌生鸡肉的汁液须充分煮沸后再用。'),
 new IngredientKnowledge('fish',['鱼','鳕鱼','鲈鱼','鳜鱼'],'鱼块与整鱼','鱼片适合快煮，整鱼和厚鱼块需更长熟化时间，冷冻鱼先按包装解冻。','鱼片易碎，频繁搅动会散。','蒸鱼水开后入锅，按最厚处调整，勿以所有鱼固定8分钟。','整鱼重量不能直接当纯鱼肉净重。','留意鱼刺；充分加热并依据食品温度计/可靠熟制指南判断。'),
 new IngredientKnowledge('shrimp',['虾'],'虾仁与带壳虾','虾仁按净重，带壳虾可食部分更少；冷冻品看是否已熟。','生虾加热后紧实，过久偏韧。','去除明显虾线，控水，按是否生熟确定入锅顺序。','同克数带壳虾不能当相同净肉量虾仁。','甲壳类过敏者避食；颜色不是单一熟度依据。'),
 new IngredientKnowledge('potato',['土豆','马铃薯'],'土豆切法与品种','粉质土豆适合炖、泥，蜡质土豆适合保持形状。','细丝快熟、薄片易熟、厚块更耐炖。','切块大小统一，快炒丝可清洗表面淀粉。','切块大小改变后，原分钟数只作参考。','发绿、明显发芽或发苦土豆不要食用。'),
 new IngredientKnowledge('greens',['青菜','菠菜','白菜','油麦菜'],'叶菜菜梗分开','菜梗比嫩叶更耐热，白菜帮与菜叶可分批下锅。','快炒更脆，久炖更软甜。','洗净沥水，梗先下、叶后下，避免不必要的加水。','不同叶菜苦味、含水量不同，调味和时间要调整。','菜叶变软不代表同锅肉类已熟。'),
 new IngredientKnowledge('tomato',['番茄','西红柿'],'番茄怎么选','熟红番茄较易炒出汁，硬实番茄更能保留块形。','出汁更酸甜浓郁，块形更有咀嚼感。','要浓酱可多炒一会儿，要块形后下或轻翻。','罐装番茄可能更浓，按味道分次加水调整。','不确定番茄酸度时不要先加大量糖。'),
 new IngredientKnowledge('bean',['豆角','四季豆'],'豆角要熟透','不同豆角长度、纤维和厚度不同，老筋需去除。','充分熟制后由生硬转为熟软。','焖煮或焯后炒均可，确保全部熟透。','不能用豌豆荚的短炒时间直接替换四季豆。','四季豆等生食或未熟可致不适；不以变绿作为熟透证据。'),
 new IngredientKnowledge('dairy',['牛奶','酸奶','奶油'],'乳制品别混换','牛奶稀，淡奶油脂肪较高；酸奶有酸味、凝乳和糖含量差异。','影响奶香、稠度与热量。','奶类汤酱避免不必要的大火久滚，按配方缓缓加入。','含糖酸奶不能等量替代咸味酱汁里的牛奶。','乳糖不耐与牛奶蛋白过敏不同；过敏者查替代品成分。')
];
// Supplementary cards do not alter source step facts or stored editorialGuide snapshots.
COOKING_KNOWLEDGE.push(
 new IngredientKnowledge('lotus',['莲藕','藕'],'藕先分脆糯','脆藕适合快炒、凉拌；粉糯藕适合炖汤。孔数只能作参考，采购时询问品种和用途。','脆藕爽口、粉藕绵糯；相同时间不保证相同软硬。','炒藕薄切、短时加热；汤藕切块，依品种观察软化。','不能仅靠延长几分钟把脆藕变成粉藕。','切片变色可短时清水浸泡，及时烹调，变质异味勿食。'),
 new IngredientKnowledge('coconut',['椰奶','椰浆'],'椰奶与椰浆','椰浆通常更浓、脂肪更高；椰奶饮料可能额外含糖。','影响浓稠度、椰香与甜度。','咸味咖喱优先选择无糖烹饪椰浆，按包装处理。','饮料型椰奶不能直接等量替代浓椰浆。','牛奶过敏者仍需核对椰奶产品是否混有乳成分。'),
 new IngredientKnowledge('butter',['黄油'],'有盐和无盐黄油','无盐黄油更便于控制咸度；有盐黄油的盐量依品牌而异。','增加奶香和润泽，熔化后水分会蒸发。','烘焙配方有指定时优先遵循，炒煎避免烧焦。','有盐黄油替换无盐黄油时减少另加盐；植物抹酱含水率不一定相同。','含乳蛋白，奶过敏者需核对配料。'),
 new IngredientKnowledge('leaven',['酵母','泡打粉','小苏打'],'膨松剂不能随意混换','酵母依靠发酵；泡打粉是复配化学膨松剂；小苏打需配方酸碱和用量配合。','分别影响发酵香、蓬松与碱味。','按可靠配方称量；酵母发酵受温度和时间影响。','三者不能按相同克数直接互换。','不要通过额外加碱代替足够发酵，过量会影响味道。'),
 new IngredientKnowledge('stock',['高汤','浓汤宝','清汤'],'汤底先核对咸度','自制无盐高汤、盒装高汤、浓缩汤料的盐和浓度不同。','影响鲜味、油脂、咸度与汤汁浓稠度。','浓缩汤料先按包装稀释，最后尝熟汤再补盐。','清水可替代汤底但风味较淡；不将浓缩汤料和清水按相同毫升互换。','浓汤宝可能含小麦、乳、海鲜等过敏原，核对标签。'),
 new IngredientKnowledge('frozen',['冷冻','速冻'],'冷冻食材先看生熟','速冻生肉、生虾与熟制半成品的处理要求不同。','表面冰霜和解冻出水会改变煎炒效果。','按包装决定是否解冻；生肉优先冷藏解冻，解冻汁避免接触即食食物。','冷冻同名食材不能直接套用鲜品固定分钟数。','生熟分开，厚处充分熟透；不要用常温放一整天的方式解冻。')
);
export function knowledgeFor(name: string): IngredientKnowledge[] { return COOKING_KNOWLEDGE.filter((k: IngredientKnowledge) => k.aliases.some((alias: string) => name.includes(alias))); }
export class GuideStep { title: string = ''; instruction: string = ''; ingredients: string = ''; heat: string = ''; time: string = ''; checkpoint: string = ''; }
export class TechniqueAdvice {pattern:string='';tip:string='';constructor(pattern:string,tip:string){this.pattern=pattern;this.tip=tip;}}
export const TECHNIQUE_ADVICE:TechniqueAdvice[]=[
new TechniqueAdvice('番茄炒蛋|西红柿炒蛋','鸡蛋先炒至凝固盛出，再炒番茄出汁后合拌；减少反复加热，口感更嫩。'),new TechniqueAdvice('蒸蛋|鸡蛋羹','蛋液充分混匀后过滤，容器遮盖防止冷凝水滴入；中部应凝固，无流动生蛋液。'),new TechniqueAdvice('红烧肉','肉块擦干再下锅，避免溅油；焖至筷子可轻插，收汁时翻动防止糖汁焦苦。'),new TechniqueAdvice('土豆丝','切丝粗细尽量一致，冲去表面淀粉并沥干；下锅后勤翻，按希望的脆软度确认。'),new TechniqueAdvice('宫保鸡丁','生鸡肉与熟食用具分开，鸡丁切均匀且充分熟透；花生最后加入以保留脆感。'),new TechniqueAdvice('麻婆豆腐','嫩豆腐滑、老豆腐更定形；加芡前先尝咸度，轻推锅底避免碎裂，芡汁少量分次加。'),new TechniqueAdvice('清蒸鱼','鱼身厚度影响蒸制时间，不套用固定分钟；最厚处应熟透，生熟工具分开。'),new TechniqueAdvice('糖醋排骨','排骨大小尽量一致，先确保内部熟透；糖醋汁最后收浓，粘锅时及时减火。'),new TechniqueAdvice('炒青菜|炒菠菜|蒜蓉西兰花','洗净后沥水，菜梗与菜叶按易熟程度先后下锅；锅小则分批炒，减少焖煮出水。'),new TechniqueAdvice('粥','锅内预留防溢空间，沸后调小火并不时搅底；浓稠时更易粘锅，勿只凭时间判断。'),new TechniqueAdvice('炒饭','米饭保持冷藏并及时食用，勿长时间常温放置；炒散且彻底热透，避免反复冷却加热。'),new TechniqueAdvice('煎豆腐','优先用较紧实的老豆腐，表面轻吸水；底面成形后再翻，减少碎裂和溅油。')
];
export function techniqueAdvice(recipe:GuideRecipe):string[]{return TECHNIQUE_ADVICE.filter((a:TechniqueAdvice)=>new RegExp(a.pattern).test(recipe.name)).map((a:TechniqueAdvice)=>a.tip);}
export class CookingGuide { summary: string = ''; equipment: string[] = []; version: number = 1; style: string = '食库统一步骤卡'; preparation: string[] = []; steps: GuideStep[] = []; needsReview: boolean = false; note: string = '保留来源事实并统一编排；未注明的火候、时间和分步用量不编造。'; }
export interface GuideRecipe extends CoreRecipe { equipment?: string[]; people?: number; tips?: string; needsQuantityReview?: boolean; }
export function cleanInstruction(text: string): string { return text.replace(/!\[[^\]]*\]\([^)]*\)/g,'（原文含图示，可在来源核对）').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*#`]/g,'').replace(/^\s*\d+[、.．)）]\s*/,'').replace(/\s+/g,' ').replace(/。+/g,'。').trim(); }
export function buildCookingGuide(recipe: GuideRecipe): CookingGuide {
 const guide: CookingGuide = new CookingGuide(); guide.needsReview = Boolean(recipe.needsQuantityReview);
 guide.summary = recipe.name + ' · 以' + recipe.ingredients.filter((i: CoreIngredient) => !i.optional).slice(0,4).map((i: CoreIngredient) => i.name).join('、') + '为主，按下方备料、下锅和收尾顺序完成。';
 const methodText: string = (recipe.steps || []).join(' '); guide.equipment = ['刀与砧板（生熟分开）','称量工具与备料碗']; if (/蒸/.test(methodText)) { guide.equipment.push('蒸锅、耐热容器与防烫工具'); } if (/烤|空气炸锅/.test(methodText)) { guide.equipment.push('烤箱 / 空气炸锅，依原步骤选用'); } if (/炒|煎/.test(methodText)) { guide.equipment.push('炒锅 / 平底锅与锅铲'); } if (/煮|炖|煲/.test(methodText)) { guide.equipment.push('煮锅 / 炖锅，保留防溢空间'); }
 guide.equipment = guide.equipment.concat(recipe.equipment || []);
 guide.preparation = recipe.ingredients.map((i: CoreIngredient) => i.name + ' · ' + (i.quantity > 0 ? '参考总量 ' + i.quantity + i.unit : '用量待确认') + (i.optional ? '（调味 / 可选）' : ''));
 for (const raw of recipe.steps || []) {
  const instruction: string = cleanInstruction(raw); if (!instruction) { continue; }
  if (guide.steps.some((s: GuideStep) => s.instruction === instruction)) { continue; }
  const step: GuideStep = new GuideStep(); step.instruction = instruction;
  step.title = /^(最后[，,]?|然后[，,]?)?(装盘|盛出|出锅|关火)/.test(instruction) ? '收尾装盘' : /蒸/.test(instruction) ? '蒸制' : /煲|炖|焖/.test(instruction) ? '焖炖入味' : /炒|煸/.test(instruction) ? '下锅翻炒' : /煎|炸|烤/.test(instruction) ? '煎炸烤制' : /煮|焯/.test(instruction) ? '煮制' : /洗|切|打散|腌|解冻|浸泡|沥/.test(instruction) ? '处理与备料' : /拌/.test(instruction) ? '混合拌匀' : '按序操作';
  const heat: RegExpMatchArray | null = instruction.match(/中小火|中大火|小火|大火|中火|微沸|沸水|水开|\d+\s*[°℃度]+/g); step.heat = heat && /火|蒸|煮|炒|煎|炸|烤|炖|焖|煲|沸/.test(instruction) ? heat.join(' / ') : '';
  const time: RegExpMatchArray | null = instruction.match(/(?:约|至少|再)?\s*\d+(?:\.\d+)?\s*(?:(?:-|～|~|至|到)\s*\d+(?:\.\d+)?)?\s*(?:小时|分钟|秒钟|秒)/g); step.time = time ? time.join(' / ') : '';
  const names: string[] = recipe.ingredients.filter((i: CoreIngredient) => instruction.includes(i.name)).map((i: CoreIngredient) => i.name);
  const doses: RegExpMatchArray | null = instruction.match(/\d+(?:\.\d+)?\s*(?:g|kg|ml|mL|L|克|千克|毫升|升|勺|茶匙|汤匙|个|片|瓣|根|块|只|倍)/g);
  step.ingredients = (names.length ? names.join('、') : '') + (doses ? (names.length ? ' · ' : '') + doses.join('、') : '');
  const point: RegExpMatchArray | null = instruction.match(/(?:直至|直到|确认|观察)[^。；]{2,45}/); step.checkpoint = point ? point[0] : '';
  guide.steps.push(step);
 }
 return guide;
}

export class CookingChecklist { preparation:string[]=[]; checkpoints:string[]=[]; pitfalls:string[]=[]; unknownIngredients:string[]=[]; }
/** A compact task checklist; quantities remain recipe totals and unknowns are never synthesized. */
export function buildCookingChecklist(recipe:GuideRecipe):CookingChecklist {
 const out:CookingChecklist=new CookingChecklist();const guide:CookingGuide=buildCookingGuide(recipe);
 out.unknownIngredients=recipe.ingredients.filter((i:CoreIngredient)=>!i.optional&&(!Number.isFinite(i.quantity)||i.quantity<=0)).map((i:CoreIngredient)=>i.name);
 out.preparation=guide.steps.filter((s:GuideStep)=>s.title==='处理与备料').map((s:GuideStep)=>s.instruction);
 out.checkpoints=guide.steps.filter((s:GuideStep)=>Boolean(s.checkpoint)).map((s:GuideStep)=>s.checkpoint).filter((value:string,index:number,values:string[])=>values.indexOf(value)===index);
 if(recipe.ingredients.some((i:CoreIngredient)=>/生抽|老抽|酱油|蚝油|豆瓣|高汤|浓汤宝/.test(i.name))){out.pitfalls.push('多种含盐调料一起用，最后尝熟菜再补盐。');}
 if(recipe.ingredients.some((i:CoreIngredient)=>/干木耳|干香菇|银耳|干豆/.test(i.name))){out.pitfalls.push('先确认干重或泡发后重量，泡发时间另留。');}
 if(out.unknownIngredients.length){out.pitfalls.push('主料用量待核对：'+out.unknownIngredients.join('、')+'。');}
 out.pitfalls.push('分步未注明独立用量时，备料总量只分配一次。');return out;
}
