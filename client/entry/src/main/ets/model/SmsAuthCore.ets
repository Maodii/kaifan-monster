// Pure shared rules; provider credentials and verification stay on the server.
export function smsPhone(value:string):string{return value.trim().replace(/^\+86[ -]?/,'').replace(/[ -]/g,'');}
export function smsPhoneError(value:string):string{return /^1[3-9]\d{9}$/.test(smsPhone(value))?'':'请输入中国大陆11位手机号';}
export function smsCodeError(value:string):string{return /^\d{6}$/.test(value.trim())?'':'请输入短信中的6位验证码';}
export function smsWaitSeconds(until:number,now:number):number{return Math.max(0,Math.ceil((until-now)/1000));}
export class SmsAuthDraft {
 phone:string='';code:string='';challengeId:string='';purpose:string='login';sentPhone:string='';sentPurpose:string='';retryAt:number=0;expiresAt:number=0;
 sent(id:string,phone:string,purpose:string,retryAfter:number,expiresIn:number,now:number):void{this.purpose=purpose;this.challengeId=id;this.sentPhone=smsPhone(phone);this.sentPurpose=purpose;this.retryAt=now+retryAfter*1000;this.expiresAt=now+expiresIn*1000;this.code='';}
 proofError(now:number):string{const phoneError:string=smsPhoneError(this.phone);if(phoneError){return phoneError;}if(!this.challengeId||this.sentPhone!==smsPhone(this.phone)||this.sentPurpose!==this.purpose){return '请先为当前手机号获取对应验证码';}if(now>=this.expiresAt){return '验证码已过期，请重新获取';}return smsCodeError(this.code);}
 metadata():string{return JSON.stringify([this.challengeId,this.sentPhone||smsPhone(this.phone),this.sentPurpose||this.purpose,String(this.retryAt),String(this.expiresAt)]);}
 restoreMetadata(raw:string,now:number):void{try{const values:string[]=JSON.parse(raw) as string[];if(values.length!==5){return;}const retry:number=Number(values[3]);const expiry:number=Number(values[4]);if(!Number.isFinite(retry)||!Number.isFinite(expiry)||retry>now+61000||expiry>now+301000){return;}if(expiry<=now&&retry<=now){return;}if(smsPhoneError(String(values[1]))){return;}if(!['login','bind','reset','close'].includes(String(values[2]))){return;}this.challengeId=String(values[0]);this.sentPhone=String(values[1]);this.sentPurpose=String(values[2]);this.retryAt=retry;this.expiresAt=expiry;this.phone=this.sentPhone;this.purpose=this.sentPurpose;}catch(_){} }
 clearProof():void{this.code='';this.challengeId='';this.sentPhone='';this.sentPurpose='';this.expiresAt=0;}
}
export function smsCanSend(phone:string,retryAt:number,now:number,consented:boolean,busy:boolean):boolean{return !smsPhoneError(phone)&&smsWaitSeconds(retryAt,now)===0&&consented&&!busy;}
export function passwordLengthOk(value:string):boolean{return value.length>=6&&value.length<=128;}
export function passwordLetterOk(value:string):boolean{return /[A-Za-z]/.test(value);}
export function passwordDigitOk(value:string):boolean{return /[0-9]/.test(value);}
export function smsRemainingSeconds(expiresAt:number,now:number):number{return Math.max(0,Math.ceil((expiresAt-now)/1000));}
