# Android 0.7.1 对齐与验证

2026-11-11；Android版本0.7.1/code16，鸿蒙现有包保持0.7.0/code15。此轮是Android平台兼容和交互修正，不声称全量像素一致。实际APK：`outputs/kaifan-monster-android-debug.apk`，调试签名。

## 本轮改动

1. 主页面按今日→菜谱→记餐→食材→我的左右滑动，与鸿蒙顺序一致，首尾不循环。
2. 输入框、按钮、表单、横向条件条、3D大厅不触发全局滑动。
3. 垂直滚动、短距离、取消、多指操作和长按选中文字不触发切页；已识别手势抑制尾随误点击。
4. 保留日历翻周/月、做法步骤切换和库存行独立手势，不挤占各自操作。
5. 子页面仅左边缘右滑返回；有未保存内容时不执行全局切页。
6. 切换主导航清除过时子页面返回栈，保留标签页滚动位置。
7. 再点当前主导航回顶部，遵守系统及应用减少动画设置；导航提供当前页无障碍语义。
8. Android11起使用IME系统窗口边距；旧系统补充visualViewport检测。键盘出现时隐藏底部导航、解除保存栏固定定位，保留输入并滚动到焦点。
9. WebView渲染进程退出时提供重新打开入口，保留数据库与既有草稿；不自动清数据。
10. 防止Activity退出后向失效WebView发送结果，系统选择器无法启动时释放占用，返回键优先收起键盘。

## 验证

|项目|结果|
|---|---|
|Android Studio自带JBR、官方SDK实际编译|成功，APK v2/v3签名通过|
|共享核心、真实SQLite与云端HTTP|14组通过，临时云端账号按注销流程清理|
|完整宿主UI|59组通过，含36页面×14尺寸/文字比例的504项检查|
|定向手势/IME/返回栈|8组通过|
|原生Java备份加密互通|6组宿主检查通过|
|当前包内容、共享资源与证据哈希绑定|4组通过|

报告：`work/reports/android-parity-release.json`、`android-parity-input.json`、`android-ui-tests.json`、`android-core-tests.json`、`android-backup-crypto-tests.json`。确认截图：`work/screenshots/android-host-parity-recipes.png`（Playwright宿主浏览器，非设备截图）。

官方Android36 ARM64 ATD镜像712011575字节，SHA1与官方值`906703f87bd947048b9099b8fbf34bd8ee33c77e`一致，ZIP CRC通过；镜像已安装，`kaifan-atd-36`已创建，下载归档已移除。只保留安装后的系统镜像和单份配置。

模拟器初次启动被主机压力门槛拦截；再次短暂无窗口启动后，内存压力升高，监测器停止本任务进程组。见`work/reports/android-emulator-memory.json`。没有结束其他应用，没有获得本轮Android设备流程或帧率结论。相机实际拍摄、锁屏通知、桌面卡片、厂商省电、真实GPU和完整视觉一致性仍待设备验收。

后续本机内存允许时先运行`python3 scripts/android/safe-emulator.py`，在另一终端执行：

```sh
ANDROID_TEST_API=http://localhost:13000 ANDROID_TEST_PHOTO_PORT=19000 node scripts/android/test-device.cjs
```

上述端口需要云端SSH隧道保持连接，且测试脚本仅适用于空白、退出账号的专用测试安装。已有示例主体数据的设备不要直接运行该测试。服务器/AI由独立对话维护，本文不代表手机已完成HTTPS接入。
