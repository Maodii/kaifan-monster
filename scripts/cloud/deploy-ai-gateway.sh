#!/usr/bin/env bash
# Upload only the independent gateway and overlays, then build/start only that service.
set -euo pipefail
cd "$(dirname "$0")/../.."
ssh_args=(-o BatchMode=yes -o ConnectTimeout=12 -o StrictHostKeyChecking=yes
  -o ServerAliveInterval=15 -o ServerAliveCountMax=2
  -o "UserKnownHostsFile=$HOME/.ssh/known_hosts_service"
  -i "$HOME/.ssh/service-deploy-key" root@api.example.invalid)
# .ai.env is written separately by the authorized business owner; never transfer/dump it.
ssh -n "${ssh_args[@]}" 'test -f /opt/kaifan/.ai.env && test "$(stat -c %a /opt/kaifan/.ai.env)" = 600'
COPYFILE_DISABLE=1 tar --no-xattrs --exclude='._*' --exclude='.DS_Store' --exclude='.venv' \
  --exclude='__pycache__' --exclude='.pytest_cache' --exclude='tests' \
  -cf - ai-gateway compose.ai.yaml compose.ai.cloud.yaml compose.ai.api.yaml |
  ssh "${ssh_args[@]}" 'cd /opt/kaifan && tar --no-same-owner -xf -'
ssh -n "${ssh_args[@]}" 'cd /opt/kaifan &&
  docker network inspect shiku_default --format "business_network={{.Name}}" &&
  docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml --profile ai config --quiet &&
  docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml --profile ai build ai-gateway &&
  docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml --profile ai up -d --no-deps --wait --wait-timeout 90 ai-gateway'
