# 阿里云试用机接入

目标为杭州Ubuntu22.04、x86_64、2vCPU/4GiB、40GiB云盘，公网legacy.example.invalid。截图显示按量付费、100Mbps峰值、按使用流量计费；峰值不是免费流量额度。试用结束时间、剩余额度和自动释放策略尚未确认。

## 当前状态

2026-11-11：四个云端服务已运行，450道正式菜谱、20个迁移已初始化；8组SSH隧道验收通过，包括注册登录/刷新/同步/隔离/图片上传下载/权限。测试账号已注销，业务用餐记录已清空，测试图片由账号注销删除队列按宽限期回收。当前隧道管理端：http://127.0.0.1:13000/admin/ 。重启本机或隧道退出后需重新执行下方SSH命令。尚未配置手机HTTPS接入或AI服务。


本机确认22端口可达，80/443连接超时（不能仅据此判定是安全组还是未开服务）。用户已添加部署公钥，现已通过root登录，安装Docker并上传最小部署源码；服务实际验收结果另见任务状态和云端验证报告。已生成单独的本地部署密钥 ~/.ssh/service-deploy-key，私钥不上传。

在阿里云Workbench登录服务器后，将该密钥的.pub公钥追加到所登录用户的 ~/.ssh/authorized_keys，权限分别700和600；不要发送密码、私钥或阿里云AccessKey到聊天。本机连接时使用该用户名。首次连接已采用TOFU并将主机指纹固定在专用known_hosts文件，未禁用后续变更检查；通过Workbench独立核对指纹尚未完成。

安全组先只允许操作者来源访问SSH22，暂不开放3000、5432、6379、9000、9001。域名与HTTPS条件具备后再按需开放80/443。

## 已准备的部署路径

macOS打包时必须设置`COPYFILE_DISABLE=1`并排除`._*`和`.DS_Store`，避免AppleDouble元数据被误读为SQL；后端Docker构建也已排除这些文件。

只传必要后端源码、锁文件、Dockerfile、迁移、菜谱数据、管理端、compose文件及infra/scripts中必需文件。不传本机.env、用户数据库、密钥、node_modules、work、art-source、Android或鸿蒙构建目录，也不运行演示账号/社区假数据种子。

服务器安装Docker Engine/Compose后，在独立项目目录执行：

```sh
python3 scripts/cloud/init-trial-env.py --directory "$PWD"
SHIKU_ARCH=amd64 sh scripts/build-minio.sh
docker compose -f compose.yaml -f compose.app.yaml -f compose.trial.yaml config --quiet
docker compose -f compose.yaml -f compose.app.yaml -f compose.trial.yaml up -d --build --wait
```

创建.env脚本遇到已有文件立即停止，不覆盖已有凭据。复用当前SHA256验证的MinIO构建脚本，显式生成amd64镜像，不能直接拿本机ARM64镜像到此服务器运行。compose.trial.yaml为进程配置内存/CPU上限和有限日志，保留约1.5GB系统及余量；它不是并发或吞吐保证，Docker构建开销需独立监测。

初次启动按现有Dockerfile执行SQL迁移、私有桶初始化和正式菜谱种子；不导入本机用户记录。公网本地管理员本地私密账号配置登录关闭；正式管理员使用正常注册账号后显式提权。

## 无域名时先验证后端

```sh
ssh -i ~/.ssh/service-deploy-key -L 13000:127.0.0.1:3000 -L 19000:127.0.0.1:9000 USER@legacy.example.invalid
curl http://127.0.0.1:13000/api/v1/health
```

管理端为 http://127.0.0.1:13000/admin/ 。照片签名地址使用127.0.0.1:19000，需要第二个隧道端口保持一致。这是SSH内的本机浏览器/API验证方式，不表示手机已接入；原生客户端不允许直接填写公网IP明文HTTP。

## 手机真实联网

准备有效的API与图片HTTPS地址，域名解析到服务器；中国内地服务器的公网服务还需核对适用备案状态。设置API_DOMAIN、S3_DOMAIN、TLS_EMAIL、S3_PUBLIC_ENDPOINT=https://图片域名，再叠加compose.production.yaml。S3预签名URL的Host必须与图片实际域名一致。API地址在两端“设置/服务连接”填写https://API域名，不添加/api/v1。

AI服务目前尚未接入。先部署已有业务后端；FastAPI/API模型调用要在模型平台、地址与密钥条件确认后实施，API密钥仅保存在服务器。

## 验收与试用到期

SSH主机指纹/架构、Docker架构、内存/磁盘/流量、容器健康、API健康、注册登录、账号隔离、正式菜谱、照片签名上传下载、管理端权限逐项验证。试用过期前确认付费转换或迁移；本轮不自动启用付费套餐、不复制整项目或自动建立备份任务。
