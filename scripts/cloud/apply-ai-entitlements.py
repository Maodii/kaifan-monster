#!/usr/bin/env python3
"""Promote only the two explicitly authorized existing accounts; no credential output."""
import json
from pathlib import Path
import subprocess
node=r'''
const {Pool}=require('pg'),assert=require('node:assert/strict');
const p=new Pool({host:process.env.PGHOST,port:Number(process.env.POSTGRES_PORT||5432),user:process.env.POSTGRES_USER,password:process.env.POSTGRES_PASSWORD,database:process.env.POSTGRES_DB,connectionTimeoutMillis:3000});
(async()=>{const c=await p.connect();try{await c.query('BEGIN');
const expected=new Map(JSON.parse(process.env.APPROVED_ADMIN_ACCOUNTS || '[]')); if (expected.size !== 2) throw Error('Set two approved test accounts in the isolated deployment');
const rows=(await c.query('SELECT id,email,role FROM users WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL FOR UPDATE',[[...expected.keys()]])).rows;
assert.equal(rows.length,2);for(const row of rows)assert.equal(row.email,expected.get(row.id));
await c.query("UPDATE users SET role='admin' WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL",[[...expected.keys()]]);
await c.query('COMMIT');console.log(JSON.stringify({passed:true,promoted:2,prior_roles:rows.map(r=>({id:r.id,role:r.role}))}));
}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();await p.end();}})().catch(()=>{console.error('Account promotion failed; transaction rolled back');process.exitCode=1;});
'''
remote='import json,subprocess\nfrom pathlib import Path\nnode='+repr(node)+'''\nr=subprocess.run(['docker','exec','shiku-api-1','node','-e',node],text=True,capture_output=True,timeout=20)
if r.returncode:raise SystemExit('Account promotion failed')
result=json.loads(r.stdout)
p=Path('/opt/kaifan/work/server-opt-rollback.json')
if p.exists():
 record=json.loads(p.read_text());record.setdefault('account_prior_roles',result['prior_roles']);record.setdefault('runtime_config',Path('/opt/kaifan/runtime-config/config.json').read_text());p.write_text(json.dumps(record));p.chmod(0o600)
print(json.dumps({'passed':result['passed'],'admin_accounts':result['promoted']}))
'''
ssh=Path.home()/'.ssh'
r=subprocess.run(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=12','-o','StrictHostKeyChecking=yes','-o',f'UserKnownHostsFile={ssh/"known_hosts_service"}','-i',str(ssh/'service-deploy-key'),'root@api.example.invalid','python3 -'],input=remote,text=True,capture_output=True,timeout=35)
if r.returncode:raise SystemExit(r.stderr.strip() or 'Account promotion failed')
print(r.stdout.strip())
