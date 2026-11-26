import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Client, { SendSmsVerifyCodeRequest, CheckSmsVerifyCodeRequest } from '@alicloud/dypnsapi20170525';
import { Config } from '@alicloud/openapi-client';
import { RuntimeOptions } from '@darabonba/typescript';
export type SmsPurpose='login'|'bind'|'reset'|'close';
export const smsTemplates:Record<SmsPurpose,string>={login:'100001',bind:'100004',reset:'100003',close:'100005'};
export interface SmsTransport {send(phone:string,purpose:SmsPurpose,id:string):Promise<void>;check(phone:string,purpose:SmsPurpose,id:string,code:string):Promise<boolean>;}
@Injectable()
export class AliyunSmsProvider implements SmsTransport {
 private client():Client {
  if(process.env.SMS_AUTH_ENABLED!=='true'||!process.env.ALIYUN_ACCESS_KEY_ID||!process.env.ALIYUN_ACCESS_KEY_SECRET||!process.env.ALIYUN_SMS_SIGN_NAME)throw new ServiceUnavailableException('短信认证尚未配置，请使用账号密码登录');
  return new Client(new Config({accessKeyId:process.env.ALIYUN_ACCESS_KEY_ID,accessKeySecret:process.env.ALIYUN_ACCESS_KEY_SECRET,endpoint:'dypnsapi.aliyuncs.com',regionId:'cn-hangzhou'}));
 }
 private runtime():RuntimeOptions{return new RuntimeOptions({autoretry:false,connectTimeout:5000,readTimeout:10000});}
 // Each challenge gets its own provider namespace (max 20 chars): codes cannot cross purposes or requests.
 private scheme(id:string):string{return 'kf'+id.replaceAll('-','').slice(0,18);}
 async send(phone:string,purpose:SmsPurpose,id:string):Promise<void>{
  const client=this.client();
  try{
   const r=await client.sendSmsVerifyCodeWithOptions(new SendSmsVerifyCodeRequest({phoneNumber:phone,countryCode:'86',schemeName:this.scheme(id),outId:id,signName:process.env.ALIYUN_SMS_SIGN_NAME,templateCode:smsTemplates[purpose],templateParam:JSON.stringify({code:'##code##',min:'5'}),codeType:1,codeLength:6,validTime:300,interval:60,duplicatePolicy:1,returnVerifyCode:false,autoRetry:0}),this.runtime());
   if(r.body?.code!=='OK'||r.body.success!==true)throw new Error('provider_rejected');
  }catch{throw new ServiceUnavailableException('短信暂未发送成功，请稍后重试；请勿连续重复发送');}
 }
 async check(phone:string,_purpose:SmsPurpose,id:string,code:string):Promise<boolean>{
  const client=this.client();
  try{
   const r=await client.checkSmsVerifyCodeWithOptions(new CheckSmsVerifyCodeRequest({phoneNumber:phone,countryCode:'86',schemeName:this.scheme(id),outId:id,verifyCode:code,caseAuthPolicy:1}),this.runtime());
   return r.body?.code==='OK'&&r.body.success===true&&r.body.model?.verifyResult==='PASS';
  }catch{throw new ServiceUnavailableException('短信验证暂不可用，请稍后重试');}
 }
}
