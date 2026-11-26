> 后续更新：AI 原固定额度/2并发已于 2026-11-16 改为 JSON 热配置，当前关闭 AI 限流。现行说明见 `runtime-config.md`。本文原容量数字保留为历史检查记录。

# 2026-11-16 服务器与AI优化交付

修复已部署至既有服务器，没有采购、扩大机器配置、下载模型权重或修改Android/鸿蒙工程。共享backend变更范围已通知原对话。应用界面继续使用既有source/reason/text/requires_review契约。

## 已修复并运行验证

- 用户选择的忌口、人数、时长、预算、地区进入优先上下文，不能被库存或历史挤出2000字符预算。抽出assistant-context模块，目录检索和模型输出使用同一份食材别名。发现文本与忌口冲突时隐藏回答；有忌口的流式请求先缓冲再核对，避免先显示后撤回。该词级检查偏保守，可能拒绝“不要放某食材”的回答，也无法保证识别所有隐含成分；继续要求用户核对，不能宣称过敏安全。
- 上游length/content_filter与正常stop分开；截断返回fallback/truncated并清楚标记未完成，不再当完整做法。记餐JSON不完整时不生成可保存草稿。没有自动续写或额外推理。
- 增补西兰花、芦笋、焯水、汆水、解冻等食材/操作和窄范围追问，保留越权、密钥和无关业务拦截。backend与Python仍有两层规则，新增正反例回归以降低漂移；没有完全重构双端UI。
- 本地语义校验、无匹配和未配置检查在额度预留之前。Redis原子预留/结算，令牌匹配退款且只执行一次；每天按Asia/Shanghai零点切换。
- 用户防滥用3次/分钟、每用户1个进行中请求；每用户100个可用回答/日；共享网关和业务入口都限制10次/分钟、2个网关并发。没有无限排队或提升现有平台使用上限。
- 不可用回答退用户日额度；分钟防滥用计数不退。全局每天500个可能发生的上游尝试：busy/disabled/未配置等明确未推理的情况可退，超时、取消、断网等平台是否已处理不确定时保留全局计数，避免通过取消绕过消费保护。这些限制是应用层保护，不代表Token Plan计费口径或免费额度。新v2计数命名空间已对切换日旧UTC日额度做一次原子、幂等的保守迁移，避免更新版本时重置当天已用额度；证据见server-ai-budget-migration.json。历史计数不是平台账单，仍需核对实际平台额度。
- 单份24小时opaque requestId标记保存在既有Redis（AOF）里，不存问题/回复正文。成功或崩溃中的旧请求不会在新进程里直接重复推理；丢失正文的job游标明确返回interrupted/error，同ID重发可返回409。用户需重新生成请求标识；不伪造“已恢复原文”，Redis自身故障/丢失也不构成严格exactly-once保证。失败已退款的请求可以正常重试。
- 新增 `/api/v1/ready`，检查PostgreSQL/Redis/MinIO并设时限，依赖故障返回503；原 `/health` 保留进程存活含义。API容器healthcheck改查ready；PG池连接等待最多3秒。MinIO增加HTTP200正式healthcheck，五个容器现均healthy。

## 已启用的运维检查

既有宿主的 `kaifan-health-watch.timer` 每10分钟运行一次，只更新 `/opt/kaifan/work/reports/server-watch.json`。检查容器/依赖、内存/磁盘、证书剩余有效期、续期timer和AI聚合指标。门槛为根盘85%、可用内存低于256MiB、TLS剩余低于48小时、服务不健康等；AI至少20次观测后失败比例≥20%会告警。告警写系统日志和JSON，尚未接入外部消息/手机推送；没有对外发送授权以外的信息。

网关 `/metrics` 仅私网且要求共享Bearer令牌；包含请求/HTTP错误、响应头延迟桶、model/timeout/busy/truncated等结果计数和熔断状态，不存用户ID、prompt、回复、JWT或平台密钥。指标在网关重启后归零；响应头延迟不冒充流式总耗时，完整耗时仍由业务job记录。

```sh
systemctl status kaifan-health-watch.timer
journalctl -u kaifan-health-watch.service --since today
python3 /opt/kaifan/scripts/cloud/server-watch.py
```

最后一条只检查状态，不调用模型；不要用真实模型冒烟脚本作定时健康检查。该timer不备份数据库或项目，不自动重启/清理业务数据。

## 恢复、访问与资源策略

已经在现有PostgreSQL中执行仅结构pg_dump→临时空库psql恢复，比较public表数量一致并删除临时库；没有复制用户行/照片，没有留下导出文件。它证明结构导出/恢复路径可运行，**不代表实际用户数据、照片一致性或灾备恢复已验证**。

正式数据保护仍需明确恢复目标和保留位置：应协调PG结构化索引与MinIO对象的同一恢复点、加密存储、保留期限及实际恢复演练；不自动建立全量备份或收费存储。用户主动导出的正式备份属于交付物，按其明确策略保留。PG/Redis/MinIO卷和未知原图均未清理。

SSH密码登录原本已关闭，继续保留当前已验证root公钥通道。本轮未擅自新增有sudo权限的账号或关闭root：现有维护/数据库访问工具与其他对话依赖该通道。改为独立维护账号时，顺序必须为创建最小权限账号、独立终端验证公钥与必要sudo、迁移维护工具、验证可恢复后再限制root；不能先关闭现有唯一入口。此项为迁移约束，未冒称已完成非root迁移。

服务器目前没有容量压力；维持2核4G。没有引入大模型、额外云服务或付费监控。阿里云试用结束日期、流量/抵扣额度、Token Plan余额和自动续费状态仍需账户控制台核对，系统内计数不能证明账单。

## 验证证据与清理

- 网关18项单测通过，包括流式中断释放和新增截断/误拒/私有指标用例；backend typecheck/build和assistant/audit/workflow/jobs/transport/credential相关套件通过。
- 真实云端Redis8组隔离用例验证并清理测试键；真实部署的API/网关模块又以模拟依赖验证条件传递、忌口、退款、截断、重启游标与依赖故障。真实模型调用0。
- 外网HTTPS `/ready` HTTP200；五个容器healthy，网关无公网/主机端口；线上文件SHA256与本地一致。
- 部署只上传必要文件；唯一最小回退集不含env/用户记录/图片，验证后已删除。没有复制整个项目、建立历史快照或删除未知素材。
- 证据：`work/reports/server-optimization-verification.json`、`server-ai-budget.json`、`server-schema-recovery.json`、`server-optimized-health.json`。双端页面与真实模型质量未在本轮重验，接口变化已通知原对话。
