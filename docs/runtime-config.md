# 服务端 JSON 热配置与账号权限

2026-11-16 已部署。当前策略：两个原有账号及 admin 测试账号（共 3 个）为管理员白名单；其他账号（含后续注册）每天 50 次成功 AI 问答，失败不扣次数，北京时间零点恢复。没有修改客户端/Android/HarmonyOS 原生代码。

服务器生效文件：`/opt/kaifan/runtime-config/config.json`。仓库模板：`infra/runtime-config.json`。API 和私有 AI 网关共享只读目录挂载，每次请求读取，无需重启或重新提交客户端版本。正常部署只在文件不存在时初始化，保留线上调整。

从工程根目录更新配置：

```sh
python3 scripts/cloud/update-runtime-config.py infra/runtime-config.json
```

脚本先使用线上验证器检查完整结构，再原子替换文件；非法配置不覆盖。经 SSH 手动修改也建议原子替换。读取异常时沿用进程上一份有效配置；重启后文件缺失/非法则回到代码中保守默认值（每日 50、没有白名单、启用其他限制）。

`version` 当前必须为 1。不接受未知字段，数值均为 1–100000 的整数。新增两个可选字段兼容旧配置；使用旧配置且未设置 `dailyLimitEnabled` 时只有 `limitsEnabled` 原策略生效。

| ai 字段 | 当前行为 |
| --- | --- |
| dailyLimitEnabled | true：独立开启普通账号每日额度，不受 limitsEnabled=false 影响 |
| perUserDay | 50：每账号每天成功 AI 问答次数 |
| adminUserIds | 三个指定账号的固定 UUID；还必须同时具备数据库 admin 角色，才免配额并解锁关闭功能 |
| limitsEnabled | false：关闭额外的分钟、全局、并发与任务门槛；不会关闭上述每日额度 |
| perUserMinute | 开启额外限制时的账号分钟额度 |
| globalMinute / globalDay | 开启额外限制时的全局分钟/日额度 |
| maxConcurrency / maxJobs | 开启额外限制时的网关并发、API 接纳阈值 |

白名单管理员免除上述全部 AI 配额和接纳门槛，网关不向供应商发送原先的 `max_tokens:512` 应用输出上限。模型供应商实际 token 上限、额度、上下文窗口仍然生效；鉴权、超时、客户端可显示的输入/输出尺寸、故障熔断和去重继续保留。登录等接口防滥用限制保留。

每日配额在 Redis 原子预留后调用 AI，成功回答结算，失败退款且幂等。日期采用北京时间，跨日使用新计数键，无需定时清零。所有设备、直接请求与轮询任务共享同账号额度。超过额度时不调用模型，返回 `source=fallback, reason=daily_limit` 和可直接显示的中文 `text`，同时附 `quota.limit/remaining/resetAt`；轮询任务以 done + result 返回，兼容已存在的客户端显示逻辑。

白名单账号还须在 users 表中设 role=admin；新注册角色固定为 user，不接受客户端指定 admin。服务端每次鉴权查数据库角色，已有会话立即生效，无需重新登录。只改 JSON ID 列表不会把普通账号变成管理员。

管理工作台：`https://api.example.invalid/admin/`，使用账号原密码；未读取或修改密码。修复了非邮箱账号错误走专用本地 admin 登录接口的问题。服务端 community/discovery、内容审核等关闭功能仅对白名单管理员开放，其余用户仍关闭。客户端若把入口编译为隐藏，则现有安装包不能仅靠服务端显示，需在下一次客户端版本接入下方权限接口。

`GET /api/v1/ai/access`（须登录）返回本人角色、whitelistedAdmin、features、ai.unlimited、ai.dailyLimit 与恢复时区；不泄露白名单列表。后续客户端可据此渲染入口。公开 JSON 中不要存放密码、密钥或其他用户资料。

验证：类型检查/构建、AI/任务/重放回归、网关单元与真实回环 HTTP、Compose、隔离 Redis 60 并发只准入 50、退款恢复额度、管理员绕过，以及线上真实 HTTP 的管理员权限、伪造角色拒绝、普通账号超额提示和轮询提示均通过。线上临时测试账号/设备和 Redis 测试键已删除，真实模型调用为 0。证据：`work/reports/server-ai-entitlements.json`、`work/reports/server-ai-budget.json`、`work/reports/server-runtime-config.json`。

测试管理员更新：已创建 admin 账号并加入相同白名单，已开启现有专用管理员登录入口，同时验证标准应用登录可用；密码仅按本次用户指令设置，不写入配置或报告。普通账号注册密码规则保持原有设置。
