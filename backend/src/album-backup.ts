import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Injectable, OnModuleDestroy, Param, ParseUUIDPipe, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn } from 'class-validator';
import { createHash, randomUUID } from 'node:crypto';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AuthGuard, Identity, User } from './auth';
import { Database } from './database';
export class AlbumConsentDto { @IsIn(['album-backup-v1']) noticeVersion!:string; @IsIn([true]) confirmed!:boolean; }
interface AlbumFile { buffer:Buffer; }
export function albumContentType(b:Buffer):string {
 if(b.length<12)return '';
 if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
 if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP')return 'image/webp';
 if(['GIF87a','GIF89a'].includes(b.subarray(0,6).toString()))return 'image/gif';
 if(b.subarray(4,8).toString()==='ftyp') {
  const brands:string[]=[];for(let i=8;i<Math.min(b.length,64);i+=4)brands.push(b.subarray(i,i+4).toString());
  if(brands.some(v=>['heic','heix','hevc','hevx'].includes(v)))return 'image/heic';
  if(brands.some(v=>['avif','avis'].includes(v)))return 'image/avif';
 }
 return '';
}
@Injectable()
export class AlbumBackupService implements OnModuleDestroy {
 private readonly s3=new S3Client({endpoint:process.env.S3_ENDPOINT||`http://127.0.0.1:${process.env.MINIO_PORT||9000}`,region:process.env.S3_REGION||'us-east-1',forcePathStyle:true,credentials:{accessKeyId:process.env.S3_ACCESS_KEY||process.env.MINIO_ROOT_USER!,secretAccessKey:process.env.S3_SECRET_KEY||process.env.MINIO_ROOT_PASSWORD!}});
 private readonly publicS3=new S3Client({endpoint:process.env.S3_PUBLIC_ENDPOINT||process.env.S3_ENDPOINT||'http://127.0.0.1:9000',region:process.env.S3_REGION||'us-east-1',forcePathStyle:true,credentials:{accessKeyId:process.env.S3_ACCESS_KEY||process.env.MINIO_ROOT_USER!,secretAccessKey:process.env.S3_SECRET_KEY||process.env.MINIO_ROOT_PASSWORD!}});
 private readonly bucket=process.env.S3_BUCKET||'shiku-photos';
 constructor(private readonly db:Database){}
 onModuleDestroy():void {this.s3.destroy();this.publicS3.destroy();}
 async consent(u:Identity,d:AlbumConsentDto):Promise<unknown>{
  return this.db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[u.userId]);const id=randomUUID();await c.query('INSERT INTO album_backup_consent(id,user_id,notice_version) VALUES($1,$2,$3)',[id,u.userId,d.noticeVersion]);return {id};});
 }
 async revoke(u:Identity,id:string):Promise<unknown>{
  return this.db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[u.userId]);await c.query('UPDATE album_backup_consent SET revoked_at=now() WHERE id=$1 AND user_id=$2',[id,u.userId]);return {stopped:true};});
 }
 async upload(u:Identity,consentId:string,file:AlbumFile):Promise<unknown>{
  if(!file?.buffer?.length||file.buffer.length>50*1024*1024)throw new BadRequestException('图片为空或超过50MB');
  const type=albumContentType(file.buffer);if(!type)throw new BadRequestException('暂不支持此原图格式');
  const hash=createHash('sha256').update(file.buffer).digest('hex');let newKey='',newId='';
  try{return await this.db.transaction(async c=>{
   // Serialize upload, stop and cloud deletion for this account, including separate devices.
   await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[u.userId]);
   const consent=(await c.query("SELECT id FROM album_backup_consent WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL AND created_at>now()-interval '24 hours'",[consentId,u.userId])).rows[0];
   if(!consent)throw new ForbiddenException('备份确认已失效，请重新确认');
   const old=(await c.query('SELECT id FROM album_backup_photo WHERE user_id=$1 AND content_hash=$2',[u.userId,hash])).rows[0];if(old)return {id:old.id,duplicate:true};
   const id=randomUUID();newId=id;newKey=`${u.userId}/album-backup/${id}`;
   // Persist a cleanup job before object creation; a process crash cannot strand an unindexed photo.
   await this.db.query("INSERT INTO object_deletion_jobs(id,photo_id,object_key,available_at) VALUES($1,$1,$2,now()+interval '1 hour')",[id,newKey]);
   await this.s3.send(new PutObjectCommand({Bucket:this.bucket,Key:newKey,ContentType:type,Body:file.buffer}));
   await c.query('INSERT INTO album_backup_photo(id,user_id,consent_id,content_hash,object_key,content_type,byte_size) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,u.userId,consentId,hash,newKey,type,file.buffer.length]);
   await c.query('DELETE FROM object_deletion_jobs WHERE id=$1',[id]);
   return {id,duplicate:false};
  });}catch(e){
   if(newKey){
    // A lost COMMIT response may still have committed; preserve any indexed object.
    const indexed=await this.db.query('SELECT id FROM album_backup_photo WHERE id=$1',[newId]);
    if(!indexed.length){try{await this.s3.send(new DeleteObjectCommand({Bucket:this.bucket,Key:newKey}));await this.db.query('DELETE FROM object_deletion_jobs WHERE id=$1',[newId]);}catch{/* Durable cleanup job will retry. */}}
   }throw e;
  }
 }
 async summary(u:Identity):Promise<unknown>{const [row]=await this.db.query('SELECT count(*)::int AS count,COALESCE(sum(byte_size),0)::text AS bytes FROM album_backup_photo WHERE user_id=$1',[u.userId]);return row;}
 async download(u:Identity,id:string):Promise<unknown>{const [p]=await this.db.query('SELECT object_key FROM album_backup_photo WHERE user_id=$1 AND id=$2',[u.userId,id]);if(!p)throw new ForbiddenException();return {url:await getSignedUrl(this.publicS3,new GetObjectCommand({Bucket:this.bucket,Key:p.object_key}),{expiresIn:300})};}
 async clear(u:Identity):Promise<unknown>{
  // Revoke first in its own transaction, so a failed object deletion never re-enables uploading.
  await this.db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[u.userId]);await c.query('UPDATE album_backup_consent SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[u.userId]);});
  return this.db.transaction(async c=>{
   await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[u.userId]);
   // Also invalidate a consent created between the two transactions.
   await c.query('UPDATE album_backup_consent SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[u.userId]);
   const rows=(await c.query('SELECT id,object_key FROM album_backup_photo WHERE user_id=$1',[u.userId])).rows;
   for(const row of rows){await this.s3.send(new DeleteObjectCommand({Bucket:this.bucket,Key:row.object_key}));await c.query('DELETE FROM album_backup_photo WHERE id=$1 AND user_id=$2',[row.id,u.userId]);}
   return {deleted:rows.length};
  });
 }
}
@Controller('album-backup') @UseGuards(AuthGuard)
export class AlbumBackupController {
 constructor(private readonly album:AlbumBackupService){}
 @Post('consent') consent(@User() u:Identity,@Body() d:AlbumConsentDto):Promise<unknown>{return this.album.consent(u,d);}
 @Delete('consent/:id') revoke(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.album.revoke(u,id);}
 @Get() summary(@User() u:Identity):Promise<unknown>{return this.album.summary(u);}
 @Post('photos/:consentId') @UseInterceptors(FileInterceptor('photo',{limits:{fileSize:50*1024*1024,files:1}}))
 upload(@User() u:Identity,@Param('consentId',ParseUUIDPipe) id:string,@UploadedFile() file:AlbumFile):Promise<unknown>{return this.album.upload(u,id,file);}
 @Get('photos/:id/download') download(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.album.download(u,id);}
 @Delete() clear(@User() u:Identity):Promise<unknown>{return this.album.clear(u);}
}
