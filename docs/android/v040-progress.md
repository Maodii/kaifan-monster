# Android 0.4.0 交付与验证

本文记录0.4.0/code6阶段验证；当前唯一APK已升级为0.4.1，见v041-progress.md。未覆盖或改动鸿蒙HAP。

- APK：outputs/kaifan-monster-android-debug.apk
- 字节：46314753
- SHA256：edf0c80de987a41fcb850a51a2fe6d8d9a9738d5970be60f2d54144910815511
- Index参考：e8eb4b72fd72037600a7d95f4acdca87692dde3c3f3e787e8af7767790a83367
- 32个共享模块源指纹与实际包内匹配；8份页面文件与测试及包内字节匹配。
- 543媒体、454封面、正式launcher和字体逐字节匹配。

| 本轮方向 | Android实际接入与证据 |
| --- | --- |
| 真机体验闭环 | adb无连接设备；没有启动模拟器，安装/离线重启/媒体/通知/字体缩放待真机 |
| 双端页面一致 | 按冻结Index接实际入口和行为；宿主窄屏走查通过，尚无双端设备像素验收 |
| 烹饪执行 | 当前材料/火候/熟度、完成切换、步骤/备料重载恢复、边界禁用和多计时就地停止 |
| 临期库存与周计划 | 共享suggestWeek草案，预览/取消无写入，采用CAS、调整换菜、采购预算重算；日期餐次人数重绘保持一致，修改参数作废草案 |
| 剩菜分装与分次处理 | 保存记餐展开安排剩菜，容器/冷藏冷冻/手动截止，部分吃/弃、事件历史、原餐关联，食用零重复花费与库存操作 |
| 菜谱试做 | 真实用户最新公开自报汇总，明确非认证，排除演示等由服务端契约验证 |
| 加密备份与误删恢复 | 默认开启密码加密（明文需显式关闭），原生JCA信封，密码确认/立即清除，解密预览/冲突选择/明确确认，本机修订与账号守卫，传入共享importData第三参快照在事务内校验；回收站新ID恢复和清空确认 |
| 常去店铺与套餐 | 餐馆/食堂/外卖/外食聚合，示例主体实付和估算分列，复用为可编辑草稿并保留分摊配送优惠 |
| 营养周趋势 | 近七天已填部分/未知餐数/包装标签与其他来源，零是已知而空白不是零 |
| 社区检索与经验 | 菜谱/地区/成功或需改进/真实演示，草稿应用才请求，重置清游标，所有分页沿用完整条件，迟到响应账号隔离；原有收藏心得保留 |

55组宿主UI、14核心、8next20、7next10、9living、6生产Java JCA/Node加密互通均通过；12组release验证绑定当前APK。报告在work/reports/android-{ui,core,next20,next10,living,backup-crypto}-tests.json与android-release.json。宿主使用实际SQLite桥接；不代表Android WebView/SAF/闹钟/加密提供器设备验收，也不代表Harmony原生加密实际互通已执行。

新界面确认截图在work/screenshots/android-host-{weekly-draft,leftovers,dining-places,nutrition-week,trash,backup-preview,community-filters,trial-evidence}.png，实际capture_tool=playwright，登记于work/artifacts.json。不是设备截图。最终正式截图替代本轮android-source候选截图，不重复保留。

剩余验收：实际设备安装与显示、照片和通知/计时器/桌面小组件、TalkBack/大字号、两端逐页视觉和动画、启动滚动与内存实测。不得把旧包或仅源码修改称为完整同步交付；目前版本和已列页面行为已同步，完整视觉一致仍待验收。
