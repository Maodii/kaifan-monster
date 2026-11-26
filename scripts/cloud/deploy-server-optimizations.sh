#!/usr/bin/env bash
# Minimal source update; keep one short-lived rollback set, never copy a whole project.
set -euo pipefail
cd "$(dirname "$0")/../.."
ssh_args=(-o BatchMode=yes -o ConnectTimeout=12 -o ServerAliveInterval=15 -o ServerAliveCountMax=2
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$HOME/.ssh/known_hosts_service"
  -i "$HOME/.ssh/service-deploy-key" root@api.example.invalid)
files=(backend/admin/app.js backend/src/main.ts backend/src/feature-access.ts backend/src/assistant.ts backend/src/assistant-policy.ts backend/src/assistant-context.ts
  backend/src/runtime-config.ts backend/src/assistant-jobs.ts backend/src/assistant-transport.ts
  ai-gateway/Dockerfile compose.ai.api.yaml compose.ai.yaml infra/runtime-config.json
  backend/src/assistant-budget.ts backend/src/assistant-workflow.ts backend/src/controllers.ts
  backend/src/database.ts ai-gateway/app.py compose.app.yaml compose.trial.yaml
  scripts/cloud/server-watch.py infra/kaifan-health-watch.service infra/kaifan-health-watch.timer)
ssh "${ssh_args[@]}" 'python3 -' <<'PY'
import json,subprocess,tarfile
from pathlib import Path
root=Path('/opt/kaifan');work=root/'work';work.mkdir(exist_ok=True)
archive=work/'server-opt-rollback.tar';record=work/'server-opt-rollback.json'
assert not archive.exists() and not record.exists(),'Existing rollback set requires review; do not overwrite it'
files=['backend/admin/app.js','backend/src/main.ts','backend/src/feature-access.ts','backend/src/assistant.ts','backend/src/assistant-policy.ts','backend/src/assistant-context.ts','backend/src/runtime-config.ts','backend/src/assistant-jobs.ts','backend/src/assistant-transport.ts','ai-gateway/Dockerfile','compose.ai.api.yaml','compose.ai.yaml','infra/runtime-config.json','backend/src/assistant-budget.ts','backend/src/assistant-workflow.ts','backend/src/controllers.ts','backend/src/database.ts','ai-gateway/app.py','compose.app.yaml','compose.trial.yaml','scripts/cloud/server-watch.py','infra/kaifan-health-watch.service','infra/kaifan-health-watch.timer']
images={name:json.loads(subprocess.check_output(['docker','inspect',name]))[0]['Image'] for name in ['shiku-api-1','kaifan-ai-ai-gateway-1']}
with tarfile.open(archive,'w') as tar:
 for name in files:
  if (root/name).is_file():tar.add(root/name,arcname=name,recursive=False)
record.write_text(json.dumps({'images':images,'new_files':[n for n in files if not (root/n).exists()]}));record.chmod(0o600)
print('Minimal rollback set prepared; no env, images, user data or project copy included.')
PY
COPYFILE_DISABLE=1 tar --no-xattrs --exclude='._*' --exclude='.DS_Store' -cf - "${files[@]}" |
  ssh "${ssh_args[@]}" 'cd /opt/kaifan && tar --no-same-owner -xf -'
ssh -n "${ssh_args[@]}" 'cd /opt/kaifan &&
  mkdir -p runtime-config && chmod 755 runtime-config &&
  if [ ! -f runtime-config/config.json ]; then install -m 644 infra/runtime-config.json runtime-config/config.json; fi &&
  docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml -f compose.migration.yaml config --quiet &&
  docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml -f compose.ai.migration.yaml --profile ai config --quiet &&
  docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml -f compose.migration.yaml build api &&
  docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml -f compose.ai.migration.yaml --profile ai build ai-gateway &&
  docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml -f compose.ai.migration.yaml --profile ai up -d --no-deps --wait --wait-timeout 90 ai-gateway &&
  docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml -f compose.migration.yaml up -d --no-deps --wait --wait-timeout 90 api &&
  install -m 644 infra/kaifan-health-watch.service /etc/systemd/system/ &&
  install -m 644 infra/kaifan-health-watch.timer /etc/systemd/system/ &&
  systemctl daemon-reload && systemctl enable --now kaifan-health-watch.timer &&
  systemctl start kaifan-health-watch.service && echo server_optimization_deployment_complete'
# Rollback files are deliberately retained until independent post-deploy checks pass.
