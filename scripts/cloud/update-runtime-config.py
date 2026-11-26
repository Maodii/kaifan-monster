#!/usr/bin/env python3
"""Validate and atomically update server runtime JSON; no container restart."""
import json
from pathlib import Path
import subprocess
import sys
if len(sys.argv)!=2:
    raise SystemExit('Usage: python3 scripts/cloud/update-runtime-config.py path/to/config.json')
value=json.loads(Path(sys.argv[1]).read_text())
remote='''import json,os,subprocess
from pathlib import Path
value=PAYLOAD
raw=json.dumps(value)
node="let s='';process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>{require('./dist/src/runtime-config').validateRuntime(JSON.parse(s));console.log('valid')})"
r=subprocess.run(['docker','exec','-i','shiku-api-1','node','-e',node],input=raw,text=True,capture_output=True,timeout=10)
if r.returncode:raise SystemExit('Invalid configuration; live file unchanged')
p=Path('/opt/kaifan/runtime-config/config.json');tmp=p.with_suffix('.tmp')
try:
 with tmp.open('w') as file:
  file.write(json.dumps(value,indent=2)+'\\n');file.flush();os.fsync(file.fileno())
 tmp.chmod(0o644);tmp.replace(p)
finally:
 if tmp.exists():tmp.unlink()
print('Runtime configuration updated atomically; effective on next request.')
'''.replace('PAYLOAD',repr(value))
ssh=Path.home()/'.ssh'
r=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={ssh/"known_hosts_service"}','-i',str(ssh/'service-deploy-key'),'root@api.example.invalid','python3 -'],input=remote,text=True,capture_output=True,timeout=30)
if r.returncode:raise SystemExit(r.stderr.strip() or 'Update failed')
print(r.stdout.strip())
