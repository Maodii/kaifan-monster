#!/usr/bin/env python3
"""Run isolated-schema tests through an existing loopback SSH tunnel. Credentials remain in memory."""
import os,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2]
ssh=['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={Path.home()}/.ssh/known_hosts_service','-i',str(Path.home()/'.ssh/service-deploy-key'),'root@api.example.invalid']
command="docker exec shiku-api-1 node -e 'process.stdout.write(JSON.stringify(Object.fromEntries([\"POSTGRES_USER\",\"POSTGRES_PASSWORD\",\"POSTGRES_DB\"].map(k=>[k,process.env[k]]))))'"
credentials=json.loads(subprocess.check_output(ssh+[command],text=True))
env=os.environ.copy();env.update(credentials);env.update(PGHOST='127.0.0.1',POSTGRES_PORT='15432')
for test in ['sms-auth.integration.ts','account-lifecycle.integration.ts']:
 subprocess.run(['node','--import','tsx','test/'+test],cwd=root/'backend',env=env,check=True)
