import { canonicalName, CoreRecipe } from './RecommendationCore';

export class IngredientGroup {
 id:string; label:string; names:string[];
 constructor(id:string,label:string,names:string[]) {this.id=id;this.label=label;this.names=names;}
}
export const INGREDIENT_GROUPS:IngredientGroup[]=[
 new IngredientGroup('pork','猪肉类',['猪肉','五花肉','瘦猪肉','猪瘦肉','猪里脊','里脊肉','猪排骨','排骨','猪蹄','猪肝','猪骨','猪肉馅','猪肉末']),
 new IngredientGroup('beef','牛肉类',['牛肉','牛腩','牛排','牛里脊','牛肉末','肥牛']),
 new IngredientGroup('lamb','羊肉类',['羊肉','羊排','羊腿','肥羊']),
 new IngredientGroup('poultry','鸡鸭禽肉',['鸡肉','鸡胸肉','鸡腿','鸡翅','鸭肉','鸭腿','鸭胸','整鸡','整鸭']),
 new IngredientGroup('fish','鱼类',['鱼肉','鲈鱼','鲫鱼','草鱼','鳕鱼','三文鱼','带鱼','黄鱼','鲅鱼','龙利鱼','巴沙鱼','鲢鱼']),
 new IngredientGroup('seafood','虾蟹贝类',['虾','虾仁','对虾','基围虾','螃蟹','蟹肉','蛤蜊','花蛤','扇贝','鱿鱼','牡蛎']),
 new IngredientGroup('egg','蛋类',['鸡蛋','鸭蛋','鹌鹑蛋','咸鸭蛋','皮蛋']),
 new IngredientGroup('tofu','豆腐豆制品',['豆腐','嫩豆腐','老豆腐','北豆腐','南豆腐','内酯豆腐','豆干','豆皮','腐竹','千张']),
 new IngredientGroup('greens','绿叶蔬菜',['青菜','小白菜','白菜','菠菜','油麦菜','生菜','油菜','空心菜','芥蓝','苋菜','茼蒿']),
 new IngredientGroup('roots','根茎瓜果',['土豆','番茄','胡萝卜','白萝卜','南瓜','冬瓜','黄瓜','茄子','莲藕','山药','西葫芦']),
 new IngredientGroup('mushroom','菌菇类',['香菇','蘑菇','口蘑','杏鲍菇','金针菇','平菇','木耳','银耳','茶树菇']),
 new IngredientGroup('staple','米面主食',['大米','米饭','面粉','面条','米粉','粉丝','燕麦','糯米','小米','玉米'])
];
export function ingredientMatches(actual:string,requested:string):boolean {
 const value=canonicalName(actual);const target=canonicalName(requested);
 const broad:string=requested==='猪肉'?'pork':requested==='牛肉'?'beef':requested==='羊肉'?'lamb':requested;
 const group=INGREDIENT_GROUPS.find((g:IngredientGroup)=>g.id===broad||g.label===broad);
 if(requested==='豆腐'){return /豆腐/.test(value);}
 if(group?.id==='pork'&&/牛|羊|鸡|鸭/.test(value)){return false;}
 return group?group.names.some((name:string)=>value===canonicalName(name)||value.includes(canonicalName(name))):value===target||actual.split(/[、,，/]|\s+or\s+|或者|或/).some((part:string)=>canonicalName(part)===target);
}
export function ingredientGroupFor(name:string):string {
 const g=INGREDIENT_GROUPS.find((group:IngredientGroup)=>group.id===name||group.label===name)||INGREDIENT_GROUPS.find((group:IngredientGroup)=>ingredientMatches(name,group.id));return g?g.id:'';
}
export function recipeHasIngredient(recipe:CoreRecipe,name:string):boolean {
 return recipe.ingredients.some(i=>ingredientMatches(i.name,name));
}
export function ingredientLabel(value:string):string{return INGREDIENT_GROUPS.find((g:IngredientGroup)=>g.id===value)?.label||value;}
