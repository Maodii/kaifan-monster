import { Meal, MealItem } from './Models';
export class DishSummary { name: string = ''; count: number = 0; estimatedCost: number = 0; }
export function mealItems(meal: Meal): MealItem[] { return Array.isArray(meal.items) && meal.items.length > 0 ? meal.items : [new MealItem(meal.name, meal.estimatedCost, meal.recipeId)]; }
export function validateMealItems(items: MealItem[]): void {
 if (items.length > 40 || items.some((item: MealItem) => !item.name.trim() || item.name.length > 200 || !Number.isFinite(item.estimatedCost) || item.estimatedCost < 0 || item.estimatedCost > 1e9)) { throw new Error('请检查菜品名称和估算花费；一餐最多40道菜'); }
}
export function totalMealCost(items: MealItem[]): number { validateMealItems(items); return Math.round(items.reduce((sum: number,item: MealItem) => sum + Math.round(item.estimatedCost * 100), 0)) / 100; }
export function summarizeDishes(meals: Meal[]): DishSummary[] {
 const map: Map<string, DishSummary> = new Map<string, DishSummary>();
 meals.forEach((meal: Meal) => { const counted: string[] = []; mealItems(meal).forEach((item: MealItem) => { let row: DishSummary | undefined = map.get(item.name); if (!row) { row = new DishSummary(); row.name = item.name; map.set(item.name, row); } if (!counted.includes(item.name)) { row.count++; counted.push(item.name); } row.estimatedCost += item.estimatedCost; }); });
 return Array.from(map.values()).sort((a: DishSummary,b: DishSummary) => b.count - a.count || a.name.localeCompare(b.name));
}
export function inMealPeriod(meal: Meal, range: string, now: Date = new Date()): boolean {
 const from: Date = new Date(now.getFullYear(),now.getMonth(),range === '月' ? 1 : now.getDate());
 if (range === '周') { from.setDate(from.getDate() - (now.getDay() + 6) % 7); }
 const end: Date = new Date(from.getTime()); if (range === '月') { end.setMonth(end.getMonth() + 1); } else { end.setDate(end.getDate() + (range === '周' ? 7 : 1)); }
 const time: number = new Date(meal.date).getTime(); return time >= from.getTime() && time < end.getTime();
}
