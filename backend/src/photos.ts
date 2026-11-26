import { Body, Controller, Delete, ForbiddenException, Injectable, Param, ParseUUIDPipe, Post, UseGuards, BadRequestException, OnModuleInit, OnModuleDestroy, Get } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { Database } from './database';
import { AuthGuard, Identity, User } from './auth';
import { PhotoDto } from './dto';
@Injectable()
export class PhotoService implements OnModuleInit, OnModuleDestroy {
 private timer: ReturnType<typeof setInterval> | undefined;
 private cleaning=false;
 onModuleInit():void { this.timer=setInterval(()=>{void this.cleanup();},30000);this.timer.unref(); }
 onModuleDestroy():void {if(this.timer)clearInterval(this.timer);this.s3.destroy();this.publicS3.destroy();}
 async cleanup():Promise<void>{
  if(this.cleaning)return;this.cleaning=true;try{
   await this.db.transaction(async c=>{await c.query("INSERT INTO object_deletion_jobs(id,photo_id,object_key,available_at) SELECT id,id,object_key,now() FROM meal_photo WHERE status='pending' AND created_at<now()-interval '1 hour' ON CONFLICT DO NOTHING");await c.query("INSERT INTO object_deletion_jobs(id,photo_id,object_key,available_at) SELECT a.id,a.id,a.object_key,now() FROM user_avatar a WHERE a.created_at<now()-interval '1 hour' AND NOT EXISTS(SELECT 1 FROM user_profile p WHERE p.avatar_id=a.id) ON CONFLICT DO NOTHING");const jobs=(await c.query('SELECT * FROM object_deletion_jobs WHERE available_at<=now() ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED')).rows;
    for(const job of jobs){try{await this.s3.send(new DeleteObjectCommand({Bucket:this.bucket,Key:job.object_key}));await c.query('DELETE FROM meal_photo WHERE id=$1',[job.photo_id]);await c.query('DELETE FROM user_avatar WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM user_profile p WHERE p.avatar_id=user_avatar.id)',[job.photo_id]);await c.query('DELETE FROM object_deletion_jobs WHERE id=$1',[job.id]);}catch{await c.query("UPDATE object_deletion_jobs SET attempts=attempts+1,last_error='Object storage unavailable',available_at=now()+interval '1 minute' * LEAST(attempts+1,60) WHERE id=$1",[job.id]);}}
   });
  }catch{ /* 队列保留，下一轮重试。 */ }finally{this.cleaning=false;}
 }
 private readonly s3=new S3Client({endpoint:process.env.S3_ENDPOINT||`http://127.0.0.1:${process.env.MINIO_PORT||9000}`,region:process.env.S3_REGION||'us-east-1',forcePathStyle:true,credentials:{accessKeyId:process.env.S3_ACCESS_KEY||process.env.MINIO_ROOT_USER!,secretAccessKey:process.env.S3_SECRET_KEY||process.env.MINIO_ROOT_PASSWORD!}});
 private readonly publicS3=new S3Client({endpoint:process.env.S3_PUBLIC_ENDPOINT||process.env.S3_ENDPOINT||'http://127.0.0.1:9000',region:process.env.S3_REGION||'us-east-1',forcePathStyle:true,credentials:{accessKeyId:process.env.S3_ACCESS_KEY||process.env.MINIO_ROOT_USER!,secretAccessKey:process.env.S3_SECRET_KEY||process.env.MINIO_ROOT_PASSWORD!}});
 private readonly bucket=process.env.S3_BUCKET||'shiku-photos';
 constructor(private readonly db:Database){}
 private async authorize(user:Identity,mealId:string):Promise<void>{
  const [m]=await this.db.query('SELECT user_id FROM meal_records WHERE id=$1 AND NOT deleted',[mealId]);
  if(!m||m.user_id!==user.userId)throw new ForbiddenException('仅记录所有者可管理照片');
 }
 async presign(user:Identity,d:PhotoDto):Promise<unknown>{
  await this.authorize(user,d.mealId);const id=randomUUID();const key=`${user.userId}/${d.mealId}/${id}`;
  const url=await getSignedUrl(this.publicS3,new PutObjectCommand({Bucket:this.bucket,Key:key,ContentType:d.contentType}),{expiresIn:300});
  const canonical=`${process.env.S3_PUBLIC_ENDPOINT||process.env.S3_ENDPOINT||'http://127.0.0.1:9000'}/${this.bucket}/${key}`;
  await this.db.transaction(async c=>{const m=(await c.query('SELECT user_id FROM meal_records WHERE id=$1 AND NOT deleted FOR UPDATE',[d.mealId])).rows[0];if(!m||m.user_id!==user.userId)throw new ForbiddenException();await c.query('INSERT INTO meal_photo(id,user_id,meal_id,object_key,url) VALUES($1,$2,$3,$4,$5)',[id,user.userId,d.mealId,key,canonical]);});
  return {id,uploadUrl:url,expiresIn:300,contentType:d.contentType};
 }
 async download(user:Identity,id:string):Promise<unknown>{
  const [p]=await this.db.query("SELECT p.* FROM meal_photo p JOIN meal_records m ON m.id=p.meal_id WHERE p.id=$1 AND p.status='uploaded' AND NOT m.deleted AND (m.user_id=$2 OR EXISTS(SELECT 1 FROM family_member f WHERE f.family_id=m.family_id AND f.user_id=$2) OR EXISTS(SELECT 1 FROM social_post s WHERE s.source_id=m.id AND s.status='approved' AND (s.visibility='public' OR (s.visibility='family' AND EXISTS(SELECT 1 FROM family_member f WHERE f.family_id=s.family_id AND f.user_id=$2)))))",[id,user.userId]);
  if(!p)throw new ForbiddenException();return {url:await getSignedUrl(this.publicS3,new GetObjectCommand({Bucket:this.bucket,Key:p.object_key}),{expiresIn:300}),expiresIn:300};
 }
 async complete(user:Identity,id:string):Promise<unknown>{
  const [p]=await this.db.query('SELECT * FROM meal_photo WHERE id=$1 AND user_id=$2',[id,user.userId]);if(!p)throw new ForbiddenException();await this.authorize(user,p.meal_id);
  const info=await this.s3.send(new HeadObjectCommand({Bucket:this.bucket,Key:p.object_key}));
  if(!info.ContentLength||info.ContentLength>20*1024*1024||!['image/jpeg','image/png','image/webp'].includes(info.ContentType||'')){await this.remove(user,id);throw new BadRequestException('图片类型或大小无效（上限20MB）');}
  const updated=await this.db.query("UPDATE meal_photo SET status='uploaded' WHERE id=$1 AND status='pending' AND EXISTS(SELECT 1 FROM meal_records m WHERE m.id=meal_photo.meal_id AND NOT m.deleted) RETURNING id",[id]);if(!updated.length)throw new BadRequestException('记录已删除或上传已结束');return {id,url:p.url,status:'uploaded'};
 }
 async avatar(user:Identity,bytes:Buffer,contentType:string):Promise<void>{
  const id=randomUUID(),key=`${user.userId}/avatars/${id}`;
  await this.db.query('INSERT INTO user_avatar(id,user_id,object_key,content_type,byte_size) VALUES($1,$2,$3,$4,$5)',[id,user.userId,key,contentType,bytes.length]);
  await this.s3.send(new PutObjectCommand({Bucket:this.bucket,Key:key,ContentType:contentType,Body:bytes}));
  await this.db.transaction(async c=>{
   const old=(await c.query('SELECT avatar_id FROM user_profile WHERE user_id=$1 FOR UPDATE',[user.userId])).rows[0];
   if(!old)throw new BadRequestException('账号资料不存在');
   await c.query('UPDATE user_profile SET avatar_id=$1,version=version+1,updated_at=now() WHERE user_id=$2',[id,user.userId]);
   if(old.avatar_id)await c.query("INSERT INTO object_deletion_jobs(id,photo_id,object_key,available_at) SELECT id,id,object_key,now()+interval '6 minutes' FROM user_avatar WHERE id=$1 ON CONFLICT DO NOTHING",[old.avatar_id]);
  });
 }
 async avatarDownload(user:Identity,id:string):Promise<unknown>{
  const [p]=await this.db.query('SELECT a.object_key FROM user_avatar a JOIN user_profile p ON p.avatar_id=a.id WHERE a.id=$1 AND a.user_id=$2',[id,user.userId]);
  if(!p)throw new ForbiddenException();return {url:await getSignedUrl(this.publicS3,new GetObjectCommand({Bucket:this.bucket,Key:p.object_key}),{expiresIn:300}),expiresIn:300};
 }
 async remove(user:Identity,id:string):Promise<unknown>{
  const [p]=await this.db.query('SELECT * FROM meal_photo WHERE id=$1 AND user_id=$2',[id,user.userId]);if(!p)throw new ForbiddenException();
  // 对象删除成功后才删除索引，失败可安全重试。
  await this.db.transaction(async c=>{await c.query("UPDATE meal_photo SET status='deleting' WHERE id=$1",[id]);await c.query("INSERT INTO object_deletion_jobs(id,photo_id,object_key,available_at) VALUES($1,$1,$2,now()+interval '6 minutes') ON CONFLICT DO NOTHING",[id,p.object_key]);});return {deleted:true,cleanupQueued:true};
 }
}
@Controller('photos') @UseGuards(AuthGuard)
export class PhotosController {
 constructor(private readonly photos:PhotoService){}
 @Post('presign') presign(@User() u:Identity,@Body() d:PhotoDto):Promise<unknown>{return this.photos.presign(u,d);}
 @Get(':id/download') download(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.photos.download(u,id);}
 @Post(':id/complete') complete(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.photos.complete(u,id);}
 @Delete(':id') remove(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.photos.remove(u,id);}
}
