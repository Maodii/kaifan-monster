# 上海服务器迁移

2026-11-17 已完成。新主机：api.example.invalid（上海，Ubuntu 22.04，2vCPU/4GiB，40GiB盘）。用户控制台显示100Mbps峰值、按使用流量计费；未调整实例规格、带宽套餐或购买资源。

入口：

- API：`https://api.example.invalid/api/v1`
- 健康检查：`https://api.example.invalid/api/v1/ready`
- 管理后台：`https://api.example.invalid/admin/`
- SSH：root，使用本机现有 `~/.ssh/service-deploy-key`，主机指纹固定在 `~/.ssh/known_hosts_service`。

迁移了5个原部署容器的确切镜像，以及PostgreSQL数据库与自定义数据库角色、Redis的AOF数据、MinIO对象和必需配置。数据库/Redis/MinIO/JWT和AI密钥均经SSH加密传输，不输出、不落到本机转储文件。保留原账号和登录会话、3个管理员白名单、普通账号每天50次成功AI问答（北京时间零点恢复，失败不扣次数）。实际JSON在 `/opt/kaifan/runtime-config/config.json`，无需重启即可调整。

PostgreSQL 47张业务表迁移前后行数一致；Redis和MinIO在停止写入后复制，启动前比较全部文件内容SHA256一致。业务验证完成并清除临时测试记录后，表行数仍全部一致。没有创建整项目检查点、镜像归档或长期数据库转储。

新机已配置Nginx、可信IP HTTPS证书及每4小时续期检查、原有每10分钟健康检查；证书续期dry-run成功。仅22、80、443需要公网访问，API3000、PG5432、Redis6379、MinIO9000/9001保持不对公网开放。SSH密码登录关闭，部署公钥登录已验证。既有4GiB交换空间保留。

## 旧地址兼容

legacy.example.invalid现仅运行Nginx和受限SSH加密转发：本机13000转发新机API3000，19000转发新机MinIO9000。保留原始客户端IP与S3签名Host。旧、新地址均访问新机同一数据库，旧地址生成的新图片链接指向新机，旧Host签名图片请求也已通过真实下载验证。

旧机的5个业务容器全部停止，原卷保持原样，停止旧业务健康检查timer；旧IP证书续期和兼容转发服务继续运行。不得重新启动旧业务容器，否则会产生独立写入数据。旧机保留用于兼容已安装应用，尚未释放；用户完全迁移到新地址前不能直接关机/释放它。

共享客户端 `AuthInputCore.ets` 默认地址已改新机，已保存的旧内置IP会转为新地址，自定义域名保持原样。Android共享核心编译及端点迁移/自定义地址保护测试通过。本轮未重新打包或发布手机安装包；旧安装包通过兼容转发继续使用旧入口。下次客户端升级时，地址变化可能要求重新登录。

## 部署与运维

新机 `/opt/kaifan` 保留源代码及部署文件，API与网关使用原机器上已验证的镜像启动，没有在新机重复构建。导入镜像的本地标签在下列覆盖层中固定，请保留：

```sh
cd /opt/kaifan
docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml -f compose.migration.yaml up -d --no-build --pull never --wait
docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml -f compose.ai.migration.yaml --profile ai up -d --no-build --pull never --wait
```

`postgres`：`kaifan-migrated-postgres:20261117`；`redis`：`kaifan-migrated-redis:20261117`；`minio`原AMD64标签；API为`shiku-api:local`，网关为`kaifan-ai-ai-gateway:local`。后续主动更新时使用当前部署脚本构建相应服务。活跃`scripts/cloud`已切换新机及其known_hosts。

健康检查：`systemctl status kaifan-health-watch.timer`；结果 `/opt/kaifan/work/reports/server-watch.json`。证书续期：`kaifan-cert-renew.timer`；兼容转发在旧机：`kaifan-shanghai-forward.service`。不要执行 `docker compose down -v`。

## 验证与回退边界

已通过：新旧IP的真实可信HTTPS、管理员原密码登录、普通账号注册/默认50次额度、双入口读写同一同步记录、签名图片上传下载和隔离、旧Host签名下载、3个白名单管理员权限、超额直接与轮询提示、网关12并发模拟、供应商/models接口200（验证网络和凭据，无推理）、证书续期演练、私有服务端口隔离。

未进行真实模型推理负载测试或手机真机重装验证。新机采样可用内存约2.5GiB、根盘约23%；这些是采样值，不是容量保证。

旧机卷保留的是切换时数据，切换后新写入仅在新机。若要回退，必须先暂停新机写入，再把新机最新数据库、Redis和对象同步回目标；不得直接启动旧数据库并把流量切回旧数据。旧机上的原 `/opt/kaifan/infra/nginx-ip-https.conf` 可作为旧本机上游配置参考，但只有数据已追平才可恢复。

证据：`work/reports/server-migration.json`（受限权限）、`server-ai-entitlements.json`、`service-endpoint-unit.json`；轻量状态：`work/server-ai-status.json`。迁移工具 `scripts/cloud/migrate-server.py` 按阶段执行；已有目标部署时禁止重新执行prepare，避免覆盖线上配置。
