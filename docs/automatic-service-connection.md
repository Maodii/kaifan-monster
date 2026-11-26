# 自动连接云端服务

目标：安装后直接使用内置 `https://api.example.invalid`，Android 与鸿蒙连接同一后端和 PostgreSQL；不需要电脑、SSH 隧道或 USB 转发。

## 当前进度

0.9.11 双端已内置地址；2026-11-12 公网 HTTPS、注册登录、数据隔离、照片签名上传/下载、真实 AI 回复与增量传输均验收通过，证书自动续期演练成功。手机/模拟器内运行验收尚未完成，鸿蒙 HAP 仍需要开发者签名。

- 新安装使用内置 HTTPS 地址。
- 旧版内置的 localhost/127.0.0.1/10.0.2.2 的 3000、3001、13000 端口及 example.invalid 占位地址自动迁移。用户自定义的其他地址保留。
- 切换服务来源时清除旧登录凭据，保留独立账号的本机记录。升级后需重新登录一次；不会将旧令牌发送给新的服务来源。
- 登录/注册直接向服务器提交。库存、记餐和照片是否自动同步，仍由“应用使用期间自动同步”和“仅 Wi-Fi”控制；连接地址自动化不等于静默上传全部私人内容。
- 无网时保留本地功能、未同步记录和冲突处理；AI 需要网络及登录。
- 高级连接设置折叠，正常使用无需打开。

## 服务器方案

Nginx 同一公网 HTTPS 入口：`/api/v1/` 转发 API，`/shiku-photos/` 转发私有对象存储。对象存储路径和 Host 保持不变，避免破坏 S3 签名。AI 流式响应关闭代理缓冲。数据库、Redis、MinIO 控制台继续仅监听 loopback。

使用 Certbot 5.10.0 webroot 申请 Let's Encrypt shortlived IP SAN 证书（160 小时有效）；systemd 每四小时检查续期，成功后验证并 reload Nginx，无需用户手工续证。该 IP 为当前试用 ECS，若实例到期或公网 IP 变化，需迁移服务；上架前建议使用自有稳定域名。

安全组放行后，在服务器执行：

```sh
cd /opt/kaifan
bash scripts/cloud/activate-public-https.sh
```

不会停数据库或替换持久卷。脚本将 `.env` 的 S3_PUBLIC_ENDPOINT 更新为该 HTTPS 来源，重建仅 API 容器配置，不传递 AI 提供商密钥给客户端。

本机公网验收（临时账号自动注销；不记录令牌和密码）：

```sh
SMOKE_ORIGIN=https://api.example.invalid python3 scripts/cloud/smoke-trial.py
SMOKE_ORIGIN=https://api.example.invalid python3 scripts/cloud/smoke-assistant.py
```

正常验证系统信任链，禁止使用跳过证书验证的选项。验收包括注册、登录、刷新、文本持久化、跨账号隔离、照片签名上传/下载及一次真实 AI 调用。手机运行、鸿蒙开发者签名与商店上架验收另列。

官方依据：
- https://letsencrypt.org/docs/profiles/ （shortlived：DNS、IP，160 小时）
- https://github.com/certbot/certbot/blob/master/certbot/CHANGELOG.md （5.3 IP 参数，5.4 webroot IP 支持）
- https://github.com/certbot/certbot/releases/tag/v5.10.0
