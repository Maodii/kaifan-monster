#!/usr/bin/env bash
# Run on the existing server, after approval and DNS are confirmed.
set -euo pipefail
if [[ "${1:-}" != "--icp-approved" ]]; then
  echo '备案仍在审核时不要启用公网。通过后执行：bash /var/www/site.example.invalid/deploy/activate.sh --icp-approved' >&2
  exit 2
fi
SITE=/var/www/site.example.invalid
CERTBOT=/opt/kaifan/certbot-venv/bin/certbot
test -f "$SITE/.managed-by-kaifanghost-website"
test -x "$CERTBOT"
test -f "$SITE/public/index.html"
if ! grep -q 'class="icp-record"' "$SITE/public/index.html"; then
  echo '请先用实际备案号构建并上传官网：WEBSITE_ICP_NUMBER="实际备案号" npm run build' >&2
  exit 2
fi
python3 - <<'PY'
import socket
import json
from pathlib import Path
server=json.loads(Path('/var/www/site.example.invalid/deploy/server.json').read_text())['host']
for domain in ['site.example.invalid','www.site.example.invalid']:
    addresses={r[4][0] for r in socket.getaddrinfo(domain,80,type=socket.SOCK_STREAM)}
    if addresses != {server}:
        raise SystemExit(f'{domain} 解析尚未仅指向当前服务器，请先核对 A/AAAA/CNAME：{sorted(addresses)}')
print('DNS points to the website server')
PY
# These two files belong only to this site; refuse unrelated existing configurations.
for name in kaifanghost-http kaifanghost-https; do
  target="/etc/nginx/sites-available/$name"
  if [[ -e "$target" ]] && ! grep -q 'site.example.invalid' "$target"; then
    echo "Refusing to overwrite unrelated configuration: $target" >&2; exit 3
  fi
done
install -m 644 "$SITE/deploy/site-http.conf" /etc/nginx/sites-available/kaifanghost-http
ln -sfn /etc/nginx/sites-available/kaifanghost-http /etc/nginx/sites-enabled/kaifanghost-http
if ! nginx -t; then
  rm /etc/nginx/sites-enabled/kaifanghost-http
  echo 'Website HTTP configuration failed validation; existing services were not reloaded' >&2; exit 4
fi
systemctl reload nginx
"$CERTBOT" certonly --webroot -w /var/lib/kaifan-acme \
  --cert-name site.example.invalid -d site.example.invalid -d www.site.example.invalid \
  --email maintainer-0c32@example.invalid --agree-tos --non-interactive --keep-until-expiring \
  --deploy-hook 'nginx -t && systemctl reload nginx'
install -m 644 "$SITE/deploy/site-https.conf" /etc/nginx/sites-available/kaifanghost-https
ln -sfn /etc/nginx/sites-available/kaifanghost-https /etc/nginx/sites-enabled/kaifanghost-https
if ! nginx -t; then
  rm /etc/nginx/sites-enabled/kaifanghost-https
  echo 'Website TLS configuration failed validation; existing services were not reloaded' >&2; exit 5
fi
install -m 644 "$SITE/deploy/error-logrotate.conf" /etc/logrotate.d/kaifanghost-website
install -m 644 "$SITE/deploy/kaifanghost-cert-renew.service" /etc/systemd/system/
install -m 644 "$SITE/deploy/kaifanghost-cert-renew.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now kaifanghost-cert-renew.timer
systemctl reload nginx
curl --fail --silent --show-error https://site.example.invalid/ -o /dev/null
SERVER_IP="$(python3 -c 'import json;print(json.load(open("/var/www/site.example.invalid/deploy/server.json"))["host"])')"
curl --fail --silent --show-error "https://$SERVER_IP/api/v1/health"
echo
echo 'Website is live: https://site.example.invalid (www redirects to the main domain)'
