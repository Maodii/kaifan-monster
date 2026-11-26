import { CoreRecipe, CoreIngredient, recipeMinutes, recipeGroupKey } from './recommend-core';
import { MenuRecipe, estimateRecipeCost, RecipeCost } from './usability-core';

/** Product navigation groups: eight traditional cuisines plus other regional food.
 * Generic home cooking, foreign food and absent metadata remain unclassified. */
export class CuisineGroup {
 id: string; label: string; regions: string[];
 constructor(id: string, label: string, regions: string[]) { this.id=id; this.label=label; this.regions=regions; }
}
export const CUISINE_GROUPS: CuisineGroup[] = [
 new CuisineGroup('川菜','川菜',['四川','川菜']), new CuisineGroup('粤菜','粤菜',['广东','粤菜']),
 new CuisineGroup('鲁菜','鲁菜',['山东','鲁菜']), new CuisineGroup('苏菜','苏菜',['江苏','苏菜']),
 new CuisineGroup('浙菜','浙菜',['浙江','浙菜']), new CuisineGroup('闽菜','闽菜',['福建','闽菜']),
 new CuisineGroup('湘菜','湘菜',['湖南','湘菜']), new CuisineGroup('徽菜','徽菜',['安徽','徽菜']),
 new CuisineGroup('其他地方菜','其他地方菜',['西北','东北','华北','云贵','广西','港台','湖北','江西','云南','海南','贵州','陕西','山西','河南','河北','北京','天津','重庆','甘肃','宁夏','新疆','内蒙古','青海','西藏','台湾','香港','澳门','其他地方菜'])
];
export function recipeCuisineGroup(recipe: CoreRecipe): string {
 // Explicit cuisine wins; province is only a navigation fallback, not proof of culinary origin.
 for (const value of [recipe.cuisine || '', recipe.region || '']) {
  const group: CuisineGroup | undefined = CUISINE_GROUPS.find((g: CuisineGroup) => g.regions.includes(value));
  if (group) { return group.id; }
 }
 return '';
}
export function normalizeSearch(value: string): string {
 return value.replace(/[Ａ-Ｚａ-ｚ０-９]/g,(s: string) => String.fromCharCode(s.charCodeAt(0)-65248)).toLowerCase().replace(/\s+/g,' ').trim();
}
export function equivalentText(value: string): string {
 return normalizeSearch(value).replace(/西红柿/g,'番茄').replace(/马铃薯/g,'土豆').replace(/芫荽/g,'香菜').replace(/生抽酱油/g,'生抽');
}
export class SearchMatch { matched: boolean = false; score: number = 0; reasons: string[] = []; }
/** All whitespace/comma-separated terms must match a field; fields are never concatenated.
 * Deliberately no guessed Chinese word segmentation or fuzzy ingredient substitutions. */
export function searchRecipe(recipe: CoreRecipe, query: string): SearchMatch {
 const out: SearchMatch = new SearchMatch();
 const terms: string[] = equivalentText(query).split(/[\s,，、;；]+/).filter((v: string,i: number,a: string[]) => !!v && a.indexOf(v)===i);
 if (!terms.length) { out.matched=true; return out; }
 const name: string = equivalentText(recipe.name);
 const aliases: string[] = (recipe.aliases || []).map((s: string) => equivalentText(s));
 const ingredients: string[] = recipe.ingredients.map((i: CoreIngredient) => equivalentText(i.name));
 const regions: string[] = [recipe.region || '',recipe.cuisine || '',recipeCuisineGroup(recipe)].map((s: string) => equivalentText(s));
 for (const term of terms) {
  let points: number = 0; let reason: string = '';
  if (name===term) { points=120; reason='菜名完全匹配'; }
  else if (aliases.includes(term)||recipeGroupKey({id:'',name:term,ingredients:[]})===recipeGroupKey(recipe)) { points=100; reason='菜名别名或同菜做法匹配'; }
  else if (name.startsWith(term)) { points=80; reason='菜名开头匹配'; }
  else if (name.includes(term)) { points=65; reason='菜名包含关键词'; }
  else if (aliases.some((v: string) => v.includes(term))) { points=55; reason='菜名别名包含关键词'; }
  else if (ingredients.includes(term)) { points=40; reason='原料匹配'; }
  else if (ingredients.some((v: string) => v.includes(term))) { points=25; reason='原料包含关键词'; }
  else if (regions.includes(term)) { points=20; reason='菜系或地区匹配'; }
  else if (regions.some((v: string) => v.includes(term))) { points=10; reason='菜系或地区包含关键词'; }
  if (!points) { return new SearchMatch(); }
  out.score+=points;
  if (!out.reasons.includes(reason)) { out.reasons.push(reason); }
 }
 out.matched=true; return out;
}
/** Unknown values always last, in either direction. No subtraction of infinities. */
function compareKnown(a: number, b: number, descending: boolean): number {
 const ak: boolean=Number.isFinite(a)&&a>=0; const bk: boolean=Number.isFinite(b)&&b>=0;
 if (ak!==bk) { return ak?-1:1; } if (!ak) { return 0; }
 return descending?b-a:a-b;
}
export function compareRecipeOrder(a: MenuRecipe,b: MenuRecipe,order: string,query: string = '',people: number = 2): number {
 let value: number=0;
 if (order==='价格升序'||order==='价格降序') {
  const ac: RecipeCost=estimateRecipeCost(a,people); const bc: RecipeCost=estimateRecipeCost(b,people);
  value=compareKnown(ac.usable?ac.total:-1,bc.usable?bc.total:-1,order==='价格降序');
 } else if (order==='耗时升序'||order==='耗时降序') {
  value=compareKnown(recipeMinutes(a)||-1,recipeMinutes(b)||-1,order==='耗时降序');
 } else if (query.trim()) { value=searchRecipe(b,query).score-searchRecipe(a,query).score; }
 // Recommendation ties preserve personalized order; library's comprehensive order is stable across feedback/batches.
 if (value) { return value; }
 if (order==='推荐') { return 0; }
 return a.name.localeCompare(b.name)||a.id.localeCompare(b.id);
}
export class RecipeVariantGroup {
 key: string = ''; name: string = ''; recipes: CoreRecipe[] = [];
}
/** Keeps every independent recipe object/ID, in input order; the first is the display representative. */
export function groupRecipeVariants(recipes: CoreRecipe[]): RecipeVariantGroup[] {
 const groups: RecipeVariantGroup[]=[];
 for (const recipe of recipes) {
  const key: string=recipeGroupKey(recipe);
  let group: RecipeVariantGroup | undefined=groups.find((g: RecipeVariantGroup) => g.key===key);
  if (!group) { group=new RecipeVariantGroup(); group.key=key; group.name=recipe.name; groups.push(group); }
  group.recipes.push(recipe);
 }
 return groups;
}
export { recipeGroupKey } from './recommend-core';
