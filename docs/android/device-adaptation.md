# Android 0.9.21 / 39 适配修复

## 布局与逻辑

- 横向筛选按钮不参与收缩，完整保留分类名称；超宽内容留在筛选条内横向滑动，各按钮至少44px高。库存和其他共用筛选条一起生效。
- 库存入口按容器宽度和rem阈值自动切换单/双列，图标、文案、箭头分别占位，不再出现箭头单独换行。
- 库存标题与新增入口使用两列，搜索框与查找按钮使用独立网格。窄屏排序独占一行，批量管理与扫码各占一列，宽屏可并排。
- 矮窗口标题随内容滚动，避免横屏时占据过多阅读区域。
- WebView明确启用viewport规则并关闭overview缩小；保留系统字体缩放与已有原生insets处理。
- visualViewport变化使用窗口宽度和屏幕方向重置键盘判断基线，失去编辑焦点时恢复底栏，防止分屏/旋转后的过期状态残留。

## 验证

`node scripts/android/test-ui.cjs --responsive-only`：36路由×14视口/rem缩放=504组；另8种视口×4文字比例=32组库存测试。专项覆盖320/360/393/412/480/768/844/600宽度，100%/130%/160%/200%全元素文字模拟，检查按钮文字边界、横向末项可达、操作区域不重叠、页面无横向溢出、底栏留白，并实际点击筛选、排序与批量管理。rem测试与全元素文字模拟均为宿主Chromium，不能等同Android WebView原生textZoom。

隐私入口回归通过。debug与非debuggable release均构建并验签，正式包证书SHA256保持 `c5508b8e5cb4447b7862cc3b373843d597fc25a71a611f4a70f0a0882a0f3df5`。核对APK内style.css/parity.js/polish.js/index.html与源文件一致。

报告：`work/reports/android-responsive-tests.json`、`work/reports/android-adaptation-release.json`。确认截图：`work/screenshots/android-host-pantry-adaptation-360-1.png`、`work/screenshots/android-host-pantry-adaptation-320-2.png`，清单在 `work/artifacts.json`。

当前adb无设备。待真机验证：Android 8–16系统WebView、系统字号/显示大小、刘海/挖孔横屏、手势/三键导航、软键盘弹收、分屏与折叠屏窗口切换。悬浮小怪仍为可拖动/长按收起的覆盖式控件，尚未实现通用控件避让，不将其标为已解决。

未新建整项目备份或美术候选；构建清理自身包装中间文件，不清理其他任务文件。
