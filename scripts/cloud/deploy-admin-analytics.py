#!/usr/bin/env python3
"""Deploy only admin/telemetry backend files. One minimal rollback set; no credentials copied."""
import io,json,os,subprocess,tarfile
from pathlib import Path
root=Path(__file__).resolve().parents[2]
ssh=['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o','ServerAliveInterval=15','-o','ServerAliveCountMax=2','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={Path.home()}/.ssh/known_hosts_service','-i',str(Path.home()/'.ssh/service-deploy-key'),'root@api.example.invalid']
files=['backend/src/telemetry.ts','backend/src/admin-analytics.ts','backend/src/auth.ts','backend/src/admin.ts','backend/src/assistant.ts','backend/src/assistant-budget.ts','backend/admin/app.js','backend/admin/index.html','backend/migrations/023_client_telemetry.sql','backend/migrations/024_user_ai_daily_limit.sql']
prepare='''import json,subprocess,tarfile
from pathlib import Path
root=Path('/opt/kaifan');work=root/'work';work.mkdir(exist_ok=True)
archive=work/'admin-analytics-rollback.tar';record=work/'admin-analytics-rollback.json'
assert not archive.exists() and not record.exists(),'Existing rollback must be reviewed before retry'
assert not list(work.glob('*rollback*.tar')),'Another rollback set exists; do not accumulate backups'
files=FILES
image=json.loads(subprocess.check_output(['docker','inspect','shiku-api-1']))[0]['Image']
subprocess.run(['docker','tag',image,'shiku-api:admin-analytics-rollback'],check=True)
with tarfile.open(archive,'w') as tar:
 for name in files:
  if (root/name).is_file():tar.add(root/name,arcname=name,recursive=False)
record.write_text(json.dumps({'image':image,'new_files':[n for n in files if not (root/n).exists()]}));record.chmod(0o600)
print('Prepared one minimal source rollback and image tag; no env or user data copied')
'''.replace('FILES',repr(files))
subprocess.run(ssh+['python3 -'],input=prepare,text=True,check=True)
buffer=io.BytesIO()
with tarfile.open(fileobj=buffer,mode='w') as tar:
 for name in files:tar.add(root/name,arcname=name,recursive=False)
subprocess.run(ssh+['cd /opt/kaifan && tar --no-same-owner -xf -'],input=buffer.getvalue(),check=True)
compose='docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml -f compose.migration.yaml'
subprocess.run(ssh+['cd /opt/kaifan && '+compose+' config --quiet && '+compose+' build api && '+compose+' up -d --no-deps --no-build --wait --wait-timeout 120 api'],check=True)
print('Admin analytics deployed; independently verify before removing rollback set')
