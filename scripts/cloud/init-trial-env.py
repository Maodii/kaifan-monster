#!/usr/bin/env python3
"""Generate fresh trial credentials on the deployment host; never import local user secrets."""
import argparse, os, secrets
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--directory',required=True,help='Existing deployment directory on the server')
a=p.parse_args();root=Path(a.directory).expanduser().resolve()
if not root.is_dir():p.error('Deployment directory must already exist')
file=root/'.env'
values={
 'POSTGRES_USER':'shiku','POSTGRES_DB':'shiku','POSTGRES_PASSWORD':secrets.token_hex(24),'POSTGRES_PORT':'5432',
 'REDIS_PASSWORD':secrets.token_hex(24),'REDIS_PORT':'6379',
 'MINIO_ROOT_USER':'kaifan-trial','MINIO_ROOT_PASSWORD':secrets.token_hex(24),'MINIO_IMAGE':'shiku-minio:2025-09-07-amd64',
 'MINIO_PORT':'9000','MINIO_CONSOLE_PORT':'9001','JWT_SECRET':secrets.token_hex(48),'API_PORT':'3000',
 'S3_PUBLIC_ENDPOINT':'http://127.0.0.1:19000','S3_BUCKET':'shiku-photos','S3_REGION':'us-east-1','LOCAL_ADMIN_LOGIN':'false'
}
try:
 fd=os.open(file,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
except FileExistsError:
 p.error('Existing .env preserved; configure it explicitly instead of replacing it')
with os.fdopen(fd,'w') as f:
 f.write('# Trial tunnel-only configuration; configure HTTPS domains before phone use.\n')
 f.write('\n'.join(f'{k}={v}' for k,v in values.items())+'\n')
print('Created a private .env with fresh independent credentials. Values were not printed.')
