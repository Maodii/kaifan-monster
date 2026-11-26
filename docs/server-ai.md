# 服务器维护与独立 AI 网关

## 最新授权与部署（后续更新，优先于下文首轮记录）

**已运行验证：** 云端网关已构建并healthy；从现有 `shiku-api-1` 经私网调用 `qwen3.8-flash` 成功，HTTP200、`source=model`、`requires_review=true`，耗时996ms；未授权401。仅发起一次真实模型请求。后续缓存部署的私网健康与源码SHA256复核通过，没有追加模型调用。网关无主机端口发布，原业务API未由本对话重建。真实结果见 `work/reports/server-ai-cloud.json`。部署SSH收尾曾未退出，已核实远端进程结束后关闭本任务连接，不能用该连接退出码代替独立部署验收。

用户已授权既有 Token Plan 密钥接入、有限真实联调与云端部署，不新购资源。本对话仅负责 ai-gateway、Compose 和云端网关；原对话负责 backend、client、android、隐藏社区以及业务API重建。下文涉及“尚未配置模型、云端未部署、仅回环18100”等描述是首轮关闭状态的历史记录，最新状态以本节和独立JSON报告为准。

此次平台地址 `https://provider.example.invalid/v1`，模型 `qwen3.8-flash`；原对话已实测该模型200，4B/8B为404。本对话不再尝试不可用模型。服务器 `/opt/kaifan/.ai.env` 由原对话直接写入，权限600；不打印、不下载、不回传密钥。本对话仅按明确要求将超时18改15。真实调用消耗既有平台额度，套餐余量与最终计费未独立核实，不宣称免费。

网关保持 `{prompt}` 接口，增加上游 `enable_thinking:false`；配置超时上限15秒，加请求体读取最多5秒，总预算不超过20秒。代码默认两开关关闭，云端授权配置显式开启。修改后11项单测、真实本机HTTP冒烟及6组本地/Compose检查通过；本地报告只记录模拟调用，不冒充真实模型验收。

`compose.ai.yaml` 已取消所有主机端口发布，网关只通过Docker私网访问。独立项目 `kaifan-ai`、容器 `kaifan-ai-ai-gateway-1`；`compose.ai.cloud.yaml` 将它的默认网络连接现有外部 `shiku_default`，默认别名 `ai-gateway`。不会创建新的付费资源，不管理或删除主业务网络。

部署与验证：

```sh
bash scripts/cloud/deploy-ai-gateway.sh
python3 scripts/cloud/verify-cloud-ai.py
```

部署脚本要求已有600凭据文件，仅流式上传网关源码/依赖锁和3个AI Compose文件；使用 `COPYFILE_DISABLE=1`，禁止xattr，排除 `._*`、`.DS_Store`、虚拟环境、测试、缓存。不传env、不复制整个项目，只构建/启动网关，不重建业务API或重启PG/Redis/MinIO。首次部署的tar扩展属性警告未生成AppleDouble文件，后续脚本已显式禁用xattr。

云端手动复用命令：

```sh
cd /opt/kaifan
docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml --profile ai config --quiet
docker compose --env-file .ai.env -f compose.ai.yaml -f compose.ai.cloud.yaml --profile ai up -d --build --no-deps --wait ai-gateway
```

原对话部署业务API时使用以下overlay，两个插值文件按顺序共同加载；业务仍读取原`.env`，仅额外注入URL/共享令牌，不把上游AI_API_KEY注入业务容器：

```sh
docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml config --quiet
docker compose --env-file .env --env-file .ai.env -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.ai.api.yaml up -d --build --no-deps --wait api
```

`AI_GATEWAY_URL=http://ai-gateway:8100`，共享令牌只属于服务器。约定业务路由 `POST /api/v1/ai/assist` 输入 `{prompt:string(最多600字符), consent:true, includeInventory?:false}`；原对话负责AuthGuard、Redis原子每用户10次/分钟和100次/天、20秒fetch超时、把说明/问题/检索结果封装为≤2000字符的网关prompt，保留source/reason/text/requires_review并添加本地catalog references。移动端不接触共享令牌、不直连网关。业务和双端验收以原对话报告为准。

