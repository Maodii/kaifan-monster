#!/usr/bin/env python3
"""Restore schema only into a disposable database; never export/copy user records."""
from datetime import datetime,timezone
import json
from pathlib import Path
import subprocess
remote=r'''
import json,subprocess
shell=r"""
set -eu
set -o pipefail
export PGPASSWORD="$POSTGRES_PASSWORD"
audit_db="kaifan_schema_audit_$(date +%s)_$$"
trap 'dropdb -U "$POSTGRES_USER" --if-exists "$audit_db" >/dev/null 2>&1' EXIT
createdb -U "$POSTGRES_USER" "$audit_db"
pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --schema-only --no-owner --no-privileges | psql -U "$POSTGRES_USER" -d "$audit_db" -v ON_ERROR_STOP=1 >/dev/null
source_count=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
restored_count=$(psql -U "$POSTGRES_USER" -d "$audit_db" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
test "$source_count" = "$restored_count"
"""
r=subprocess.run(['docker','exec','shiku-postgres-1','sh','-c',shell],capture_output=True,text=True,timeout=60)
print(json.dumps({'passed':r.returncode==0,'scope':'schema-only disposable database restore; no user rows or images copied','temporary_database_cleanup':'EXIT trap dropdb','backup_files_created':0}))
raise SystemExit(r.returncode)
'''
ssh=Path.home()/'.ssh'
r=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={ssh/"known_hosts_service"}','-i',str(ssh/'service-deploy-key'),'root@api.example.invalid','python3 -'],input=remote,text=True,capture_output=True,timeout=75)
if not r.stdout.strip():raise SystemExit('Schema-only recovery rehearsal failed; credentials not printed')
report=json.loads(r.stdout);report['checked_at']=datetime.now(timezone.utc).isoformat()
p=Path(__file__).resolve().parents[2]/'work/reports/server-schema-recovery.json';p.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
raise SystemExit(0 if r.returncode==0 else 1)
