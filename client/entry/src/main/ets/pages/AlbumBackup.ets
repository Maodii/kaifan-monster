import { common, ApplicationStateChangeCallback } from '@kit.AbilityKit';
import { router } from '@kit.ArkUI';
import { AlbumBackup, AlbumProgress, AlbumSummary } from '../model/AlbumBackup';
import { ALBUM_BACKUP_SLOGAN, ALBUM_BACKUP_NOTICE } from '../model/AlbumBackupCopy';
@Entry
@Component
struct AlbumBackupPage {
 @State deleting: boolean = false; @State ready: boolean = false; @State running: boolean = false; @State checked: boolean = false;
 @State status: string = ''; @State endpoint: string = ''; @State count: number = 0;
 @State progress: AlbumProgress = new AlbumProgress();
 private backup: AlbumBackup = new AlbumBackup(); private hidden: boolean = false; private foreground: boolean = true;
 private appContext: common.ApplicationContext | undefined = undefined;
 private appState: ApplicationStateChangeCallback = {
  onApplicationForeground: () => { this.foreground = true; },
  onApplicationBackground: () => { this.foreground = false; this.backup.stop(); this.checked = false; }
 };
 aboutToAppear(): void { this.initialize(); }
 onPageShow(): void { this.hidden = false; }
 onPageHide(): void { this.hidden = true; this.backup.stop(); this.checked = false; }
 aboutToDisappear(): void { this.hidden = true; this.backup.stop(); if (this.appContext) { this.appContext.off('applicationStateChange', this.appState); this.appContext = undefined; } }
 private async initialize(): Promise<void> {
  try { this.appContext = (this.getUIContext().getHostContext() as common.UIAbilityContext).getApplicationContext(); this.appContext.on('applicationStateChange', this.appState); await this.backup.initialize(this.getUIContext().getHostContext() as common.UIAbilityContext); this.endpoint = this.backup.cloud.endpoint; const summary: AlbumSummary = await this.backup.summary(); this.count = summary.count; this.ready = true; }
  catch (e) { this.status = (e as Error).message; }
 }
 private begin(): void {
  if (!this.ready || this.running || this.deleting || !this.checked || !ALBUM_BACKUP_SLOGAN.trim()) { return; }
  this.getUIContext().showAlertDialog({ title: '确认备份整个相册？', message: ALBUM_BACKUP_NOTICE + '\n上传至：' + this.endpoint,
   primaryButton: { value: '取消', action: () => {} }, secondaryButton: { value: '确认上传相册', action: () => { this.start(); } } });
 }
 private async start(): Promise<void> {
  if (this.hidden || !this.foreground || this.running || this.deleting) { return; } this.running = true; this.status = '正在申请系统权限；拒绝后不会上传'; this.progress = new AlbumProgress();
  try {
   const result: AlbumProgress = await this.backup.run(this.getUIContext().getHostContext() as common.UIAbilityContext, (value: AlbumProgress) => { this.progress = JSON.parse(JSON.stringify(value)) as AlbumProgress; this.status = '正在备份系统授权可读取的照片'; });
   this.progress = result; this.status = !result.stopped && result.processed === result.total && result.failed === 0 ? '本次可读取照片已处理完成' : '备份已停止或有未完成照片，可重新确认后重试';
   const summary: AlbumSummary = await this.backup.summary(); this.count = summary.count;
  } catch (e) { this.status = (e as Error).message || '备份未完成'; }
  finally { this.running = false; this.checked = false; }
 }
 private remove(): void {
  this.getUIContext().showAlertDialog({ title: '删除云端相册备份？', message: '将删除当前账号的全部相册备份。不会删除手机相册、记餐照片或头像。此前已签发的下载链接可能在5分钟内继续有效。',
   primaryButton: { value: '取消', action: () => {} }, secondaryButton: { value: '删除云端备份', action: () => { this.clear(); } } });
 }
 private async clear(): Promise<void> {
  if (this.running || this.deleting) { return; } this.deleting = true;
  try { await this.backup.clear(); this.count = 0; this.status = '云端相册备份已删除'; } catch (e) { this.status = '删除未完成，请重试：' + (e as Error).message; }
  finally { this.deleting = false; }
 }
 build() {
  Scroll() { Column({ space: 16 }) {
   Button('返回').onClick(() => { this.backup.stop(); router.back(); })
   Text('整个相册备份').fontSize(24).fontWeight(FontWeight.Bold)
   Text(ALBUM_BACKUP_SLOGAN.trim() || '提示标语待填写，备份暂未开放').fontSize(18)
   Text(ALBUM_BACKUP_NOTICE).fontSize(14).lineHeight(24)
   Text('上传至：' + (this.endpoint || '尚未连接账号服务')).fontSize(13)
   Text('云端已备份 ' + this.count + ' 张').fontSize(15)
   Row({ space: 8 }) { Checkbox({ name: 'album-backup-consent' }).select(this.checked).enabled(!this.running && !this.deleting && this.ready && ALBUM_BACKUP_SLOGAN.trim().length > 0).onChange((v: boolean) => { this.checked = v; }); Text('我已阅读并同意上述上传范围').fontSize(14).layoutWeight(1) }.width('100%')
   Button('确认并备份相册').enabled(this.ready && !this.running && !this.deleting && this.checked && ALBUM_BACKUP_SLOGAN.trim().length > 0).onClick(() => this.begin())
   if (this.running) { Button('停止备份').onClick(() => { this.backup.stop(); this.status = '正在停止，已上传照片仍保留'; }) }
   Text('已处理 ' + this.progress.processed + ' / ' + this.progress.total + '；新增 ' + this.progress.uploaded + '，重复 ' + this.progress.duplicate + '，失败 ' + this.progress.failed).fontSize(14)
   if (this.progress.lastError) { Text('最近失败原因：' + this.progress.lastError).fontSize(13).fontColor('#A34B40') }
   Text(this.status).fontSize(14)
   Button('删除云端相册备份').enabled(this.ready && !this.running && !this.deleting).onClick(() => this.remove())
  }.width('100%').padding(24).alignItems(HorizontalAlign.Start) }.edgeEffect(EdgeEffect.Spring, { alwaysEnabled: true }).width('100%').height('100%').backgroundColor('#FFF9EF')
 }
}
