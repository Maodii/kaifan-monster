# 开饭小怪 

[开发者接入、快速配置与测试服务申请](docs/developer-access.md)

当前测试版本 **0.9.10 / code28**。首页左上角小怪直接打开对话，移除旧入口卡片；各业务页面加入可拖动吸边、长按互动的侧边伙伴。对话以虚化背景浮层展开，关闭保留原页面和未保存表单，推荐菜仍可跳转真实做法。新增四张蜡笔动作，合计十姿态；退后台与减少动态效果时停止侧边动作计时。新增长按动作菜单、暂时收起与首页唤回、输入避让、顶部下拉收起和开关过渡。本轮细化姿态双图过渡、拖动倾斜与落位反馈，修正下拉退场突跳，并降低待机动作频率。本次修正鸿蒙云端测试连接入口；设备转发见 [AI 测试连接](docs/ai-test-connection.md)。本次将对话按钮改为明确文字，并统一流式、历史与完整回复的 Markdown 排版；见 [控件与文字排版](docs/ai-readable-controls-v0910.md)。社区保持隐藏。

新增 20 组伙伴宿主交互、6 组共享边界、51 组 AI 交互回归通过；双端编译及交付包另有核验。说明见 [侧边伙伴交付](docs/ai-companion-v098.md)、[验收索引](work/reports/ai-companion-acceptance.json)。宿主截图、键盘模拟和性能数值不等同真机验收。

当前鸿蒙商店准备版 **0.9.17 / code35**：[正式签名 APP](outputs/kaifan-monster-harmony-release.app)、[签名 HAP](outputs/kaifan-monster-harmony-release.hap)、[提审材料与待补事项](outputs/harmony-store/index.html)。AI 已通过公网可信 HTTPS 实际问答验证；3D 和社区入口隐藏。隐私授权、撤回及本机模式已通过鸿蒙模拟器验收，真机和平板仍待验收。旧未签名调试 HAP 已由正式发布包替代并清理；重新调试请按下文构建。Android 仍保留独立的[调试 APK](outputs/kaifan-monster-android-debug.apk)。

HarmonyOS NEXT 原生 ArkTS 客户端 + Android 原生容器/共享业务与 Web UI + NestJS/TypeScript 服务端。核心业务使用本地数据库，云端增强同步、私有照片和可选 AI；做饭与外食各有推荐偏好，今日记录共用。

## 工程

| 路径 | 内容 |
|---|---|
| client/ | 原生Stage工程、ArkUI、RDB、Preferences、Scan Kit、系统媒体选择、AssetStore、提醒与ArkTS卡片 |
| backend/src/ | 鉴权/设备/家庭、变更日志同步、目录、确定性推荐、统计、私有照片、社区 |
| backend/admin/ | 管理员审核工作台，不属于客户端WebView |
| backend/migrations/ | 幂等SQL迁移，保留所需业务表及索引 |
| art-source/ | 正式插画原图与详细提示词；应用只打包压缩后的实际资源 |
| scripts/ | 环境、启动、镜像构建及无窗口设备验收工具 |
| docs/ | [原始需求](docs/requirements.md)、[计划](docs/plan.md)、[API](docs/api.md)、[原生路由](docs/routes.md)、[部署](docs/deployment.md)、[美术与交互](docs/design.md) |
| outputs/ | 当前Android APK、鸿蒙正式签名 APP/HAP与提审材料；覆盖交付路径、不累积版本 |
| work/ | 唯一任务状态、验证报告、确认截图及素材清单 |

## 本机环境

已安装并验证 DevEco Studio 26.0.0.865 ARM、HarmonyOS SDK26.0.0.105、JBR25、Hvigor6.26.9、ohpm26、hdc3.2；客户端使用DevEco配套Node24.14，后端复用系统Node24.16。Colima Linux ARM64运行Docker，PostgreSQL17、Redis7.4、MinIO和Nest API已本机启动。

基础系统Kit不需要另装第三方UI插件。客户端原生工程编译：

```sh
source scripts/harmony-env.sh
cd client
hvigorw --mode module -p product=default assembleHap --no-daemon
```

产物位于 `client/entry/build/default/outputs/default/entry-default-unsigned.hap`。本任务ARM64模拟器已实际安装运行；真机安装需要用户在DevEco配置账号、设备和签名。

