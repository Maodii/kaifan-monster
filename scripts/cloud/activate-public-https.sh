#!/usr/bin/env bash
# Run on the server, after public TCP 80/443 have been allowed in its security group.
# Existing database/object storage volumes and AI secrets are never copied or replaced.
set -euo pipefail
cd /opt/kaifan
if [[ ! -x certbot-venv/bin/certbot ]]; then
 echo 'Install certbot 5.10.0 into /opt/kaifan/certbot-venv first' >&2; exit 1
fi
mkdir -p /var/lib/kaifan-acme/.well-known/acme-challenge
install -m 644 infra/nginx-ip-http.conf /etc/nginx/sites-available/kaifan-http
ln -sfn /etc/nginx/sites-available/kaifan-http /etc/nginx/sites-enabled/kaifan-http
# Remove only the package-provided welcome site, not user sites.
if [[ "$(readlink /etc/nginx/sites-enabled/default || true)" == /etc/nginx/sites-available/default ]]; then rm /etc/nginx/sites-enabled/default; fi
nginx -t
systemctl reload nginx
certbot-venv/bin/certbot certonly --webroot -w /var/lib/kaifan-acme \
 --ip-address api.example.invalid --required-profile shortlived --cert-name kaifan-ip \
 --non-interactive --agree-tos --register-unsafely-without-email --keep-until-expiring
install -m 644 infra/nginx-ip-https.conf /etc/nginx/sites-available/kaifan-https
ln -sfn /etc/nginx/sites-available/kaifan-https /etc/nginx/sites-enabled/kaifan-https
nginx -t
systemctl reload nginx
install -m 644 infra/kaifan-cert-renew.service /etc/systemd/system/
install -m 644 infra/kaifan-cert-renew.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now kaifan-cert-renew.timer
# Update one public setting without printing or altering secrets.
python3 - <<'PY'
import subprocess,json
from pathlib import Path
p=Path('.env');s=p.read_text();lines=s.splitlines();key='S3_PUBLIC_ENDPOINT';v='https://api.example.invalid'
gateway=json.loads(subprocess.check_output(['docker','network','inspect','shiku_default']))[0]['IPAM']['Config'][0]['Gateway']
lines=[line for line in lines if not line.startswith((key+'=','TRUST_PROXY_CIDRS='))];lines.extend([key+'='+v,'TRUST_PROXY_CIDRS=loopback,'+gateway])
p.write_text('\n'.join(lines)+'\n');p.chmod(0o600)
PY
docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml config --quiet
docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml up -d --no-deps --wait --wait-timeout 90 api
curl --fail --silent --show-error https://api.example.invalid/api/v1/health
