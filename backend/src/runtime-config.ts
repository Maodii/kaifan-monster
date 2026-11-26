import { readFileSync } from 'node:fs';
export interface RuntimeConfig {version:1;ai:{limitsEnabled:boolean;perUserMinute:number;perUserDay:number;globalMinute:number;globalDay:number;maxConcurrency:number;maxJobs:number;dailyLimitEnabled?:boolean;adminUserIds?:string[];};}
export const DEFAULT_RUNTIME:RuntimeConfig={version:1,ai:{limitsEnabled:true,perUserMinute:3,perUserDay:50,globalMinute:10,globalDay:500,maxConcurrency:2,maxJobs:64,dailyLimitEnabled:true,adminUserIds:[]}};
export function validateRuntime(value:unknown):RuntimeConfig {
 const v=value as RuntimeConfig;
 const required=['limitsEnabled','perUserMinute','perUserDay','globalMinute','globalDay','maxConcurrency','maxJobs'];
 const optional=['dailyLimitEnabled','adminUserIds'];
 if(!v||v.version!==1||!v.ai||typeof v.ai.limitsEnabled!=='boolean'||Object.keys(v).some(k=>!['version','ai'].includes(k))||required.some(k=>!(k in v.ai))||Object.keys(v.ai).some(k=>![...required,...optional].includes(k)))throw new Error('invalid_runtime_schema');
 for(const key of required.filter(k=>k!=='limitsEnabled')){const n=v.ai[key as keyof typeof v.ai];if(!Number.isSafeInteger(n)||Number(n)<1||Number(n)>100000)throw new Error('invalid_runtime_limit');}
 if(v.ai.dailyLimitEnabled!==undefined&&typeof v.ai.dailyLimitEnabled!=='boolean')throw new Error('invalid_daily_flag');
 if(v.ai.adminUserIds!==undefined&&(!Array.isArray(v.ai.adminUserIds)||v.ai.adminUserIds.length>100||v.ai.adminUserIds.some(id=>typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))||new Set(v.ai.adminUserIds).size!==v.ai.adminUserIds.length))throw new Error('invalid_admin_whitelist');
 return v;
}
/** Read the parent-mounted file each request: atomic rename and in-place edits both work. */
export function runtimeReader(path:()=>string|undefined=()=>process.env.RUNTIME_CONFIG_FILE):()=>RuntimeConfig {
 let last=DEFAULT_RUNTIME;
 return ()=>{const file=path();if(!file)return DEFAULT_RUNTIME;try{const raw=readFileSync(file,'utf8');if(Buffer.byteLength(raw)>16384)throw new Error('runtime_too_large');last=validateRuntime(JSON.parse(raw));}catch{/* Keep last valid configuration; never execute JSON as code. */}return last;};
}
export const runtimeConfig=runtimeReader();
export function isWhitelistedAdmin(user:{userId:string;role:string}):boolean{return user.role==='admin'&&!!runtimeConfig().ai.adminUserIds?.includes(user.userId);}
