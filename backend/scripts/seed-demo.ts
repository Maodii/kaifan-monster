import 'reflect-metadata';
import { createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { hash } from 'argon2';
import { Database } from '../src/database';

const batch='example-seed-batch';
const root='../';
const credentials=root+'work/demo-seed-credentials.json';
const id=(key:string)=>{const h=createHash('sha256').update(batch+':'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const names=['锅边小蘑菇','饭点准时到','番茄不加班','今天炖点啥','米粒旅行家','豆腐研究员','辣椒小队长','认真吃早餐','一碗热汤','厨房新同学','便当收藏家','面条绕地球','清爽小青菜','下班开小灶','周末慢慢煮','糖醋星球','蒸蒸日上','汤圆不熬夜','两人一张桌','今天吃鱼吗','一锅暖冬','低油也好吃','外卖观察员','少洗一个碗'];
const dishes=['番茄炒蛋','宫保鸡丁','鱼香肉丝','麻婆豆腐','红烧肉','清蒸鲈鱼','糖醋排骨','紫菜蛋花汤','酸辣土豆丝','可乐鸡翅','蒜蓉西兰花','皮蛋瘦肉粥','扬州炒饭','葱油拌面','冬瓜排骨汤','回锅肉','凉拌黄瓜','香菇滑鸡','蒸蛋','南瓜粥','白灼虾','咖喱鸡','水煮肉片','咖啡椰奶冻'];
const stories=[
 '下班回来先洗切备菜，米饭焖着的时候炒菜，两示例主体吃刚刚好。',
 '第一次照着教程做，先把食材分装在小碗里，开火以后就不慌了。',
 '今天想吃清爽一点的，调味分两次加，最后再尝一下咸淡。',
 '周末慢慢煮一锅，留出聊天和收拾厨房的时间，也算认真休息。',
 '打包一份明天的便当，酱汁单独装，蔬菜和主食分开放。',
 '没有下厨的一天，在附近吃了一餐。这里的花费和口味感受都是虚构演示。',
 '一菜一汤的小餐桌，先处理费时间的那道，最后再炒快手菜。',
 '按两人份备菜，再根据食量调整；少量多次调味更容易掌握。'];

async function main(){
 if(process.env.NODE_ENV==='production'||!['127.0.0.1','localhost','::1'].includes(process.env.PGHOST||'127.0.0.1'))throw new Error('演示种子仅允许本机开发数据库');
 const db=new Database();
 try{
  if(process.argv.includes('--remove')){
   // Keep unrelated users and user-created responses intact; hide demo posts and retire demo identities.
   await db.transaction(async c=>{
    const ids=(await c.query('SELECT id FROM users WHERE demo_seed_batch=$1 FOR UPDATE',[batch])).rows.map(r=>r.id);
    await c.query("UPDATE social_post SET visibility='private',status='rejected' WHERE user_id=ANY($1::uuid[])",[ids]);
    for(const table of ['discovery_favorite','discovery_search','social_like','social_favorite'])await c.query(`DELETE FROM ${table} WHERE user_id=ANY($1::uuid[])`,[ids]);
    await c.query('DELETE FROM social_follow WHERE follower_id=ANY($1::uuid[]) OR following_id=ANY($1::uuid[])',[ids]);
    await c.query('DELETE FROM social_notification WHERE user_id=ANY($1::uuid[]) OR actor_id=ANY($1::uuid[])',[ids]);
    await c.query('UPDATE devices SET revoked_at=now(),refresh_hash=NULL WHERE user_id=ANY($1::uuid[])',[ids]);
    await c.query('UPDATE users SET deleted_at=now() WHERE demo_seed_batch=$1',[batch]);
   });
   console.log('演示数据已退出公开展示，普通账号及其内容未修改。');return;
  }
  let secret:{batch:string;password:string};
  try{secret=JSON.parse(await readFile(credentials,'utf8'));if(secret.batch!==batch)throw new Error('凭据批次冲突');}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;secret={batch,password:'Demo!'+randomBytes(18).toString('base64url')};await writeFile(credentials,JSON.stringify(secret,null,2)+'\n',{mode:0o600});}
  await chmod(credentials,0o600);
  const passwordHash=await hash(secret.password,{memoryCost:19456,timeCost:2,parallelism:1});
  const all=(await db.query('SELECT id,name,payload FROM recipe_catalog ORDER BY name,id'));
  if(all.length<24)throw new Error('请先导入正式菜谱');
  const recipes=dishes.map(name=>all.find(r=>r.name===name)||all.find(r=>r.name.includes(name))).filter((r,index,rows)=>r&&rows.findIndex(x=>x?.id===r.id)===index);
  for(const r of all)if(recipes.length<24&&!recipes.some(x=>x!.id===r.id))recipes.push(r);
  const regions=(await db.query('SELECT code FROM regions ORDER BY code')).map(r=>r.code);
  const accounts=names.map((name,i)=>({id:id('user:'+i),email:`demo${String(i+1).padStart(2,'0')}@kaifan.example.test`,name:'演示·'+name}));
  await db.transaction(async c=>{
   await c.query('SELECT pg_advisory_xact_lock(842159)');
   for(const [i,a] of accounts.entries()){
    const old=(await c.query('SELECT demo_seed_batch,deleted_at FROM users WHERE id=$1 OR email=$2',[a.id,a.email])).rows;
    if(old.some(r=>r.demo_seed_batch!==batch))throw new Error('检测到非演示账号冲突，事务取消');
    if(old.some(r=>r.deleted_at))throw new Error('演示批次已退役，不自动重新激活');
    await c.query('INSERT INTO users(id,email,password_hash,demo_seed_batch) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',[a.id,a.email,passwordHash,batch]);
    await c.query("INSERT INTO devices(id,user_id,name) VALUES($1,$2,'本地演示种子') ON CONFLICT DO NOTHING",[id('device:'+i),a.id]);
    await c.query('INSERT INTO user_profile(user_id,display_name,region_code,avatar_preset,bio,diet_goal) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[a.id,a.name,regions[i%regions.length],['tomato','rice','cat','mushroom'][i%4],'虚构演示账号，仅用于本地功能与界面测试。',['均衡饮食','控制热量','高蛋白','清淡少油'][i%4]]);
    for(let j=0;j<recipes.length;j++)if(i<24-j){await c.query('INSERT INTO discovery_favorite(user_id,recipe_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[a.id,recipes[j]!.id]);}
    for(let j=0;j<8;j++)if(i<24-j*2)await c.query('INSERT INTO discovery_search(user_id,term,searched_on) VALUES($1,$2,CURRENT_DATE) ON CONFLICT DO NOTHING',[a.id,recipes[j]!.name]);
    const r=recipes[i%recipes.length]!;
    const payload={name:'【演示】'+r.name,date:new Date(Date.now()-i*3600000).toISOString().slice(0,10),mealType:i%3===0?'早餐':i%3===1?'午餐':'晚餐',recipeId:r.id,people:i%4+1,notes:'【虚构演示内容】'+stories[i%stories.length],tags:['演示内容',i%2?'家常小灶':'今日食记'],estimatedCost:12+i*1.5,items:[{name:r.name,recipeId:r.id,estimatedCost:12+i*1.5}]};
    await c.query('INSERT INTO meal_records(id,user_id,device_id,payload) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id('meal:'+i),a.id,id('device:'+i),payload]);
    await c.query("INSERT INTO social_post(id,user_id,source_id,kind,visibility,status,show_price,payload,created_at) VALUES($1,$2,$3,'meal','public','approved',true,$4,now()-$5*interval '1 hour') ON CONFLICT DO NOTHING",[id('post:'+i),a.id,id('meal:'+i),payload,i]);
   }
   for(let p=0;p<accounts.length;p++){
    for(let u=0;u<accounts.length;u++)if(u!==p){
     if((p+u)%3!==0)await c.query('INSERT INTO social_like(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id('post:'+p),accounts[u].id]);
     if((p+u)%4===0)await c.query('INSERT INTO social_favorite(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id('post:'+p),accounts[u].id]);
     if(u<3)await c.query('INSERT INTO social_follow(follower_id,following_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[accounts[u].id,accounts[p].id]);
    }
    for(let n=0;n<2;n++)await c.query('INSERT INTO social_comment(id,post_id,user_id,body) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id(`comment:${p}:${n}`),id('post:'+p),accounts[(p+n+1)%24].id,['【演示留言】这个搭配看着很适合工作日晚饭。','【演示留言】下次想试试少油的版本，先收藏啦。'][n]]);
    await c.query("INSERT INTO social_notification(id,user_id,actor_id,kind,event_key,post_id,comment_id) VALUES($1,$2,$3,'comment',$4,$5,$6) ON CONFLICT DO NOTHING",[id('notice:'+p),accounts[p].id,accounts[(p+1)%24].id,'demo:'+batch+':'+p,id('post:'+p),id(`comment:${p}:0`)]);
   }
  });
  const [counts]=await db.query(`SELECT (SELECT count(*)::int FROM users WHERE demo_seed_batch=$1 AND deleted_at IS NULL) AS accounts,(SELECT count(*)::int FROM social_post WHERE user_id IN(SELECT id FROM users WHERE demo_seed_batch=$1)) AS posts,(SELECT count(*)::int FROM social_comment WHERE user_id IN(SELECT id FROM users WHERE demo_seed_batch=$1)) AS comments,(SELECT count(*)::int FROM discovery_favorite WHERE user_id IN(SELECT id FROM users WHERE demo_seed_batch=$1)) AS recipe_favorites,(SELECT count(*)::int FROM discovery_search WHERE user_id IN(SELECT id FROM users WHERE demo_seed_batch=$1)) AS searches`,[batch]);
  const doc=['# 开饭小怪 · 本地演示账号','', '以下账号和社区内容均为虚构测试数据；没有管理员权限，不绑定真实邮箱。','', '登录密码（所有演示账号相同）：`'+secret.password+'`','', '| 邮箱 | 昵称 |','| --- | --- |',...accounts.map(a=>`| ${a.email} | ${a.name} |`),'','登录后可查看社区、收藏榜、热搜与站内消息；账号01–03还预置了关注关系。','', '重复执行种子不会新增重复账号、动态或互动。退出公开展示：在 backend 目录执行 `node --env-file=../.env --import tsx scripts/seed-demo.ts --remove`。该操作只撤回演示内容、清除演示贡献并停用演示账号，保留普通用户数据。','', '请勿将演示账号用于真实示例主体数据。',''].join('\n');
  await writeFile(root+'outputs/demo-accounts.md',doc,{mode:0o600});await chmod(root+'outputs/demo-accounts.md',0o600);
  await writeFile(root+'work/reports/demo-seed.json',JSON.stringify({passed:true,batch,...counts,synthetic:true,credentials:'outputs/demo-accounts.md',passwordInReport:false,createdAt:new Date().toISOString()},null,2)+'\n');
  console.log(JSON.stringify(counts));
 }finally{await db.onModuleDestroy();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