## 后端启动

已有 `.env` 包含随机凭据，不要覆盖；新机器参考 `.env.example` 创建自己的配置。

```sh
colima start
sh scripts/run-local.sh
```

一条命令构建并启动API、PostgreSQL、Redis、MinIO，自动迁移数据库并创建私有照片桶。本次容器API验证端口为3001，开发进程3000；新启动可用 `API_PORT=3001 sh scripts/run-local.sh` 避免端口冲突。

开发方式：

```sh
npm ci --prefix backend
npm --prefix backend run migrate
npm --prefix backend start
```

健康地址 `http://127.0.0.1:3000/api/v1/health`；Swagger `/api/docs`；管理员 `/admin/`。原生客户端支持HTTPS服务地址；本地测试仅额外允许带明确端口的localhost/127.0.0.1 HTTP地址，生产TLS和对象域名方案见部署文档。所有私有API均校验JWT及当前设备状态，用户和设备身份取自鉴权信息。

## 已实现的核心流程

底栏为今日、菜谱、记餐、食库、我的；采购收进食库。今日统一汇总所有用餐方式，设置可分别配置做饭与外食推荐偏好，菜谱默认先展示完整做法，数量/来源按需展开。20项体验改进见[ux-20.md](docs/ux-20.md)。

- 点选食材模板/扫码辅助 → 可编辑数量、位置、日期 → 主动确认保存本机；支持部分消耗、归档、丢弃、批量整理。
- 库存 → 临期优先确定性推荐 → 缺材清单确认采购 → 分步教程/实际用量 → 确认制作 → 原子扣减并生成私有用餐记录。
- 手动用餐记录、系统照片选择/相机入口、本机原图与压缩图、待上传队列、私有对象直传及删除队列。
- 自定义菜谱、收藏、用餐日周月估算、CSV、采购文本与JSON备份；导入冲突由用户选择。
- 注册/登录、昵称、头像、34地区选择和饮食目标、资料版本冲突保护；450道扩展菜谱与4道原有菜谱支持离线地区/分类筛选及人数/食量/口味分量预览。数据库结构见[database.md](docs/database.md)。
- 可选账号、多设备、家庭空间、手动/前台Wi-Fi自动同步、两端对照与逐字段冲突合并；公开分享二次确认并进入审核。
- 纸纹背景、透明手绘头像、餐桌横幅、细线导航和系统无衬线字体、自定义确认面板与固定保存栏。图片为开发阶段制作的静态本地资源，应用运行不调用图片生成服务。

相机硬件、通知触达、桌面卡片实例、真实HTTPS多设备联调仍需按验收表逐项验证，不能只凭编译通过认定完成。

## 测试

```sh
npm --prefix backend run typecheck
npm --prefix backend run check:services
npm --prefix backend run test:integration
cd backend && node --import tsx test/rules.test.ts
```

无窗口模拟器原生交互测试：`python3 scripts/native-smoke.py`。该脚本只控制本任务 `127.0.0.1:5555` 模拟器，使用测试食材检查，不控制Mac桌面。测试预期本任务模拟器已有验收样例（14个鸡蛋、2盒牛奶及一次蒸蛋用餐），不适用于用户真机数据。

## 数据与空间

默认不登录、不公开、不自动修改库存。金额区分实付与估算，未知热量不按零计算。对象二进制不进入数据库或服务端本地目录；令牌使用AssetStore，账户记录绑定，冲突不盲目覆盖。回环端口仅供本机开发；照片公网访问使用短时签名。

不创建整项目检查点，不自动初始化/提交Git，不复制依赖与构建缓存。进度只维护 `work/task-state.json`；截图登记在 `work/artifacts.json`，只清理本任务已核实废弃的文件。Docker持久卷不是临时文件，勿执行 `down -v`。

本轮整改测试包已更新，资源核验及原生待验范围见[整改验收](docs/remediation-acceptance.md)和[发布报告](work/reports/remediation-release.json)。

管理端已扩展为六模块本地工作台：访问 http://127.0.0.1:3001/admin/ ，账号见 [本地管理凭据](outputs/admin-access.md)。[管理端说明与验收](docs/admin-console.md) · [后续开发方向](docs/development-roadmap.md)。
