#!/usr/bin/env python3
"""HTTPS acceptance that deliberately never invokes a real SMS send."""
import datetime,json,uuid,urllib.request,urllib.error
from pathlib import Path
origin='https://api.example.invalid';token='';created=False;checks=[];passed=False
account='qa_sms_'+uuid.uuid4().hex[:18];password=uuid.uuid4().hex+'Az2'
def req(path,method='GET',body=None,status=200,auth=True):
 headers={'Content-Type':'application/json'}
 if token and auth:headers['Authorization']='Bearer '+token
 r=urllib.request.Request(origin+'/api/v1'+path,method=method,headers=headers,data=json.dumps(body).encode() if body is not None else None)
 try:
  with urllib.request.urlopen(r,timeout=25) as response:code,data=response.status,response.read()
 except urllib.error.HTTPError as e:code,data=e.code,e.read()
 assert code==status,f'{path}: HTTP{code}, expected{status}'
 return json.loads(data) if data else {}
try:
 assert req('/ready')['status']=='ready';checks.append('Public HTTPS and dependency readiness')
 req('/auth/sms/status',status=401,auth=False)
 req('/auth/sms/send','POST',{'phone':'invalid','purpose':'login'},400,False)
 req('/auth/sms/send','POST',{'phone':'19900000000','purpose':'bind'},400,False)
 req('/auth/sms/login','POST',{'challengeId':str(uuid.uuid4()),'code':'123456','deviceName':'invalid-proof'},400,False)
 req('/auth/sms/reset','POST',{'challengeId':str(uuid.uuid4()),'code':'123456','newPassword':'abc123'},400,False)
 req('/auth/sms/account/send','POST',{'phone':'19900000000','purpose':'bind'},401,False)
 checks.append('Validation, purpose and authentication reject before provider call')
 session=req('/auth/register','POST',{'email':account,'password':password,'deviceName':'sms-smoke','displayName':'短信隔离验收'},201,False);token=session['accessToken'];created=True
 status=req('/auth/sms/status');assert status=={'enabled':True,'phoneMasked':'','phoneBound':False};checks.append('Existing password account works; SMS enabled and no implicit binding')
 again=req('/auth/login','POST',{'email':account,'password':password,'deviceName':'sms-smoke-again'},201,False);assert again['userId']==session['userId'];token=again['accessToken'];assert req('/devices');checks.append('Existing login, session and device APIs preserved');passed=True
finally:
 if created:req('/auth/account','DELETE',{'password':password,'confirmation':'注销我的账号'});created=False
 report={'passed':passed,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'temporaryAccountClosed':not created,'realSmsSent':0,'limitation':'Real phone delivery / provider send template acceptance not exercised'}
 Path('work/reports/sms-auth-cloud.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
