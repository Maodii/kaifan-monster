# Android 0.9.22 / 40 返回修复

## 原因

原生 `evaluateJavascript` 的回调拿到的是Promise对象的序列化值，而非最终布尔结果。网页返回处理在助手接入后变为async，原生仍以字符串true判断，可能错误地将Activity移入后台。

原网页右滑只接受28px左边缘；表单、控件与未保存草稿全被排除。搜索与生活工具的部分返回还直接跳固定页面，未弹出实际历史。

## 修复

- 原生通过带请求编号的 `Android.finishBack` 接收Promise最终应答，只有明确false才退出到后台；原生/Web双方去重。异常保留当前应用。
- 系统返回、网页右滑、工具栏返回共用 `requestAppBack`，保留已有弹层、助手、草稿确认等返回处理链。
- 左侧32–48 CSS px边缘可触发返回；普通详情空白/标题内容也支持右滑。表单可从边缘右滑，未保存时仍需确认。键盘开启时先收起输入。
- 方向锁定、距离阈值、多点/取消/短距离/纵向判定避免误触。筛选条、滑块、悬浮小怪拖动及库存行手势分别处理；根页面边缘右滑不会误切其他标签，应用退出仍由系统返回决定。
- 搜索与生活工具优先使用真实历史；无历史时才用默认父页。保留列表阅读位置恢复。

## 验证与边界

`node scripts/android/test-ui.cjs --back-navigation-only`：11组检查，使用Chromium CDP真实Touch输入覆盖详情、多层、根页、内容右滑、键盘、草稿确认/取消、纵向/短滑/取消、横向筛选、法律弹层、阅读位置与历史栈。提取Java中实际嵌入的JS表达式，模拟应答桥验证异步结果、重复请求去重、false/异常分支。

`node scripts/android/test-ui.cjs --parity-input-only`：8组既有标签顺序、首尾边界、手势取消、输入保护、详情返回、根页返回、标签回顶与键盘输入回归。

报告在 `work/reports/android-back-navigation.json`、`work/reports/android-parity-input.json`、`work/reports/android-back-release.json`。Android原生类通过APK构建编译；debug/release验签并逐个核对包内修改脚本。正式包保留原签名。

这些是宿主浏览器、桥模拟与构建证据。当前adb无连接设备；Android 8–16系统手势拦截、三键导航、软键盘、OEM边缘区域及预测性返回视觉仍需真机确认。没有新增跟手动画，不将浏览器触摸或桥模拟当作原生设备验收。
