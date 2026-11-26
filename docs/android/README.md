# Android 开发与安装

最新返回修复：**0.9.22/code40（2026-11-17）**。系统返回等待网页异步处理，右滑/返回按钮共用去重入口，支持详情内容右滑和表单边缘右滑，保留草稿确认与键盘优先收起；搜索、生活工具按实际历史返回。11组返回专项及8组既有手势/输入回归通过；无安卓真机连接。说明见 [back-navigation.md](back-navigation.md)。

最新适配修复：**0.9.21/code39（2026-11-17）**，修复库存入口换行、筛选文字压缩和操作区布局，完善窗口缩放后的键盘状态恢复。504组通用页面布局 + 32组库存文字缩放检查、隐私回归通过；debug/release均已重建并核对包内页面。正式包沿用原签名。报告：`work/reports/android-adaptation-release.json`；详细范围见 [device-adaptation.md](device-adaptation.md)。当前无连接设备，尚未完成原生字体缩放、刘海/挖孔、系统导航与键盘的真机验证。下文旧版本信息为历史基线。

当前正式APK为 **0.6.2/code14**：搜索按钮恢复文案，收藏入口聚合喜欢的菜与自建菜单，爱心使用双线描边与浅陶红选中态。18组定向布局与4组交互、7组包检查通过，主端独立双包核验已通过，报告work/reports/search-hub-dual-release.json。详见[search-clarity-notes.md](search-clarity-notes.md)。旧完整业务回归为保留基线，并非本轮重跑。

稳定性结论单独保留：主端45分钟被动内存观察完成且应用PID未变；长时切页压测达到保守1.8GB Emulator RSS阈值后停测，`harmony_stability_accepted=false`。这不构成性能全部通过，Android真机及逐像素视觉一致性仍未验收。

工程根：本项目 `android/`。`outputs/kaifan-monster-android-debug.apk` 是唯一正式测试APK；不覆盖鸿蒙HAP。

当前版本：0.6.2（versionCode14），绑定最终Index `a5a15e8a82aab36e29555b9fc813331e5795360c446c332659293922e83dca77`；“我的”显示 Android 0.6.2 · 14。547媒体、454封面、原版图标和字体逐字节核对。共享核心除版本与Index元数据外与上一版相同，旧业务报告保留原哈希。

本轮菜谱列表采用100px左图与右侧信息，390px正常首卡181px；抽餐条件改紧凑开关/数值行，照片操作52px，头像选择去重。5组代表性底纹颜色复合样本最低对比度均超过4.5，采样范围见android-brush-contrast.json。

## 架构

这是透明的混合实现：新写的Android专用HTML/CSS/JS界面运行在受限WebView内；没有打包旧的交互预览。32个现有ArkTS模型、推荐/份量/采购/本地事务/同步/目录核心由 `scripts/android/build-web.cjs` 构建时转译，源文件哈希在 `work/reports/android-shared-core.json`。不复制或编辑 `client/`。

Java原生能力位于 `android/app/src/main/java/com/kaifan/monster/`：

- `MainActivity`：SQLite、私有Preferences、Android Keystore AES-GCM会话加密、原生HTTP、系统Photo Picker/SAF、系统相机及照片压缩/EXIF方向、条码识别、返回/窗口insets/前后台。
- `BackupCrypto`：密码派生PBKDF2-SHA256/210000次与AES-256-GCM，兼容共享备份信封；密码不保存。
- `PhotoProvider`：只授权应用私有命名照片，不暴露任意文件路径。
- `TimerReceiver`：AlarmManager普通/精确提醒、通知权限提示、重启后恢复当前账号提醒。
- `PantryWidget`：可调整尺寸的食库/采购组合卡片；点击回应用确认，卡片不静默改库存。
- ZXing core 3.5.3：本机EAN8/EAN13/UPC-A/UPC-E照片解码，不上传条码照片；这是拍照识别，不是实时取景扫描。

访客和每个用户使用独立数据库与偏好。登录不自动吞并访客数据；可显式JSON导出/导入。切换账号取消当前应用旧系统提醒和通知，卡片更新为当前空间；账号内保留最多6个计时和一份未保存表单草稿。数据库记录与outbox仍使用原核心事务。

