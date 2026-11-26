# Android 0.4.1 搜索与地点调整

唯一正式APK：outputs/kaifan-monster-android-debug.apk，0.4.1/code7，46323007字节。

SHA256：42c7f191470bc8cb1ca83c21cf61d4cef113c4a9ab826e84bf39dd53b39866fc

冻结Index参考：d1615a5c206ec692d3285c7af1c5c534a65db8d6a9efcee6307cd7f096dc8a57

- 首页、记餐、食材、统计、计划和我的等页面无全局搜索入口。仅菜谱和社区有各自入口，88%居中、max-width480px，关键词单行省略；独立搜索页输入同样缩窄居中。
- recipe-search使用菜谱输入、菜谱搜索记录/热榜、菜谱结果标签，返回菜谱库。
- community-search使用独立社区关键词、帖子数组、q游标和返回路径。与scope/recipeId/region/outcome/data组合，不改原feed，不写菜谱历史或热度。新关键词清游标，改变原分区/筛选后重进清旧结果；账号切换清状态，迟到响应检查owner/request/page。帖子返回搜索保留结果，搜索返回广场。
- 最近吃过卡片副标题固定“再吃一次”，不展示地点或用餐方式。缺失/null/字面undefined的旧记录已覆盖。
- 仅餐馆/食堂/外卖/兼容外食显示折叠“高级详情 · 店铺（可选）”。在家做无地点输入，切换与保存不清除已有地点。外食常去店铺聚合功能保留。

58组宿主UI通过，包含实际点击、搜索结果与历史/feed隔离、分页与返回、迟到响应/账号reset、390和1024宽度测量、旧记录缺字段及隐藏地点回显保存。社区q在UI测试使用请求stand-in；后端真实API由主对话单独7组验证。14core+8next20+7next10+9living共38组核心/SQLite检查通过，报告绑定最终包内core。6组生产Java加密互通报告源指纹仍匹配，默认加密保持开启。

12组release通过：32共享模块源指纹、9份测试页面文件、543媒体/454封面、正式launcher/共享字体和最终Index参考均与实际APK一致。仍无Android安装、WebView/SAF/通知/字体缩放或全像素一致声明；没有启动模拟器。

正式确认截图（capture_tool=playwright，已登记work/artifacts.json）：

- work/screenshots/android-host-recipe-search-entry.png
- work/screenshots/android-host-community-search-results.png
- work/screenshots/android-host-home-recent-meals.png
- work/screenshots/android-host-home-meal-no-place.png
- work/screenshots/android-host-dining-place-advanced.png

已确认最终同名截图与报告依赖后清理21张本轮android-source开发截图和过时开发报告。保留单份APK，无额外整项目副本、检查点或中间APK。

最终鸿蒙原生宽度修复后的引用更新：Android仍保持实测88%/480px布局。仅生成core.js中的Index参考字符串变化，逐字节重建旧核心与原执行hash一致；重新封装签名时其他APK条目全部哈希保持一致。未重跑58UI/38core，报告保留原executed_core_sha256及引用更新证明；12组release重新通过。证明：work/reports/android-reference-rebind.json。
