# 开饭小怪：鸿蒙 / Android 协作约定

## 用户授权与目标

用户要求完整适配开发双端，并于 2026-11-05 明确要求把 Android 开发放到本项目其他专门对话，平时同步。Android 应交付可安装测试 APK，逐项对齐鸿蒙当前功能；不能以网页演示、静态页面或可编译空壳当作完成。

主对话「部署食库开发环境」：`01a19f30-f4fc-7823-8b17-045904cf2911`，负责鸿蒙 `client/`、共享后端及双端契约。
Android 专门对话「开饭小怪 Android 双端适配」：`01a1aaca-21e4-7ce1-8af6-0d724ffed010`。

Android 专门对话负责 `android/`、`scripts/android/`、Android 测试及报告。两者共用当前目录，不拷贝整个工程、不初始化或提交 Git。

## 同步与写入边界

- 后端 API、实体 JSON、稳定菜谱 ID、金额单位与份量规则保持兼容；增量变化先记录在本文件，并通过用户已授权的对话消息告知对方。
- Android 日常进度仅更新 `work/android-status.json`；主对话维护 `work/task-state.json`，避免互相覆盖。
- Android 独有文档与测试放 `docs/android/`、`work/reports/android-*`。正式 APK 单份覆盖至 `outputs/kaifan-monster-android-debug.apk`，不得覆盖鸿蒙 HAP。
- 需要改 `backend/` 或鸿蒙共享核心时，先将具体兼容方案告知主对话再协调，避免并发覆盖。可只读、导入、生成构建时的可移植核心；不得对用户已有修改 reset/clean。
- 功能里程碑、接口变更、真实阻碍或最终交付时同步主对话，不把每次构建日志都发给用户。没有常驻监控、定时任务或跨对话永久自动同步的假设。

## 当前基础与验收基线

详见 `docs/optimization-20-acceptance.md`、`docs/routes.md`、`docs/api.md`、`docs/database.md`、`work/iteration-20-scope.md`。现有 ArkTS `Models.ets`、`LocalStore.ets`、`RecommendationCore.ets` 等包含可复用的模型、事务业务和离线算法。不能另写一个明显弱化的推荐器宣称双端一致。

454 道内置菜谱（450 扩展 + 4 基础），封面为稳定 ID 各一张。正式图片：`client/entry/src/main/resources/base/media/`；菜谱：`client/entry/src/main/resources/rawfile/recipes.json` 和 `backend/data/recipes.json`。原图清单 `art-source/recipe-covers/manifest.json`。构建可从原位置打包，不长期另复制全套资源。

本机 API：`http://127.0.0.1:3000/api/v1` 与 `http://127.0.0.1:3001/api/v1`；Android 模拟器宿主地址与真机网络需单独适配，不能在 APK 内把 127.0.0.1 当作开发 Mac。保持 HTTPS 默认，测试连接策略明确。管理员不是用户默认登录身份。不要打印 `.env` 或会话密钥。

测试覆盖本地 SQLite、同步 outbox/冲突/账号隔离、照片、家庭、社区、目录更新、推荐/份量与营养；相机、通知、亮屏、桌面组件、手势返回与横竖屏需 Android 平台实际适配。无设备时明确写未验证，不生成伪装设备截图。

## 环境交接

已安装 `/Applications/Android Studio.app`，其 JBR 位于 `Contents/jbr/Contents/Home`。初检无 `~/Library/Android/sdk` 与 `~/.gradle`，不要只凭 IDE 存在认为 SDK 可用。

官方下载包已下载：`work/downloads/android-commandline.zip`，来源 `https://dl.google.com/android/repository/commandlinetools-mac-13114758_latest.zip`，下载完成日志 `work/reports/android-sdk-download.log`。接手先核对完整性和官方校验，再安装所需最少 SDK。不要重复下载或重新安装 IDE。

目前 `android/` 及 `scripts/android/` 只创建了空目录，尚无应用实现、构建配置或任何 APK。架构选择未锁定，应根据完整原生能力、可维护性和可验证性决定；若使用混合界面须透明说明，并实现系统适配和真实持久化，不能包装旧预览充数。

用户要求后台运行、不抢焦点、不打开 IDE/浏览器窗口。主机曾内存压力高且模拟器导致不适，启动任何模拟器前先检查主机压力，不同时启动双端模拟器。不关闭其他项目进程。加载 long-run-diagnostics 处理耗时任务，但用户禁止整项目检查点/反复备份；只保留轻量状态。

截图仅 `work/screenshots/`，生成美术候选仅 `work/generated-art/`，登记 `work/artifacts.json`。未知用途原图保留。任务结束只清理本任务确认废弃的产物。

## 下一轮兼容扩展（2026-11-05）

此节更新前述初始空工程的历史状态：目前 Android 已有测试 APK，仍不表示逐页或设备验收完成。当前结果以 `work/android-status.json` 为准。

