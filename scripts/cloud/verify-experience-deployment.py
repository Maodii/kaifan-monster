#!/usr/bin/env python3
"""Read-only deployed source fingerprints, container health and private gateway boundary."""
import hashlib,json,subprocess,datetime
from pathlib import Path
root=Path(__file__).resolve().parents[2]
files=['backend/src/assistant.ts','backend/src/assistant-policy.ts','backend/src/main.ts','backend/src/assistant-jobs.ts','backend/src/catalog.ts','ai-gateway/app.py']
remote="""
import hashlib,json,subprocess
from pathlib import Path
files=%r
hashes={p:hashlib.sha256((Path('/opt/kaifan')/p).read_bytes()).hexdigest() for p in files}
states=[]
for name in ['shiku-api-1','kaifan-ai-ai-gateway-1']:
 x=json.loads(subprocess.check_output(['docker','inspect',name]))[0]
 states.append({'name':name,'image':x['Image'],'status':x['State']['Status'],'health':x['State'].get('Health',{}).get('Status'),'oomKilled':x['State']['OOMKilled'],'restartCount':x['RestartCount'],'ports':x['HostConfig']['PortBindings']})
print(json.dumps({'sourceHashes':hashes,'containers':states,'privateEnvironmentPermissions':oct(Path('/opt/kaifan/.ai.env').stat().st_mode & 0o777)}))
""" % files
ssh=Path.home()/'.ssh'
r=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o',f'UserKnownHostsFile={ssh/"known_hosts_service"}','-i',str(ssh/'service-deploy-key'),'root@api.example.invalid','python3 -'],input=remote,text=True,capture_output=True,check=True,timeout=40)
report=json.loads(r.stdout)
for path,digest in report['sourceHashes'].items():assert digest==hashlib.sha256((root/path).read_bytes()).hexdigest(),path
assert all(s['health']=='healthy' and s['status']=='running' and not s['oomKilled'] for s in report['containers'])
assert not report['containers'][1]['ports'];assert report['privateEnvironmentPermissions']=='0o600'
report.update(passed=True,verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),scope='cloud runtime health and source fingerprints; provider credentials never read')
(root/'work/reports/ai-v094-deployment.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':True,'checkedFiles':len(files),'containersHealthy':2,'gatewayPublicPorts':0}))
