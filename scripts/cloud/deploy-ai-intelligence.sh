#!/usr/bin/env bash
# Focused update: one temporary rollback, no database/config/key copy.
set -euo pipefail
cd "$(dirname "$0")/../.."
connection=(-o BatchMode=yes -o ConnectTimeout=12 -o ServerAliveInterval=15 -o ServerAliveCountMax=2 -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$HOME/.ssh/known_hosts_service" -i "$HOME/.ssh/service-deploy-key" root@api.example.invalid)
files=(backend/src/assistant-context.ts backend/src/assistant.ts backend/src/assistant-intelligence.ts backend/src/payload.ts backend/src/assistant-jobs.ts ai-gateway/app.py)
ssh "${connection[@]}" 'python3 -' <<'PY'
import json,tarfile,subprocess
from pathlib import Path
r=Path('/opt/kaifan');w=r/'work';w.mkdir(exist_ok=True)
a=w/'ai-intelligence-rollback.tar';m=w/'ai-intelligence-rollback.json'
assert not list(w.glob('*rollback*')),'Existing rollback must be reviewed first'
names=['backend/src/assistant-context.ts','backend/src/assistant.ts','backend/src/assistant-intelligence.ts','backend/src/payload.ts','backend/src/assistant-jobs.ts','ai-gateway/app.py']
with tarfile.open(a,'w') as t:
 for n in names:
  if (r/n).is_file():t.add(r/n,arcname=n,recursive=False)
images={n:json.loads(subprocess.check_output(['docker','inspect',n]))[0]['Image'] for n in ['shiku-api-1','kaifan-ai-ai-gateway-1']}
m.write_text(json.dumps({'new_files':[n for n in names if not (r/n).exists()],'images':images}));m.chmod(0o600)
print('Prepared source-only rollback')
PY
COPYFILE_DISABLE=1 tar --no-xattrs --exclude='._*' -cf - "${files[@]}" | ssh "${connection[@]}" 'cd /opt/kaifan && tar --no-same-owner -xf -'
ssh -n "${connection[@]}" 'cd /opt/kaifan &&
 docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml -f compose.migration.yaml build api &&
 docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml -f compose.ai.migration.yaml --profile ai build ai-gateway &&
 AI_TIMEOUT_SECONDS=15 docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml -f compose.ai.migration.yaml --profile ai up -d --no-deps --wait --wait-timeout 90 ai-gateway &&
 docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml -f compose.migration.yaml up -d --no-deps --wait --wait-timeout 90 api'
# Keep rollback only until independent live verification succeeds.
