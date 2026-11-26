#!/usr/bin/env python3
"""Deploy SMS auth and configure RAM credentials over SSH stdin. Never print credential data."""
import csv,io,json,shlex,subprocess,tarfile
from pathlib import Path
root=Path(__file__).resolve().parents[2]
ssh=['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o','ServerAliveInterval=15','-o','ServerAliveCountMax=2','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={Path.home()}/.ssh/known_hosts_service','-i',str(Path.home()/'.ssh/service-deploy-key'),'root@api.example.invalid']
files=['backend/src/sms-auth.ts','backend/src/sms-provider.ts','backend/src/app.module.ts','backend/src/account-lifecycle.ts','backend/package.json','backend/package-lock.json','backend/migrations/025_sms_auth.sql','backend/scripts/check-sms-credentials.cjs']
prepare='''import json,subprocess,tarfile
from pathlib import Path
root=Path('/opt/kaifan');work=root/'work';work.mkdir(exist_ok=True)
archive=work/'sms-auth-rollback.tar';record=work/'sms-auth-rollback.json'
assert not list(work.glob('*rollback*.tar')),'Existing rollback must be reviewed first'
assert not record.exists(),'Existing record must be reviewed'
files=FILES
image=json.loads(subprocess.check_output(['docker','inspect','shiku-api-1']))[0]['Image']
subprocess.run(['docker','tag',image,'shiku-api:sms-auth-rollback'],check=True)
with tarfile.open(archive,'w') as tar:
 for name in files:
  if(root/name).is_file():tar.add(root/name,arcname=name,recursive=False)
record.write_text(json.dumps({'image':image,'new_files':[n for n in files if not(root/n).exists()]}));record.chmod(0o600)
print('Prepared one minimal source rollback; no credential or user-data backup')
'''.replace('FILES',repr(files))
subprocess.run(ssh+['python3 -'],input=prepare,text=True,check=True)
buffer=io.BytesIO()
with tarfile.open(fileobj=buffer,mode='w') as tar:
 for name in files:tar.add(root/name,arcname=name,recursive=False)
subprocess.run(ssh+['cd /opt/kaifan && tar --no-same-owner -xf -'],input=buffer.getvalue(),check=True)
with Path.home().joinpath('Downloads', 'AccessKey.csv').open(encoding='utf-8-sig',newline='') as handle:
 rows=list(csv.DictReader(handle));assert len(rows)==1
 key=rows[0]['AccessKey ID'].strip();secret=rows[0]['AccessKey Secret'].strip()
assert key and secret and all(c.isalnum() for c in key+secret),'Unexpected credential format'
config={'ALIYUN_ACCESS_KEY_ID':key,'ALIYUN_ACCESS_KEY_SECRET':secret,'SMS_AUTH_ENABLED':'true','ALIYUN_SMS_SIGN_NAME':'YOUR_APPROVED_SIGN','SMS_AUTH_DAILY_LIMIT':'100'}
configure='''import json,sys,os
from pathlib import Path
p=Path('/opt/kaifan/.env');config=json.load(sys.stdin);s=p.read_text();lines=[line for line in s.splitlines() if line.split('=',1)[0] not in config]
lines.extend(k+'='+v for k,v in config.items());temp=p.with_name('.env.sms-tmp')
fd=os.open(temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:f.write('\\n'.join(lines)+'\\n')
os.replace(temp,p);p.chmod(0o600)
print('Configured SMS RAM credentials privately; values withheld')
'''
subprocess.run(ssh+['python3 -c '+shlex.quote(configure)],input=json.dumps(config),text=True,check=True)
compose='docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml -f compose.migration.yaml'
subprocess.run(ssh+['cd /opt/kaifan && '+compose+' config --quiet && '+compose+' build api && '+compose+' up -d --no-deps --no-build --wait --wait-timeout 120 api'],check=True)
subprocess.run(ssh+['docker exec -i shiku-api-1 node'],input=(root/'backend/scripts/check-sms-credentials.cjs').read_text(),text=True,check=True)
print('Deployment finished; independently verify before removing rollback set')
