import { uiIcon } from './UiIconMap';
import { Recipe } from './Models';
import { builtinRecipeCover } from './RecipeCoverMap';
export function categoryImage(category:string):Resource{
 if(category==='快手菜'){return uiIcon('quick');}if(category==='汤类'){return uiIcon('soup');}if(category==='粥类'){return uiIcon('porridge');}if(category==='大菜'){return uiIcon('feast');}if(category==='主食'){return uiIcon('staples');}if(category==='早餐'){return uiIcon('breakfast');}if(category==='凉菜'){return uiIcon('cold');}if(category==='甜点'){return uiIcon('dessert');}if(category==='减脂餐'){return uiIcon('light');}if(category==='高蛋白'){return uiIcon('protein');}return uiIcon('home');
}
export function recipeCover(recipe: Recipe): Resource {
 const cover: Resource | undefined = builtinRecipeCover(recipe.id);
 return cover || uiIcon('recipes');
}
export function avatarImage(key: string): Resource {
 if (key === 'cat') { return $r('app.media.avatar_editorial_cat'); } if (key === 'rice') { return $r('app.media.avatar_editorial_rice'); } if (key === 'mushroom') { return $r('app.media.avatar_editorial_mushroom'); } return $r('app.media.avatar_editorial_tomato');
}

export function occasionImage(key:string):Resource{
 if(key==='lunch'){return $r('app.media.meal_lunch');}
 if(key==='dinner'){return $r('app.media.meal_dinner');}
 if(key==='snack'){return $r('app.media.meal_snack');}
 return $r('app.media.ui_breakfast');
}
