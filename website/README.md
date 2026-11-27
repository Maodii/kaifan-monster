# 开饭小怪独立官网

独立静态官网，无外部 CDN、统计追踪或服务凭据。2026-11-27 起根据用户要求加入华为应用市场链接与已核验的正式 Android APK 下载；不显示阶段字样或运营者。

## 预览与部署

```sh
cd /Users/developer/Documents/ChatGPT/HarmonyOS/website
npm start
npm run build
```

预览：http://127.0.0.1:4178 。默认仅监听本机；可用 WEBSITE_PORT 调端口。

部署只使用 website/dist/，以根域部署。build 原地更新唯一 dist，无需安装依赖，不复制项目或 outputs。产物包含网站所需 HTML/CSS/JS、字体与品牌资源，以及 release.json 允许的单个签名 APK；不包含密钥或业务配置。_headers 提供 CSP、权限与 MIME 防护；不支持该格式的托管平台需映射同等响应头。网站已部署公网 HTTPS，详情见 DEPLOYMENT.md。

自有域名 `site.example.invalid` 的阿里云解析、服务器准备与备案通过后的启用步骤见 [DEPLOYMENT.md](DEPLOYMENT.md)。当前文件已准备到独立服务器目录；备案审核期间未启用域名站点。域名启用后以 HTTPS 为规范地址，www 跳转根域名。

## 内容与来源

首页、功能、三种偏好抽菜、本页记住灵感、真实页面预览、上手指引、六项 FAQ 与官网隐私/使用/联系入口均已实现。源资源见 asset-sources.json：正式紫色小怪和食物插画来自客户端，界面预览来自已有鸿蒙模拟器截图。没有编造用户数量、评价、应用商店入口或上架状态，也未宣传隐藏的社区/3D 模块。

联系邮箱依据 client/entry/src/main/resources/rawfile/release-legal.json。官网隐私与使用说明仅说明网站行为，应用完整政策请在应用内查看；不静默改写应用原政策，也未修改任何原政策资料。正式部署后须根据实际托管配置维护官网访问日志说明。

## 交互与图形

三个独立 WebGL 场景共享 GLSL：首屏纸纹光环、抽菜灵感涟漪、真实截图背景等高线。另有指针视差、微磁吸按钮、滚动揭示、章节导航/阅读进度/回顶、平滑 FAQ、偏好筛选、灵感收藏反馈、截图切换/键盘导航/大图。

所有动画支持减少动态效果。GPU 不可用时保留静态资源和交互；离屏、页面隐藏暂停，WebGL Context Lost 可恢复。桌面 DPR≤1.5 / 手机≤1.25，渲染调度预算桌面60Hz / 手机30Hz，不是硬件实测帧率承诺。详见 work/reports/official-site-motion.md。

灵感偏好筛选使用真实菜谱的规划分钟数：半小时内≤30分钟，慢慢炖煮>30分钟。本页六张示例均为真实菜谱，后者为汤品。抽菜不读取用户库存；记住的灵感仅保存在当前页面内存，刷新即清除，不使用 Cookie/localStorage，不上传数据。

## 验证

先开启预览，然后 npm test。复用本机已有 Playwright；其他机器安装 Playwright/Chromium，或以 WEBSITE_PLAYWRIGHT 指向已安装包。WEBSITE_BASE_URL 可切换目标地址。

覆盖320/360/390/430/768/1024/1440px、200%文字、筛选/反复抽菜/收藏、键盘/模态、FAQ、页面链接、文案移除、私有路径和安装包隔离、WebGL/上下文恢复/离屏暂停/降级。证据只保留当前版本：

- work/reports/official-site-validation.json
- work/screenshots/official-site-desktop.png
- work/screenshots/official-site-mobile.png

无头 Chromium 验证不代替 Safari、Android/HarmonyOS 真机或设备 GPU 性能验收。无全项目备份、无历史构建版本。

正式下载：先执行 `python3 website/scripts/verify-download.py` 核验双方实际安装包，再构建。完整预览用 `WEBSITE_SERVE_DIST=1 node website/scripts/serve.mjs`；测试下载适配用 `node website/scripts/check-release.mjs`。
