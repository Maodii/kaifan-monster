import 'reflect-metadata';
import assert from 'node:assert/strict';
import {validate} from 'class-validator';
import {plainToInstance} from 'class-transformer';
import {RegisterDto,CredentialsDto,ResetPasswordDto} from '../src/dto';
import {PasswordDto} from '../src/controllers';
async function main(){
 const base={email:' 饭搭子_01 ',password:'abc123',deviceName:'test',displayName:'饭搭子'};
 const r=plainToInstance(RegisterDto,base);assert.equal(r.email,'饭搭子_01');assert.equal((await validate(r)).length,0);
 for(const password of ['a12345','12345Z','ABC123','abc123!'])assert.equal((await validate(plainToInstance(RegisterDto,{...base,password}))).length,0,password);
 for(const password of ['a1234','abcdef','123456','中文123456','a'.repeat(129)+'1'])assert.ok((await validate(plainToInstance(RegisterDto,{...base,password}))).length,password);
 for(const email of ['a','contains space','with/slash','x'.repeat(33)])assert.ok((await validate(plainToInstance(RegisterDto,{...base,email}))).length,email);
 assert.equal((await validate(plainToInstance(RegisterDto,{...base,email:'old@example.test'}))).length,0);
 assert.equal((await validate(plainToInstance(CredentialsDto,{email:'old@example.test',password:'legacy-pass',deviceName:'test'}))).length,0);
 assert.equal((await validate(plainToInstance(CredentialsDto,{email:'legacy_user',password:'old',deviceName:'test'}))).length,0);
 for(const value of ['abc123','abcde']){assert.equal((await validate(plainToInstance(PasswordDto,{currentPassword:'old',newPassword:value}))).length===0,value==='abc123');assert.equal((await validate(plainToInstance(ResetPasswordDto,{email:'old@example.test',token:'a'.repeat(64),newPassword:value}))).length===0,value==='abc123');}
 console.log(JSON.stringify({passed:true,checks:['custom Chinese/alphanumeric login and canonical trim/case','six-character letter-plus-digit registration','reject short/single-class passwords and invalid identifiers','legacy email and old-password login compatibility','change/reset share new password rules']}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
