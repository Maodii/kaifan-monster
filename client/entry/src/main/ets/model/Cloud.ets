import { ClientTelemetry, TelemetryContext, ClientBatch } from './ClientTelemetry';
import { PrivacyAccess } from './ReleaseLegal';
import { socialPath } from './AssistantCore';
import { WorkspacePayload, WorkspaceCheck, WorkspacePut, WorkspaceRecord, workspaceSignature } from './WorkspaceCore';
import { UserProfile } from './AccountModels';
import { Vault } from './Vault';
import { fileIo } from '@kit.CoreFileKit';
import { http } from '@kit.NetworkKit';
import { Food, Shopping, Meal, Change } from './Models';
import { LocalStore } from './LocalStore';
import { normalizeEmail, normalizeEndpoint } from './AuthInputCore';
class ManifestVersion {version:string='';}
class ApiFailure { message:string=''; }
export class Session { accessToken: string = ''; refreshToken: string = ''; userId: string = ''; deviceId: string = ''; role: string = ''; }
export class Credentials { displayName?: string; regionCode?: string; avatarPreset?: string; email: string = ''; password: string = ''; deviceName: string = '我的鸿蒙设备'; }
export class SmsSend { phone:string='';purpose:string='login'; }
export class SmsChallenge { challengeId:string='';expiresIn:number=300;retryAfter:number=60;phoneMasked:string=''; }
export class SmsProof { challengeId:string='';code:string=''; }
export class SmsLogin extends SmsProof { deviceName:string='我的鸿蒙设备'; }
export class SmsBinding extends SmsProof { currentPassword:string=''; }
export class SmsPasswordReset extends SmsProof { newPassword:string=''; }
export class SmsClosure extends SmsProof { confirmation:string=''; }
export class SmsStatus { enabled:boolean=false;phoneBound:boolean=false;phoneMasked:string=''; }
export class RefreshRequest { refreshToken: string = ''; }
export class ApiChange {
 familyId?: string; changeId: string = ''; entityId: string = ''; entityType: string = ''; operation: string = ''; baseVersion: number = 0;
 modifiedAt: string = ''; payload: Object = new Object();
}
export class PushRequest { changes: ApiChange[] = []; }
export class Accepted { changeId: string = ''; entityId: string = ''; version: number = 0; }
export class RemoteRecord { id: string = ''; payload: Object = new Object(); version: number = 0; modified_at: string = ''; deleted: boolean = false; }
export class Conflict { changeId: string = ''; entityId: string = ''; server: RemoteRecord | null = null; local: ApiChange = new ApiChange(); suggested: string = ''; }
export class PushResult { accepted: Accepted[] = []; conflicts: Conflict[] = []; }
export class RemoteChange { entity_type: string = ''; entity_id: string = ''; operation: string = ''; version: number = 0; payload: Object = new Object(); }
export class PullResult { familyIds: string[] = []; changes: RemoteChange[] = []; hasMore: boolean = false; nextVersion: number = 0; }
export class PayloadMetadata { familyId: string = ''; _recordVersion: number = 0; _familyId: string = ''; }
export class SyncReport { uploaded: number = 0; downloaded: number = 0; conflicts: Conflict[] = []; }
export class PhotoUploadRequest { mealId: string = ''; contentType: string = 'image/jpeg'; }
export class PhotoUploadResult { id: string = ''; uploadUrl: string = ''; }
export class PhotoComplete { id: string = ''; url: string = ''; }
export class Device { id: string = ''; name: string = ''; revoked_at: string = ''; }
export class Family { id: string = ''; name: string = ''; role: string = ''; inviteCode: string = ''; }
export class FamilyName { name: string = ''; }
export class InviteCode { inviteCode: string = ''; }
export class Cloud {
 constructor(){ClientTelemetry.configure('harmony','unknown',()=>{const c:TelemetryContext=new TelemetryContext();c.owner=this.session.accessToken?this.session.userId:'';c.endpoint=this.endpoint;c.cloud=PrivacyAccess.allowed;c.enabled=PrivacyAccess.analyticsEnabled;return c;},async(batch:ClientBatch)=>{await this.request('/telemetry/events',http.RequestMethod.POST,batch);});}

