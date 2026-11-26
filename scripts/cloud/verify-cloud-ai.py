#!/usr/bin/env python3
"""One authorized real-model request from the business API container to private AI DNS.

Credentials remain on the host/in process stdin. Outputs contain metadata only.
"""
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess

REMOTE = r'''
import json,subprocess,sys
from pathlib import Path
def run(*args,**kwargs):
    return subprocess.check_output(args,text=True,timeout=35,**kwargs)
gateway=json.loads(run('docker','inspect','kaifan-ai-ai-gateway-1'))[0]
api=json.loads(run('docker','inspect','shiku-api-1'))[0]
token=run('docker','exec','kaifan-ai-ai-gateway-1','python','-c',
          'import os;print(os.environ["AI_GATEWAY_TOKEN"])').strip()
node=r"""
let data='';process.stdin.on('data',x=>data+=x);process.stdin.on('end',async()=>{
 try {
  const {token}=JSON.parse(data),base='http://ai-gateway:8100';
  const health=await fetch(base+'/health',{signal:AbortSignal.timeout(3000)});
  const h=await health.json();
  const unauthorized=await fetch(base+'/v1/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'测试'}),signal:AbortSignal.timeout(3000)});
  const begin=Date.now();
  const result=await fetch(base+'/v1/assist',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({prompt:'请用一句话给出鸡蛋彻底煮熟和过敏原核对的提醒。'}),signal:AbortSignal.timeout(20000)});
  const body=await result.json();
  console.log(JSON.stringify({network_origin:'shiku-api-1',private_dns:'ai-gateway:8100',health_status:health.status,enabled:h.enabled,unauthorized_status:unauthorized.status,assist_status:result.status,source:body.source,reason:body.reason,requires_review:body.requires_review,response_characters:typeof body.text==='string'?body.text.length:0,elapsed_ms:Date.now()-begin,real_model_requests:1}));
 } catch(e) { console.log(JSON.stringify({error:'private_gateway_smoke_failed',error_type:e.name}));process.exitCode=1; }
});
"""
smoke=json.loads(run('docker','exec','-i','shiku-api-1','node','-e',node,input=json.dumps({'token':token})))
networks=list(gateway['NetworkSettings']['Networks'])
ports=gateway['HostConfig']['PortBindings'] or {}
env=dict(item.split('=',1) for item in gateway['Config']['Env'] if '=' in item)
safe_config={key:env.get(key) for key in ['AI_ENABLED','AI_ALLOW_OUTBOUND','AI_MODEL','AI_BASE_URL','AI_TIMEOUT_SECONDS','AI_REQUESTS_PER_MINUTE','AI_MAX_CONCURRENCY']}
report={'smoke':smoke,'container':{'name':'kaifan-ai-ai-gateway-1','status':gateway['State']['Status'],
 'health':gateway['State'].get('Health',{}).get('Status'),'oom_killed':gateway['State']['OOMKilled'],
 'restart_count':gateway['RestartCount'],'memory_limit':gateway['HostConfig']['Memory'],
 'networks':networks,'published_ports':ports,'image_id':gateway['Image'],'safe_config':safe_config},
 'api':{'image_id':api['Image'],'started_at':api['State']['StartedAt'],'health':api['State'].get('Health',{}).get('Status')},
 'appledouble_count':len(list(Path('/opt/kaifan/ai-gateway').rglob('._*')))}
print(json.dumps(report))
'''

root = Path(__file__).resolve().parents[2]
ssh = Path.home() / '.ssh'
result = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=12',
                         '-o', 'StrictHostKeyChecking=yes', '-o', f'UserKnownHostsFile={ssh / "known_hosts_service"}',
                         '-i', str(ssh / 'service-deploy-key'), 'root@api.example.invalid', 'python3 -'],
                        input=REMOTE, capture_output=True, text=True, timeout=60)
if result.returncode:
    # Remote stderr is deliberately not printed; credentials never enter our local output.
    raise SystemExit('Cloud AI smoke command failed (remote exit code %s)' % result.returncode)
report = json.loads(result.stdout)
report['checked_at'] = datetime.now(timezone.utc).isoformat()
s, c = report['smoke'], report['container']
report['passed'] = (s.get('health_status') == 200 and s.get('enabled') is True and
                    s.get('unauthorized_status') == 401 and s.get('assist_status') == 200 and
                    s.get('source') == 'model' and s.get('requires_review') is True and
                    s.get('response_characters', 0) > 0 and s.get('elapsed_ms', 21000) < 20000 and
                    not c['published_ports'] and c['health'] == 'healthy' and
                    'shiku_default' in c['networks'] and report['appledouble_count'] == 0 and
                    float(c['safe_config']['AI_TIMEOUT_SECONDS']) <= 15 and
                    c['safe_config']['AI_MODEL'] == 'qwen3.8-flash')
path = root / 'work/reports/server-ai-cloud.json'
path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'passed': report['passed'], 'report': str(path), 'smoke': s}))
raise SystemExit(0 if report['passed'] else 1)
