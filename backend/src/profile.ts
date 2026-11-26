import { BadRequestException, Body, ConflictException, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { AuthGuard, Identity, User } from './auth';
import { Database } from './database';
import { PhotoService } from './photos';
export class ProfileDto {
 @IsInt() @Min(1) @Max(Number.MAX_SAFE_INTEGER) version!:number;
 @IsString() @Length(2,24) displayName!:string;
 @IsOptional() @IsString() @Matches(/^\d{6}$/) regionCode?:string;
 @IsIn(['tomato','rice','cat','mushroom']) avatarPreset!:string;
 @IsString() @Length(0,160) bio!:string;
 @IsIn(['均衡饮食','控制热量','高蛋白','清淡少油']) dietGoal!:string;
 @IsOptional() @IsIn(['keep','preset']) avatarMode?:string;
}
export interface AvatarFile { buffer:Buffer;size:number;mimetype:string; }
@Controller('regions')
export class RegionsController { constructor(private readonly db:Database){} @Get() list():Promise<unknown>{return this.db.query('SELECT code,name FROM regions ORDER BY code');} }
@Controller('account') @UseGuards(AuthGuard)
export class ProfileController {
 constructor(private readonly db:Database,private readonly photos:PhotoService){}
 @Get('profile') async get(@User() u:Identity):Promise<unknown>{
  const [p]=await this.db.query(`SELECT p.*,r.name AS region_name FROM user_profile p LEFT JOIN regions r ON r.code=p.region_code WHERE p.user_id=$1`,[u.userId]);
  if(!p)throw new BadRequestException('账号资料尚未初始化');
  return {displayName:p.display_name,regionCode:p.region_code||'',regionName:p.region_name||'',avatarPreset:p.avatar_preset,avatarId:p.avatar_id||'',bio:p.bio,dietGoal:p.diet_goal,version:Number(p.version),updatedAt:p.updated_at};
 }
 @Post('profile/update') updateCompatible(@User() u:Identity,@Body() d:ProfileDto):Promise<unknown>{return this.update(u,d);}
 @Patch('profile') async update(@User() u:Identity,@Body() d:ProfileDto):Promise<unknown>{
  const name=d.displayName.trim();if(name.length<2||/[\u0000-\u001f\u007f]/.test(name))throw new BadRequestException('昵称需为2–24字且不含控制字符');
  if(d.regionCode && !(await this.db.query('SELECT code FROM regions WHERE code=$1',[d.regionCode])).length)throw new BadRequestException('地区无效');
  await this.db.transaction(async c=>{
   const old=(await c.query('SELECT avatar_id,version FROM user_profile WHERE user_id=$1 FOR UPDATE',[u.userId])).rows[0];
   if(!old||Number(old.version)!==d.version)throw new ConflictException('资料已在其他设备更新，请重新读取');
   await c.query(`UPDATE user_profile SET display_name=$1,region_code=$2,avatar_preset=$3,bio=$4,diet_goal=$5,avatar_id=CASE WHEN $6 THEN NULL ELSE avatar_id END,version=version+1,updated_at=now() WHERE user_id=$7`,[name,d.regionCode||null,d.avatarPreset,d.bio.trim(),d.dietGoal,d.avatarMode==='preset',u.userId]);
   if(d.avatarMode==='preset'&&old.avatar_id)await c.query("INSERT INTO object_deletion_jobs(id,photo_id,object_key,available_at) SELECT id,id,object_key,now()+interval '6 minutes' FROM user_avatar WHERE id=$1 ON CONFLICT DO NOTHING",[old.avatar_id]);
  });return this.get(u);
 }
 @Post('avatar') @UseInterceptors(FileInterceptor('avatar',{limits:{fileSize:5*1024*1024,files:1}}))
 async upload(@User() u:Identity,@UploadedFile() file:AvatarFile):Promise<unknown>{
  if(!file?.buffer?.length)throw new BadRequestException('请选择头像');
  const b=file.buffer;const type=b[0]===255&&b[1]===216&&b[2]===255?'image/jpeg':b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP'?'image/webp':'';
  if(!type||file.mimetype!==type)throw new BadRequestException('仅支持JPEG、PNG或WebP图片');
  await this.photos.avatar(u,b,type);return this.get(u);
 }
 @Get('avatar/:id') avatar(@User() u:Identity,@Param('id',ParseUUIDPipe) id:string):Promise<unknown>{return this.photos.avatarDownload(u,id);}
}
