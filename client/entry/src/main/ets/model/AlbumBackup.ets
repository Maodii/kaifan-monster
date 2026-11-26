import { PrivacyAccess } from './ReleaseLegal';
import { abilityAccessCtrl, common, PermissionRequestResult } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';
import { dataSharePredicates } from '@kit.ArkData';
import { photoAccessHelper } from '@kit.MediaLibraryKit';
import { fileIo } from '@kit.CoreFileKit';
import { http } from '@kit.NetworkKit';
import { util } from '@kit.ArkTS';
import { Cloud, Session } from './Cloud';
import { Vault } from './Vault';
import { ALBUM_BACKUP_NOTICE_VERSION } from './AlbumBackupCopy';
class AlbumConsent { noticeVersion: string = ALBUM_BACKUP_NOTICE_VERSION; confirmed: boolean = true; }
class AlbumConsentResult { id: string = ''; }
class AlbumUploadResult { id: string = ''; duplicate: boolean = false; }
export class AlbumSummary { count: number = 0; bytes: string = '0'; }
export class AlbumProgress { stopped: boolean = false; total: number = 0; processed: number = 0; uploaded: number = 0; duplicate: number = 0; failed: number = 0; lastError: string = ''; }
export class AlbumBackup {
 cloud: Cloud = new Cloud(); private consentId: string = ''; private stopped: boolean = true;
 private active: http.HttpRequest | undefined = undefined;
 async initialize(context: common.UIAbilityContext): Promise<void> {
  const prefs: preferences.Preferences = await preferences.getPreferences(context, { name: 'shiku_settings' });
  this.cloud.endpoint = (await prefs.get('endpoint', 'http://127.0.0.1:3000')).toString();
  const saved: string = await Vault.load(); if (!saved) { throw new Error('请先登录账号，再使用相册备份'); }
  this.cloud.session = JSON.parse(saved) as Session;
  if (!this.cloud.session.accessToken) { throw new Error('请先登录账号，再使用相册备份'); }
 }
 async summary(): Promise<AlbumSummary> { return JSON.parse(await this.cloud.request('/album-backup', http.RequestMethod.GET)) as AlbumSummary; }
 stop(): void { this.stopped = true; if (this.active) { this.active.destroy(); this.active = undefined; } }
 async clear(): Promise<void> { this.stop(); await this.cloud.request('/album-backup', http.RequestMethod.DELETE); }
 async run(context: common.UIAbilityContext, progress: (value: AlbumProgress) => void): Promise<AlbumProgress> {
  this.stopped = false; const state: AlbumProgress = new AlbumProgress();
  let permission: PermissionRequestResult;
  try { permission = await abilityAccessCtrl.createAtManager().requestPermissionsFromUser(context, ['ohos.permission.READ_IMAGEVIDEO']); }
  catch (_) { throw new Error('系统未允许全量相册读取，需符合平台权限要求；没有上传照片'); }
  if (this.stopped) { state.stopped = true; return state; }
  if (permission.authResults.length !== 1 || permission.authResults[0] !== 0) { throw new Error('未获得相册读取权限，没有上传照片'); }
  const consent: AlbumConsentResult = JSON.parse(await this.cloud.request('/album-backup/consent', http.RequestMethod.POST, new AlbumConsent())) as AlbumConsentResult;
  this.consentId = consent.id;
  const helper: photoAccessHelper.PhotoAccessHelper = photoAccessHelper.getPhotoAccessHelper(context);
  let fetched: photoAccessHelper.FetchResult<photoAccessHelper.PhotoAsset> | undefined = undefined;
  try {
   if (this.stopped) { state.stopped = true; return state; }
   const predicates: dataSharePredicates.DataSharePredicates = new dataSharePredicates.DataSharePredicates();
   predicates.equalTo(photoAccessHelper.PhotoKeys.PHOTO_TYPE, photoAccessHelper.PhotoType.IMAGE);
   fetched = await helper.getAssets({ fetchColumns: [photoAccessHelper.PhotoKeys.SIZE], predicates: predicates });
   state.total = fetched.getCount(); progress(state);
   for (let i: number = 0; i < state.total && !this.stopped; i++) {
    const item: photoAccessHelper.PhotoAsset = i === 0 ? await fetched.getFirstObject() : await fetched.getNextObject();
    if (this.stopped) { break; }
    const path: string = context.cacheDir + '/album-backup-' + util.generateRandomUUID();
    try {
     const input: fileIo.File = fileIo.openSync(item.uri, fileIo.OpenMode.READ_ONLY);
     try { const size: number = fileIo.statSync(input.fd).size; if (size <= 0 || size > 50 * 1024 * 1024) { throw new Error('原图为空或超过50MB'); } fileIo.copyFileSync(input.fd, path); } finally { fileIo.closeSync(input); }
     if (this.stopped) { break; }
     // Refresh/validate the account before each request; one file is staged at a time.
     await this.cloud.request('/account/profile', http.RequestMethod.GET);
     if (this.stopped) { break; }
     const result: AlbumUploadResult = await this.upload(path);
     if (result.duplicate) { state.duplicate++; } else { state.uploaded++; }
    } catch (e) { state.lastError = (e as Error).message || '照片读取或上传失败'; if (!this.stopped) { state.failed++; } }
    finally { try { fileIo.unlinkSync(path); } catch (_) {} }
    if (!this.stopped) { state.processed++; progress(state); }
    // Leave room for account checks under the API's shared rate limit (120/minute).
    if (!this.stopped) { await new Promise<void>((resolve) => { setTimeout(resolve, 1200); }); }
   }
   return state;
  } finally {
   state.stopped = this.stopped;
   if (fetched) { fetched.close(); } try { await helper.release(); } catch (_) {}
   if (this.consentId) { try { await this.cloud.request('/album-backup/consent/' + this.consentId, http.RequestMethod.DELETE); } catch (_) {} this.consentId = ''; }
  }
 }
 private async upload(path: string): Promise<AlbumUploadResult> {
  PrivacyAccess.require();const request: http.HttpRequest = http.createHttp(); this.active = request;
  try {
   const result: http.HttpResponse = await request.request(this.cloud.endpoint + '/api/v1/album-backup/photos/' + this.consentId, {
    method: http.RequestMethod.POST, header: { Authorization: 'Bearer ' + this.cloud.session.accessToken, 'Content-Type': 'multipart/form-data' },
    multiFormDataList: [{ name: 'photo', contentType: 'application/octet-stream', remoteFileName: 'photo', filePath: path }],
    expectDataType: http.HttpDataType.STRING, connectTimeout: 10000, readTimeout: 60000
   });
   if (result.responseCode === 400) { throw new Error('此照片格式不支持或超过50MB'); }
   if (result.responseCode === 401 || result.responseCode === 403) { this.stop(); throw new Error('账号或备份确认已失效，请重新进入后确认'); }
   if (result.responseCode === 429) { this.stop(); throw new Error('请求过于频繁，已停止，请稍后重新确认备份'); }
   if (result.responseCode >= 400) { throw new Error('上传失败（' + result.responseCode + '），可稍后重试'); }
   return JSON.parse(result.result.toString()) as AlbumUploadResult;
  } finally { if (this.active === request) { this.active = undefined; } request.destroy(); }
 }
}
