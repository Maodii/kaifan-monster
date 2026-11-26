#!/usr/bin/env python3
"""Check deployed readers, atomic hot updates and account basics; no inference."""
import json
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[2]
remote=r'''
import json,subprocess,urllib.request,os
from pathlib import Path
p=Path('/opt/kaifan/runtime-config/config.json');original=p.read_text()
def node(code):
 r=subprocess.run(['docker','exec','shiku-api-1','node','-e',code],text=True,capture_output=True,timeout=15)
 if r.returncode:raise RuntimeError('container check failed')
 return json.loads(r.stdout)
def gateway():
 return node("fetch('http://ai-gateway:8100/metrics',{headers:{Authorization:'Bearer '+process.env.AI_GATEWAY_TOKEN}}).then(r=>r.json()).then(r=>console.log(JSON.stringify(r.runtime)))")
proc=subprocess.Popen(['docker','exec','-i','shiku-api-1','node','-e',"const r=require('./dist/src/runtime-config').runtimeConfig;require('readline').createInterface({input:process.stdin}).on('line',()=>console.log(JSON.stringify(r())))"],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
def api():
 proc.stdin.write('read\n');proc.stdin.flush();return json.loads(proc.stdout.readline())
def replace(raw):
 tmp=p.with_suffix('.verify.tmp');tmp.write_text(raw);tmp.chmod(0o644);tmp.replace(p)
try:
 base=json.loads(original);assert not base['ai']['limitsEnabled'];assert api()==base;assert gateway()==base
 changed=json.loads(original);changed['ai']['globalMinute']=37
 replace(json.dumps(changed));assert api()==changed;assert gateway()==changed
 replace('{invalid');assert api()==changed;assert gateway()==changed
finally:
 replace(original);proc.terminate();proc.wait(timeout=5)
assert gateway()==json.loads(original)
mock=node("const {AssistantJobs}=require('./dist/src/assistant-jobs'),{AssistantFlights}=require('./dist/src/assistant-transport');(async()=>{let n=0;const work=async()=>{n++;return {source:'model'}};const j=new AssistantJobs(),f=new AssistantFlights();for(let i=0;i<12;i++)j.start('audit-runtime','request-'+i,{},work);await Promise.all(Array.from({length:12},(_,i)=>f.run('audit-runtime','flight-'+i,{},work)));if(n!==24)throw Error('mock_failed');console.log(JSON.stringify({passed:true,jobs:12,flights:12}));})().catch(()=>process.exit(1))")
accounts=node("const {Pool}=require('pg');const p=new Pool({host:process.env.POSTGRES_HOST||process.env.PGHOST||'postgres',port:Number(process.env.POSTGRES_PORT||5432),user:process.env.POSTGRES_USER,password:process.env.POSTGRES_PASSWORD,database:process.env.POSTGRES_DB,connectionTimeoutMillis:3000});(async()=>{try{const counts=await p.query('SELECT count(*)::int AS total,count(*) FILTER (WHERE deleted_at IS NULL)::int AS active,count(*) FILTER (WHERE deleted_at IS NOT NULL)::int AS deleted FROM kaifan_support.accounts');const rows=await p.query('SELECT email,display_name,role,created_at,is_demo,active_devices FROM kaifan_support.accounts WHERE deleted_at IS NULL ORDER BY created_at DESC');console.log(JSON.stringify({counts:counts.rows[0],accounts:rows.rows}));}finally{await p.end();}})().catch(()=>process.exit(1))")
with urllib.request.urlopen('https://api.example.invalid/api/v1/ready',timeout=15) as response:
 assert response.status==200
print(json.dumps({'passed':True,'checks':['both deployed runtime readers','atomic hot update without restart','malformed last-good fallback','disabled config restored','HTTPS readiness'],'runtime':json.loads(original),'deployed_api_mock':mock,'account_summary':accounts,'real_model_calls':0}))
'''
ssh=Path.home()/'.ssh'
r=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={ssh/"known_hosts_service"}','-i',str(ssh/'service-deploy-key'),'root@api.example.invalid','python3 -'],input=remote,text=True,capture_output=True,timeout=80)
if r.returncode:
 print(r.stderr[-1800:]);raise SystemExit('Live verification failed')
report=json.loads(r.stdout);path=root/'work/reports/server-runtime-config.json';path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');path.chmod(0o600)
print(json.dumps(report,ensure_ascii=False))
