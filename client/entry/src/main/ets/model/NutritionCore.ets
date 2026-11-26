import { CoreIngredient, canonicalName, compatibleUnit } from './RecommendationCore';
export class NutritionReference {
 name:string; kcal:number; protein:number; fat:number; carbs:number;
 constructor(name:string,kcal:number,protein:number,fat:number,carbs:number){this.name=name;this.kcal=kcal;this.protein=protein;this.fat=fat;this.carbs=carbs;}
}
/** Editable approximate raw-food references per 100g; never a medical or lab measurement. */
export const NUTRITION_REFERENCES:NutritionReference[]=[
 new NutritionReference('鸡蛋',144,13.3,8.8,2.8),new NutritionReference('鸡胸肉',133,19.4,5,2.5),
 new NutritionReference('瘦猪肉',143,20.3,6.2,1.5),new NutritionReference('五花肉',395,13.2,37,2.4),
 new NutritionReference('牛肉',125,19.9,4.2,2),new NutritionReference('虾仁',93,18.6,0.8,2.8),
 new NutritionReference('三文鱼',139,17.2,7.8,0),new NutritionReference('老豆腐',98,12.2,4.8,2),
 new NutritionReference('嫩豆腐',62,6.2,2.5,2.4),new NutritionReference('番茄',15,0.9,0.2,3.5),
 new NutritionReference('土豆',81,2.6,0.2,17.8),new NutritionReference('胡萝卜',39,1,0.2,8.8),
 new NutritionReference('白菜',20,1.6,0.2,3.4),new NutritionReference('菠菜',28,2.6,0.3,4.5),
 new NutritionReference('黄瓜',16,0.8,0.2,2.9),new NutritionReference('西兰花',36,4.1,0.6,4.3),
 new NutritionReference('香菇',26,2.2,0.3,5.2),new NutritionReference('大米',346,7.4,0.8,77.9),
 new NutritionReference('米饭',116,2.6,0.3,25.9),new NutritionReference('面粉',350,11.2,1.5,73.6),
 new NutritionReference('食用油',899,0,99.9,0),new NutritionReference('白糖',400,0,0,100)
];
export class NutritionEstimate {
 kcal:number=0;protein:number=0;fat:number=0;carbs:number=0;knownGrams:number=0;matched:number=0;total:number=0;missing:string[]=[];
 complete:boolean=false;perServingKcal:number=0;perServingProtein:number=0;reference:string='按生重及编辑参考值估算，非检测值';
}
export function estimateNutrition(ingredients:CoreIngredient[],people:number):NutritionEstimate{
 if(!Number.isInteger(people)||people<1||people>20){throw new Error('营养份数须为1–20人');}
 const out=new NutritionEstimate();out.total=ingredients.length;
 for(const ingredient of ingredients){
  const name=canonicalName(ingredient.name);
  if(/^(水|清水|开水|热水|凉水|盐|食盐)$/.test(name)){out.matched++;continue;}
  const ref=NUTRITION_REFERENCES.find((row:NutritionReference)=>canonicalName(row.name)===name);
  let grams=ingredient.quantity*compatibleUnit(ingredient.unit,'g');
  if(name===canonicalName('鸡蛋')&&ingredient.unit==='个'){grams=ingredient.quantity*50;}
  if(!ref||!Number.isFinite(grams)||grams<=0){out.missing.push(ingredient.name);continue;}
  out.matched++;out.knownGrams+=grams;out.kcal+=ref.kcal*grams/100;out.protein+=ref.protein*grams/100;out.fat+=ref.fat*grams/100;out.carbs+=ref.carbs*grams/100;
 }
 out.complete=out.total>0&&out.missing.length===0;out.kcal=Math.round(out.kcal);out.protein=Math.round(out.protein*10)/10;out.fat=Math.round(out.fat*10)/10;out.carbs=Math.round(out.carbs*10)/10;
 out.perServingKcal=Math.round(out.kcal/people);out.perServingProtein=Math.round(out.protein/people*10)/10;return out;
}
