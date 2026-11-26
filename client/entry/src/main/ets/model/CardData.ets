import { Food, Shopping, daysLeft } from './Models';
export class CardData { urgentText: string = '暂时没有临期食材'; shoppingText: string = '采购清单空空'; foodId: string = ''; shoppingId: string = ''; count: string = '0'; }
export function cardData(foods: Food[], shopping: Shopping[]): CardData {
 const data: CardData = new CardData(); const urgent: Food[] = foods.filter((f: Food) => !f.archived && f.quantity > 0).sort((a: Food,b: Food) => a.expiryDate.localeCompare(b.expiryDate)).slice(0,3);
 if (urgent.length > 0) { data.urgentText = urgent.map((f: Food) => `${f.name} · ${f.expiryDate.slice(5)}到期`).join('\n'); data.foodId = urgent[0].id; }
 const pending: Shopping[] = shopping.filter((s: Shopping) => !s.purchased); if (pending.length > 0) { data.shoppingText = pending.slice(0,3).map((s: Shopping) => `${s.name} · ${s.quantity}${s.unit}`).join('\n'); data.shoppingId = pending[0].id; } data.count = String(pending.length); return data;
}
