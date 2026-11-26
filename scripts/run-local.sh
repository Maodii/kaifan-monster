#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ -f .env ] || { echo '请先按.env.example创建.env并设置随机凭据'; exit 1; }
docker image inspect shiku-minio:2025-09-07-arm64 >/dev/null 2>&1 || sh scripts/build-minio.sh
exec docker compose -f compose.yaml -f compose.app.yaml up -d --build --wait
