> 当前线上已于2026-11-17迁移至上海api.example.invalid，现行部署命令、镜像覆盖层和旧地址兼容说明见 [服务器迁移](server-migration.md)。下面的初始部署示例不替代现行迁移配置。

# 部署与运行

## 本机完整容器服务

已验证 Apple Silicon / Linux ARM64。复用根目录 `.env`，不要覆盖已有凭据：

```sh
colima start
sh scripts/run-local.sh
curl http://127.0.0.1:3000/api/v1/health
```

命令构建 Nest API、执行幂等 SQL 迁移、创建私有照片桶，再启动 PostgreSQL/Redis/MinIO。端口冲突时用 `API_PORT=3001 sh scripts/run-local.sh`。本次实测容器 API 使用 3001，开发进程使用 3000。所有基础服务端口仅绑定回环地址。

后端开发进程：`npm ci --prefix backend`、`npm --prefix backend run migrate`、`npm --prefix backend start`。不要直接用 tsx 启动 Nest 主程序：依赖注入需要 TypeScript 编译的装饰器元数据。

## 云服务器

需要用户提供 Linux 云服务器 SSH 访问方式和两个已解析域名。当前用户提供了阿里云试用机并请求接入；试用机步骤见[试用机接入](aliyun-trial-access.md)，SSH授权和HTTPS条件就绪后执行。推荐至少 2核/4GB/40GB磁盘，开放22、80、443端口；5432、6379、9000、9001不对公网开放。

1. 安装 Docker Engine 和 Compose v2，将源代码复制到服务器。不要上传本机 `.env`、node_modules、client构建缓存和work目录。
2. 参考 `.env.example` 创建服务器自己的 `.env`，为数据库、Redis、MinIO、JWT分别生成独立随机凭据，`chmod 600 .env`。JWT_SECRET至少48个随机字符。配置 `API_DOMAIN`、`S3_DOMAIN`、`TLS_EMAIL`、`S3_PUBLIC_ENDPOINT=https://图片域名`。
3. 执行 `sh scripts/build-minio.sh`。脚本检测Docker架构并下载官方ARM64或AMD64二进制，验证官方SHA256后本地构建。AMD64服务器须设置 `MINIO_IMAGE=shiku-minio:2025-09-07-amd64`。
4. 执行：

```sh
docker compose -f compose.yaml -f compose.app.yaml -f compose.production.yaml up -d --build --wait
```

Caddy根据域名自动获取证书。API和对象存储使用不同域名，S3签名Host必须与客户端实际上传地址一致；不要修改签名URL的域名或路径。私有桶不配置匿名读取，对外浏览照片走短期签名下载链接。MinIO控制台仅通过SSH隧道访问。

原生客户端在“设置”填 `https://API域名`，不带 `/api/v1`。客户端只接受HTTPS，不能连接本机明文测试API。真实HTTPS与真机联调尚待服务器/证书条件具备。

## 管理员

先在客户端或API注册普通账号，再由服务器维护人员显式提权，不内置默认管理员账号或密码：

```sh
# 容器内执行，邮箱为已注册账号：
docker compose -f compose.yaml -f compose.app.yaml exec api node dist/scripts/promote-admin.js admin@example.com
```

打开 `https://API域名/admin/`。工作台令牌仅保存在页面内存，关闭页面即丢失。支持条码、菜谱、动态和举报审核及基础指标。通过举报会下架原动态；审核及撤回不修改原始私有日记。

## 存储与运维

PostgreSQL、Redis、MinIO使用命名卷；停止容器不删除数据。不要运行 `down -v`。数据库仅保存结构化JSON、照片索引/URL，对象二进制由客户端直接上传私有MinIO。对象删除使用持久化队列；保留6分钟宽限期，覆盖5分钟未过期预签名上传，失败退避重试。未完成上传索引1小时后进入清理队列。

生产应为API创建限定照片桶权限的S3服务账号，配置 `S3_ACCESS_KEY`、`S3_SECRET_KEY`，避免使用MinIO root凭据。本机开发环境使用root用于本地验证。生产镜像可固定已审核digest并定期更新依赖；当前Node/Caddy发布标签由部署时解析。

本项目不会自动复制或打包整项目，不自动建立定时全量备份。需要备份时由用户制定实际保留策略；云备份API显式创建单个私有数据快照，本地JSON导出由用户主动触发。

## 验证

```sh
npm --prefix backend run typecheck
npm --prefix backend run check:services
npm --prefix backend run test:integration
cd backend && node --import tsx test/rules.test.ts
```

后端测试创建随机example.test用户并在finally清理，使用真实PG/Redis/MinIO。照片测试只从客户端测试进程直传对象；不会把照片落盘到服务器目录。正式真机签名、云端HTTPS和相机硬件能力不能由编译成功替代。
