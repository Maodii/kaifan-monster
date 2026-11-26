import { SmsAuthController, SmsAuthService } from './sms-auth';
import { AliyunSmsProvider } from './sms-provider';
import { AdminAnalyticsController } from './admin-analytics';
import { Telemetry, TelemetryController, TelemetryInterceptor } from './telemetry';
import { AssistantController, AssistantService } from './assistant';
import { WorkspaceController } from './workspace';
import { AlbumBackupController, AlbumBackupService } from './album-backup';
import { AdminController, AdminGuard } from './admin';
import { ShoppingClaimsController } from './shopping-claims';
import { DiscoveryController } from './discovery';
import { ProfileController, RegionsController } from './profile';
import { Cache } from './cache';
import { CatalogController, InsightsController } from './catalog';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { PhotoService, PhotosController } from './photos';
import { SocialService, SocialController } from './social';
import { Database } from './database';
import { AuthService, AuthGuard } from './auth';
import { SyncService } from './sync';
import { AuthController, DevicesController, SyncController, FamiliesController, RecordsController, HealthController } from './controllers';
const secret=process.env.JWT_SECRET;
if(!secret||secret.length<32)throw new Error('JWT_SECRET must contain at least 32 characters');
@Module({imports:[JwtModule.register({secret,signOptions:{issuer:'shiku',audience:'shiku-client'},verifyOptions:{issuer:'shiku',audience:'shiku-client'}}),ThrottlerModule.forRoot([{ttl:60000,limit:120}])],controllers:[SmsAuthController,AdminAnalyticsController,TelemetryController,AssistantController,WorkspaceController,ShoppingClaimsController,AdminController,DiscoveryController,AlbumBackupController,ProfileController,RegionsController,CatalogController,InsightsController,AuthController,DevicesController,SyncController,FamiliesController,RecordsController,HealthController,PhotosController,SocialController],providers:[SmsAuthService,AliyunSmsProvider,Telemetry,TelemetryInterceptor,{provide:APP_INTERCEPTOR,useClass:TelemetryInterceptor},AssistantService,AdminGuard,AlbumBackupService,Cache,Database,AuthService,AuthGuard,SyncService,PhotoService,SocialService,{provide:APP_GUARD,useClass:ThrottlerGuard}]})
export class AppModule {}
