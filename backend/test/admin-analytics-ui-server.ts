import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { readdir,readFile } from 'node:fs/promises';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { static as staticFiles } from 'express';
import { Database } from '../dist/src/database';
import { AuthService,AuthGuard } from '../dist/src/auth';
import { AuthController } from '../dist/src/controllers';
import { Cache } from '../dist/src/cache';
import { SocialService } from '../dist/src/social';
import { AdminController,AdminGuard } from '../dist/src/admin';
import { AdminAnalyticsController } from '../dist/src/admin-analytics';
import { Telemetry,TelemetryController,TelemetryInterceptor } from '../dist/src/telemetry';
async function main(){
 const owner=new Database(),db=new Database(),schema='admin_ui_'+randomUUID().replaceAll('-','');db.pool.options.options='-c search_path='+schema;let app:any,created=false,telemetry:Telemetry|undefined;
 try{
  await owner.query('CREATE SCHEMA '+schema);created=true;for(const f of (await readdir('migrations')).filter(f=>f.endsWith('.sql')).sort())await db.query(await readFile('migrations/'+f,'utf8'));
  const module=await Test.createTestingModule({controllers:[AuthController,AdminController,AdminAnalyticsController,TelemetryController],providers:[{provide:Database,useValue:db},{provide:Cache,useValue:{get:async()=>null,set:async()=>{}}},{provide:JwtService,useValue:new JwtService({secret:'isolated-browser-test-secret-at-least-32-characters'})},AuthService,AuthGuard,AdminGuard,SocialService,Telemetry,TelemetryInterceptor]}).compile();
  app=module.createNestApplication({logger:false});app.use('/admin',staticFiles('admin'));app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));app.useGlobalInterceptors(module.get(TelemetryInterceptor));
  const auth=module.get(AuthService),admin:any=await auth.register('browser-admin@example.test','synthetic-admin1','browser-admin'),user:any=await auth.register('browser-user@example.test','synthetic-user1','browser-user');await db.query("UPDATE users SET role='admin' WHERE id=$1",[admin.userId]);
  telemetry=module.get(Telemetry);telemetry.record({userId:user.userId,name:'ai_answer',route:'AI stream',status:200,duration:1800,firstToken:200,task:'ask',outcome:'model'});await telemetry.flush();
  const stop=new Promise<void>(resolve=>{app.getHttpAdapter().getInstance().post('/__test/stop',(_:any,res:any)=>{res.json({stopped:true});resolve();});process.once('SIGTERM',resolve);process.once('SIGINT',resolve);});
  await app.listen(3012,'127.0.0.1');console.log('READY isolated admin browser fixture');await stop;
 }finally{if(telemetry)await telemetry.onModuleDestroy();if(app)await app.close();else await db.onModuleDestroy();if(created)await owner.query('DROP SCHEMA '+schema+' CASCADE');await owner.onModuleDestroy();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
