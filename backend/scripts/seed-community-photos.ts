import 'reflect-metadata';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {Database} from '../src/database';
import {PhotoService} from '../src/photos';

const batch='kaifan-photo-demo-v1';
const id=(key:string)=>{const h=createHash('sha256').update(batch+':'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
async function main(){
 if(process.env.NODE_ENV==='production'||!['127.0.0.1','localhost','::1'].includes(process.env.PGHOST||'127.0.0.1'))throw new Error('只允许本地演示数据库');
 const manifest=JSON.parse(await readFile('../art-source/community-demo/manifest.json','utf8'));
 if(!manifest.reviewed||manifest.items.length!==8)throw new Error('照片尚未完成目检与正式资源核验');
 const db=new Database(),photos=new PhotoService(db),written:any[]=[];
 try{
  const accounts=await db.query("SELECT u.id,u.email,d.id AS device_id FROM users u JOIN LATERAL(SELECT id FROM devices WHERE user_id=u.id ORDER BY created_at LIMIT 1)d ON true WHERE u.demo_seed_batch='example-seed-batch' AND u.deleted_at IS NULL AND u.role='user' ORDER BY u.email");
  if(accounts.length<8)throw new Error('需要8个未停用的演示账号；不会创建或修改普通账号');
  const catalog=await db.query('SELECT id,name FROM recipe_catalog');
  for(const [i,item] of manifest.items.entries()){
   const account=accounts[i],identity={userId:account.id,deviceId:account.device_id,role:'user'},mealId=id('meal:'+item.slug),postId=id('post:'+item.slug);
   const bytes=await readFile('../'+item.path),digest=createHash('sha256').update(bytes).digest('hex');if(digest!==item.sha256)throw new Error('照片与已审核清单不一致');
   const recipe=catalog.find(r=>r.name===item.dish),cost=[12,22,26,16,28,8,45,25][i];
   const payload:any={name:'【演示】'+item.title,notes:'【虚构演示 · AI生成配图】\n'+item.notes,photoId:'',date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}),mealType:i===5?'早餐':i===1?'午餐':'晚餐',people:i===0||i===2||i===6?2:1,tags:'演示内容 · '+item.tag,estimatedCost:cost,costType:'估算',diningMode:i===4?'餐馆':i===7?'外卖':'在家做',rating:[5,4,5,4,4,5,5,4][i],calories:-1,items:[{name:item.dish,estimatedCost:cost,...(recipe?{recipeId:recipe.id}:{})}],demoBatch:batch,demoPhotoHash:digest,...(recipe?{recipeId:recipe.id}:{})};
   await db.transaction(async c=>{
    const old=(await c.query('SELECT user_id,payload FROM meal_records WHERE id=$1 FOR UPDATE',[mealId])).rows[0];if(old&&(old.user_id!==account.id||old.payload.demoBatch!==batch))throw new Error('演示ID冲突');
    await c.query('INSERT INTO meal_records(id,user_id,device_id,payload) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[mealId,account.id,account.device_id,payload]);
   });
   let photo=(await db.query("SELECT id FROM meal_photo WHERE meal_id=$1 AND user_id=$2 AND status='uploaded' ORDER BY created_at LIMIT 1",[mealId,account.id]))[0];
   if(!photo){
    const upload:any=await photos.presign(identity,{mealId,contentType:'image/jpeg'});
    const response=await fetch(upload.uploadUrl,{method:'PUT',headers:{'Content-Type':'image/jpeg'},body:bytes});if(!response.ok)throw new Error('对象直传失败 '+response.status);
    await photos.complete(identity,upload.id);photo={id:upload.id};
   }
   const read:any=await photos.download(identity,photo.id);const downloaded=await fetch(read.url);if(!downloaded.ok||createHash('sha256').update(Buffer.from(await downloaded.arrayBuffer())).digest('hex')!==digest)throw new Error('对象存储读回校验失败');
   payload.photoId=photo.id;
   await db.transaction(async c=>{
    // Serialize retirement with publication, so a retired batch cannot reappear on retry.
    const active=(await c.query("SELECT id FROM users WHERE id=$1 AND demo_seed_batch='example-seed-batch' AND deleted_at IS NULL FOR UPDATE",[account.id])).rows[0];if(!active)throw new Error('演示账号已停用，停止发布');
    const previous=(await c.query('SELECT user_id,payload FROM social_post WHERE id=$1 FOR UPDATE',[postId])).rows[0];if(previous&&(previous.user_id!==account.id||previous.payload.demoBatch!==batch))throw new Error('动态ID冲突');
    if(previous)throwIfWithdrawn(previous,await c.query('SELECT status,visibility FROM social_post WHERE id=$1',[postId]));
    await c.query('UPDATE meal_records SET payload=$2 WHERE id=$1',[mealId,payload]);
    await c.query("INSERT INTO social_post(id,user_id,source_id,kind,visibility,status,show_price,payload,created_at) VALUES($1,$2,$3,'meal','public','approved',true,$4,now()-$5*interval '12 minutes') ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",[postId,account.id,mealId,payload,i]);
    for(let j=0;j<accounts.length;j++)if(j!==i){if((i+j)%3!==0)await c.query('INSERT INTO social_like(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[postId,accounts[j].id]);if((i+j)%5===0)await c.query('INSERT INTO social_favorite(post_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[postId,accounts[j].id]);}
    for(let j=0;j<2;j++)await c.query('INSERT INTO social_comment(id,post_id,user_id,body) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[id(`comment:${item.slug}:${j}`),postId,accounts[(i+j+1)%accounts.length].id,['【演示留言】这份搭配看起来很适合平日的一餐。','【演示留言】先收藏这个思路，下次也试着搭配一下。'][j]]);
   });
   written.push({slug:item.slug,postId,mealId,photoId:photo.id,userId:account.id,title:payload.name,recipeId:recipe?.id||null,sha256:digest,bytes:bytes.length});console.log('已接入演示图文：'+item.slug);
  }
  await writeFile('../work/reports/community-photo-seed.json',JSON.stringify({passed:true,batch,synthetic:true,count:written.length,storage:'private S3 objects; database stores references only',items:written},null,2)+'\n');
 }finally{photos.onModuleDestroy();await db.onModuleDestroy();}
}
function throwIfWithdrawn(_previous:unknown,result:{rows:any[]}){if(result.rows[0].status!=='approved'||result.rows[0].visibility!=='public')throw new Error('动态已经撤回或被拒绝，不会自动重新发布');}
main().catch(e=>{console.error(e);process.exitCode=1;});
