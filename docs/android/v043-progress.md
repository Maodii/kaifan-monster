# Android 0.4.3 响应式修复

唯一APK：outputs/kaifan-monster-android-debug.apk，0.4.3/code9，47220303字节。

SHA256：e039c4f74c4af54d3c5d752f7b6899335324bb95e370e65735696d291b00c1b4

冻结Index：dfda2be363fae370099d9a1c88d58982d0d81997cd590c1ee4a7aa160887620a

本轮修复对象是压缩、裁切和比例问题，不再以首屏塞入全部内容为约束。

- 根因：Fixed55px settings and44/48px controls could not grow with text。修复：auto height with minimum touch height and multiline labels。
- 根因：Meal/header/action flex rows forced nowrap and allowed intrinsic minimums to compete。修复：min-width0, bounded children, wrap actions and metadata, long names break naturally。
- 根因：Artwork had independently fixed width/height boxes and a fixed cooking-scene wrapper。修复：intrinsic image aspect ratio, height auto, bounded widths, growing scene wrapper; no raster regenerated。
- 根因：Pixel font sizes plus fixed line heights made font scaling inconsistent。修复：rem typography and unitless line heights for text layouts; native existing textZoom preserved。
- 根因：Static bottom padding and sticky long toolbars assumed short labels。修复：ResizeObserver measures nav/action/header; safe area and measured clearance; header over25percent viewport flows with page。
- 根因：Small-screen art and body competed in two fixed columns。修复：single column through430px; bounded reading width780px and flexible tablet/landscape grids。

保留88%/max480px独立菜谱/社区搜索入口，正文搜索结果标题可换行；11筛选分组无勾/checkbox。未改client/backend或32业务模型，544正式媒体/454封面/桌面图标/字体逐字节匹配APK。

验证：59组宿主UI，含36页面×14场景=504组合；320/360/390/430/768/1024各1和1.3倍文字，另844×390横屏各1和1.3倍。实测图片content-box与naturalWidth/naturalHeight误差不超过2.5%，长标题/食材/记餐/帖子与标签、文字边界、金额/元数据互不遮挡、底部留白和780px阅读上限。超过屏幕25%的长标题工具栏进入文档流。长菜名夹具通过显式首卡断言确认已渲染，测试数据仅内存、无SQLite写入。

另有38组核心/真实宿主SQLite与6组Java加密互通通过，12组release核对实际包、全部页面文件和504条结果及测试脚本指纹。证据：work/reports/android-responsive-layout.json及android-ui-tests.json的responsive字段。

本轮仅4张新增响应式代表视口截图：work/screenshots/android-host-responsive-*（Playwright登记work/artifacts.json），不为504组合逐一截图。已有行为截图按同名更新；确认正式替换后清理25张本任务source截图和开发报告。保留唯一APK、原HAP，无模拟器、前置窗口或全量备份。

限制：文字缩放为宿主Chromium中rem文字放大近似，不能替代原生WebView textZoom、设备字体/状态栏/安全区和真实安装验证；不声明双端逐像素相同。最终主线程独立双包复核通过：work/reports/responsive-dual-release.json；APK/HAP、冻结Index、32共享模块和504条零失败结果已核验。Android真机视觉限制仍保留。
