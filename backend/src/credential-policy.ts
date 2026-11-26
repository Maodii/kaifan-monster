export const ACCOUNT_PATTERN = /^(?:[A-Za-z0-9_\-\u4e00-\u9fff]{2,32}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;
export const PASSWORD_PATTERN = /^(?=[\s\S]*[A-Za-z])(?=[\s\S]*[0-9])[\s\S]{6,128}$/;
export function newPasswordError(value:string):string{return PASSWORD_PATTERN.test(value)?'':'密码需6–128位，且同时包含字母和数字';}
