#!/usr/bin/env python3
"""Public custom-account registration/login/change acceptance; ephemeral account removed."""
import datetime,json,uuid,urllib.request,urllib.error
from pathlib import Path
ORIGIN='https://api.example.invalid';token=None;current='abc123';created=False;checks=[]
account='qa_'+uuid.uuid4().hex[:20]
def req(path,method='GET',body=None,status=200,authenticated=True):
 h={'Content-Type':'application/json'}
 if token and authenticated:h['Authorization']='Bearer '+token
 request=urllib.request.Request(ORIGIN+'/api/v1'+path,method=method,headers=h,data=json.dumps(body).encode() if body is not None else None)
 try:
  with urllib.request.urlopen(request,timeout=25) as response:code,data=response.status,response.read()
 except urllib.error.HTTPError as e:code,data=e.code,e.read()
 assert code==status,f'{path}: HTTP{code}, expected{status}'
 return json.loads(data) if data else None
try:
 for password in ['abcdef','123456','a1234']:
  req('/auth/register','POST',{'email':account,'password':password,'deviceName':'bounded-auth','displayName':'规则验收'},400,False)
 checks.append('Short, letters-only and digits-only new passwords rejected over HTTPS')
 session=req('/auth/register','POST',{'email':' '+account.upper()+' ','password':current,'deviceName':'bounded-auth','displayName':'规则验收'},201,False);token=session['accessToken'];created=True
 assert req('/auth/account')['emailVerified'] is False
 assert req('/devices');assert not req('/sync/pull?since=0')['changes'];checks.append('Custom account registers with six-character mixed password, no verification or business-data upload')
 req('/auth/register','POST',{'email':account,'password':current,'deviceName':'duplicate','displayName':'重复验收'},400,False);checks.append('Canonical account duplicate refused without replacing existing credentials')
 login=req('/auth/login','POST',{'email':account,'password':current,'deviceName':'bounded-relogin'},201,False);assert login['userId']==session['userId'];token=login['accessToken'];checks.append('Custom account login reaches the same account')
 req('/auth/password','POST',{'currentPassword':current,'newPassword':'abcdef'},400)
 result=req('/auth/password','POST',{'currentPassword':current,'newPassword':'a1b2c3'},201);current='a1b2c3';assert result['requiresLogin']
 req('/devices',status=401);req('/auth/login','POST',{'email':account,'password':'abc123','deviceName':'old-password'},401,False)
 login=req('/auth/login','POST',{'email':account,'password':current,'deviceName':'new-password'},201,False);token=login['accessToken'];assert login['userId']==session['userId'];checks.append('New six-character mixed password works; old password and existing sessions invalidated')
finally:
 if created:
  token=req('/auth/login','POST',{'email':account,'password':current,'deviceName':'cleanup'},201,False)['accessToken']
  req('/auth/account','DELETE',{'password':current,'confirmation':'注销我的账号'});created=False
report={'passed':True,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'temporaryAccountRemoved':not created,'realModelCalls':0,'businessRecordsCreated':0}
Path('work/reports/account-v0914-cloud.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
