#!/usr/bin/env python3
"""One bounded real-model call. Temporary test identity is deleted in finally."""
import os,json,secrets,uuid,urllib.request,urllib.error,datetime
from pathlib import Path
ORIGIN=os.environ.get('SMOKE_ORIGIN','http://127.0.0.1:13000').rstrip('/')
BASE=ORIGIN+'/api/v1'
checks=[];token=None;password=secrets.token_urlsafe(24)
def req(path,method='GET',body=None,expected=200,auth=None):
 headers={'Content-Type':'application/json'}
 if auth:headers['Authorization']='Bearer '+auth
 r=urllib.request.Request(BASE+path,method=method,headers=headers,data=json.dumps(body).encode() if body is not None else None)
 try:
  with urllib.request.urlopen(r,timeout=35) as res:status,data=res.status,res.read()
 except urllib.error.HTTPError as e:status,data=e.code,e.read()
 assert status==expected,f'{path}: {status}, expected {expected}'
 return json.loads(data) if data else None
try:
 req('/health');checks.append('cloud health')
 req('/ai/assist','POST',{'prompt':'番茄炒蛋怎么做？','consent':True},401);checks.append('unauthenticated request rejected')
 account=req('/auth/register','POST',{'email':'ai-acceptance-'+uuid.uuid4().hex+'@example.invalid','password':password,'deviceName':'ai-acceptance','displayName':'助手验证'},201);token=account['accessToken']
 for body in [{'prompt':'晚餐'},{'prompt':'晚餐','consent':False},{'prompt':'x'*601,'consent':True},{'prompt':'晚餐','consent':True,'userId':str(uuid.uuid4())}]:req('/ai/assist','POST',body,400,token)
 checks.append('consent, question length and unknown identity fields rejected')
 for path in ['/community/posts/page','/discovery/summary','/catalog/submissions/mine']:req(path,expected=404,auth=token)
 checks.append('community, popularity and publication endpoints hidden')
 before=req('/sync/pull?since=0',auth=token)
 result=req('/ai/assist','POST',{'prompt':'番茄炒蛋怎么做？请用三句话回答，提醒先后顺序。','consent':True,'includeInventory':False},201,token)
 assert result['source']=='model',result.get('reason')
 assert result['requires_review'] is True and len(result['text'])>5 and result['references']
 assert all('id' in r and 'name' in r for r in result['references'])
 checks.append('authenticated real model response with catalog references and review flag')
 after=req('/sync/pull?since=0',auth=token);assert before==after
 checks.append('AI request did not mutate synced records')
 report={'passed':True,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'transport':'Public trusted HTTPS' if ORIGIN.startswith('https://') else 'SSH loopback tunnel; mobile public HTTPS not configured','realModelCalls':1,'model':'qwen3.8-flash','answerCharacters':len(result['text']),'referenceCount':len(result['references']),'checks':checks,'accountCleanup':False}
finally:
 if token:
  req('/auth/account','DELETE',{'password':password,'confirmation':'注销我的账号'},200,token)
  if 'report' in globals():report['accountCleanup']=True
if 'report' in globals():
 Path('work/reports/assistant-public-https.json' if ORIGIN.startswith('https://') else 'work/reports/assistant-cloud.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(report,ensure_ascii=False,indent=2))
