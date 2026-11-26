/** Local-only schedule; completed is a planning marker, never an inventory operation. */
export class MealPlan {
 sourceMealId:string=''; remainingPortions:number=0;
 mode:string='在家做'; note:string='';
 id: string = ''; date: string = ''; occasion: string = '晚餐'; recipeId: string = '';
 people: number = 2; completed: boolean = false; modifiedAt: string = '';
}
