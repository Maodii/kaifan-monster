#!/usr/bin/env bash
set -euo pipefail
WEBSITE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SITE=/var/www/site.example.invalid
SERVER_IP="$(node --input-type=module -e 'import fs from "node:fs";console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).host)' "$WEBSITE_DIR/deploy/server.json")"
KNOWN_HOSTS="$(node --input-type=module -e 'import fs from "node:fs";console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).sshKnownHosts)' "$WEBSITE_DIR/deploy/server.json")"
HOST="root@$SERVER_IP"
ssh_args=(-o BatchMode=yes -o ConnectTimeout=12 -o ServerAliveInterval=15 -o ServerAliveCountMax=2
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$HOME/.ssh/$KNOWN_HOSTS"
  -i "$HOME/.ssh/service-deploy-key")
npm run build --prefix "$WEBSITE_DIR"
if ! grep -q 'class="icp-record"' "$WEBSITE_DIR/dist/index.html"; then
  if ! ssh "${ssh_args[@]}" "$HOST" 'test ! -e /etc/nginx/sites-enabled/kaifanghost-https'; then
    echo '已上线网站更新必须携带真实 WEBSITE_ICP_NUMBER，避免覆盖现有备案页脚。' >&2
    exit 2
  fi
fi
ssh "${ssh_args[@]}" "$HOST" 'set -eu
site=/var/www/site.example.invalid
if [ -d "$site" ] && [ ! -f "$site/.managed-by-kaifanghost-website" ]; then
  echo "Refusing to overwrite an unrelated directory" >&2; exit 3
fi
install -d -m 755 "$site/public" "$site/deploy"
touch "$site/.managed-by-kaifanghost-website"'
printf -v ssh_command '%q ' ssh "${ssh_args[@]}"
rsync -az --no-owner --no-group --delete --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r -e "$ssh_command" "$WEBSITE_DIR/dist/" "$HOST:$SITE/public/"
rsync -az --no-owner --no-group --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r -e "$ssh_command" "$WEBSITE_DIR/deploy/" "$HOST:$SITE/deploy/"
ssh "${ssh_args[@]}" "$HOST" 'chown -R root:root /var/www/site.example.invalid && python3 /var/www/site.example.invalid/deploy/verify-stage.py' > "$WEBSITE_DIR/../work/reports/official-site-server-stage.json"
node --input-type=module -e 'import fs from "node:fs";const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));console.log(JSON.stringify({passed:r.passed,server:r.server,files:r.files.length,publicWebsiteEnabled:r.publicWebsiteEnabled,checks:r.checks},null,2))' "$WEBSITE_DIR/../work/reports/official-site-server-stage.json"
