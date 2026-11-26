#!/usr/bin/env python3
"""Verify deployed HTTP entitlements and mocked gateway; never call provider."""
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[2]
node=(root/'backend/test/assistant-entitlements.cloud.cjs').read_text()
mock=(root/'ai-gateway/tests/test_runtime.py').read_text().replace("json.loads(Path('infra/runtime-config.json').read_text())",repr(json.loads((root/'infra/runtime-config.json').read_text())))+'\nif __name__ == "__main__": unittest.main()\n'
remote='import json,subprocess\nnode='+repr(node)+'\nmock='+repr(mock)+'''
r=subprocess.run(['docker','exec','-i','shiku-api-1','node','-'],input=node,text=True,capture_output=True,timeout=55)
if r.returncode:
 print(r.stderr[-1500:]);raise SystemExit('Deployed HTTP entitlement verification failed')
report=json.loads(r.stdout)
r=subprocess.run(['docker','exec','-i','kaifan-ai-ai-gateway-1','python','-'],input=mock,text=True,capture_output=True,timeout=20)
if r.returncode:
 print(r.stderr[-1500:]);raise SystemExit('Deployed mocked gateway verification failed')
report['gateway_unlimited_mock']=True
report['temporary_fixture_cleaned']=True
print(json.dumps(report))
'''
ssh=Path.home()/'.ssh'
r=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={ssh/"known_hosts_service"}','-i',str(ssh/'service-deploy-key'),'root@api.example.invalid','python3 -'],input=remote,text=True,capture_output=True,timeout=100)
if r.returncode:
 print(r.stdout[-2000:]);raise SystemExit(r.stderr[-1500:] or 'Verification failed')
report=json.loads(r.stdout);report['verified_at']=datetime.now(timezone.utc).isoformat()
p=root/'work/reports/server-ai-entitlements.json';p.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
