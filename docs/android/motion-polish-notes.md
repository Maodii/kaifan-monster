# Android 0.6.0 动效与紧凑布局交付记录

正式APK已更新为0.6.0/code12，47,830,852字节。主端冻结Index：`7c99295e818ebd2604241865e6beb1a14be72705a0414caa4827450b2fd00e6b`。APK SHA256：`565cebbf7345c64f7aaa972c847cfb6619c0a7f0f158260b65ae1d591f0e0fdc`；core SHA256：`6de354625901c1c482c3f1459009a89b14108be11c579ced4dc64e6aea1625a2`。已同步冻结源文件生成共享core并完成打包，主端独立双包复核已通过（2026-11-09 10:10:59+08:00），报告work/reports/motion-polish-dual-release.json。

## 已落实的具体修改

1. 原版小怪图片、标题与短标语组成开屏揭幕层。
2. 首次页面就绪即240ms淡出，不增加强制等待。
3. core加载之前设置1800ms看门狗，脚本失败也会移除遮层。
4. CSS独立隐藏截止时间，遮层不拦截指针。
5. 小怪208px中心入场280ms、延后220ms交接，复用原版纸纹、双色笔触、品牌标题和三色点；不等待动画再加载首页。
6. 删除每次innerHTML重绘都会触发的main CSS动画。
7. 实际路由标识变化才播放从0.86透明度开始的220ms过渡；表单更新不重播。
8. 根据返回、历史栈与主导航顺序判断动画方向。
9. 标题单独横移10px，main不做transform，保持固定操作栏位置。
10. 四个固定动画槽替换旧效果，快速导航取消前次作业。
11. 动画完成或超时均移除效果和定时器，不保留fill效果。
12. 重绘前取消脱离文档节点上的效果。
13. 原生后台通知清理动画；pageshow不能绕过原生后台状态。
14. pagehide清理、恢复时不重播；旋转/resize也清理效果。
15. 应用减少动画及系统偏好变化即时取消，并阻止后续启动。
16. 收藏、筛选、评分等仅对操作目标提供140ms反馈。
17. 用户展开details播放160ms内容淡入；重绘恢复展开状态不重播。
18. animate API不可用或抛错时立即显示正常界面。
19. 蒸汽装饰由无限循环改为两次。
20. 月历前后按钮与日期使用紧凑三列排版。
21. 筛选工具栏采用内容与操作两列，同排对齐。
22. 菜谱次级操作四列；极窄屏降为两列。
23. 记餐照片操作缩小间隙和内边距。
24. 抽菜标题同排对齐；头像选择缩小空隙。
25. 社区应用与重置操作同排对齐。
26. theme-color与现有奶油色页面统一。

筛选11组继续不显示勾号和复选框，保留选中态和可访问语义；未修改正式图片、业务模型和本机数据。

## 验证与边界

全部在本轮最终core下重新执行，报告绑定实际包内文件，没有复用旧报告重绑哈希。

|验证|结果|报告|
|---|---|---|
|共享核心|14组，另next20 8组、next10 7组、living9组，共38组|work/reports/android-core-tests.json，android-next20-tests.json，android-next10-tests.json，android-living-tests.json|
|原生Java加密互通|6组|work/reports/android-backup-crypto-tests.json|
|界面与响应式|59组，504个几何用例|work/reports/android-ui-tests.json|
|精修控件与走查|19控件，75场景|work/reports/android-pixel-polish.json|
|有限动效|16项，含40次快速导航、失败core、animate抛错、表单焦点/详情恢复、后台与减少动画、11组无勾筛选|work/reports/android-motion.json|
|底纹对比|5组新采样全部p05≥4.5|work/reports/android-brush-contrast.json|
|实际APK|15组，含签名、547媒体/454封面/图标/字体字节、最终core和呈现层哈希|work/reports/android-release.json|

修改源码：android/web/index.html、app.js、experience.js、style.css，AndroidManifest.xml版本与原生styles.xml背景色；测试：test-ui.cjs、check-motion.cjs、verify-release.py和audit-brush-contrast.py。没有修改client/backend。响应式和本机数据功能保持回归通过。

预览：work/reports/android-motion-preview.webm，Playwright实际浏览器录制启动、切页与折叠；元数据work/reports/android-motion-preview.json。不代表Android设备帧率。代表截图work/screenshots/android-host-motion-recipes.png，capture_tool=playwright，已登记work/artifacts.json。

旧包版本审计work/reports/android-version-audit.json只说明被替换前的0.5.0包情况，不作为0.6.0验证依据。生成的失败候选与整项目备份均未创建；已删除本轮被最终证据替代的草稿报告和确认截图，未清理正式或未知用途美术。

以上为宿主Chromium、SQLite桥和包字节验证。没有执行Android真机安装、桌面显示、两端逐页像素一致或稳定性验收，不能声称“完全一样”。主端最后独立双包核验已通过；真机、帧率与长时稳定性边界保持不变。
