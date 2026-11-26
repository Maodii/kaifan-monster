#!/usr/bin/env python3
"""Read-only host check. Never dumps Docker Config.Env or credentials."""
import argparse
import json
from pathlib import Path
import subprocess

REMOTE = r'''
import datetime,json,subprocess,urllib.request
def run(*args):
    return subprocess.check_output(args,text=True,timeout=20).strip()
names=['shiku-api-1','shiku-postgres-1','shiku-redis-1','shiku-minio-1']
containers=[]
for name in names:
    c=json.loads(run('docker','inspect',name))[0]
    containers.append({'name':name,'status':c['State']['Status'],
      'health':c['State'].get('Health',{}).get('Status'),
      'oom_killed':c['State']['OOMKilled'],'restart_count':c['RestartCount'],
      'memory_limit':c['HostConfig']['Memory'],'ports':c['NetworkSettings']['Ports']})
checks={}
for name,url in [('api','http://127.0.0.1:3000/api/v1/health'),
                 ('minio','http://127.0.0.1:9000/minio/health/live')]:
    try:
        with urllib.request.urlopen(url,timeout=5) as response:
            checks[name]={'ok':response.status==200}
    except Exception:
        checks[name]={'ok':False}
print(json.dumps({'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'containers':containers,'checks':checks,'memory':run('free','-m'),
 'disk':run('df','-h','/'),'architecture':run('uname','-m'),
 'stats':run('docker','stats','--no-stream','--format','{{.Name}} {{.MemUsage}} {{.CPUPerc}}'),
 'listeners':run('ss','-lnt'),
 'network_counters':run('cat','/proc/net/dev'),
 'billing':{'verified':False,'reason':'Guest OS cannot verify Aliyun trial expiry, credit, quota or auto-renewal.'}}))
'''


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='work/reports/server-health.json')
    args = parser.parse_args()
    ssh = Path.home() / '.ssh'
    result = subprocess.run([
        'ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=12',
        '-o', 'StrictHostKeyChecking=yes', '-o', f'UserKnownHostsFile={ssh / "known_hosts_service"}',
        '-i', str(ssh / 'service-deploy-key'), 'root@api.example.invalid', 'python3 -'],
        input=REMOTE, capture_output=True, text=True, timeout=60, check=True)
    report = json.loads(result.stdout)
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    ok = (all(x['status'] == 'running' and not x['oom_killed'] and
              x['health'] in (None, 'healthy') for x in report['containers'])
          and all(x['ok'] for x in report['checks'].values()))
    print(json.dumps({'healthy': ok, 'report': str(path), 'checked_at': report['checked_at']}))
    raise SystemExit(0 if ok else 1)


if __name__ == '__main__':
    main()
