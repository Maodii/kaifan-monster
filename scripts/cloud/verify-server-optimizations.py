#!/usr/bin/env python3
"""Verify actual deployed modules with fake dependencies and zero model requests."""
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path
import subprocess

root=Path(__file__).resolve().parents[2]
files=['backend/src/assistant.ts','backend/src/assistant-context.ts','backend/src/assistant-budget.ts','backend/src/assistant-policy.ts','backend/src/assistant-workflow.ts','backend/src/controllers.ts','backend/src/database.ts','ai-gateway/app.py','compose.app.yaml','compose.trial.yaml','scripts/cloud/server-watch.py']
node=r'''
require('reflect-metadata');const assert=require('node:assert/strict');
const {AssistantService}=require('./dist/src/assistant'),{budgetDay}=require('./dist/src/assistant-budget');
const {HealthController}=require('./dist/src/controllers');
let reservations=0,prompt='',settled=[];const db={query:async sql=>sql.includes('recipe_catalog')?[{id:'r1',payload:{name:'蒸鸡蛋',minutes:10,ingredients:[{name:'鸡蛋'}]}}]:[]};
const cache={redis:{get:async()=> 'completed',ping:async()=> 'PONG',eval:async(script,...args)=>{if(script.includes('local old='))reservations++;else settled.push(args.at(-3));return 1;}}};
let text='蒸熟鸡蛋';globalThis.fetch=async(_url,init)=>{prompt=JSON.parse(init.body).prompt;return new Response(JSON.stringify({source:'model',text}));};
(async()=>{const service=new AssistantService(db,cache),owner={userId:'isolated-audit',deviceId:'d',role:'user'};
await assert.rejects(service.assist(owner,{prompt:'安排晚餐',consent:true,startDate:'2026-02-31'}));assert.equal(reservations,0);
await service.assist(owner,{prompt:'推荐晚餐',consent:true,people:5,maxCost:88,maxMinutes:25,excluded:['花生']});
for(const value of ['花生','"people":5','"maxMinutes":25','"maxCost":88'])assert.ok(prompt.includes(value));assert.equal(settled.at(-1),'charge');
text='加入花生油';const denied=await service.assist(owner,{prompt:'鸡蛋怎么做',consent:true,excluded:['花生']});assert.equal(denied.reason,'dietary_conflict');assert.equal(settled.at(-1),'refund');
assert.equal(budgetDay(new Date('2026-11-15T16:00:00Z')),'2026-11-16');const lost=await service.read(owner,'request-123',3);assert.equal(lost.state,'error');assert.equal(lost.position,3);
const health=new HealthController({query:async()=>{throw Error('fixture_down');}},cache);await assert.rejects(health.ready(),e=>e.status===503);
console.log(JSON.stringify({passed:true,checks:['deployed constraints','invalid-date zero quota','dietary guard and refund','China midnight','restart cursor','dependency-readiness failure'],real_model_calls:0}));})().catch(()=>{console.log(JSON.stringify({passed:false,error:'deployed_module_regression'}));process.exitCode=1;});
'''
gateway=r'''
import json,httpx
from fastapi.testclient import TestClient
from app import Settings,create_app,policy_denial
def provider(req):
 body={'choices':[{'message':{'content':'unfinished'},'delta':{'content':'unfinished'},'finish_reason':'length'}]}
 return httpx.Response(200,content=('data: '+json.dumps(body)+'\n\n').encode()) if json.loads(req.content)['stream'] else httpx.Response(200,json=body)
config=Settings(enabled=True,allow_outbound=True,token='x'*32,base_url='https://mock.invalid/v1',api_key='fake',model='mock')
with TestClient(create_app(config,httpx.MockTransport(provider))) as client:
 for route in ['/v1/assist','/v1/assist/stream']:
  response=client.post(route,headers={'Authorization':'Bearer '+'x'*32},json={'prompt':'鸡蛋怎么做'})
  result=json.loads(response.text.splitlines()[-1])['result'] if route.endswith('stream') else response.json()
  assert result['source']=='fallback' and result['reason']=='truncated'
 assert not policy_denial('西兰花焯水多久？')
 assert client.get('/metrics').status_code==401
print(json.dumps({'passed':True,'checks':['deployed nonstream truncation','deployed stream truncation','food scope','private metrics'],'real_model_calls':0}))
'''
remote='''import hashlib,json,subprocess
from pathlib import Path
'''+f'files={files!r}\nnode={node!r}\ngateway={gateway!r}\n'+'''
checks={}
for name,command in [('api',['docker','exec','shiku-api-1','node','-e',node]),('gateway',['docker','exec','kaifan-ai-ai-gateway-1','python','-c',gateway])]:
 r=subprocess.run(command,capture_output=True,text=True,timeout=20)
 if r.returncode:raise SystemExit('deployed isolated regression failed: '+name)
 checks[name]=json.loads(r.stdout)
checks['watch']=json.loads(Path('/opt/kaifan/work/reports/server-watch.json').read_text())
checks['timer_active']=subprocess.check_output(['systemctl','is-active','kaifan-health-watch.timer'],text=True).strip()=='active'
checks['hashes']={p:hashlib.sha256((Path('/opt/kaifan')/p).read_bytes()).hexdigest() for p in files}
checks['containers']=[]
for name in ['shiku-api-1','kaifan-ai-ai-gateway-1','shiku-minio-1','shiku-postgres-1','shiku-redis-1']:
 c=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
 checks['containers'].append({'name':name,'status':c['State']['Status'],'health':c['State'].get('Health',{}).get('Status'),'oom':c['State']['OOMKilled'],'ports':c['HostConfig']['PortBindings'],'image':c['Image']})
print(json.dumps(checks))
'''
ssh=Path.home()/'.ssh'
r=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={ssh/"known_hosts_service"}','-i',str(ssh/'service-deploy-key'),'root@api.example.invalid','python3 -'],input=remote,text=True,capture_output=True,timeout=60)
if r.returncode:raise SystemExit('Deployed optimization verification failed; credentials not printed')
report=json.loads(r.stdout)
report['source_hashes_match']=all(d==hashlib.sha256((root/p).read_bytes()).hexdigest() for p,d in report['hashes'].items())
report['passed']=report['source_hashes_match'] and report['api']['passed'] and report['gateway']['passed'] and report['watch']['healthy'] and report['timer_active'] and all(c['status']=='running' and c['health']=='healthy' and not c['oom'] for c in report['containers']) and not report['containers'][1]['ports']
report['checked_at']=datetime.now(timezone.utc).isoformat();report['real_model_calls']=0
p=root/'work/reports/server-optimization-verification.json';p.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'source_files':len(files),'healthy_containers':len(report['containers']),'real_model_calls':0,'report':str(p)}))
raise SystemExit(0 if report['passed'] else 1)