- 新增 `GET/PUT /api/v1/account/workspace`，独立 `baseVersion` CAS；payload format=1，plans、preferences。既有六类同步实体与游标不变。比较用 `workspaceSignature`，不能依赖 JSONB 对象键序。
- Food 可选 `openedAt/openedExpiry`，未开封为空串；有效到期取原/开封到期较早者，推荐、筛选、扣减共用。
- Meal 可选 `financeFood/deliveryFee/discount/splitPeople/personalShares/mealTotal/personalCost`；金额为元、计算用分，示例主体份额向下取分，余数留其他人。已知 financeFood 时服务端核对合计及示例主体份额，旧记录兼容。
- Meal 可选 `sourceMealId/leftoverPortions/trialOutcome/actualMinutes/trialSubstitution/trialFailure`。试做结果为未评价/成功/需改进，分钟≤2880，剩菜份数≤100。公共内容不泄露新私人费用字段。
- MealPlan 的 mode=吃剩菜 不扩展 Meal.diningMode 枚举。recordLeftoverPlan 生成在家做+剩菜标签、关联原餐、零重复费用、不扣库存，并原子完成计划；相同 plan.id 作 meal.id 防止重开计划后重复记餐。
- 家庭档案合并参与者硬忌口；人数采用参与者数，平均食量为成人份总和/人数、限制0.5–1.5。用户先预览再应用。
- DELETE /catalog/recommendations/events/latest 同时匹配 recipeId/intent/action，仅撤销相应最近反馈。
- 本轮服务核验 work/reports/next20-services.json，19套回归汇总 work/reports/next20-tests.json。设备未验证不得由宿主测试替代。

## 0.3.0 下一轮10项共享契约

新增WorkspaceMergeCore/ConvenienceCore，目前31个共享模块。`workspaceMergeRows(local,remote,base|null)`以plan UUID、收藏夹/筛选名称、成员ID和普通偏好键分项比较，重复键拒绝；同项双端改变须明确选择，空值表示删除。`mergedWorkspace(rows)`生成旧format=1 payload，Cloud.mergeWorkspace保持CAS与本地完整签名检查。`workspaceMergeSummary(row,side,recipes=[])`供可读差异展示，不能用原始JSON代替用户界面。

`LocalStore.purchasePartial(shoppingId,food,expectedSnapshot)` 第三参是打开页面时的JSON.stringify(shopping)完整快照。相同毫秒的改动也必须拒绝；同名、兼容单位、相同家庭范围，超买拒绝。保存实购批次与outbox，并将余量留在原待购项；买齐才purchased=true。替换品独立录入，不自动猜测。

`EnergyPortion{referenceKcal,fraction,source}`经consumedEnergy计算实际值；Meal.energyReference=-1/consumedFraction=1向后兼容，calories存实际摄入。`TemporarySkip{recipeId,intent,until}`保存在账号本机temporarySkips:v1，至本地午夜过期，不发学习事件、不进入云端工作区。

DrawOptions新增timeMode=sequential/parallel、balance=false；默认兼容原来逐道行为。parallel用cookTimeline，balance至少两道菜时要求有肉类和非肉菜（启发式），不突破预算/时间/忌口。新模式不表示熟度或营养自动认证。

两端0.3.0/versionCode5。共用正式logo、菜图和插图，Android为独立混合UI+原生桥；source/package一致不等于设备逐像素一致。

## 0.4.0 日常使用强化契约

本轮独立范围 `docs/daily10-scope.md`，当前验收 `docs/daily10-acceptance.md`。两端目标0.4.0/versionCode6，必须重新生成/构建实际页面，不得只更新参考指纹、版本文本后沿用旧APK。

- `DailyLivingCore`：`suggestWeek`只提草案，保留已有餐次、硬忌口、不重复菜品/菜组，临期排序；`nutritionWeek`七天统计区分未知与真0；`diningPlaces`兼容餐馆/食堂/外卖/外食并使用示例主体费用。
- `LocalStore.applySuggestedWeek(plans,expectedPlansJSON)`、`replacePlannedRecipe(id,recipeId,expectedPlanJSON)`在事务中检查快照；不删除已购库存，采购和预算基于最新计划重新计算。
- `LocalStore.state.leftovers`账号本机批次，`saveLeftover/useLeftover`支持容器/冷藏冷冻/手动截止/份数流水；useLeftover同事务生成零重复花费用餐，不重复扣原料。暂不属于云端同步实体，通过用户选择的备份迁移。
- `state.trash`仅显式删除的库存/采购/记餐/私房菜，30条/30天；`restoreTrash`新私有ID/version0，保留原ID删除记录；`clearTrash`不清其他数据。
- `EncryptedBackup.encryptBackup/decryptBackup`按database.md相同标准协议；Harmony CryptoFramework、Android原生JCA；不把Harmony crypto模块直接转译到Web。错误密码/损坏/非法参数在调用importData前失败；密码不持久化。明文备份需显式关闭加密。
- 社区条件及试做证据按api.md：游标绑定条件；分开草稿与应用条件。试做统计是用户自报，排除演示，不称实测认证。
- Android需实际实现新页面leftovers/trash/dining-places及七日草案/换菜/营养/社区筛选入口，维持独立混合UI与系统桥的真实边界。
