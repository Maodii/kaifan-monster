import { FilterRecipe } from './RecipeFilterCore';
import { MenuRecipe, HistoryFood } from './UsabilityCore';
import { GuideRecipe } from './CookingGuide';
import { CoreIngredient, coreExpiry, CoreFood, CoreRecipe, CoreMeal, CoreMealItem, compatibleUnit, CoreRank, RankingOptions, PreferenceEvent, rankPersonalized } from './RecommendationCore';
export class FoodMovement { id: string = ''; date: string = ''; quantity: number = 0; cost: number = 0; reason: string = 'consumed'; recipeName: string = ''; before: number = 0; after: number = 0; }
export class Food implements CoreFood, HistoryFood {
 openedAt:string=''; openedExpiry:string='';
 purchasedQuantity: number = -1; purchasePrice: number = -1; movements: FoodMovement[] = [];
 id: string = ''; name: string = ''; category: string = '蔬菜'; location: string = '冷藏室';
 quantity: number = 1; unit: string = '个'; purchasedAt: string = ''; expiryDate: string = '';
 estimatedPrice: number = 0; notes: string = ''; tags: string = ''; batch: string = '';
 localPhoto: string = ''; photoOriginal: string = ''; cloudPhoto: string = ''; archived: boolean = false;
 version: number = 0; deviceId: string = ''; modifiedAt: string = ''; familyId: string = ''; archiveReason: string = ''; consumedCost: number = 0; wastedCost: number = 0; muted: boolean = false;
}
export class Shopping {
 familyId: string = '';
 id: string = ''; name: string = ''; quantity: number = 1; unit: string = '个'; category: string = '其他';
 notes: string = ''; purchased: boolean = false; modifiedAt: string = ''; version: number = 0;
}
export class Ingredient implements CoreIngredient {
 optional: boolean = false; amountText: string = ''; quantitySource: string = ''; quantityBasis: string = '';
 name: string = ''; quantity: number = 0; unit: string = 'g';
 constructor(name: string, quantity: number, unit: string) { this.name = name; this.quantity = quantity; this.unit = unit; }
}
export class RecipeSource { url: string = ''; platform: string = ''; author: string = ''; ingredients: string[] = []; }
export class Recipe implements CoreRecipe, MenuRecipe, GuideRecipe, FilterRecipe {
 originRecipeId:string='';
 aliases: string[] = []; dishGroupId: string = ''; variantLabel: string = '';
 equipment: string[] = [];
 mealOccasions: string[] = [];
 referenceSources: RecipeSource[] = [];
 dietTags: string[] = []; calories: number = -1; protein: number = -1; caloriesSource: string = '未记录';
 region: string = '通用家常'; category: string = '家常菜'; prepMinutes: number = 5; cookMinutes: number = 10; timeEstimated: boolean = true; costKnown: boolean = true;
 ingredientsRaw: string[] = []; sourceName: string = '食库预置'; sourceUrl: string = ''; sourceLicense: string = ''; sourceRevision: string = ''; imageKey: string = '';
 needsQuantityReview: boolean = false; servingsNote: string = ''; methodNotes: string = '';
 familyId: string = '';
 version: number = 0; modifiedAt: string = ''; status: string = 'private'; cuisine: string = '家常'; difficulty: string = '简单';
 id: string = ''; name: string = ''; taste: string = '清淡'; minutes: number = 15; people: number = 2;
 estimatedCost: number = 0; ingredients: Ingredient[] = []; steps: string[] = []; tips: string = '';
}
export class MealItem implements CoreMealItem {
 calories: number = -1;
 name: string = ''; estimatedCost: number = 0; recipeId: string = ''; category: string = '家常';
 constructor(name: string, cost: number, recipeId: string = '', category: string = '家常') { this.name = name; this.estimatedCost = cost; this.recipeId = recipeId; this.category = category; }
}
export class Meal implements CoreMeal {
 protein:number=-1;proteinSource:string='未记录';aiEstimateRange:string='';
 portionSize:string='normal';
 energyReference:number=-1;consumedFraction:number=1;
 financeFood:number=-1;deliveryFee:number=0;discount:number=0;splitPeople:number=1;personalShares:number=1;personalCost:number=-1;mealTotal:number=-1;sourceMealId:string='';leftoverPortions:number=0;trialOutcome:string='未评价';actualMinutes:number=0;trialSubstitution:string='';trialFailure:string='';
 diningMode: string = '在家做'; place: string = ''; rating: number = 0; calories: number = -1; calorieSource: string = '未记录'; costType: string = '估算';
 items: MealItem[] = [];
 familyId: string = '';
 id: string = ''; name: string = ''; mealType: string = '晚餐'; date: string = ''; estimatedCost: number = 0;
 notes: string = ''; tags: string = ''; localPhoto: string = ''; cloudPhoto: string = '';
 photoOriginal: string = ''; photoId: string = ''; photoStatus: string = ''; visibility: string = 'private'; recipeId: string = ''; modifiedAt: string = ''; version: number = 0;
}
export class Change {
 changeId: string = ''; entityId: string = ''; entityType: string = ''; operation: string = 'upsert';
 baseVersion: number = 0; modifiedAt: string = ''; payload: string = ''; deviceId: string = '';
}
export class Template {
 familyId: string = '';
 id: string = ''; version: number = 0; modifiedAt: string = ''; name: string = ''; category: string = ''; days: number = 7; location: string = '冷藏室'; unit: string = '个'; barcode: string = '';
 constructor(name: string, category: string, days: number, location: string, unit: string) {
  this.name = name; this.category = category; this.days = days; this.location = location; this.unit = unit;
 }
}
export function dateString(date: Date): string {
 return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function daysLeft(food: Food): number {
 const today: Date = new Date(); return Math.round((Date.UTC(Number(coreExpiry(food).slice(0,4)), Number(coreExpiry(food).slice(5,7))-1, Number(coreExpiry(food).slice(8,10))) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
}
export function safeQuantity(value: string): number { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : 0; }
export const CATEGORIES: string[] = ['蔬菜', '肉禽水产', '蛋奶', '干货', '水果', '调味品', '其他'];
export const UNITS: string[] = ['g', 'kg', '个', '盒', '瓶', 'L', '袋', 'mL', '根', '片', '瓣', '块', '只', '碗', '杯', '把', '条'];
export const TEMPLATES: Template[] = [
 new Template('鸡蛋', '蛋奶', 21, '冷藏室', '个'), new Template('牛奶', '蛋奶', 7, '冷藏室', '盒'),
 new Template('西红柿', '蔬菜', 5, '冷藏室', '个'), new Template('青菜', '蔬菜', 3, '冷藏室', 'g'),
 new Template('猪骨', '肉禽水产', 3, '冷藏室', 'g'), new Template('菜干', '干货', 180, '橱柜', 'g'),
 new Template('大米', '干货', 180, '橱柜', 'kg'), new Template('苹果', '水果', 14, '冷藏室', '个')
];
export function offlineRecipes(): Recipe[] {
 const a: Recipe = new Recipe(); a.id = 'tomato-eggs'; a.name = '番茄炒蛋'; a.estimatedCost = 8; a.taste = '酸甜';
 a.ingredients = [new Ingredient('西红柿', 2, '个'), new Ingredient('鸡蛋', 3, '个')];
 a.steps = ['西红柿洗净切块，鸡蛋打散。', '热锅少油，将蛋液炒至凝固，盛出备用。', '炒软西红柿，加入鸡蛋翻炒，按口味调味后出锅。']; a.tips = '先炒鸡蛋再炒番茄，口感更嫩。';
 const b: Recipe = new Recipe(); b.id = 'greens'; b.name = '清炒时蔬'; b.estimatedCost = 5; b.minutes = 10;
 b.ingredients = [new Ingredient('青菜', 300, 'g')]; b.steps = ['青菜洗净沥干，切去老根。', '热锅下油，放入青菜大火快炒。', '菜叶变软后加少量盐，拌匀即可。'];
 const c: Recipe = new Recipe(); c.id = 'soup'; c.name = '菜干猪骨汤'; c.estimatedCost = 28; c.minutes = 90;
 c.ingredients = [new Ingredient('猪骨', 500, 'g'), new Ingredient('菜干', 50, 'g')]; c.steps = ['菜干提前浸泡，洗净切段。', '猪骨焯水后冲洗干净。', '加入足量清水，煮开后小火煲约一小时。', '加菜干继续煲至软烂，最后调味。'];
 const d: Recipe = new Recipe(); d.id = 'steamed-eggs'; d.name = '嫩滑蒸蛋'; d.minutes = 20; d.estimatedCost = 4;
 d.ingredients = [new Ingredient('鸡蛋', 2, '个')]; d.steps = ['鸡蛋打散，加入约1.5倍温水。', '过筛入碗，盖上耐热盖。', '水开后中小火蒸约10分钟，确认熟透后食用。'];
 a.region = '通用家常'; b.region = '通用家常'; c.region = '广东'; c.cuisine = '广东'; c.category = '汤类'; d.region = '通用家常'; d.category = '快手菜'; return [a, b, c, d];
}
export class Recommendation {
 score: number = 0; reasons: string[] = []; coverage: number = 0; learned: number = 0;
 recipe: Recipe; urgent: number = 0; matched: number = 0; missing: string[] = []; recent: boolean = false;
 constructor(recipe: Recipe) { this.recipe = recipe; }
}
export function recommend(recipes: Recipe[], foods: Food[], meals: Meal[], excluded: string, taste: string, recentDays: number, options: RankingOptions = new RankingOptions(), events: PreferenceEvent[] = []): Recommendation[] {
 options.excluded = excluded.split(/[,，、]/).map((v: string) => v.trim()).filter((v: string) => v.length > 0); options.taste = taste; options.recentDays = recentDays;
 return rankPersonalized(recipes,foods,meals,events,options).map((row: CoreRank) => { const recipe: Recipe = recipes.find((r: Recipe) => r.id === row.recipeId)!; const r: Recommendation = new Recommendation(recipe); r.urgent = row.urgent; r.matched = row.matched; r.missing = row.missing.map((i) => i.unknown ? i.name + '（用量待确认）' : i.name + ' ' + Math.round(i.quantity * 100) / 100 + i.unit); r.recent = row.recent; r.score = row.score; r.coverage = row.coverage; r.reasons = row.reasons; r.learned = row.learned; return r; });
}

export function validDate(value: string): boolean { const d: Date = new Date(value + 'T12:00:00'); return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(d.getTime()) && dateString(d) === value; }
export function unitFactor(from: string, to: string): number { return compatibleUnit(from,to); }

export class Favorite { id: string = ''; recipeId: string = ''; version: number = 0; modifiedAt: string = ''; }