网络默认HTTPS，仅debug版本允许localhost、127.0.0.1、10.0.2.2的HTTP测试。TLS使用系统CA，不跳过证书检查；不跟随请求重定向。WebView只加载打包资源，禁止文件访问、混合内容和外部脚本/iframe；外链需要确认后交外部浏览器。

## 本机构建

已复用现有Android Studio的JBR及官方command-line tools，未重新下载安装IDE。SDK位于 `~/Library/Android/sdk`，使用platform android-36、build-tools 36.0.0、platform-tools。原下载包SHA-1与Google官方仓库一致：`c3e06a1959762e89167d1cbaa988605f6f7c1d24`。

```sh
scripts/android/build.sh
node scripts/android/test-core.cjs
node scripts/android/test-next20.cjs
node scripts/android/test-next10.cjs
node scripts/android/test-living.cjs
node scripts/android/test-backup-crypto.cjs
node scripts/android/test-ui.cjs
python3 scripts/android/verify-release.py
```

构建用官方aapt2/javac/d8/zipalign/apksigner，不依赖Gradle/Maven在线解析。共享转译复用现有 `backend/node_modules/typescript`。测试复用本机已有Playwright和Node24内置SQLite。源码与生成物在 `android/app/build/`；图片通过构建期符号链接从现有正式资源读取，不留第二套源图。

APK包名 `com.kaifan.monster`，minSdk26（Android8.0）、targetSdk36（Android16），debuggable且由本机调试密钥签名。它用于测试，不是商店生产包。调试密钥保留在 `~/.android/kaifan-debug.keystore`，用于后续同签名升级；不要把密钥提交、分享或当生产密钥。

ZXing二进制固定SHA-256：`8d8064c1636fdaef7189dd9055c7d59950a8940a12f2293956446ec3c109fd82`。Apache2许可证在 `android/licenses/zxing-LICENSE.txt`，也打入APK的assets/licenses。

## 安装与服务

```sh
~/Library/Android/sdk/platform-tools/adb devices
~/Library/Android/sdk/platform-tools/adb -s DEVICE_SERIAL install -r outputs/kaifan-monster-android-debug.apk
~/Library/Android/sdk/platform-tools/adb -s DEVICE_SERIAL reverse tcp:3001 tcp:3001
~/Library/Android/sdk/platform-tools/adb -s DEVICE_SERIAL reverse tcp:9000 tcp:9000
```

设备上“我的→账号与同步→服务连接”填写 `http://localhost:3001`。模拟器也可用 `http://10.0.2.2:3001` 请求宿主API；签名照片URL若由后端返回localhost:9000，仍需9000端口reverse。仅API联通不代表私有对象存储联通。生产环境应为API与对象存储配置设备可访问的HTTPS地址，签名URL不可随意替换host，否则可能破坏签名。

首次无登录可完成本地食库、菜谱、计划、采购、记餐。注册普通用户，管理员不会自动登录。照片上传先同步记录，再明确上传待传照片；公开发布需要确认且待审核。家庭认领只有在线服务确认成功才显示成功。

## 证据与边界

- `work/reports/android-core-tests.json`：真实宿主SQLite和实际3001 API的核心/桥接适配测试，不能冒充Android SQLite或Keystore设备验证。
- `work/reports/android-ui-tests.json`：无窗口Chromium测试Android新界面；截图明确名为android-host-*，不是Android设备截图。
- `work/reports/android-release.json`：最终APK签名、包体、源码/资源一致性与实际设备验证状态。
- [20项对齐与设备边界](acceptance.md)、[72项实用优化方向](optimization-backlog.md)。

Android尚未对齐鸿蒙独立的整相册备份、账号邮件验证/重置/注销向导、自动同步开关与完整手势动画；后续优先原生设备可靠性，再补这些差异。不要把此APK或宿主测试称为双端全面验收完成。

本轮20项对应接入及未验收项见 [next20-progress.md](next20-progress.md)。设备性能采集使用 `python3 scripts/android/measure-device.py --serial 设备号 --measure`；会停止并重新启动本应用5次，不启动模拟器或安装APK。无设备仅记录未执行。