真实验收从现有业务API容器验证私网DNS/健康、未授权401和一次最小烹饪文字请求。令牌原地读取，仅通过子进程stdin传递，报告不保存令牌、上游错误、模型原文或私人内容。每次运行该验证脚本会产生一次模型请求，不用于无限轮询。最新结果见 `work/reports/server-ai-cloud.json`；运行前该报告不存在时，不宣称部署或真实调用通过。

停用时可将云端两开关置false后只重建网关，或仅stop ai-gateway；业务端连接错误应回退，不得公开网关端口。域名、HTTPS、手机公网访问和费用核对仍属独立未完成事项。本机Docker daemon未启动，容器构建/运行在既有云端执行，不启动Colima，不下载模型权重。

本对话职责为服务器维护、HTTPS 准备和 AI 服务；不修改 Android、鸿蒙或共享 NestJS backend。独立状态为 `work/server-ai-status.json`，不覆盖主 `work/task-state.json`。所有执行结果以该状态和 `work/reports/server-health.json`、`work/reports/server-ai-verification.json` 为准。

## 服务器现状与检查

2026-11-11 实际通过固定 known_hosts 的 root SSH 检查 legacy.example.invalid：四个业务容器运行；API、PG、Redis healthy；MinIO 没有 Docker healthcheck，但 HTTP 存活检查成功。无 OOM、重启次数 0；可用内存约 2635 MiB，根盘 15%（可用约 32 GiB）。这些是采样值，不是持续监控或容量承诺。业务 3000/5432/6379/9000/9001 均绑定回环。SSH 为公网监听；本轮未变更安全组或防火墙，不能由来宾 OS 证明安全组的来源限制。

复查命令只读取运行状态，不输出容器环境、私钥或 `.env`：

```sh
python3 scripts/cloud/check-trial-health.py
```

报告保存路径固定，不累积整项目快照。首次 SSH 主机指纹已 TOFU 固定，仍需在阿里云 Workbench 独立比对。之前 8 组业务验收见 `work/reports/aliyun-trial-smoke.json`；本轮仅复核运行健康，未重跑注册、照片和全部业务流程。云端迁移和菜谱的 20/450 数字来自之前验收，不代表本轮重建或更新了数据库。

## 费用与试用边界

已知配置记录为杭州、Ubuntu22.04 amd64、2核4G、40G，按量付费、按流量计费、峰值100Mbps。**100Mbps 不是免费流量额度，试用机也不能据此宣称零费用。** 本轮没有采购、开通付费模型、下载模型或改动云端资源。

SSH 无法核对账户级账单。试用截止日期/时区、剩余抵扣额度、赠送流量及超额单价、公网 IP/云盘收费、到期释放还是转按量、自动续费/余额扣费状态均为待确认。需要由账号持有人在阿里云控制台的试用订单、ECS 实例计费、费用与成本/账单中核对并设置适用的预算通知；本轮未登录这些控制台，也未设置通知。不要在聊天发送 AccessKey。

`/proc/net/dev` 仅为开机以来的网络计数，包含主机与容器通信，不等于阿里云计费口径、月流量或剩余额度。图片下载、对象直传、SSH、构建拉取都可能产生网络使用。未确认期限前不建立定时备份、付费续费或额外资源。到期前由用户决定保留/迁移/停止；停止机器也未必停止云盘和公网资源计费，释放涉及数据销毁须另行明确授权。

## 无域名阶段与 HTTPS 上线步骤（尚未执行）

当前继续使用本机 SSH 隧道 13000/API、19000/图片；隧道存活不保证重启后恢复。手机公网直连、域名、备案、证书均未验收。暂不买域名、不开放公网明文 API、不使用临时公网隧道代替发布。

以后具备已有域名和上线条件时：

