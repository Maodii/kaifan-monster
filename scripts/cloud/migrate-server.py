#!/usr/bin/env python3
"""Bounded server migration: encrypted streams, explicit phases, no project snapshots."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import shlex
import subprocess
import time

ROOT=Path(__file__).resolve().parents[2]
SOURCE='legacy.example.invalid'
TARGET='api.example.invalid'
SSH=Path.home()/'.ssh'
REPORT=ROOT/'work/reports/server-migration.json'
CONTAINERS=['shiku-api-1','shiku-postgres-1','shiku-redis-1','shiku-minio-1','kaifan-ai-ai-gateway-1']
TAGS=['shiku-api:local','kaifan-migrated-postgres:20261117','kaifan-migrated-redis:20261117','shiku-minio:2025-09-07-amd64','kaifan-ai-ai-gateway:local']
APP='docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml -f compose.migration.yaml'
AI='docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml -f compose.ai.migration.yaml --profile ai'

def ssh(host):
    known='known_hosts_legacy' if host==SOURCE else 'known_hosts_service'
    return ['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o','ServerAliveInterval=15','-o','ServerAliveCountMax=3','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={SSH/known}','-i',str(SSH/'service-deploy-key'),f'root@{host}']

def command(host,cmd,*,input=None,timeout=60,quiet=False):
    r=subprocess.run(ssh(host)+[cmd],input=input,capture_output=True,text=True,timeout=timeout)
    if r.returncode:
        raise RuntimeError(f'{host}: command failed ({r.returncode}); '+('output withheld' if quiet else r.stderr[-1500:]))
    return r.stdout

def python(host,code,timeout=60,quiet=False):
    return command(host,'python3 -',input=code,timeout=timeout,quiet=quiet)

def record(**values):
    report=json.loads(REPORT.read_text()) if REPORT.exists() else {}
    report.update(values,updated_at=datetime.now(timezone.utc).isoformat(),source=SOURCE,target=TARGET)
    REPORT.parent.mkdir(parents=True,exist_ok=True);REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');REPORT.chmod(0o600)

def stream(source_cmd,target_cmd,timeout=600):
    begin=time.monotonic()
    src=subprocess.Popen(ssh(SOURCE)+[source_cmd],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    dst=subprocess.Popen(ssh(TARGET)+[target_cmd],stdin=src.stdout,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    src.stdout.close()
    try:
        out,err=dst.communicate(timeout=timeout);_,serr=src.communicate(timeout=20)
        if src.returncode or dst.returncode:raise RuntimeError('Encrypted transfer failed: '+('details withheld for private transfer' if any(word in source_cmd+target_cmd for word in ['pg_dump','pg_restore','psql']) else (serr+err).decode(errors='replace')[-1200:]))
        print(json.dumps({'stream_complete':True,'seconds':round(time.monotonic()-begin,1)}),flush=True)
    except BaseException:
        for proc in (dst,src):
            if proc.poll() is None:proc.terminate()
        raise

def write(host,path,text,mode=0o644):
    python(host,'from pathlib import Path\np=Path('+repr(path)+')\np.parent.mkdir(parents=True,exist_ok=True)\np.write_text('+repr(text)+')\np.chmod('+str(mode)+')\n')

def prepare():
    if command(TARGET,'test -e /opt/kaifan/.env && echo exists || true').strip():raise RuntimeError('Existing target deployment preserved; do not rerun preparation')
    command(TARGET,'systemctl enable --now docker nginx && install -d -m 755 /opt/kaifan /opt/kaifan/work /opt/kaifan/work/reports')
    rows=json.loads(python(SOURCE,"import json,subprocess\nnames="+repr(CONTAINERS)+"\nprint(json.dumps([{'name':n,'id':json.loads(subprocess.check_output(['docker','inspect',n]))[0]['Image']} for n in names]))"))
    record(status='transferring_runtime_files',images=rows)
    # Only deployable runtime/source files; no whole workspace, assets, build caches or backups.
    files=['backend','ai-gateway/app.py','ai-gateway/Dockerfile','ai-gateway/requirements.lock','compose.yaml','compose.app.yaml','compose.trial.yaml','compose.ai.api.yaml','compose.ai.yaml','compose.ai.cloud.yaml','scripts/cloud','infra','runtime-config','.env','.ai.env']
    source='cd /opt/kaifan && tar --exclude=node_modules --exclude=dist --exclude=.venv --exclude=__pycache__ --exclude=tests --exclude=test --exclude="*.log" -czf - '+shlex.join(files)
    stream(source,'tar --no-same-owner -xzf - -C /opt/kaifan',180)
    command(TARGET,'chmod 600 /opt/kaifan/.env /opt/kaifan/.ai.env')
    print('Streaming exact deployed image layers; no image archive retained.',flush=True)
    ids=list(dict.fromkeys(r['id'] for r in rows))
    stream('bash -o pipefail -c '+shlex.quote('docker image save '+shlex.join(ids)+' | gzip -1'),'docker image load',900)
    for row,tag in zip(rows,TAGS):command(TARGET,shlex.join(['docker','image','tag',row['id'],tag]))
    write(TARGET,'/opt/kaifan/compose.migration.yaml','services:\n  postgres:\n    image: '+TAGS[1]+'\n    pull_policy: never\n  redis:\n    image: '+TAGS[2]+'\n    pull_policy: never\n  api:\n    pull_policy: never\n')
    write(TARGET,'/opt/kaifan/compose.ai.migration.yaml','services:\n  ai-gateway:\n    image: '+TAGS[4]+'\n    pull_policy: never\n')
    # Preserve deployment account for certificate issuance, never transfer or print old TLS keys.
    stream('tar -czf - -C /etc/letsencrypt accounts','install -d -m 700 /etc/letsencrypt && tar -xzf - -C /etc/letsencrypt',60)
    python(TARGET,"from pathlib import Path\np=Path('/opt/kaifan/.env');lines=p.read_text().splitlines();lines=[line for line in lines if not line.startswith(('S3_PUBLIC_ENDPOINT=','TRUST_PROXY_CIDRS='))];lines+=['S3_PUBLIC_ENDPOINT=https://"+TARGET+"','TRUST_PROXY_CIDRS=loopback'];p.write_text('\\n'.join(lines)+'\\n');p.chmod(0o600)\n")
    record(status='runtime_and_images_staged',image_transfer_complete=True)
    print('Runtime and exact deployed images staged.',flush=True)


def tls():
    import urllib.request
    http=(ROOT/'infra/nginx-ip-http.conf').read_text().replace(SOURCE,TARGET)
    write(TARGET,'/etc/nginx/sites-available/kaifan-http',http)
    command(TARGET,'install -d -m 755 /var/lib/kaifan-acme/.well-known/acme-challenge && ln -sfn /etc/nginx/sites-available/kaifan-http /etc/nginx/sites-enabled/kaifan-http && if [ "$(readlink /etc/nginx/sites-enabled/default)" = /etc/nginx/sites-available/default ]; then rm /etc/nginx/sites-enabled/default; fi && nginx -t && systemctl reload nginx')
    write(TARGET,'/var/lib/kaifan-acme/.well-known/acme-challenge/migration-probe','kaifan-migration-ready')
    with urllib.request.urlopen('http://'+TARGET+'/.well-known/acme-challenge/migration-probe',timeout=10) as response:
        assert response.read()==b'kaifan-migration-ready'
    print('Public ACME challenge verified; issuing trusted target-IP certificate.',flush=True)
    result=command(TARGET,'cd /opt/kaifan && certbot-venv/bin/certbot certonly --webroot -w /var/lib/kaifan-acme --ip-address '+TARGET+' --required-profile shortlived --cert-name kaifan-ip --non-interactive --keep-until-expiring',timeout=150)
    print(result[-1000:],flush=True)
    write(TARGET,'/etc/nginx/sites-available/kaifan-https',(ROOT/'infra/nginx-ip-https.conf').read_text().replace(SOURCE,TARGET))
    for name in ['kaifan-cert-renew.service','kaifan-cert-renew.timer']:
        write(TARGET,'/etc/systemd/system/'+name,(ROOT/'infra'/name).read_text())
    command(TARGET,'ln -sfn /etc/nginx/sites-available/kaifan-https /etc/nginx/sites-enabled/kaifan-https && nginx -t && systemctl daemon-reload && systemctl reload nginx && systemctl enable --now kaifan-cert-renew.timer && rm /var/lib/kaifan-acme/.well-known/acme-challenge/migration-probe')
    # A 404 is expected before API starts; the TLS handshake and CA validation must succeed.
    import urllib.error
    try:
        urllib.request.urlopen('https://'+TARGET+'/',timeout=10)
    except urllib.error.HTTPError as error:
        assert error.code==404
    record(status='target_tls_verified',target_https_verified=True)
    print('Trusted HTTPS and automatic renewal configured.',flush=True)


def tunnel():
    command(SOURCE,"test -f /root/.ssh/kaifan-shanghai-forward || ssh-keygen -q -t ed25519 -N '' -C kaifan-server-migration-forward -f /root/.ssh/kaifan-shanghai-forward")
    public=command(SOURCE,'cat /root/.ssh/kaifan-shanghai-forward.pub').strip()
    assert public.startswith('ssh-ed25519 ')
    entry='from="'+SOURCE+'",restrict,port-forwarding,permitopen="127.0.0.1:3000",permitopen="127.0.0.1:9000",command="/bin/false" '+public
    python(TARGET,'from pathlib import Path\np=Path("/root/.ssh/authorized_keys");s=p.read_text();entry='+repr(entry)+'\nif entry not in s:p.write_text(s.rstrip()+"\\n"+entry+"\\n")\np.chmod(0o600)\n')
    write(SOURCE,'/root/.ssh/known_hosts_kaifan_forward',(SSH/'known_hosts_service').read_text(),0o600)
    unit="""[Unit]
