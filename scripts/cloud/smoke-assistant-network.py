#!/usr/bin/env python3
"""One logical model request plus concurrent/replay transport acceptance; ephemeral account cleaned."""
import concurrent.futures,datetime,gzip,hashlib,http.client,json,secrets,time,uuid
from pathlib import Path
TOKEN=None;password=secrets.token_urlsafe(24);checks=[]
def request(path,method='GET',body=None,token=None,encoding='identity',connection=None,expected=200):
 own=connection is None;c=connection or http.client.HTTPConnection('127.0.0.1',13000,timeout=35)
 headers={'Accept-Encoding':encoding,'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 started=time.monotonic()
 try:
  c.request(method,'/api/v1'+path,body=json.dumps(body).encode() if body is not None else None,headers=headers);r=c.getresponse();data=r.read();h={k.lower():v for k,v in r.getheaders()};assert r.status==expected,f'{path}: status {r.status}, expected {expected}'
  return data,h,round((time.monotonic()-started)*1000,1)
 finally:
  if own:c.close()
def json_request(*args,**kwargs):
 data,h,ms=request(*args,**kwargs);return json.loads(data),h,ms
try:
 account,_,_=json_request('/auth/register','POST',{'email':'ai-network-'+uuid.uuid4().hex+'@example.invalid','password':password,'displayName':'网络验收','deviceName':'bounded-network-test'},expected=201);TOKEN=account['accessToken']
 conn=http.client.HTTPConnection('127.0.0.1',13000,timeout=35)
 try:
  plain,plain_headers,plain_ms=request('/catalog/recipes',token=TOKEN,connection=conn);socket_id=conn.sock.fileno()
  packed,packed_headers,packed_ms=request('/catalog/recipes',token=TOKEN,encoding='gzip',connection=conn)
  assert conn.sock and conn.sock.fileno()==socket_id
 finally:conn.close()
 assert packed_headers.get('content-encoding')=='gzip';assert gzip.decompress(packed)==plain;assert len(packed)<len(plain)
 checks.append('cloud catalog gzip matches identity JSON exactly; two requests reuse the same HTTP connection')
 key='net_'+uuid.uuid4().hex;body={'requestId':key,'task':'ask','prompt':'请用一句话说明番茄炒蛋先炒鸡蛋还是番茄。','consent':True}
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  replies=list(pool.map(lambda _:json_request('/ai/assist','POST',body,token=TOKEN,expected=201),range(2)))
 assert replies[0][0]==replies[1][0];assert replies[0][0]['source']=='model',replies[0][0].get('reason')
 replay,headers,replay_ms=json_request('/ai/assist','POST',body,token=TOKEN,expected=201);assert replay==replies[0][0];assert 'no-store' in headers.get('cache-control','');assert 'content-encoding' not in headers
 checks.append('concurrent identical request IDs and completed replay return the same real-model answer; private response is no-store')
 request('/ai/assist','POST',{**body,'prompt':'different'},token=TOKEN,expected=409)
 checks.append('reusing a request ID for altered content is rejected')
 request('/community/posts/page',token=TOKEN,expected=404);checks.append('community remains hidden')
 report={'passed':True,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'catalogTransfer':{'identityBytes':len(plain),'gzipBytes':len(packed),'savedPercent':round((1-len(packed)/len(plain))*100,1),'sha256':hashlib.sha256(plain).hexdigest(),'identityMs':plain_ms,'gzipMs':packed_ms},'assistantTransport':{'logicalRequests':1,'concurrentResponses':2,'replays':1,'responseMs':[x[2] for x in replies],'replayMs':replay_ms},'scope':'SSH loopback cloud acceptance; timings are samples, not a mobile latency guarantee','accountRemoved':False}
finally:
 if TOKEN:json_request('/auth/account','DELETE',{'password':password,'confirmation':'注销我的账号'},token=TOKEN)
 if 'report' in globals():report['accountRemoved']=True
if 'report' in globals():
 Path('work/reports/assistant-network-cloud.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