1. 确认域名控制权及中国内地公网服务适用的备案条件。准备独立 API 与图片子域名，A 记录指向服务器；若没有 IPv6 服务，不发布不可达的 AAAA。核对两域名的解析和证书签发限制。
2. 从服务器侧编辑现有 `.env` 中 `API_DOMAIN`、`S3_DOMAIN`、`TLS_EMAIL`、`S3_PUBLIC_ENDPOINT=https://图片域名`。不把配置文件复制到聊天或覆盖其他凭据。部署前确认 S3 最小桶权限服务账号和正式管理员，不复用弱口令。
3. 在安全组/主机防火墙放通必要的 80/443；22 限定维护来源。保留所有业务端口回环绑定，9001 控制台只走 SSH。
4. 使用现有 `infra/Caddyfile` 和 `compose.production.yaml`。保留试用资源限制：

   ```sh
   docker compose -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.production.yaml config --quiet
   docker compose -f compose.yaml -f compose.app.yaml -f compose.trial.yaml -f compose.production.yaml up -d --wait
   ```

   如需后端源码更新，先与原对话约定版本和迁移，再显式构建；当前本地源码可能领先云端，不能盲目部署。Caddy 仅反代业务 API 与 MinIO，**不代理独立 AI 网关**。
5. 从外网验证两域名完整证书链、HTTPS/HTTP 跳转、API 健康、管理员授权、照片预签名上传/下载和账号隔离。图片签名 Host 与实际访问 Host 必须一致；不能改写签名 URL，旧的 localhost 签名需要重新签发。
6. 原对话负责在安卓/鸿蒙设置不带 `/api/v1` 的 HTTPS 根地址并真机验收。证书签发和命令成功不能代替手机联网测试。

配置故障时保持数据卷，不执行 `down -v`，可停止本轮新增的 Caddy 并恢复先前明确修改的字段；继续走 SSH 排查，禁止为应急暴露3000/9000明文端口。

## 已实现的 FastAPI 网关

代码在 `ai-gateway/`；它只做文字建议的无状态转发，不加载权重、不写数据库、不解析图片、不具有修改用户记录的工具。没有自动读取 Codex 配置或重用本机模型密钥。`AI_ENABLED=false`、`AI_ALLOW_OUTBOUND=false` 为双重默认关闭；Compose 还需显式 `--profile ai` 才会启动服务。

本地运行（Python 3.12+）：

```sh
uv venv --python 3.12 ai-gateway/.venv
uv pip sync --python ai-gateway/.venv/bin/python ai-gateway/requirements.lock
cd ai-gateway
.venv/bin/uvicorn app:app --host 127.0.0.1 --port 18100 --workers 1 --no-access-log --limit-concurrency 16
```

无令牌时健康检查正常、建议接口返回503，属于默认关闭行为。需要在进程环境设置一个至少32位随机 ASCII 的 `AI_GATEWAY_TOKEN` 才能测试已鉴权的关闭回退；不要打印该令牌。测试脚本自动生成临时令牌并在退出时终止自己的子进程，不落盘。

可选容器启动（本轮未执行构建/云端部署）：

```sh
docker compose --env-file /dev/null -f compose.ai.yaml --profile ai up -d --build --wait
```

该独立 Compose 使用192MiB内存、0.35 CPU上限，单进程、非root、只读根文件系统和有限日志，不发布主机端口。云端通过cloud overlay复用业务私网；本机直接uvicorn测试才使用回环18100。不需要叠加主业务 Compose，也不读取主业务 `.env`；AI配置通过专用权限600文件及 `--env-file` 或受控进程环境注入。不要执行会打印完整插值配置的 `docker compose config`，使用 `config --quiet`。

| 配置 | 默认/要求 |
| --- | --- |
| AI_ENABLED | false；启用网关转发逻辑 |
| AI_ALLOW_OUTBOUND | false；另需明确允许向指定平台发送数据，不能由客户端改变 |
| AI_GATEWAY_TOKEN | 空；非空须至少32位 ASCII；只属于受信业务服务器 |
| AI_BASE_URL | 空；HTTPS API根地址，如 `https://approved-provider.example/v1`，由运维固定，不接受请求指定 URL |
| AI_API_KEY / AI_MODEL | 空；必须来自用户明确提供、具有使用授权和费用约束的模型平台 |
| AI_TIMEOUT_SECONDS | 默认8秒，云端15秒；允许0.05–15秒；覆盖整个响应流，加请求体最多5秒后总预算≤20秒 |
| AI_REQUESTS_PER_MINUTE | 10；允许1–60；全网关滚动窗口 |
| AI_MAX_CONCURRENCY | 2；允许1–4；满载直接回退，不排队 |

