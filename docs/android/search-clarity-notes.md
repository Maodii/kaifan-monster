# Android 0.6.2 搜索识别与收藏分工

按用户反馈修正0.6.1过于隐蔽的搜索按钮、重复收藏入口和突兀实心字形。绑定主端冻结Index `a5a15e8a82aab36e29555b9fc813331e5795360c446c332659293922e83dca77`，版本0.6.2/code14。

- 搜索恢复明确文案：现有放大镜图片加“搜索”，配浅纸底和细边框；保留44px最小点击区，随标题内容滚动，分别进入独立搜索页。
- 菜谱顶部只保留一个“收藏”入口，显示本机喜欢数；删除重复的爱心筛选与“更多”中的收藏夹入口。
- 收藏页统一展示“喜欢的菜”和“自建菜单”。爱心只负责喜欢/取消；菜单保留原分组、新建、重命名、批量计划、移除与删除逻辑，已有数据不迁移、不删改。
- 爱心由系统实心字符改为不规则双轮廓SVG；选中用浅陶红填色，保留描边。使用代码内矢量，无新增生成素材或外部资源。
- 详情顶部保留唯一爱心，正文去除重复爱心；分组操作改名“归入菜单”，区分喜欢和整理菜单。
- 列表局部更新继续保留DOM、排序、滚动和焦点；读屏继续说明收藏/取消、菜名及社区数量。收藏入口单独显示本机总数。

源码仅android/web/app.js、parity.js、style.css及AndroidManifest.xml版本。未修改client/backend、正式媒体或原生适配。

新执行验证：work/reports/android-search-clarity.json，18组320/390/768px ×1/1.3/2倍文字×菜谱/社区组合，以及4组交互：搜索文案/随滚动/独立搜索返回、纸感心形两态/44px/键盘/SQLite重载/取消、滚动操作DOM顺序与位置不变、单一收藏聚合页/喜欢取消移除/菜单数据不变、详情唯一心形与分组操作、版本与动效清理。

定向包检查：work/reports/android-search-clarity-release.json。保留基线work/reports/android-v062-baseline.json记录0.6.1以前报告原哈希；不把旧完整业务/全UI报告当作本轮重新执行。共享core剔除唯一版本与Index元数据行后，字节应与上一版相同；32模块、547图片、454封面、桌面图标和字体仍逐字节检查。

确认截图：work/screenshots/android-host-search-clarity-{recipes,community,selected}.png。capture_tool=playwright，已查看且登记work/artifacts.json；selected图展示实际选中后的浅陶红与未选描边对比。截图是宿主浏览器证据，非Android设备截图。

没有启动模拟器或前置窗口，没有整项目备份和重复APK。当前只有一个正式APK。Android真机、帧率与长时稳定性未验收，完整业务本轮未重跑。最终独立双包核验已通过，报告work/reports/search-hub-dual-release.json；Android设备/帧率/长时稳定性边界保持不变。

正式APK：outputs/kaifan-monster-android-debug.apk，47830852字节，SHA256 `ec448d122bc8fcc311fb89b39f64cbd678869216cc5e79ff724e0a077acf377d`。core SHA256 `c0803b393fd17f7cb3f49b88fcda18e9f750800ae4f0442f25fe411a6d37bf9b`。7组定向发布校验通过，主端独立双包核验已通过，报告work/reports/search-hub-dual-release.json。
