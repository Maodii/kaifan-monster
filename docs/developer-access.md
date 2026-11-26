# 开发者接入开饭小怪

Android 和 HarmonyOS 使用同一套业务 API。阅读源码和使用本地功能无需申请。需要联调账号、同步、云端 AI 或短信时，可以申请维护者的测试环境，也可以自己启动后端。

## 申请测试环境

在仓库的 **Issues → New issue → 申请开发测试服务** 填写用途、所需能力和测试期限。维护者通过 Issue 告知审核结果，再通过双方确认的私密渠道发放 HTTPS 地址、示例主体测试账号、有效期和获批额度。公开讨论仅记录申请状态。到期或结束测试时，维护者回收对应权限。如需续期，请在原 Issue 说明。服务是否开放、短信额度和审批时间由维护者决定。

获批后，在客户端打开 **我的 → 账号与同步 → 服务连接**，填写私下收到的 HTTPS 根地址，例如 `https://api.example.invalid`，保存后使用自己的测试账号登录。不要把百炼 Key、短信 AccessKey 或 SSH 私钥填入客户端。用以下命令核对测试服务就绪状态，将示例替换为获批地址。

```sh
SERVICE_ORIGIN='https://api.example.invalid'
curl --fail --show-error "$SERVICE_ORIGIN/api/v1/ready"
```

## 自建业务服务

在仓库根目录执行以下命令。需要 Python 3、Docker 和 Docker Compose。初始化脚本生成独立的数据库、Redis、MinIO、JWT 和网关凭据，写入仅当前用户可读写的 `.env` 和 `.ai.env`。再次执行会保留已有配置。AI 和短信初始关闭。

```sh
python3 scripts/setup-local-services.py
sh scripts/build-minio.sh
# ARM64 默认镜像名已匹配。AMD64 在 .env 增加 MINIO_IMAGE=shiku-minio:2025-09-07-amd64
docker compose -f compose.yaml -f compose.app.yaml up -d --build --wait
curl --fail http://127.0.0.1:3000/api/v1/ready
```

默认只有宿主机能访问后端。手机联调请配置可信 HTTPS、设备可访问的 `S3_PUBLIC_ENDPOINT`，参照 [部署说明](deployment.md)。仓库历史文档中的云端地址、账号与部署示例均已脱敏，历史验收描述指原部署。

## 接入百炼和短信

| 私有文件 | 填写项 | 用途 |
| --- | --- | --- |
| `.ai.env` | `AI_BASE_URL`、`AI_MODEL`、`AI_API_KEY` | 填写自己的百炼兼容 API 基址、已开通模型和该区域的 Key。基础 URL 不含 `/chat/completions`。 |
| `.ai.env` | `AI_ENABLED=true`、`AI_ALLOW_OUTBOUND=true`、`AI_GATEWAY_TOKEN` | 两个开关允许真实模型调用。保留脚本生成的令牌，两套 Compose 使用同一文件。 |
| `.env` | `SMS_AUTH_ENABLED=true`、`ALIYUN_ACCESS_KEY_ID`、`ALIYUN_ACCESS_KEY_SECRET`、`ALIYUN_SMS_SIGN_NAME`、`SMS_AUTH_DAILY_LIMIT` | 填写自己的号码认证 RAM 凭据、已开通签名和发送限额。真实联调可能计费。 |

先启动业务服务以建立 `shiku_default` 网络。启用 AI 时准备运行配置，再启动网关并让业务 API 读取同一私有令牌。

```sh
mkdir -p runtime-config
test -f runtime-config/config.json || cp infra/runtime-config.json runtime-config/config.json
docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml --profile ai up -d --build --wait
docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.ai.api.yaml up -d --build --wait api
```

只启用短信时，编辑 `.env` 后重新执行业务服务的 `up` 命令。更改供应商配置前可用同一组 Compose 参数执行 `config --quiet` 做配置检查。验收账号、配置截图、验证码和连接资料留在私密渠道。参阅 [短信接口与用量](sms-auth.md)、[AI 网关](server-ai.md) 和 [业务 API](api.md)。
