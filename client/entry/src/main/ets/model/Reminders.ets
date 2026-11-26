import { reminderAgentManager } from '@kit.BackgroundTasksKit';
import { notificationManager } from '@kit.NotificationKit';
import { common } from '@kit.AbilityKit';
import { LocalStore } from './LocalStore';
import { Food, daysLeft, CATEGORIES } from './Models';
export class Reminders {
 private static lastSignature:string='';
 private static scheduling:Promise<void>|null=null;
 private static nextTimerNotice:number=10000+Math.floor(Date.now()%1000000000);
 static async permission(context: common.UIAbilityContext): Promise<void> { await notificationManager.requestEnableNotification(context);if(!await notificationManager.isNotificationEnabled()){throw new Error('通知尚未开启，请在系统设置中允许通知后重试');} }
 static async cancel(store: LocalStore): Promise<void> {
  Reminders.lastSignature='';
  const ids: number[] = JSON.parse(await store.getSetting('reminderIds', '[]')) as number[];
  const failed: number[] = []; for (const id of ids) { try { await reminderAgentManager.cancelReminder(id); } catch (_) { failed.push(id); } }
  await store.setting('reminderIds', JSON.stringify(failed));
 }
 static async schedule(store: LocalStore): Promise<void> {
  const previous:Promise<void>|null=Reminders.scheduling;
  const pending:Promise<void>=(async():Promise<void>=>{
  if(previous){try{await previous;}catch(_){}}
  const signature:string=JSON.stringify([await store.getSetting('notifications','false'),await store.getSetting('reminderHour','20'),await store.getSetting('reminderMinute','0'),await store.getSetting('threshold','3'),await Promise.all(CATEGORIES.map(async(c:string):Promise<string>=>c+':'+await store.getSetting('mute:'+c,'false')+':'+await store.getSetting('threshold:'+c,'3'))),store.state.foods.map((f:Food)=>f.id+':'+f.name+':'+f.quantity+':'+f.expiryDate+':'+f.category+':'+f.archived+':'+f.muted)]);
  if(signature===Reminders.lastSignature){return;}
  await Reminders.register(store);Reminders.lastSignature=signature;
  })();Reminders.scheduling=pending;
  try{await pending;}finally{if(Reminders.scheduling===pending){Reminders.scheduling=null;}}
 }
 private static async register(store:LocalStore):Promise<void>{
  await Reminders.cancel(store); if (await store.getSetting('notifications', 'false') !== 'true') { return; }
  const saved: number[] = JSON.parse(await store.getSetting('reminderIds', '[]')) as number[];
  const hour: number = Number(await store.getSetting('reminderHour', '20')); const minute: number = Number(await store.getSetting('reminderMinute', '0'));
  const foods: Food[] = store.state.foods.filter((f: Food) => !f.archived && !f.muted && f.quantity > 0).sort((a: Food,b: Food) => a.expiryDate.localeCompare(b.expiryDate));
  try {
   const summary: reminderAgentManager.ReminderRequestAlarm = { reminderType: reminderAgentManager.ReminderType.REMINDER_TYPE_ALARM, hour: hour, minute: minute, daysOfWeek: [1,2,3,4,5,6,7], title: '开饭小怪 · 每日整理', content: foods.filter((f: Food) => daysLeft(f) <= 3).length > 0 ? '本次整理预警：' + foods.filter((f: Food) => daysLeft(f) <= 3).map((f: Food) => f.name + '（' + f.expiryDate + '）').join('、').slice(0, 180) : '当前没有临近到期的食材，打开开饭小怪检查最新库存与采购清单。', notificationId: 8100, ringDuration: 0, wantAgent: { pkgName: 'com.shiku.foodkeeper', abilityName: 'EntryAbility' } };
   saved.push(await reminderAgentManager.publishReminder(summary)); await store.setting('reminderIds', JSON.stringify(saved));
   // 系统代理提醒有数量配额，优先为最近10份食材登记，首页始终展示全部预警。
   for (let index: number = 0; index < Math.min(10, foods.length); index++) {
    const f: Food = foods[index]; if (await store.getSetting('mute:' + f.category, 'false') === 'true') { continue; }
    const threshold: number = Number(await store.getSetting('threshold:' + f.category, await store.getSetting('threshold', '3')));
    const expiry: Date = new Date(f.expiryDate + 'T' + String(hour).padStart(2,'0') + ':' + String(minute).padStart(2,'0') + ':00');
    const warning: Date = new Date(expiry.getTime()); warning.setDate(warning.getDate() - threshold);
    for (let phase: number = 0; phase < 2; phase++) {
     let at: Date = phase === 0 ? warning : expiry; if (at.getTime() <= Date.now()) { if (phase === 0) { continue; } at = new Date(Date.now() + 60000); }
     const req: reminderAgentManager.ReminderRequestCalendar = { reminderType: reminderAgentManager.ReminderType.REMINDER_TYPE_CALENDAR, dateTime: { year: at.getFullYear(), month: at.getMonth()+1, day: at.getDate(), hour: at.getHours(), minute: at.getMinutes() }, title: phase === 0 ? '食材临期提醒' : '食材到期提醒', content: `${f.name} · 到期 ${f.expiryDate}，请检查后处理`, notificationId: 8200 + index * 2 + phase, ringDuration: 0, wantAgent: { pkgName: 'com.shiku.foodkeeper', abilityName: 'EntryAbility', parameters: { foodId: f.id } } };
     if (phase === 1) { req.daysOfWeek = [1,2,3,4,5,6,7]; }
     saved.push(await reminderAgentManager.publishReminder(req)); await store.setting('reminderIds', JSON.stringify(saved));
    }
   }
  } catch (_) { throw new Error('系统提醒未完整登记，请检查通知权限或稍后重试；其他修改已保存'); }
 }
 static async cancelTimer(id:number):Promise<void>{await reminderAgentManager.cancelReminder(id);}
 static async timer(label: string, seconds: number): Promise<number> {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 86400) { throw new Error('计时需为1秒到24小时'); }
  const req: reminderAgentManager.ReminderRequestTimer = { reminderType: reminderAgentManager.ReminderType.REMINDER_TYPE_TIMER, triggerTimeInSeconds: seconds, title: '开饭小怪 · 烹饪计时', content: label, ringDuration: 5, notificationId: Reminders.nextTimerNotice++, wantAgent: { pkgName: 'com.shiku.foodkeeper', abilityName: 'EntryAbility' } };
  return await reminderAgentManager.publishReminder(req);
 }
}
