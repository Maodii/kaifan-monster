# site.example.invalid 部署说明

2026-11-25：官网已正式启用公网 HTTPS，已通过网页交互、WebGL、响应式、安全路径及 API 健康验证。

- 主站：https://site.example.invalid/
- www 与 HTTP 自动跳转主站 HTTPS。
- 服务器：api.example.invalid（上海）。
- 网站备案号：示例备案号，已展示于首页页脚并链接工信部查询。
- 两条 A 记录 @ / www 均已指向新服务器。
- 独立 Let's Encrypt 域名证书，当前有效期至 2027-02-23；独立 systemd 自动续证任务已启用，执行结果 success。
- 现有应用 API 与 IP 证书配置保持正常。
- 公网验证报告：work/reports/official-site-public-validation.json。

## 更新网站

工程根执行 `bash website/scripts/stage-server.sh`。备案号与官网邮箱已固化在 `website/site-config.json`；构建保留备案页脚。更新只同步本站静态文件，不复制项目或密钥，仅发布已核验的单个正式 APK。

部署根目录为 `/var/www/site.example.invalid/public/`；部署脚本在同级 `deploy/`，不可公开访问。HTTPS 配置、自动续证与日志轮转见 `website/deploy/`。不记录逐次访问日志，仅轮转保留必要运行错误日志。

## 首次启用流程（已执行）

确认备案通过和 DNS 指向新服务器后，执行 `bash /var/www/site.example.invalid/deploy/activate.sh --icp-approved`。该流程已完成，无需重复申请证书或重建站点。

服务器历史私有预览依赖 SSH 通道；正式使用以上公网 URL，无需本机进程或 SSH 通道。

### 应用协议公网地址

- 隐私政策：https://site.example.invalid/privacy.html
- 用户服务协议：https://site.example.invalid/terms.html
- `/privacy`、`/privacy/`、`/terms`、`/terms/` 同样可用，无需登录。
- 构建时从 `outputs/harmony-store/privacy.md`、`terms.md` 读取完整应用政策；修改源文档后运行 `bash website/scripts/stage-server.sh` 发布。官网自身说明另存为 `/website-privacy.html` 和 `/website-terms.html`。

### 正式下载入口（2026-11-27）

- 华为应用市场：https://appgallery.huawei.com/app/detail?id=com.shiku.foodkeeper
- 下载区：https://site.example.invalid/#download
- Android 0.9.37（55）：https://site.example.invalid/downloads/kaifan-monster-0.9.37-android.apk
- 桌面端显示市场二维码；手机沿用官方 HTTPS 跳转；鸿蒙与安卓分别推荐对应入口，iOS 显示设备说明，微信/QQ 提示系统浏览器。
- 发布前运行 `python3 website/scripts/verify-download.py`，校验实际鸿蒙/安卓版本一致、v2/v3 正式签名、共享源码与资源；再运行部署脚本。构建会核对双方包哈希，只复制允许的 APK，生成公开 `downloads.json`；不会公开 `.hap`、`.app` 或其他 outputs 文件。
- 本次核对的是实际本地鸿蒙正式包 0.9.37（55）；华为桌面商店页未展示上架版本号。真机安装与系统唤起由具体浏览器/应用市场决定，未声称已完成真机验收。
