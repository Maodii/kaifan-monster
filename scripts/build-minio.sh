#!/bin/sh
# 使用 MinIO 官方发布的 Linux ARM64 二进制构建本地开发镜像。
set -eu
cd "$(dirname "$0")/.."
task_arch="${SHIKU_ARCH:-$(docker info --format '{{.Architecture}}')}"
case "$task_arch" in
  aarch64|arm64) task_binary=404655924; task_sum=404655912; task_tag=arm64 ;;
  x86_64|amd64) task_binary=404655976; task_sum=404655965; task_tag=amd64 ;;
  *) echo "Unsupported Docker architecture: $task_arch" >&2; exit 1 ;;
esac
mkdir -p work/downloads/minio-build
task_dir="work/downloads/minio-build"
curl -fL --connect-timeout 15 --max-time 300 -H 'Accept: application/octet-stream' \
  "https://api.github.com/repos/minio/minio/releases/assets/$task_binary" -o "$task_dir/minio"
curl -fL --connect-timeout 15 --max-time 60 -H 'Accept: application/octet-stream' \
  "https://api.github.com/repos/minio/minio/releases/assets/$task_sum" -o "$task_dir/checksum"
python3 - "$task_dir" <<'PY'
import hashlib, sys
from pathlib import Path
p = Path(sys.argv[1])
expected = (p / 'checksum').read_text().split()[0]
assert hashlib.sha256((p / 'minio').read_bytes()).hexdigest() == expected, 'MinIO SHA256 mismatch'
PY
docker build --pull=false -f infra/minio.Dockerfile -t "shiku-minio:2025-09-07-$task_tag" "$task_dir"
rm "$task_dir/minio" "$task_dir/checksum"
rmdir "$task_dir"