网关只向配置根地址下的 `/chat/completions` 发一次请求，OpenAI兼容文本协议，最多512输出token。不重试、不跟随重定向、不采用宿主代理环境。调用失败连续3次熔断30秒。输入 prompt 限2000字符、JSON原始请求体16KiB、读取请求体最长5秒、上游响应64KiB、建议文本8000字符；不记录 prompt/响应/令牌，也不向调用方转发上游错误内容。模型文本始终标记需要人工核对。以后消费模型文本必须作为纯文本展示，不能作为HTML或指令执行。

限流和熔断为单进程内存状态，重启即清空，不构成严格消费预算；禁止未经扩展就开启多个workers/副本。一次调用也可能收费，因此本轮两开关始终关闭且没有配置真实密钥。启用前还需核对平台额度/计费、数据出境/隐私与用户同意、模型能力及实测延迟。仅将用户主动提交的最小文字发往模型，不自动提交日记、照片、家庭信息或JWT。

## 接口契约与后续业务接入

`GET /health` 不鉴权，仅返回存活及 enabled；enabled 不是模型就绪或已连通证明。

受信服务器请求 `POST /v1/assist`，携带 `Authorization: Bearer <AI_GATEWAY_TOKEN>`，JSON 为 `{"prompt":"鸡蛋怎么做"}`；拒绝未知字段。成功或业务降级均HTTP200：

```json
{"source":"fallback","reason":"disabled","text":"AI 辅助暂不可用，请使用现有菜谱搜索与手动录入，并核对食材、过敏原及用量。","requires_review":true}
```

模型成功时 `source=model`、`reason=null`；回退原因是 `disabled`、`not_configured`、`busy`、`timeout`、`upstream_unavailable`、`circuit_open`。调用方必须检查 source，不能把 HTTP200 当作模型成功。401=无效令牌，503=未设置服务令牌，422=输入无效，413=请求体过大，408=请求体超时，429=本地限流（Retry-After 60秒）。连接失败及这些非200响应应由业务端继续使用现有菜谱/手动路径。

当前 NestJS 没有新增 AI 路由，移动端不可直接访问网关，也不能携带网关共享令牌。未来需与原对话约定后新增已登录业务路由（建议 `POST /api/v1/ai/assist`），由现有 AuthGuard 验证用户/设备，业务端按账号限流及隐私同意；服务器注入共享令牌调用独立网关，总等待预算建议10秒。共享 Docker 网络和业务端连通配置也需届时显式接入。不能把回环地址当作跨容器地址，也不能把AI接口直接挂到现有 Caddy 公网路由。该业务路由、本地菜谱自动检索、图片识别均属于后续计划，本轮未实现。

## 已运行验证与缺失条件

```sh
ai-gateway/.venv/bin/python -m unittest discover -s ai-gateway/tests -v
ai-gateway/.venv/bin/python ai-gateway/tests/wire_smoke.py
docker compose --env-file /dev/null -f compose.ai.yaml config --quiet
```

单测使用内存模拟模型传输，覆盖默认关闭/未配置零出站、鉴权与输入边界、固定协议成功、401/429/503/重定向/畸形/过大响应回退、总超时、限流、并发拒绝、熔断。真实本机HTTP进程验证存活、鉴权与关闭回退。测试不等于真实模型验收。

缺失：经过授权的模型平台地址/密钥/模型名、明确费用或免费额度与发送数据许可；业务用户鉴权桥接；域名与手机HTTPS验收。云端未部署网关，Docker镜像未构建；本机 Docker daemon 未运行，本轮未启动 Colima 或更改其状态。Python依赖与HTTP运行已在本机验证。没有下载任何大型模型。
