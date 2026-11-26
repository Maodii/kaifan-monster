import { FeatureAccessGuard } from './feature-access';
import { AuthGuard } from './auth';
import 'reflect-metadata';
import { catalogCompression } from './network';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, static as staticFiles, Request, Response, NextFunction } from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';
async function bootstrap():Promise<void>{
 const app=await NestFactory.create(AppModule,{bodyParser:false});
 // Trust only the configured local ingress peer, never arbitrary forwarded headers.
 const trustedProxy=(process.env.TRUST_PROXY_CIDRS||'').split(',').map(v=>v.trim()).filter(Boolean);
 if(trustedProxy.length){app.getHttpAdapter().getInstance().set('trust proxy',trustedProxy);}
 app.useGlobalGuards(new FeatureAccessGuard(app.get(AuthGuard)));
 app.use(catalogCompression());
 app.use((req:Request,res:Response,next:NextFunction)=>{if(/^\/api\/v1\/(ai|auth|account|sync|admin|telemetry)(\/|\?|$)/.test(req.originalUrl))res.setHeader('Cache-Control','private, no-store');next();});
 app.use('/admin',staticFiles(join(process.cwd(),'admin'),{setHeaders:res=>res.setHeader('Cache-Control','no-cache')}));
 app.use('/api/v1/ai',json({limit:'16kb'}));
 app.use(json({limit:'1mb'}));app.setGlobalPrefix('api/v1');
 app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
 app.enableShutdownHooks();
 const config=new DocumentBuilder().setTitle('食库 API').setVersion('0.1.0').addBearerAuth().build();
 SwaggerModule.setup('api/docs',app,SwaggerModule.createDocument(app,config));
 const server=app.getHttpServer();server.keepAliveTimeout=65000;server.headersTimeout=70000;
 await app.listen(Number(process.env.PORT||3000),process.env.API_HOST||'127.0.0.1');
}
bootstrap().catch(e=>{console.error(e);process.exitCode=1;});