Description=Encrypted compatibility forward to Shanghai Kaifan server
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
ExecStart=/usr/bin/ssh -N -T -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/root/.ssh/known_hosts_kaifan_forward -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -i /root/.ssh/kaifan-shanghai-forward -L 127.0.0.1:13000:127.0.0.1:3000 -L 127.0.0.1:19000:127.0.0.1:9000 root@"""+TARGET+"""
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
"""
    write(SOURCE,'/etc/systemd/system/kaifan-shanghai-forward.service',unit)
    command(SOURCE,'systemctl daemon-reload && systemctl enable --now kaifan-shanghai-forward.service && systemctl is-active kaifan-shanghai-forward.service')
    record(tunnel_prepared=True)
    print('Restricted encrypted forwarding service prepared; source traffic unchanged.',flush=True)

TABLE_COUNTS=r"""
import json,subprocess
base=['docker','exec','shiku-postgres-1','sh','-c']
def query(sql):
 return subprocess.check_output(base+['exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA -v ON_ERROR_STOP=1 -c "$1"','query',sql],text=True).strip()
tables=json.loads(query("SELECT COALESCE(json_agg(tablename ORDER BY tablename),'[]') FROM pg_tables WHERE schemaname='public'"))
print(json.dumps({table:int(query('SELECT count(*) FROM public."'+table.replace('"','""')+'"')) for table in tables}))
"""
VOLUME_DIGEST=r"""
import hashlib,json
from pathlib import Path
for name in ['shiku_redis-data','shiku_minio-data']:
 root=Path('/var/lib/docker/volumes')/name/'_data';digest=hashlib.sha256();count=0;size=0
 for file in sorted(root.rglob('*')):
  if file.is_file():
   content=hashlib.sha256(file.read_bytes()).digest();digest.update(str(file.relative_to(root)).encode());digest.update(content);count+=1;size+=file.stat().st_size
 print(json.dumps({'volume':name,'sha256':digest.hexdigest(),'files':count,'bytes':size}))
