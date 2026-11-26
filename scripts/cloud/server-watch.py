#!/usr/bin/env python3
"""Run on the existing server: one bounded health report, journal warnings, no content."""
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import ssl
import subprocess
import urllib.request

def collect(root=Path('/opt/kaifan')):
    warnings=[]
    def run(args):return subprocess.check_output(args,text=True,timeout=8).strip()
    containers=[]
    for name in ['shiku-api-1','shiku-postgres-1','shiku-redis-1','shiku-minio-1','kaifan-ai-ai-gateway-1']:
        try:
            c=json.loads(run(['docker','inspect',name]))[0]
            state={'name':name,'status':c['State']['Status'],'health':c['State'].get('Health',{}).get('Status'),'oom':c['State']['OOMKilled'],'restarts':c['RestartCount']}
            if state['status']!='running' or state['health']=='unhealthy' or state['oom']:warnings.append('container:'+name)
            containers.append(state)
        except Exception:warnings.append('container_missing:'+name)
    memory={line.split(':')[0]:int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines() if ':' in line and len(line.split())>=2}
    available=memory['MemAvailable']//1024
    disk=shutil.disk_usage('/')
    disk_pct=round(disk.used/disk.total*100,1)
    if available<256:warnings.append('memory_available_below_256MiB')
    if disk_pct>=85:warnings.append('root_disk_above_85_percent')
    checks={}
    for name,url in [('api_ready','http://127.0.0.1:3000/api/v1/ready'),('minio','http://127.0.0.1:9000/minio/health/live'),('public_https','https://api.example.invalid/api/v1/health')]:
        try:
            with urllib.request.urlopen(url,timeout=5) as response:checks[name]=response.status==200
        except Exception:checks[name]=False
        if not checks[name]:warnings.append('http:'+name)
    remaining=None
    try:
        cert=ssl._ssl._test_decode_cert('/etc/letsencrypt/live/kaifan-ip/cert.pem')
        expires=datetime.strptime(cert['notAfter'],'%b %d %H:%M:%S %Y %Z').replace(tzinfo=timezone.utc)
        remaining=round((expires-datetime.now(timezone.utc)).total_seconds()/3600,2)
        if remaining<48:warnings.append('tls_certificate_below_48h')
    except Exception:warnings.append('tls_certificate_unreadable')
    renewal={}
    try:
        renewal=dict(line.split('=',1) for line in run(['systemctl','show','kaifan-cert-renew.service','-p','Result','-p','ExecMainStatus']).splitlines())
        if renewal.get('Result')!='success' or renewal.get('ExecMainStatus')!='0':warnings.append('certificate_renewal_failed')
        if run(['systemctl','is-active','kaifan-cert-renew.timer'])!='active':warnings.append('certificate_timer_inactive')
    except Exception:warnings.append('certificate_timer_check_failed')
    # Read only already-aggregated gateway metrics; never return credentials.
    metrics=None
    try:
        script="import os,json,urllib.request;req=urllib.request.Request('http://127.0.0.1:8100/metrics',headers={'Authorization':'Bearer '+os.environ['AI_GATEWAY_TOKEN']});print(urllib.request.urlopen(req,timeout=3).read().decode())"
        metrics=json.loads(run(['docker','exec','kaifan-ai-ai-gateway-1','python','-c',script]))
        if metrics.get('circuit_open'):warnings.append('ai_circuit_open')
        outcomes=metrics.get('outcomes',{})
        total=sum(outcomes.values())
        failed=sum(outcomes.get(key,0) for key in ['timeout','upstream_unavailable','truncated','incomplete'])
        if total>=20 and failed/total>=0.2:warnings.append('ai_failure_ratio_above_20_percent_since_restart')
    except Exception:warnings.append('ai_metrics_unavailable')
    report={'checked_at':datetime.now(timezone.utc).isoformat(),'containers':containers,'available_memory_MiB':available,'root_disk_used_percent':disk_pct,'http_checks':checks,'certificate_hours_remaining':remaining,'renewal':renewal,'ai_metrics':metrics,'warnings':warnings,'healthy':not warnings}
    path=root/'work/reports/server-watch.json';path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    return report

if __name__=='__main__':
    report=collect()
    print(json.dumps({'healthy':report['healthy'],'warnings':report['warnings'],'report':'work/reports/server-watch.json'}))
    raise SystemExit(0 if report['healthy'] else 1)
