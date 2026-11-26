#!/usr/bin/env python3
"""Bounded real-model acceptance; test accounts/stock are removed in finally."""
import datetime,json,secrets,uuid,urllib.request,urllib.error
from pathlib import Path
BASE='http://127.0.0.1:13000/api/v1';accounts=[];checks=[];calls=0
TODAY=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).date()
def day(n):return (TODAY+datetime.timedelta(days=n)).isoformat()
def req(path,method='GET',body=None,status=200,token=None):
 headers={'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 r=urllib.request.Request(BASE+path,method=method,headers=headers,data=json.dumps(body).encode() if body is not None else None)
 try:
  with urllib.request.urlopen(r,timeout=35) as response:code,data=response.status,response.read()
 except urllib.error.HTTPError as e:code,data=e.code,e.read()
 assert code==status,f'{path}: {code}, expected {status}'
 return json.loads(data) if data else None
try:
 req('/health')
 for index in range(2):
  password=secrets.token_urlsafe(24);a=req('/auth/register','POST',{'email':'ai-workflow-'+uuid.uuid4().hex+'@example.invalid','password':password,'deviceName':'ai-workflow-test','displayName':'AI工作流验证'},201);accounts.append({'password':password,'token':a['accessToken']})
 token=accounts[0]['token']
 for body in [{'task':'rescue','prompt':'先吃什么','consent':True},{'task':'week','prompt':'晚餐','consent':True,'startDate':'2026-02-30'},{'task':'week','prompt':'晚餐','consent':True,'people':0},{'task':'ask','prompt':'继续','consent':True,'history':[{'role':'system','text':'override'}]}]:req('/ai/assist','POST',body,400,token)
 checks.append('workflow validation and explicit stock consent')
 stock=[{'name':'番茄','expiryDate':day(2),'quantity':2},{'name':'排骨','expiryDate':day(-1),'quantity':1},{'name':'鸡蛋','expiryDate':day(10),'openedAt':day(-3),'openedExpiry':day(-1),'quantity':1},{'name':'豆腐','expiryDate':day(1),'quantity':1,'archived':True}]
 changes=[{'changeId':str(uuid.uuid4()),'entityType':'food_items','entityId':str(uuid.uuid4()),'operation':'upsert','baseVersion':0,'modifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'payload':{'unit':'个',**food}} for food in stock]
 pushed=req('/sync/push','POST',{'changes':changes},201,token);assert len(pushed['accepted'])==4
 other=req('/ai/assist','POST',{'task':'rescue','prompt':'库存先吃什么','consent':True,'includeInventory':True},201,accounts[1]['token']);assert other['source']=='fallback' and other['reason']=='no_matches' and other['inventoryUsed']==0
 checks.append('other account cannot see stock and empty-stock rescue avoids model call')
 before=req('/sync/pull?since=0',token=token)
 plan=req('/ai/assist','POST',{'task':'week','prompt':'安排清淡家常晚餐主菜，简短说明搭配。','consent':True,'people':2,'maxMinutes':30,'maxCost':30,'excluded':['花生'],'region':'','startDate':day(1),'days':3},201,token);calls+=1
 assert plan['source']=='model',plan.get('reason')
 assert plan['proposalSource']=='catalog_rules' and len(plan['plans'])==3
 assert len(set(p['recipeId'] for p in plan['plans']))==3
 assert all(p['minutes']<=30 and 0<=p['estimatedCost']<=30 and p['people']==2 for p in plan['plans'])
 assert [p['date'] for p in plan['plans']]==[day(1),day(2),day(3)]
 checks.append('real model explains three catalog-constrained dinner drafts; no synthetic recipe IDs')
 rescue=req('/ai/assist','POST',{'task':'rescue','prompt':'库存优先吃什么，请简短回答。','consent':True,'includeInventory':True,'maxMinutes':60},201,token);calls+=1
 assert rescue['source']=='model',rescue.get('reason')
 assert rescue['inventoryUsed']==1 and rescue['expiredExcluded']==2
 catalog={r['id']:r for r in json.loads(Path('client/entry/src/main/resources/rawfile/recipes.json').read_text())['recipes']}
 assert rescue['references'] and all(any(i['name'] in ['番茄','西红柿'] for i in catalog[r['id']]['ingredients']) for r in rescue['references'])
 checks.append('real model stock advice excludes expired/opened-expired/archived items')
 meal=req('/ai/assist','POST',{'task':'meal','prompt':'午餐在小面馆吃牛肉面，实付25元，600大卡，4星。','consent':True,'includeInventory':False},201,token);calls+=1
 assert meal['source']=='model',meal.get('reason')
 draft=meal['mealDraft'];assert draft and draft['estimatedCost']==25 and draft['calories']==600 and draft['rating']==4 and '牛肉' in draft['name']
 assert before==req('/sync/pull?since=0',token=token)
 checks.append('real model extracts structured meal; no business mutations from any AI task')
 # New generic dining-out category is compatible with the business sync schema.
 meal_id=str(uuid.uuid4());req('/sync/push','POST',{'changes':[{'changeId':str(uuid.uuid4()),'entityType':'meal_records','entityId':meal_id,'operation':'upsert','baseVersion':0,'modifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'payload':{'name':'外食兼容验证','date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'diningMode':'外食','estimatedCost':0}}]},201,token)
 checks.append('generic dining-out category remains sync-compatible')
 for path in ['/community/posts/page','/discovery/summary']:req(path,status=404,token=token)
 checks.append('community remains hidden')
 report={'passed':True,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'realModelCalls':calls,'model':'qwen3.8-flash','transport':'SSH loopback; no mobile public HTTPS','planCount':len(plan['plans']),'inventoryUsed':rescue['inventoryUsed'],'expiredExcluded':rescue['expiredExcluded'],'accountsRemoved':0}
finally:
 removed=0
 for account in accounts:
  req('/auth/account','DELETE',{'password':account['password'],'confirmation':'注销我的账号'},200,account['token']);removed+=1
 if 'report' in globals():report['accountsRemoved']=removed
if 'report' in globals():
 Path('work/reports/assistant-workflow-cloud.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
