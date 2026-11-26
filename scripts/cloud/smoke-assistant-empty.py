#!/usr/bin/env python3
"""Public trusted HTTPS empty-stock recommendation acceptance; ephemeral account removed."""
import json,os,secrets,uuid,urllib.request,urllib.error,datetime
from pathlib import Path
ORIGIN=os.environ.get('SMOKE_ORIGIN','https://api.example.invalid').rstrip('/');token=None;password=secrets.token_urlsafe(24);report=None

def req(path,method='GET',body=None,status=200):
 h={'Content-Type':'application/json'}
 if token:h['Authorization']='Bearer '+token
 r=urllib.request.Request(ORIGIN+'/api/v1'+path,method=method,headers=h,data=json.dumps(body).encode() if body is not None else None)
 try:
  with urllib.request.urlopen(r,timeout=40) as res:code,data=res.status,res.read()
 except urllib.error.HTTPError as e:code,data=e.code,e.read()
 assert code==status,f'{path}: HTTP{code}'
 return json.loads(data) if data else None
try:
 a=req('/auth/register','POST',{'email':'empty-stock-'+uuid.uuid4().hex+'@example.invalid','password':password,'displayName':'空库存验收','deviceName':'bounded-empty-stock'},201);token=a['accessToken']
 before=req('/sync/pull?since=0');assert not before['changes']
 r=req('/ai/assist','POST',{'prompt':'库存没有食材，推荐两道20分钟内可采购后制作的菜，告诉我补充什么；不要只说无法推荐。','consent':True,'task':'rescue','includeInventory':True,'people':2,'maxMinutes':20},201)
 assert r['source']=='model',r.get('reason');assert r['inventoryUsed']==0 and len(r['references'])>0
 assert all(0<x['minutes']<=20 for x in r['references']);assert len(r['text'])>10
 assert req('/sync/pull?since=0')==before
 report={'passed':True,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'origin':ORIGIN,'realModelCalls':1,'inventoryCount':r['inventoryUsed'],'references':r['references'],'answer':r['text'],'checks':['Empty authorized cloud inventory still produces constrained catalog recommendations','Real model offers purchase/replenishment guidance','No inventory/meal/recipe writes from server inference'],'accountRemoved':False}
finally:
 if token:
  req('/auth/account','DELETE',{'password':password,'confirmation':'注销我的账号'})
  if report:report['accountRemoved']=True
if report:
 Path('work/reports/assistant-empty-public-https.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
