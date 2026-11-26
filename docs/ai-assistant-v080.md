# 开饭小怪 0.8.0：双端 AI 与社区暂时下线

鸿蒙 `com.shiku.foodkeeper` 与安卓 `com.kaifan.monster` 均升级到 0.8.0 / code 17。

## 已实现

- 今日页、菜谱详情和 3D 大厅功能抽屉均可进入小怪助手。
- 四种快捷提问，支持做法、配餐、食材替换与食材知识；详情页可带入菜名。
- 明确同意后才发送本次问题。库存名称默认不发送，可选附带服务器已同步的示例主体库存；不读取家庭共享库存，不发送照片。
- 显示模型回答和最多三条检索菜谱，可点击继续看详细步骤。
- 支持重试、取消等待、清空；离开页面或账号切换后阻止旧回答回填。问题、回答和同意状态只保留在内存，不写入本地历史。
- 仅给建议，不自动创建计划、记餐或扣库存。热量、时间、花费建议需要用户核对。

## 服务器

`legacy.example.invalid` 上部署 FastAPI AI 网关，调用阿里云 `qwen3.8-flash`。这是服务器代理云端模型推理，没有在这台普通 CPU 服务器上部署模型权重或训练服务。

应用 → 业务 API `/api/v1/ai/assist` → 私网 `ai-gateway:8100` → 阿里云。

上游 API Key 只在服务器私有环境文件中，权限 600；业务 API 仅持有内部网关令牌。两端安装包没有上游 Key。网关不发布公网端口，限额 10 次/分钟、并发 2、15 秒上游超时、192 MiB 内存上限；业务 API 另有每账号 10 次/分钟、100 次/UTC日限制。Redis 故障时拒绝模型请求。

业务 API、数据库、Redis、图片服务保持宿主回环监听。当前用户暂无域名，尚未配置可供手机直接访问的公网 HTTPS。

## 无域名测试

电脑终端保持 SSH 转发运行（只绑定本机回环）：

```sh
ssh -N -i ~/.ssh/service-deploy-key \
  -o IdentitiesOnly=yes -o ExitOnForwardFailure=yes \
  -o UserKnownHostsFile=~/.ssh/known_hosts_legacy \
  -L 127.0.0.1:13000:127.0.0.1:3000 \
  -L 127.0.0.1:19000:127.0.0.1:9000 root@legacy.example.invalid
```

不要重复启动已经占用 13000/19000 的转发。手机通过 USB 连接并开启对应开发调试：

安卓（多个设备时给 adb 加 `-s 设备序列号`）：

```sh
~/Library/Android/sdk/platform-tools/adb reverse tcp:13000 tcp:13000
~/Library/Android/sdk/platform-tools/adb reverse tcp:19000 tcp:19000
~/Library/Android/sdk/platform-tools/adb install -r outputs/kaifan-monster-android-debug.apk
```

鸿蒙：

```sh
source scripts/harmony-env.sh
hdc rport tcp:13000 tcp:13000
hdc rport tcp:19000 tcp:19000
```

鸿蒙 HAP 当前未签名，需要在 DevEco 使用开发者签名后安装至真机；它不是可直接上架或直接安装到任意真机的发行包。

两端在“我的 → 账号与同步 / 服务连接”设置 `http://127.0.0.1:13000`，注册或登录自己的账号，进入“小怪助手”，勾选发送同意，再提问。库存辅助需先同步自己的食材。断开电脑转发时 AI 不可用，本地功能继续可用。

以上 USB 命令已核对工具语法，但本轮没有连接可用手机，未完成设备端端到端验收。公网接入后使用有效 HTTPS 地址替换该本地测试地址。

## 暂时隐藏的功能

简洁模式和 3D 模式的社区广场、帖子搜索、公开成品墙、关注评论消息、公开分享与投稿、热搜、收藏人数和排行榜入口均关闭；公共接口返回 404。管理端隐藏内容审核、演示社区与公开动态统计。

不删除社区数据库，也不影响示例主体记餐照片、本地收藏、示例主体菜谱和库存。重新开放需同步恢复客户端入口与服务端策略。

## 验证范围

- FastAPI 网关既有单测与私网真实模型调用通过。
- 业务 API 真实登录鉴权、发送同意、长度限制、字段限制、模型回复及三条目录引用通过；测试账号已注销。
- 回归验证：14 组 SQLite/真实 HTTP、8 组输入导航、9 组 AI/社区隐藏交互，5 种宽度布局。
- 后端单测覆盖示例主体库存隔离、默认不带库存、限额、Redis 故障、无业务写入和模型降级。
- 鸿蒙 ArkTS 编译与安卓 APK 构建、APK v2/v3 签名校验通过。
- Android 无窗口模拟器在 180 秒启动预算内仍为 offline，监控停止本任务模拟器；峰值物理占用约 774 MiB，无强制放宽内存保护。没有真机摄像头、鸿蒙运行界面或设备端 GPU 验收。

验证报告位于 `work/reports/assistant-*.json`。`work/screenshots/assistant-android-host.png` 是宿主测试适配器截图，回复为模拟数据，用于布局验证。
