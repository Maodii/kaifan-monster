export function normalizeEndpoint(value:string):string{return value.trim().replace(/\/+$/,'').replace(/\/api\/v1$/,'');}
export function normalizeEmail(value:string):string{return value.trim().toLowerCase();}
export const ACCOUNT_PATTERN = /^(?:[A-Za-z0-9_\-\u4e00-\u9fff]{2,32}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;
export const PASSWORD_PATTERN = /^(?=[\s\S]*[A-Za-z])(?=[\s\S]*[0-9])[\s\S]{6,128}$/;
export function newPasswordError(value:string):string{return PASSWORD_PATTERN.test(value)?'':'密码需6–128位，且同时包含字母和数字';}
export function credentialError(email:string,password:string,register:boolean,name:string,confirmation:string):string{
 if(!ACCOUNT_PATTERN.test(normalizeEmail(email))||normalizeEmail(email).length>254){return '账号需2–32位，可用中文、字母、数字、下划线或短横线';}
 if(register){const error:string=newPasswordError(password);if(error){return error;}}
 else if(!password||password.length>128){return '请填写密码';}
 if(register&&(name.trim().length<2||name.trim().length>24)){return '昵称请填写2–24个字';}
 if(register&&password!==confirmation){return '两次密码不一致，请重新确认';}return '';
}

// One shared production origin. Only known retired bundled origins are migrated; custom origins stay unchanged.
export const DEFAULT_SERVICE_ENDPOINT:string='https://api.example.invalid';
export function automaticServiceEndpoint(saved:string):string{
 const value:string=normalizeEndpoint(saved);
 if(!value||value==='https://legacy.example.invalid'||value==='https://example.invalid'||/^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2):(3000|3001|13000)$/.test(value)){return DEFAULT_SERVICE_ENDPOINT;}
 return value;
}
export function serviceOriginChanged(previous:string,next:string):boolean{return normalizeEndpoint(previous)!==normalizeEndpoint(next);}
