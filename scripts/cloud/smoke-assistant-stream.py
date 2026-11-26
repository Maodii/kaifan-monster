#!/usr/bin/env python3
"""Bounded cloud stream/ETag acceptance with private ephemeral identities."""
import os,urllib.parse,concurrent.futures,datetime,hashlib,http.client,json,secrets,time,uuid
from pathlib import Path
ORIGIN=os.environ.get('SMOKE_ORIGIN','http://127.0.0.1:13000').rstrip('/')
URL=urllib.parse.urlparse(ORIGIN)
accounts=[];checks=[]
def req(path,method='GET',body=None,token=None,status=200,headers=None):
 c=(http.client.HTTPSConnection if URL.scheme=='https' else http.client.HTTPConnection)(URL.hostname,URL.port,timeout=35)
 h={'Content-Type':'application/json',**(headers or {})}
 if token:h['Authorization']='Bearer '+token
 try:
  c.request(method,'/api/v1'+path,json.dumps(body).encode() if body is not None else None,h)
  r=c.getresponse();raw=r.read();assert r.status==status,f'{path}: status {r.status}, expected {status}'
  return json.loads(raw) if raw else None,dict((k.lower(),v) for k,v in r.getheaders()),len(raw)
 finally:c.close()
def account():
 password=secrets.token_urlsafe(24)
 data,_,_=req('/auth/register','POST',{'email':'stream-'+uuid.uuid4().hex+'@example.invalid','password':password,'displayName':'流式验收','deviceName':'bounded-stream-test'},status=201)
 accounts.append((data['accessToken'],password));return data['accessToken']
report=None
try:
 token=account();other=account()
 manifest,h,full=req('/catalog/offline/manifest',token=token);tag=h.get('etag');assert tag=='"'+manifest['version']+'"'
 empty,cached,zero=req('/catalog/offline/manifest',token=other,headers={'If-None-Match':tag},status=304);assert empty is None and zero==0
 checks.append('content-version ETag and empty 304 for unchanged public manifest across identities; client cache tested separately')
 before,_,_=req('/sync/pull?since=0',token=token)
 key='stream_'+uuid.uuid4().hex;body={'requestId':key,'task':'ask','prompt':'请分三步说明番茄炒蛋的操作顺序。','consent':True,'includeInventory':False}
 started=time.monotonic()
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: starts=list(pool.map(lambda _:req('/ai/assist/jobs','POST',body,token,status=201),range(2)))
 assert all(s[0]['id']==key for s in starts)
 req('/ai/assist/jobs/'+key,token=other,status=404)
 req('/ai/assist/jobs','POST',{**body,'prompt':'不同内容'},token,status=409)
 position=0;parts=[];first=None;polls=0
 for _ in range(100):
  value,h,_=req('/ai/assist/jobs/'+key+'?after='+str(position),token=token);polls+=1
  assert value['position']==position+len(value.get('delta','').encode('utf-16-le'))//2
  if value.get('delta'):
   parts.append(value['delta']);first=first or round((time.monotonic()-started)*1000,1)
  position=value['position'];assert 'no-store' in h.get('cache-control','')
  if value['state']=='done':break
  assert value['state']=='running';time.sleep(.15)
 else:raise AssertionError('stream did not complete')
 result=value['result'];assert result['source']=='model',result.get('reason');assert ''.join(parts).strip()==result['text'].strip();assert len(parts)>=1
 replay,_,_=req('/ai/assist/jobs/'+key+'?after='+str(position),token=token);assert replay['delta']=='' and replay['result']==result
 total=round((time.monotonic()-started)*1000,1)
 checks.append('real provider incremental output reaches authenticated cursor transport; concurrent start shares job, private owner/body guards and zero-delta replay pass')
 cancel='cancel_'+uuid.uuid4().hex
 req('/ai/assist/jobs/'+cancel,'DELETE',token=token)
 cancelled,_,_=req('/ai/assist/jobs','POST',{**body,'requestId':cancel},token,status=201);assert cancelled['state']=='cancelled' and not cancelled['delta']
 req('/ai/assist/jobs/'+key,'DELETE',token=token);cleared,_,_=req('/ai/assist/jobs/'+key,token=token);assert cleared['state']=='cancelled' and not cleared['delta'] and cleared['result'] is None
 checks.append('cancel-before-start tombstone blocks late start; cancel clears retained private result')
 after,_,_=req('/sync/pull?since=0',token=token);assert before==after
 checks.append('inference and cancellation leave business data untouched')
 report={'passed':True,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'stream':{'realLogicalModelRequests':1,'receivedDeltaBatches':len(parts),'polls':polls,'firstReceivedMs':first,'serverFirstDeltaMs':value.get('firstDeltaMs'),'totalMs':total,'answerCharacters':len(result['text'])},'manifest':{'version':manifest['version'],'fullBytes':full,'unchangedBytes':zero},'scope':'Public trusted HTTPS to deployed API and real provider; device evidence separate' if URL.scheme=='https' else 'SSH loopback to deployed API and real provider; not mobile latency or physical-device evidence','accountsRemoved':0}
finally:
 for token,password in accounts:
  req('/auth/account','DELETE',{'password':password,'confirmation':'注销我的账号'},token=token)
  if report:report['accountsRemoved']+=1
if report:
 Path('work/reports/assistant-stream-public-https.json' if URL.scheme=='https' else 'work/reports/assistant-stream-cloud.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
