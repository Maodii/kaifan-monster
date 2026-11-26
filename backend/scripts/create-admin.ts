import 'reflect-metadata';
import { randomBytes,randomUUID } from 'node:crypto';
import { readFile,writeFile,chmod } from 'node:fs/promises';
import { hash,verify } from 'argon2';
import { Database } from '../src/database';

async function main(){
 if(process.env.NODE_ENV==='production'||!['127.0.0.1','localhost','::1'].includes(process.env.PGHOST||'127.0.0.1'))throw new Error('此引导脚本仅适用于本地开发库');
 const db=new Database();const path='../work/admin-credentials.json';
 try{
  let credentials:{email:string;password:string;userId:string};
  try{credentials=JSON.parse(await readFile(path,'utf8'));}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;credentials={email:'admin@kaifan.example.test',password:'Admin!'+randomBytes(24).toString('base64url'),userId:randomUUID()};await writeFile(path,JSON.stringify(credentials,null,2)+'\n',{mode:0o600});}
  await chmod(path,0o600);
  const local=process.argv.includes('--local-admin');
  if(local){if(process.env.LOCAL_ADMIN_LOGIN!=='true')throw new Error('需启用本地管理员账号登录');credentials={...credentials,email:'admin',password:credentials.password};}
  const passwordHash=await hash(credentials.password,{memoryCost:19456,timeCost:2,parallelism:1});
  await db.transaction(async c=>{const existing=(await c.query('SELECT id,email,password_hash,role,deleted_at,demo_seed_batch FROM users WHERE email=$1 OR id=$2 FOR UPDATE',[credentials.email,credentials.userId])).rows;if(existing.length){if(existing.length!==1||existing[0].id!==credentials.userId||existing[0].role!=='admin'||existing[0].deleted_at||existing[0].demo_seed_batch)throw new Error('账号已存在或不可用；不会提升其他账号权限或修改其他账号');if(local&&(existing[0].email!=='admin'||!await verify(existing[0].password_hash,credentials.password))){await c.query('UPDATE users SET email=$2,password_hash=$3 WHERE id=$1',[credentials.userId,credentials.email,passwordHash]);await c.query('UPDATE devices SET revoked_at=now(),refresh_hash=NULL WHERE user_id=$1',[credentials.userId]);}return;}
   await c.query("INSERT INTO users(id,email,password_hash,role) VALUES($1,$2,$3,'admin')",[credentials.userId,credentials.email,passwordHash]);await c.query("INSERT INTO user_profile(user_id,display_name,avatar_preset,bio) VALUES($1,'小怪管理员','mushroom','本地管理工作台专用账号')",[credentials.userId]);});
  await writeFile(path,JSON.stringify(credentials,null,2)+'\n',{mode:0o600});await chmod(path,0o600);
  await writeFile('../outputs/admin-access.md',['# 开饭小怪 · 本地管理端','', '入口：[打开管理工作台](http://127.0.0.1:3001/admin/)','', '备用入口：http://127.0.0.1:3000/admin/','', '账号：`'+credentials.email+'`','', '密码：`'+credentials.password+'`','', '此为独立管理员账号，请勿公开或交给普通用户。凭据文件权限0600，登录会话仅保存在浏览器内存中，刷新页面后需重新登录。','', '管理端当前连接本机数据库；请保持本地Docker服务运行。',''].join('\n'),{mode:0o600});await chmod('../outputs/admin-access.md',0o600);console.log('已创建或复用本地独立管理账号，凭据见 outputs/admin-access.md（未在日志中输出密码）');
 }finally{await db.onModuleDestroy();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
