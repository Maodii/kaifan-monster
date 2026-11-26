import { cryptoFramework } from '@kit.CryptoArchitectureKit';
import { util } from '@kit.ArkTS';
export class BackupEnvelope {format:string='kaifan-backup';version:number=1;algorithm:string='AES-256-GCM';kdf:string='PBKDF2-SHA256';iterations:number=210000;salt:string='';iv:string='';ciphertext:string='';}
const AAD:string='kaifan-backup:v1';
function encode(value:Uint8Array):string{return new util.Base64Helper().encodeToStringSync(value);}
function decode(value:string,length:number=0):Uint8Array {if(typeof value!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(value)){throw new Error('备份编码无效');}const bytes:Uint8Array=new util.Base64Helper().decodeSync(value);if(length&&bytes.length!==length){throw new Error('备份参数长度无效');}return bytes;}
async function keyFor(password:string,salt:Uint8Array):Promise<cryptoFramework.SymKey>{
 if(password.length<8||password.length>128){throw new Error('备份密码请设为8至128个字符');}
 const spec:cryptoFramework.PBKDF2Spec={algName:'PBKDF2',password:new util.TextEncoder().encodeInto(password),salt:salt,iterations:210000,keySize:32};
 const derived:cryptoFramework.DataBlob=await cryptoFramework.createKdf('PBKDF2|SHA256').generateSecret(spec);
 try{return await cryptoFramework.createSymKeyGenerator('AES256').convertKey(derived);}finally{derived.data.fill(0);}
}
export async function encryptBackup(content:string,password:string):Promise<string>{
 if(!content||content.length>12*1024*1024-1024){throw new Error('备份内容为空或过大');}const plain:Uint8Array=new util.TextEncoder().encodeInto(content);if(plain.length>12*1024*1024-1024){throw new Error('备份内容过大');}const e:BackupEnvelope=new BackupEnvelope();const random:cryptoFramework.Random=cryptoFramework.createRandom();const salt:Uint8Array=(await random.generateRandom(16)).data;const iv:Uint8Array=(await random.generateRandom(12)).data;const key:cryptoFramework.SymKey=await keyFor(password,salt);const cipher:cryptoFramework.Cipher=cryptoFramework.createCipher('AES256|GCM|NoPadding');
 const params:cryptoFramework.GcmParamsSpec={algName:'GcmParamsSpec',iv:{data:iv},aad:{data:new util.TextEncoder().encodeInto(AAD)},authTag:{data:new Uint8Array(16)}};
 await cipher.init(cryptoFramework.CryptoMode.ENCRYPT_MODE,key,params);const data:cryptoFramework.DataBlob=await cipher.doFinal({data:plain});e.salt=encode(salt);e.iv=encode(iv);e.ciphertext=encode(data.data);return JSON.stringify(e);
}
export async function decryptBackup(content:string,password:string):Promise<string>{
 if(content.length>16*1024*1024){throw new Error('备份过大');}const e:BackupEnvelope=JSON.parse(content) as BackupEnvelope;
 if(e.format!=='kaifan-backup'||e.version!==1||e.algorithm!=='AES-256-GCM'||e.kdf!=='PBKDF2-SHA256'||e.iterations!==210000){throw new Error('不支持的加密备份格式');}
 const salt:Uint8Array=decode(e.salt,16),iv:Uint8Array=decode(e.iv,12),bytes:Uint8Array=decode(e.ciphertext);if(bytes.length<17||bytes.length>12*1024*1024-1024+16){throw new Error('备份内容不完整');}
 const key:cryptoFramework.SymKey=await keyFor(password,salt);const cipher:cryptoFramework.Cipher=cryptoFramework.createCipher('AES256|GCM|NoPadding');const params:cryptoFramework.GcmParamsSpec={algName:'GcmParamsSpec',iv:{data:iv},aad:{data:new util.TextEncoder().encodeInto(AAD)},authTag:{data:bytes.slice(-16)}};
 try{await cipher.init(cryptoFramework.CryptoMode.DECRYPT_MODE,key,params);const data:cryptoFramework.DataBlob=await cipher.doFinal({data:bytes.slice(0,-16)});return new util.TextDecoder().decodeToString(data.data);}catch(_){throw new Error('密码错误或备份已损坏，未导入任何记录');}
}
