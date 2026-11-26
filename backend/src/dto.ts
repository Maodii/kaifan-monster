import { IsEmail, IsString, MinLength, MaxLength, IsUUID, IsIn, IsInt, Min, IsISO8601, IsObject, IsOptional, IsArray, ValidateNested, ArrayMaxSize, IsBoolean, Matches, Length } from 'class-validator';
import { ACCOUNT_PATTERN, PASSWORD_PATTERN } from './credential-policy';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
export class CredentialsDto {
 @Transform(({value})=>typeof value==='string'?value.trim().toLowerCase():value) @IsString() @MaxLength(254) @Matches(ACCOUNT_PATTERN) email!:string;
 @IsString() @MinLength(1) @MaxLength(128) password!:string;
 @IsString() @MinLength(1) @MaxLength(80) deviceName!:string;
}
export class LocalAdminCredentialsDto {
 @IsString() @MinLength(1) @MaxLength(254) email!:string;
 @IsString() @MinLength(1) @MaxLength(128) password!:string;
 @IsString() @MinLength(1) @MaxLength(80) deviceName!:string;
}
export class RegisterDto extends CredentialsDto {
 @IsString() @MinLength(6) @MaxLength(128) @Matches(PASSWORD_PATTERN) password:string='';
 @IsOptional() @IsString() @Length(2,24) displayName?:string;
 @IsOptional() @IsString() @Matches(/^\d{6}$/) regionCode?:string;
 @IsOptional() @IsIn(['tomato','rice','cat','mushroom']) avatarPreset?:string;
}
export class RefreshDto { @IsString() @MaxLength(4096) refreshToken!:string; }
export const entityTypes=['food_items','barcode_lib','shopping_list','recipes','recipe_favorites','meal_records'] as const;
export class ChangeDto {
 @IsUUID() changeId!:string;
 @IsIn(entityTypes) entityType!:typeof entityTypes[number];
 @IsUUID() entityId!:string;
 @IsIn(['upsert','delete']) operation!:'upsert'|'delete';
 @IsInt() @Min(0) baseVersion!:number;
 @IsISO8601({strict:true}) modifiedAt!:string;
 @IsObject() payload!:Record<string,unknown>;
 @IsOptional() @IsUUID() familyId?:string;
}
export class PushDto {
 @IsArray() @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>ChangeDto) changes!:ChangeDto[];
}
export class ResolveDto extends ChangeDto { @IsBoolean() confirmed!:boolean; }
export class FamilyDto { @IsString() @MinLength(1) @MaxLength(80) name!:string; }
export class InviteDto { @IsString() @MinLength(8) @MaxLength(64) inviteCode!:string; }
export class PhotoDto { @IsUUID() mealId!:string; @IsIn(['image/jpeg','image/png','image/webp']) contentType!:string; }

export class EmailRequestDto { @IsEmail() @MaxLength(254) email!:string; }
export class EmailTokenDto extends EmailRequestDto { @IsString() @Matches(/^[a-f0-9]{64}$/) token!:string; }
export class ResetPasswordDto extends EmailTokenDto { @IsString() @MinLength(6) @MaxLength(128) @Matches(PASSWORD_PATTERN) newPassword!:string; }
export class CloseAccountDto { @IsString() @MaxLength(128) password!:string; @IsString() @MaxLength(30) confirmation!:string; }