 private currentEndpoint:string='';private currentSession:Session=new Session();
 get endpoint():string{return this.currentEndpoint;}
 set endpoint(value:string){if(value!==this.currentEndpoint){ClientTelemetry.clear();}this.currentEndpoint=value;}
 get session():Session{return this.currentSession;}
 set session(value:Session){if(value.userId!==this.currentSession.userId||!value.accessToken){ClientTelemetry.clear();}this.currentSession=value;}
 private catalogBody:string='';private catalogTag:string='';private catalogEndpoint:string='';
 private refreshPending:Promise<void>|null=null;private refreshScope:string='';
 async request(path: string, method: http.RequestMethod, body: Object | null = null, retry: boolean = true): Promise<string> {
  if(socialPath(path)){throw new Error('此功能暂未开放');}
  this.endpoint=normalizeEndpoint(this.endpoint);
  if (!/^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(this.endpoint) && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(this.endpoint)) { throw new Error('请填写HTTPS服务地址；本机测试可使用localhost端口'); }
  const requestEndpoint:string=this.endpoint;const requestOwner:string=this.session.userId;const requestAccess:string=this.session.accessToken;const requestRefresh:string=this.session.refreshToken;
  PrivacyAccess.require();const request: http.HttpRequest = http.createHttp();
  try {
   const result: http.HttpResponse = await request.request(this.endpoint + '/api/v1' + path, {
    method: method, header: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.session.accessToken}`, 'If-None-Match':path==='/catalog/offline/manifest'&&this.catalogEndpoint===this.endpoint?this.catalogTag:'' },
    extraData: body === null ? '' : JSON.stringify(body), connectTimeout: 10000, readTimeout: 30000, expectDataType: http.HttpDataType.STRING
   });
   if(result.responseCode===304&&path==='/catalog/offline/manifest'&&this.catalogEndpoint===requestEndpoint&&this.catalogBody){return this.catalogBody;}
   if(result.responseCode===200&&path==='/catalog/offline/manifest'){const value:ManifestVersion=JSON.parse(result.result.toString()) as ManifestVersion;if(/^[a-f0-9]{64}$/.test(value.version)){this.catalogBody=result.result.toString();this.catalogTag='"'+value.version+'"';this.catalogEndpoint=requestEndpoint;}}
   if (result.responseCode === 401 && retry && requestRefresh && path !== '/auth/refresh') { if(this.endpoint!==requestEndpoint||this.session.userId!==requestOwner){throw new Error('会话已变化，请重新操作');}if(this.session.accessToken===requestAccess){await this.refreshOnce(requestEndpoint,requestOwner,requestRefresh);}if(this.endpoint!==requestEndpoint||this.session.userId!==requestOwner){throw new Error('会话已变化，请重新操作');}return await this.request(path,method,body,false); }
   if (result.responseCode === 401) { throw new Error(path === '/auth/login' ? '账号或密码不正确，请检查后重试' : '登录已过期，请重新登录；本地记录仍然可用'); }
   if(result.responseCode===409&&path.startsWith('/shopping/')){throw new Error('其他家人已认领，请刷新采购状态');}
   if(result.responseCode===409&&path.startsWith('/catalog/offline/')){throw new Error('菜谱目录刚刚变化，请重新检查更新；旧版仍可使用');}
   if (result.responseCode === 409 && path === '/account/profile') { throw new Error('资料已在其他设备更新，请重新读取后再修改'); }
   if (result.responseCode === 400 && path === '/auth/register') { const failure:ApiFailure=JSON.parse(result.result.toString()) as ApiFailure;throw new Error((failure.message==='账号已注册'||failure.message==='邮箱已注册')?'这个账号已注册，请切换登录':failure.message==='昵称无效'?'昵称请填写2–24个字':'请检查账号、6–128位字母数字密码和昵称'); }
   if(result.responseCode>=400&&path.startsWith('/auth/sms/')){const failure:ApiFailure=JSON.parse(result.result.toString()) as ApiFailure;throw new Error(typeof failure.message==='string'?failure.message:'请检查手机号与验证码后重试');}
   if (result.responseCode === 429) { throw new Error('操作有点频繁，请稍等片刻再试'); }
   if (result.responseCode >= 400) { throw new Error(`云端请求失败（${result.responseCode}），请稍后重试`); }
   return result.result.toString();
  } catch(e){const message:string=(e as Error).message||'';if(/[\u4e00-\u9fff]/.test(message)){throw new Error(message);}throw new Error('暂时连接不到云端，请检查网络后重试；本机记录仍可使用');} finally { request.destroy(); }
 }
 private async refreshOnce(endpoint:string,owner:string,token:string):Promise<void>{
  const scope:string=endpoint+'|'+owner+'|'+token;
  if(this.refreshPending){if(this.refreshScope!==scope){throw new Error('会话已变化，请重新操作');}return this.refreshPending;}
  this.refreshScope=scope;const pending:Promise<void>=this.performRefresh(endpoint,owner,token);this.refreshPending=pending;
  try{await pending;}finally{if(this.refreshPending===pending){this.refreshPending=null;this.refreshScope='';}}
 }
 private async performRefresh(endpoint:string,owner:string,token:string):Promise<void>{
  const refresh:RefreshRequest=new RefreshRequest();refresh.refreshToken=token;
  const renewed:Session=JSON.parse(await this.request('/auth/refresh',http.RequestMethod.POST,refresh,false)) as Session;
  if(this.endpoint!==endpoint||this.session.userId!==owner||this.session.refreshToken!==token){throw new Error('会话已变化，请重新操作');}
  this.session=renewed;await Vault.save(JSON.stringify(renewed));
  if(this.session!==renewed||this.endpoint!==endpoint){if(this.session.accessToken){await Vault.save(JSON.stringify(this.session));}else{await Vault.clear();}throw new Error('会话已变化，请重新操作');}
 }
 async checkWorkspace(store:LocalStore):Promise<WorkspaceCheck>{const check:WorkspaceCheck=new WorkspaceCheck();check.local=await store.workspacePayload();check.localRevision=workspaceSignature(check.local);check.remote=JSON.parse(await this.request('/account/workspace',http.RequestMethod.GET)) as WorkspaceRecord;check.conflict=check.remote.version!==Number(await store.getSetting('workspaceVersion','0'));return check;}
 async mergeWorkspace(store:LocalStore,check:WorkspaceCheck,payload:WorkspacePayload):Promise<void>{
  if(workspaceSignature(await store.workspacePayload())!==check.localRevision){throw new Error('本机内容已变化，请重新对照');}
  const body:WorkspacePut=new WorkspacePut();body.baseVersion=check.remote.version;body.payload=payload;
  const record:WorkspaceRecord=JSON.parse(await this.request('/account/workspace',http.RequestMethod.PUT,body)) as WorkspaceRecord;
  await store.applyWorkspace(record,check.localRevision);await store.setting('workspaceBase',workspaceSignature(record.payload!));
 }
 async uploadWorkspace(store:LocalStore,check:WorkspaceCheck):Promise<void>{if(workspaceSignature(await store.workspacePayload())!==check.localRevision){throw new Error('本机安排又有变化，请重新对照');}const body:WorkspacePut=new WorkspacePut();body.baseVersion=check.remote.version;body.payload=check.local;const record:WorkspaceRecord=JSON.parse(await this.request('/account/workspace',http.RequestMethod.PUT,body)) as WorkspaceRecord;await store.setting('workspaceVersion',String(record.version));}
 async login(email: string, password: string, register: boolean, profile?: UserProfile): Promise<Session> {
  const body: Credentials = new Credentials(); body.email = normalizeEmail(email); body.password = password; if (register && profile) { body.displayName = profile.displayName.trim(); if (profile.regionCode) { body.regionCode = profile.regionCode; } body.avatarPreset = profile.avatarPreset; }
  this.session = JSON.parse(await this.request(register ? '/auth/register' : '/auth/login', http.RequestMethod.POST, body,false)) as Session;
  await Vault.save(JSON.stringify(this.session)); return this.session;
 }
 async sendSms(phone:string,purpose:string):Promise<SmsChallenge>{
  const body:SmsSend=new SmsSend();body.phone=phone.trim();body.purpose=purpose;
  return JSON.parse(await this.request(purpose==='bind'||purpose==='close'?'/auth/sms/account/send':'/auth/sms/send',http.RequestMethod.POST,body,false)) as SmsChallenge;
 }
 async smsLogin(challengeId:string,code:string):Promise<Session>{
  const body:SmsLogin=new SmsLogin();body.challengeId=challengeId;body.code=code.trim();
  const session:Session=JSON.parse(await this.request('/auth/sms/login',http.RequestMethod.POST,body,false)) as Session;
  this.session=session;await Vault.save(JSON.stringify(session));return session;
 }
 async smsStatus():Promise<SmsStatus>{return JSON.parse(await this.request('/auth/sms/status',http.RequestMethod.GET)) as SmsStatus;}
 async bindPhone(challengeId:string,code:string,password:string):Promise<void>{const body:SmsBinding=new SmsBinding();body.challengeId=challengeId;body.code=code.trim();body.currentPassword=password;await this.request('/auth/sms/bind',http.RequestMethod.POST,body,false);}
 async resetPhonePassword(challengeId:string,code:string,password:string):Promise<void>{const body:SmsPasswordReset=new SmsPasswordReset();body.challengeId=challengeId;body.code=code.trim();body.newPassword=password;await this.request('/auth/sms/reset',http.RequestMethod.POST,body,false);}
 async closeByPhone(challengeId:string,code:string,confirmation:string):Promise<void>{const body:SmsClosure=new SmsClosure();body.challengeId=challengeId;body.code=code.trim();body.confirmation=confirmation;await this.request('/auth/sms/close',http.RequestMethod.POST,body,false);}
 async uploadAvatar(path: string): Promise<UserProfile> {
  await this.request('/account/profile', http.RequestMethod.GET);
  PrivacyAccess.require();const request: http.HttpRequest = http.createHttp();
  try { const result: http.HttpResponse = await request.request(this.endpoint + '/api/v1/account/avatar', { method: http.RequestMethod.POST, header: { Authorization: 'Bearer ' + this.session.accessToken, 'Content-Type': 'multipart/form-data' }, multiFormDataList: [{ name: 'avatar', contentType: 'image/jpeg', remoteFileName: 'avatar.jpg', filePath: path }], expectDataType: http.HttpDataType.STRING, connectTimeout: 10000, readTimeout: 30000 });
   if (result.responseCode >= 400) { throw new Error('头像上传失败，已保存的头像仍保留，请重试'); } return JSON.parse(result.result.toString()) as UserProfile;
  } finally { request.destroy(); }
 }
 async sync(store: LocalStore): Promise<SyncReport> {
  if (!this.session.accessToken) { throw new Error('请先登录云端账号，本地功能无需登录'); }
  const report: SyncReport = new SyncReport();
  const memberships: Family[] = JSON.parse(await this.request('/families', http.RequestMethod.GET)) as Family[]; const ids: string[] = memberships.map((f: Family) => f.id); await store.reconcileFamilies(ids);
  const groups: Map<string, Change[]> = new Map<string, Change[]>();
  store.state.changes.forEach((ch: Change) => { const metadata: PayloadMetadata = JSON.parse(ch.payload) as PayloadMetadata; if (metadata.familyId && !ids.includes(metadata.familyId)) { return; } const key: string = ch.entityType + ':' + ch.entityId; const values: Change[] = groups.get(key) || []; values.push(ch); groups.set(key, values); });
  const request: PushRequest = new PushRequest();
  groups.forEach((values: Change[]) => {
   const first: Change = values[0]; const latest: Change = values[values.length - 1];
   const ch: ApiChange = new ApiChange(); ch.changeId = latest.changeId; ch.entityType = latest.entityType; ch.entityId = latest.entityId;
   ch.operation = latest.operation; ch.baseVersion = first.baseVersion; ch.modifiedAt = latest.modifiedAt; ch.payload = JSON.parse(latest.payload) as Object; if (ch.entityType === 'meal_records') { const value: Meal = JSON.parse(latest.payload) as Meal; value.localPhoto = ''; value.photoOriginal = ''; ch.payload = value; } if (ch.entityType === 'food_items') { const value: Food = JSON.parse(latest.payload) as Food; value.localPhoto = ''; value.photoOriginal = ''; ch.payload = value; } const metadata: PayloadMetadata = JSON.parse(latest.payload) as PayloadMetadata; if (metadata.familyId) { ch.familyId = metadata.familyId; } request.changes.push(ch);
  });
  for (let i: number = 0; i < request.changes.length; i += 100) {
   const page: PushRequest = new PushRequest(); page.changes = request.changes.slice(i, i + 100);
   const result: PushResult = JSON.parse(await this.request('/sync/push', http.RequestMethod.POST, page)) as PushResult;
   for (const accepted of result.accepted) {
    const ch: ApiChange | undefined = page.changes.find((item: ApiChange) => item.changeId === accepted.changeId);
    if (ch) { const pending: Change[] = groups.get(ch.entityType + ':' + ch.entityId) || []; await store.acknowledge(ch.entityType, ch.entityId, accepted.version, pending.map((p: Change) => p.changeId)); report.uploaded++; }
   }
   report.conflicts = report.conflicts.concat(result.conflicts);
  }
  // 有冲突时保留拉取游标，避免以服务器快照覆盖本地尚未决定的记录。
  if (report.conflicts.length > 0) { return report; }
  let since: number = Number(await store.getSetting('syncVersion', '0')); let more: boolean = true;
  while (more) {
   const result: PullResult = JSON.parse(await this.request(`/sync/pull?since=${since}`, http.RequestMethod.GET)) as PullResult;
   await store.reconcileFamilies(result.familyIds); await store.applyRemote(result.changes); since = result.nextVersion; more = result.hasMore; report.downloaded += result.changes.length;
   await store.setting('syncVersion', String(since));
  }
  await store.setting('lastSync', new Date().toISOString()); return report;
 }
 async uploadPhotos(store: LocalStore, mealId:string=''): Promise<number> {
  let count: number = 0;
  for (const original of store.state.meals.filter((m: Meal) => (!mealId||m.id===mealId)&& m.localPhoto && m.photoStatus !== 'uploaded')) {
   const started:number=Date.now();const scope:string=ClientTelemetry.scope();try{
   const meal: Meal = JSON.parse(JSON.stringify(original)) as Meal;
   const body: PhotoUploadRequest = new PhotoUploadRequest(); body.mealId = meal.id;
   if (!meal.photoId) { const signed: PhotoUploadResult = JSON.parse(await this.request('/photos/presign', http.RequestMethod.POST, body)) as PhotoUploadResult; meal.photoId = signed.id; await store.saveMeal(meal); await this.putPhoto(signed.uploadUrl, meal.localPhoto); }
   else {
    // 旧预签名失效或中断时先清理该对象，保留本机原图再重新登记。
    await this.request('/photos/' + meal.photoId, http.RequestMethod.DELETE);
    const signed: PhotoUploadResult = JSON.parse(await this.request('/photos/presign', http.RequestMethod.POST, body)) as PhotoUploadResult; meal.photoId = signed.id; await store.saveMeal(meal); await this.putPhoto(signed.uploadUrl, meal.localPhoto);
   }
   const complete: PhotoComplete = JSON.parse(await this.request('/photos/' + meal.photoId + '/complete', http.RequestMethod.POST, new Object())) as PhotoComplete;
   meal.cloudPhoto = complete.url; meal.photoStatus = 'uploaded'; await store.saveMeal(meal); count++;if(scope){ClientTelemetry.record('photo_upload','','','success',Date.now()-started,-1,scope);}
   }catch(error){if(scope){ClientTelemetry.record('photo_upload','','','error',Date.now()-started,-1,scope);}throw new Error((error as Error).message);}
  } return count;
 }
 private async putPhoto(url: string, path: string): Promise<void> {
  if (!url.startsWith('https://')) { throw new Error('照片上传地址必须使用HTTPS'); }
  const file: fileIo.File = fileIo.openSync(path, fileIo.OpenMode.READ_ONLY); let bytes: ArrayBuffer = new ArrayBuffer(0);
  try { const size: number = fileIo.statSync(file.fd).size; if (size > 20 * 1024 * 1024) { throw new Error('压缩照片超过20MB'); } bytes = new ArrayBuffer(size); fileIo.readSync(file.fd, bytes); } finally { fileIo.closeSync(file); }
  PrivacyAccess.require();const request: http.HttpRequest = http.createHttp(); try { const result: http.HttpResponse = await request.request(url, { method: http.RequestMethod.PUT, header: { 'Content-Type': 'image/jpeg' }, extraData: bytes, connectTimeout: 10000, readTimeout: 60000 }); if (result.responseCode >= 400) { throw new Error('照片上传未完成，下次同步自动重试'); } } finally { request.destroy(); }
 }
 async logout(): Promise<void> { try { if (this.session.accessToken) { await this.request('/auth/logout', http.RequestMethod.POST, new Object()); } } finally { ClientTelemetry.clear();this.session = new Session(); await Vault.clear(); } }
 async resolve(store: LocalStore, conflict: Conflict, useLocal: boolean): Promise<void> {
  store.assertConflictCurrent(conflict.local.entityType, conflict.entityId, conflict.changeId);
  if (!conflict.server) { throw new Error('服务端记录已删除，请先导出本地备份后重新录入'); }
  if (useLocal) {
   const ch: ApiChange = conflict.local; ch.baseVersion = conflict.server.version;
   // 换一个变更ID以保证明确决策的重试幂等性。
   await store.rebase(ch.entityType, ch.entityId, ch.baseVersion);
  } else {
   await store.replaceFromConflict(conflict.local.entityType, conflict.entityId, conflict.server.payload, conflict.server.version, conflict.server.deleted);
  }
 }
}
