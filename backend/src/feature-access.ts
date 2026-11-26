import { CanActivate, ExecutionContext, NotFoundException } from '@nestjs/common';
import { AuthGuard, AuthedRequest } from './auth';
import { isWhitelistedAdmin } from './runtime-config';
/** Closed features remain private; only verified database role + configured user ID bypass. */
export class FeatureAccessGuard implements CanActivate {
 constructor(private readonly auth:AuthGuard){}
 async canActivate(context:ExecutionContext):Promise<boolean>{
  const req=context.switchToHttp().getRequest<AuthedRequest>();
  if(!/^\/api\/v1\/(community|discovery|admin\/(moderation|demo))(\/|\?|$)/.test(req.originalUrl)&&!/^\/api\/v1\/catalog\/(submissions|public)(\/|\?|$)/.test(req.originalUrl))return true;
  try{await this.auth.canActivate(context);}catch{throw new NotFoundException('此功能暂未开放');}
  if(!req.identity||!isWhitelistedAdmin(req.identity))throw new NotFoundException('此功能暂未开放');
  return true;
 }
}