"""

def data():
    import urllib.request
    if not json.loads(REPORT.read_text()).get('target_https_verified'):raise RuntimeError('Target TLS verification required before source freeze')
    # The target was provisioned for this migration and must have no application tables.
    assert json.loads(python(TARGET,TABLE_COUNTS))=={},'Target database is not empty; preserve and review it'
    command(TARGET,'cd /opt/kaifan && '+APP+' config --quiet && '+AI+' config --quiet')
    original=command(SOURCE,'cat /etc/nginx/sites-available/kaifan-https')
    write(SOURCE,'/opt/kaifan/work/migration-source-nginx.conf',original,0o600)
    maintenance=original.replace('proxy_pass http://127.0.0.1:3000;', "return 503 '{\"message\":\"服务器迁移中，请稍后重试\"}';").replace('proxy_pass http://127.0.0.1:9000;', 'return 503;')
    try:
        write(SOURCE,'/etc/nginx/sites-available/kaifan-https',maintenance)
        command(SOURCE,'nginx -t && systemctl reload nginx && docker stop --time 30 shiku-api-1 kaifan-ai-ai-gateway-1 shiku-minio-1 shiku-redis-1',timeout=100)
        record(status='source_frozen_data_transfer',source_frozen=True)
        counts=json.loads(python(SOURCE,TABLE_COUNTS))
        if not counts:raise RuntimeError('Source database unexpectedly empty')
        print('Source writes paused; streaming database roles and transactional database dump.',flush=True)
        # Strip only the already-created bootstrap role; preserve all role settings and grants.
        role_cmd=r"""docker exec shiku-postgres-1 sh -c 'pg_dumpall -U "$POSTGRES_USER" --roles-only' | sed '/^CREATE ROLE shiku;$/d'"""
        role_target=r"""docker exec -i shiku-postgres-1 sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'"""
        stream('bash -o pipefail -c '+shlex.quote(role_cmd),role_target,60)
        dump=r"""docker exec shiku-postgres-1 sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner'"""
        restore=r"""docker exec -i shiku-postgres-1 sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error --clean --if-exists'"""
        stream(dump,restore,180)
        restored=json.loads(python(TARGET,TABLE_COUNTS));assert restored==counts,'Database table counts differ'
        fingerprints=[json.loads(line) for line in python(SOURCE,VOLUME_DIGEST).splitlines()]
        for name in ['shiku_redis-data','shiku_minio-data']:
            stream('tar -czf - -C /var/lib/docker/volumes/'+name+'/_data .','tar --same-owner -xzf - -C /var/lib/docker/volumes/'+name+'/_data',120)
        assert fingerprints==[json.loads(line) for line in python(TARGET,VOLUME_DIGEST).splitlines()],'Cold volume content hashes differ'
        command(SOURCE,'docker stop --time 30 shiku-postgres-1',timeout=45)
        record(status='data_restored_verified',database_table_counts=counts,cold_volume_fingerprints=fingerprints,database_restore_verified=True)
        command(TARGET,'cd /opt/kaifan && '+APP+' up -d --no-deps --no-build --pull never --wait --wait-timeout 90 redis minio',timeout=120)
        python(TARGET,"import subprocess,json\nfrom pathlib import Path\ngateway=json.loads(subprocess.check_output(['docker','network','inspect','shiku_default']))[0]['IPAM']['Config'][0]['Gateway']\np=Path('/opt/kaifan/.env');lines=[line for line in p.read_text().splitlines() if not line.startswith('TRUST_PROXY_CIDRS=')];lines+=['TRUST_PROXY_CIDRS=loopback,'+gateway];p.write_text('\\n'.join(lines)+'\\n');p.chmod(0o600)\n")
        command(TARGET,'cd /opt/kaifan && '+AI+' up -d --no-deps --no-build --pull never --wait --wait-timeout 90 ai-gateway && '+APP+' up -d --no-deps --no-build --pull never --wait --wait-timeout 90 api',timeout=210)
        with urllib.request.urlopen('https://'+TARGET+'/api/v1/ready',timeout=15) as response:assert response.status==200
        # Keep original client IP and signed S3 Host; only change local upstream ports.
        bridge=original.replace('127.0.0.1:3000','127.0.0.1:13000').replace('127.0.0.1:9000','127.0.0.1:19000')
        command(SOURCE,'curl --fail --silent --output /dev/null http://127.0.0.1:13000/api/v1/ready',timeout=20)
        write(SOURCE,'/etc/nginx/sites-available/kaifan-https',bridge)
        command(SOURCE,'nginx -t && systemctl reload nginx && systemctl disable --now kaifan-health-watch.timer',timeout=30)
        with urllib.request.urlopen('https://'+SOURCE+'/api/v1/ready',timeout=15) as response:assert response.status==200
        record(status='cutover_complete_pending_business_verification',source_is_compatibility_proxy=True,target_ready=True,source_frozen=False)
        print('Data verified; target is primary and old IP forwards securely to it.',flush=True)
    except BaseException:
        # Before any target API is exposed, restoring source service is safe. Once target
        # accepted requests, preserve both databases and require review instead of losing writes.
        target_running=command(TARGET,"docker inspect -f '{{.State.Running}}' shiku-api-1 2>/dev/null || true").strip()=='true'
        if not target_running:
            write(SOURCE,'/etc/nginx/sites-available/kaifan-https',original)
            command(SOURCE,'docker start shiku-postgres-1 shiku-redis-1 shiku-minio-1 kaifan-ai-ai-gateway-1 shiku-api-1 && nginx -t && systemctl reload nginx',timeout=90)
            record(status='source_restored_after_migration_failure',source_frozen=False)
        else:record(status='target_running_cutover_requires_review')
        raise

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('phase',choices=['prepare','tls','tunnel','data']);args=parser.parse_args()
    globals()[args.phase]()
