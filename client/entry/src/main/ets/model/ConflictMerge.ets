import { Conflict } from './Cloud';
export class MergeField {
 key: string; label: string; local: string; server: string;
 constructor(key: string, label: string, local: string, server: string) { this.key = key; this.label = label; this.local = local; this.server = server; }
}
const labels: string[][] = [['diningMode','用餐方式'],['place','地点'],['rating','评分'],['calories','示例主体热量'],['calorieSource','热量来源'],['costType','花费类型'],['dietTags','饮食分类'],['region', '地区'], ['category', '分类'], ['items', '本餐菜品'], ['name', '名称'], ['quantity', '数量'], ['unit', '单位'], ['location', '存放位置'], ['purchasedAt', '购入日期'], ['expiryDate', '到期日期'], ['estimatedPrice', '购买花费（估算）'], ['notes', '备注'], ['tags', '标签'], ['batch', '批次'], ['archived', '已归档'], ['muted', '静默提醒'], ['mealType', '餐次'], ['date', '日期'], ['estimatedCost', '花费（估算）'], ['taste', '口味'], ['cuisine', '菜系'], ['difficulty', '难度'], ['minutes', '制作分钟'], ['people', '人数'], ['ingredients', '完整用料清单'], ['steps', '完整步骤'], ['tips', '小贴士'], ['purchased', '已购买'], ['days', '保质期天数']];
export function mergeFields(conflict: Conflict): MergeField[] {
 if (!conflict.server || conflict.server.deleted || conflict.local.operation === 'delete') { return []; }
 const local: Record<string, Object> = conflict.local.payload as Record<string, Object>; const server: Record<string, Object> = conflict.server.payload as Record<string, Object>; const out: MergeField[] = [];
 labels.forEach((pair: string[]) => { const key: string = pair[0]; if (local[key] !== undefined && server[key] !== undefined && JSON.stringify(local[key]) !== JSON.stringify(server[key])) { out.push(new MergeField(key, pair[1], JSON.stringify(local[key]), JSON.stringify(server[key]))); } });
 return out;
}
export function mergedPayload(conflict: Conflict, cloudFields: string[]): Object {
 const value: Record<string, Object> = JSON.parse(JSON.stringify(conflict.local.payload)) as Record<string, Object>;
 const server: Record<string, Object> = conflict.server!.payload as Record<string, Object>;
 const allowed: string[] = mergeFields(conflict).map((field: MergeField) => field.key);
 cloudFields.filter((key: string) => allowed.includes(key)).forEach((key: string) => { value[key] = server[key]; });
 return value;
}
