# Android 0.4.2 正式资源与手账界面

唯一正式APK：outputs/kaifan-monster-android-debug.apk，0.4.2/code8，47216011字节。

SHA256：f9a9cf37119a36f24e76205a91eec2e07ee07abc3d6ed9228df70ab8fd6d6efe

冻结Index参考：0b3d2ed898431f42c9e7548c5c8b6fbc26ed577a9d5e19a448260610fd9bf99e

- 旧交付APK曾停留0.4.1/code7；本次从冻结源码重新生成32模块、构建签名并覆盖唯一正式APK。
- 所有544个正式媒体文件、454封面映射、共享字体与桌面图标逐字节匹配包内内容。正式table_collage透明拼贴已接入。
- 11个筛选分组无勾号/复选框，选中状态、居中和取消草稿行为均回归。
- 米白纸张、番茄红/绿/靛蓝/麦黄层次；装饰胶带不影响点击。菜谱390×844首屏名称/时间/价格均在底部导航上方；首图176px，320屏160px。
- 七设置行55px，三种纸色；快捷记餐位于三餐与抽菜内容之后。保留独立搜索、再吃一次和高级外食地点。

验证：59组宿主UI、38组共享核心/SQLite、6组生产Java加密互通源指纹及12组release通过。UI含7页面×320/390/768宽度截图、无横向溢出、排序/菜谱/记餐/设置真实点击；报告绑定实际包内core和9页面源文件。本轮测试均重新执行，无旧报告引用重绑定。

最终截图work/screenshots/android-host-art-*已用Playwright登记work/artifacts.json；替换并清理21张本轮废弃source-art截图与开发报告。保留单份APK与原HAP，无整项目备份。

这些是宿主Chromium证据；尚无Android设备安装/WebView/桌面截图或完整逐像素双端验收，不能声称完全一样。独立主线程复核通过，报告work/reports/art-refresh-dual-release.json；双包0.4.2/code8、冻结Index、32模型与544媒体已核对。
