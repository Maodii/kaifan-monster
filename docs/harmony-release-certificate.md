# 鸿蒙发布证书与签名

2026-11-16：用户从华为平台下载并提供发布证书和 AppGallery 发布 Profile。已验证发布 CSR、公钥、证书链内部签名、Profile 官方签名、包名 com.shiku.foodkeeper、应用 ID 6917621423134470610、有效期及 Profile 绑定证书一致。

证书有效期至北京时间 2029-11-16 10:41:02。发布证书 SHA256：

F7:60:FE:FB:3B:28:9D:17:D2:E3:29:C4:8A:7A:67:86:2F:CE:7B:E1:B7:4F:C4:98:8E:A4:84:30:0D:0E:80:AD

下载的 .cer 含根、中间、应用三张证书，配置指纹时使用上方应用发布证书指纹，不使用根证书指纹。本地配置在 ~/.kaifan/signing/signing.json 的 harmonyRelease 项，私钥与口令不进入工程或安装包。旧调试身份不变。

构建 release 模式 HAP 后执行 python3 scripts/sign-harmony.py --release。脚本拒绝 debug HAP、不匹配公钥/包名/应用 ID/证书、非 AppGallery 发布 Profile 及过期 Profile，并使用官方工具签包及验签。

本次已产出 outputs/kaifan-monster-harmony-release.hap（0.9.16 / 34，release，约 53.3MB）；证据 work/reports/harmony-release-signing.json。原模拟器调试安装未替换、未卸载。发布证书身份不同于原调试身份，不能承诺覆盖已有调试安装；当前没有鸿蒙真机，未进行真机验收。

这是已签名 HAP 模块，尚不是 AppGallery 最终上传的完整 .app 分发归档；后续上架需生成并检查完整发布归档、完成商店材料和审核。服务账号/API Key 不参与本次签名。

## 2026-11-16 当前商店准备版

0.9.17 / 35 已完成完整APP封装和双层正式签名，交付 `outputs/kaifan-monster-harmony-release.app`；官方验签、release/debug标志、无3D资源、隐私配置及与模拟器已测试字节码一致性通过。以 `work/reports/harmony-store-package.json` 的当前哈希为准。素材、文案、政策网页与提审前待办见 `outputs/harmony-store/index.html` 和 `submission-guide.md`。尚未上传商店、未验收真机，不代表已具备所有备案或AI资质。
