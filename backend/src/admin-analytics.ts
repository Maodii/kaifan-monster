import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth';
import { AdminGuard } from './admin';
import { Database } from './database';
import { Telemetry } from './telemetry';
@Controller('admin/analytics') @UseGuards(AuthGuard,AdminGuard)
export class AdminAnalyticsController {
 constructor(private readonly db:Database,private readonly telemetry:Telemetry){}
 @Get() async overview(@Query('days') raw='7',@Query('test') test='exclude'){
  const days=Number(raw);if(![1,7,30,90].includes(days)||!['exclude','include','only'].includes(test))throw new BadRequestException('统计筛选无效');
  await this.telemetry.flush();
  const where=`e.created_at >= (now() AT TIME ZONE 'Asia/Shanghai')::date AT TIME ZONE 'Asia/Shanghai' - ($1::int-1)*interval '1 day' AND ($2='include' OR ($2='only' AND e.is_test) OR ($2='exclude' AND NOT e.is_test))`;
  const params=[days,test];
  const [summary]=await this.db.query(`SELECT count(DISTINCT user_id) FILTER(WHERE status<400 AND event_name NOT LIKE 'client_%')::int AS active_users,count(*) FILTER(WHERE event_name='register' AND status<400)::int AS registrations,count(*) FILTER(WHERE event_name='ai_answer')::int AS ai_requests,count(*) FILTER(WHERE event_name='ai_answer' AND outcome='model')::int AS ai_success,count(*) FILTER(WHERE event_name='ai_answer' AND code='daily_limit')::int AS quota_hits,count(*) FILTER(WHERE event_name='api_request')::int AS api_requests,count(*) FILTER(WHERE event_name='api_request' AND status>=500)::int AS api_errors,round((percentile_cont(0.5) WITHIN GROUP(ORDER BY duration_ms) FILTER(WHERE event_name='ai_answer'))::numeric)::int AS ai_p50_ms,round((percentile_cont(0.95) WITHIN GROUP(ORDER BY duration_ms) FILTER(WHERE event_name='ai_answer'))::numeric)::int AS ai_p95_ms,round(avg(first_token_ms) FILTER(WHERE event_name='ai_answer'))::int AS first_token_ms,min(created_at) AS first_record_at FROM telemetry_event e WHERE ${where}`,params);
  const daily=await this.db.query(`SELECT to_char(e.created_at AT TIME ZONE 'Asia/Shanghai','YYYY-MM-DD') AS day,count(DISTINCT user_id) FILTER(WHERE status<400 AND event_name NOT LIKE 'client_%')::int AS active_users,count(*) FILTER(WHERE event_name='register' AND status<400)::int AS registrations,count(*) FILTER(WHERE event_name='ai_answer')::int AS ai_requests,count(*) FILTER(WHERE event_name='ai_answer' AND outcome='model')::int AS ai_success FROM telemetry_event e WHERE ${where} GROUP BY day ORDER BY day DESC`,params);
  const problems=await this.db.query(`SELECT event_name,route,status,code,count(*)::int AS count,round(avg(duration_ms))::int AS average_ms FROM telemetry_event e WHERE ${where} AND (status>=400 OR (event_name='ai_answer' AND outcome<>'model')) GROUP BY event_name,route,status,code ORDER BY count DESC LIMIT 20`,params);
  const feedback=await this.db.query(`SELECT f.vote,f.reason,count(*)::int AS count FROM telemetry_feedback f JOIN telemetry_event e ON e.id=f.event_id WHERE ${where} GROUP BY f.vote,f.reason ORDER BY count DESC`,params);
  const features=await this.db.query(`SELECT route,count(*)::int AS count,round(avg(duration_ms))::int AS average_ms FROM telemetry_event e WHERE ${where} AND event_name='api_request' GROUP BY route ORDER BY count DESC LIMIT 20`,params);
  const clientEvents=await this.db.query(`SELECT platform,app_version,event_name,route,task,outcome,count(*)::int AS count,round(avg(duration_ms))::int AS average_ms FROM telemetry_event e WHERE ${where} AND event_name LIKE 'client_%' GROUP BY platform,app_version,event_name,route,task,outcome ORDER BY count DESC LIMIT 50`,params);
  return {clientEvents,summary,daily,problems,feedback,features,collection:this.telemetry.health(),days,test,timezone:'Asia/Shanghai',scope:'云端活跃用户：期间成功使用云服务的去重账号；不代表本机模式日活。默认排除管理员及演示账号；数据从接入后开始。首字耗时为后端收到可展示增量的时间，不含客户端轮询延迟。Token及费用尚未统计。'};
 }
}
