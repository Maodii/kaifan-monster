# 小怪动作与传输优化 · 0.9.2 / 20

## 视觉和交互

保留原有紫色蜡笔小怪、黄色饭碗和青色勺子的身份，使用生图 API 制作六个独立姿态：待机、眨眼、招手、思考、开心、吃饭。原图与提示词位于 `art-source/ai-mascot/`，六张透明 PNG 正式接入鸿蒙 media，并通过 Android 构建流程复用。每张 384×384，六张解码约 3.5 MiB，不使用大型逐帧视频。

首页入口和对话页使用新的姿态资源。点角色依次招手、吃饭；等待回复时切换思考表情；回复出现时开心回应。Android 使用一个低频动作定时器，历史消息头像保持静止；鸿蒙组件离开时清理定时器。两端在后台或减少动态效果设置下暂停动作。

对话提供复制回答、分步讲讲、换个做法。Android 阅读旧消息时保留位置，新回复提供“回到最新”；输入框维持底部，窄屏、键盘高度和长链接都进行宿主浏览器验证。鸿蒙对应交互完成 ArkTS 编译，尚未进行设备视觉验收。

动画预览 `work/reports/assistant-mascot-preview.gif` 通过无头宿主浏览器录制；其中回复为模拟内容，不是模型能力或实时延迟证明。

## 网络与服务

- Android HTTP 和图片上传使用独立的两线程有界队列，等待容量 12，空闲线程 30 秒回收；数据库仍串行执行，避免破坏写入顺序。网络任务不再占用数据库/本机操作队列。
- 共享 Cloud 层对同账号、同服务和同刷新令牌的并发续期合并为一次，成功后分别重试原请求一次。账号变化时丢弃旧续期结果；失败释放等待槽。
- AI 请求携带随机 requestId。客户端网络错误重试保留同一标识，修改内容后生成新标识。服务端按用户隔离，同标识同内容的并发和短期重试共享结果；改内容返回 409。
- 去重最多保留 64 项，成功模型结果保留 60 秒，失败或降级结果可重试；仅单进程内存有效，多副本部署前需改为共享协调。取消前端等待不会自动取消已经开始的上游推理。
- 推理所需公共菜谱缓存 30 秒，并合并并发加载，序列化大小上限 8 MiB。库存仍每次按当前用户查询。菜谱编辑可能在此窗口内延迟反映到推荐中。
- 公共菜谱目录启用 gzip（超过 1 KiB，级别 4）；AI、认证和同步响应保持 private/no-store，未对敏感响应启用此压缩。
- 服务端 HTTP keep-alive 为 65 秒；AI 网关复用原有上游连接池。未实现流式逐字输出。

## 验证与交付

云端实测公共目录 948,085 字节，gzip 为 118,926 字节，节省 **87.5%**；解压后 SHA-256 一致，同一连接可复用。本次样本分别约 1,624 / 605 ms，只能代表 SSH 回环测试条件，不代表手机网络性能。

真实模型请求通过并发、结果回放、内容冲突检查，临时测试账号已删除；社区仍返回 404。服务端已部署新镜像，AI 权重仍由阿里云提供，服务器运行的是 API 与网关。

验证证据：

- `work/reports/assistant-ui.json`：21 组宿主 UI、隐私及真实本地写入流程。
- `work/reports/assistant-client-core.json`：6 组共享业务/SQLite 事务。
- `work/reports/cloud-refresh-unit.json`：并发续期、账号切换、失败后恢复及句柄释放。
- `work/reports/assistant-transport-unit.json`：去重、有效期、容量、目录缓存和 HTTP gzip。
- `work/reports/assistant-network-cloud.json`：真实云端传输及模型回放。
- `work/reports/android-parity-input.json`：8 组输入导航。
- `work/reports/android-core-tests.json`：14 组 SQLite/HTTP 核心流程。
- `work/reports/assistant-release.json`：双端安装包、版本、资源与凭据排除校验。

安装包覆盖原有输出文件：`outputs/kaifan-monster-android-debug.apk`、`outputs/shiku-mvp-unsigned.hap`。APK 为 debug 签名；HAP 仍需开发者签名。尚无公网 HTTPS 域名，手机连接沿用 `docs/ai-assistant-v080.md` 中的隧道/转发方式。本轮没有启动模拟器或完成真机验收。
