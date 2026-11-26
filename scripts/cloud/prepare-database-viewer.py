#!/usr/bin/env python3
"""Provision restricted support views; do not expose DB port or user credentials."""
from pathlib import Path
import subprocess,secrets,json,os,datetime
ROOT=Path(__file__).resolve().parents[2]
private=Path.home()/'.kaifan/access';private.mkdir(parents=True,exist_ok=True);private.chmod(0o700)
config=private/'database-viewer.json'
ssh=['ssh','-i',str(Path.home()/'.ssh/service-deploy-key'),'-o','BatchMode=yes','-o','ConnectTimeout=12','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+str(Path.home()/'.ssh/known_hosts_service'),'root@api.example.invalid']
remote='docker exec -i shiku-postgres-1 sh -c \'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -At\''
def sql(text):
 r=subprocess.run(ssh+[remote],input=text,text=True,capture_output=True,timeout=35)
 if r.returncode:raise SystemExit('Database setup/query failed; SQL and credentials not printed')
 return r.stdout
exists=sql("SELECT count(*) FROM pg_roles WHERE rolname='kaifan_support_reader';\n").strip()=='1'
if config.exists():c=json.loads(config.read_text())
else:
 if exists:raise SystemExit('Role already exists without local credentials; will not reset its password')
 c={'host':'127.0.0.1','port':15432,'database':'shiku','user':'kaifan_support_reader','password':secrets.token_urlsafe(32)}
 fd=os.open(config,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as f:json.dump(c,f,indent=2);f.write('\n')
if not exists:
 sql("CREATE ROLE kaifan_support_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '"+c['password'].replace("'","''")+"';\n")
sql('''BEGIN;
CREATE SCHEMA IF NOT EXISTS kaifan_support;
REVOKE ALL ON SCHEMA kaifan_support FROM PUBLIC;
CREATE OR REPLACE VIEW kaifan_support.accounts AS
 SELECT u.id,u.email,p.display_name,p.region_code,u.role,u.created_at,u.deleted_at,
        (u.demo_seed_batch IS NOT NULL) AS is_demo,
        (SELECT count(*) FROM devices d WHERE d.user_id=u.id AND d.revoked_at IS NULL) AS active_devices
 FROM users u LEFT JOIN user_profile p ON p.user_id=u.id;
GRANT CONNECT ON DATABASE shiku TO kaifan_support_reader;
GRANT USAGE ON SCHEMA kaifan_support TO kaifan_support_reader;
GRANT SELECT ON kaifan_support.accounts TO kaifan_support_reader;
ALTER ROLE kaifan_support_reader SET search_path=kaifan_support;
ALTER ROLE kaifan_support_reader SET default_transaction_read_only=on;
ALTER ROLE kaifan_support_reader SET statement_timeout='15s';
COMMIT;
''')
check=sql("SELECT has_table_privilege('kaifan_support_reader','kaifan_support.accounts','SELECT'),has_table_privilege('kaifan_support_reader','users','SELECT'),has_table_privilege('kaifan_support_reader','kaifan_support.accounts','UPDATE');\n").strip()
assert check=='t|f|f',check
# Exercise actual password login over TCP inside the container without printing it.
remote_read='docker exec -i shiku-postgres-1 sh -c \'IFS= read -r PGPASSWORD; export PGPASSWORD; exec psql -h 127.0.0.1 -U kaifan_support_reader -d shiku -At -v ON_ERROR_STOP=1\''
r=subprocess.run(ssh+[remote_read],input=c['password']+"\nSELECT count(*) FROM kaifan_support.accounts; SHOW default_transaction_read_only; SELECT current_user;\n",text=True,capture_output=True,timeout=35)
assert r.returncode==0 and '\non\nkaifan_support_reader' in r.stdout,'Read-only login verification failed'
access=ROOT/'outputs/server-database-access.md'
text=f'''# 服务器数据库只读访问（请勿公开）

服务器：api.example.invalid；数据库：PostgreSQL 17 / shiku。

## 最快查看：阿里云 Workbench

登录服务器后执行：

```sh
docker exec -it shiku-postgres-1 psql -U kaifan_support_reader -d shiku
```

然后执行：

```sql
SELECT id, email, display_name, region_code, role, created_at, active_devices FROM accounts ORDER BY created_at DESC LIMIT 50;
```

输入 `\\q` 退出。账号密码哈希和设备令牌不在此只读视图中。

## DBeaver / DataGrip / TablePlus

本机先运行 `bash scripts/cloud/open-database-tunnel.sh`，保持该终端。

- 类型：PostgreSQL
- 主机：127.0.0.1
- 端口：15432
- 数据库：{c['database']}
- 用户名：{c['user']}
- 密码：`{c['password']}`
- 表/视图：kaifan_support → Views → accounts
- 本机环回通过 SSH 加密隧道传输，数据库驱动 SSL 可关闭；不要将该配置用于公网直连。

数据库 5432 不对公网开放。此账号仅能查看 accounts 视图；不能查看密码哈希或会话令牌，也不能修改账号数据。

## AI 记录现状

当前不存在持久化 AI 问答表。问题和回答仅在请求/内存任务中暂存，已结束任务约60秒后过期，下一次任务清理时移除，取消任务清除正文，重启后不可回查；此只读账号无法读取其他用户正在进行的内存任务。模型运行在阿里云提供商，业务服务器保存的是调用网关。

若后续开发 AI 历史/质检后台，需要另外实现用户明确授权、可关闭的历史保存、保留期限、删除与管理员访问审计；不能找回此前没有保存的对话。
'''
fd=os.open(access,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
with os.fdopen(fd,'w') as f:f.write(text)
access.chmod(0o600)
report={'passed':True,'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'database':'shiku','role':c['user'],'view':'kaifan_support.accounts','permissions':{'viewSelect':True,'baseUsersSelect':False,'viewUpdate':False},'passwordLoginVerified':True,'privateAccessFile':str(access.relative_to(ROOT)),'publicDatabasePortOpened':False,'aiPromptAnswerPersistence':False}
(ROOT/'work/reports/database-viewer.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
