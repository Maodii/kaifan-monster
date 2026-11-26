#!/usr/bin/env bash
# Foreground terminal tunnel, opened explicitly by the owner. Ctrl+C closes it.
set -euo pipefail
exec ssh -N -L 127.0.0.1:15432:127.0.0.1:5432 \
 -i "$HOME/.ssh/service-deploy-key" \
 -o BatchMode=yes -o ConnectTimeout=12 -o ExitOnForwardFailure=yes \
 -o ServerAliveInterval=30 -o ServerAliveCountMax=2 \
 -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$HOME/.ssh/known_hosts_service" \
 root@api.example.invalid
