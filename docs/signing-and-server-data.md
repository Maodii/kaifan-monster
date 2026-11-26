# 签名与服务器数据查看

2026-11-12 当前进度：Android 正式密钥已生成；鸿蒙专用 ECC 密钥与 CSR 已生成，但本机没有华为签发的证书及 Profile，不能声称已有可用于真机的官方签名 HAP。

## 鸿蒙：完成签名所需的一次本人操作

推荐先在 DevEco Studio 完成自动签名：

1. 打开 `/Users/developer/Documents/ChatGPT/HarmonyOS/client`。
2. 进入 File → Project Structure → Project → Signing Configs。
3. 勾选 Automatically generate signature，登录已实名认证的华为开发者账号。
4. 若提示绑定设备，连接开启开发者模式与 USB 调试的鸿蒙真机，按提示完成配置并 Apply / OK。

账号密码不用交给 Codex。华为身份认证及证书授权不能用 SDK 附带的公共 OpenHarmony 测试证书替代。自动签名使用 IDE 管理的密钥；与下述手动 CSR 方案选择一种使用即可。

### 手动 CSR 方案（使用已准备的专用密钥）

公开申请文件：`outputs/harmony-development-request.csr`，已验证 CSR 签名有效。应用包名 `com.shiku.foodkeeper`。

在华为开发者/AppGallery Connect 的证书、APP ID 与 Profile 管理中，使用该 CSR 申请调试证书；为上述包名和实际测试设备生成调试 Profile。下载证书和已签发的 Profile，分别保存为：

- `~/.kaifan/signing/harmony-development.cer`
- `~/.kaifan/signing/harmony-development.p7b`

随后执行：

```sh
python3 scripts/sign-harmony.py --check
python3 scripts/sign-harmony.py
```

工具先检查证书公钥是否匹配专用密钥，再核对 Profile 的包名，使用官方 hap-sign-tool 签包并验证；成功才输出 `outputs/shiku-mvp-signed.hap`。当前缺官方材料，仅通过了准备检查，真实签包步骤尚未运行。Profile 的设备授权、有效期及真机安装仍需验证。

本地密钥配置：`~/.kaifan/signing/signing.json`；私钥和口令独立存放在该受限目录（目录0700、文件0600），不在项目、服务器、安装包或日志中。证书申请文件仅包含公钥，不含私钥。不要替换已有密钥身份。

## Android

原有测试包仍是 debug 签名，原 debug 密钥未修改。另备专用正式签名身份，配置同上文件的 android 项。

构建正式签名包：

```sh
KAIFAN_ANDROID_VARIANT=release bash scripts/android/build.sh
```

产物 `outputs/kaifan-monster-android-release.apk`：禁用 application debuggable 和原生 BuildConfig.DEBUG，使用正式专用密钥；构建后检查签名 v2/v3。该证书与 debug 包不同，不能直接覆盖现有 debug 安装；不要为安装新包直接卸载并丢失未同步记录。先同步/导出记录，或在独立测试设备安装。正式签名并不等于已完成商店上架审核。

## 查看服务器账号：最短路径

阿里云 ECS → 远程连接 → Workbench，登录服务器后执行：

```sh
docker exec -it shiku-postgres-1 psql -U kaifan_support_reader -d shiku
```

进入后执行：

```sql
SELECT email, display_name, region_code, role, created_at, active_devices
FROM accounts
ORDER BY created_at DESC
LIMIT 50;
```

输入 `\q` 退出。该账号只读 `kaifan_support.accounts` 视图，查看密码哈希/登录令牌以及写操作均被拒绝。已验证真实 SSH 隧道、密码登录、视图读取和权限拒绝，未开放公网5432。

如偏好表格界面，使用 DBeaver / DataGrip / TablePlus；完整本机连接参数及只读密码在 `outputs/server-database-access.md`（0600，请勿公开）。在本机先执行：

```sh
bash scripts/cloud/open-database-tunnel.sh
```

保持该终端运行，客户端连接 `127.0.0.1:15432`，数据库 `shiku`。关闭终端或 Ctrl+C 即关闭本次隧道，不影响手机的公网 HTTPS 连接。

## 数据实际存放位置

业务服务器 `api.example.invalid`，PostgreSQL 容器 `shiku-postgres-1`，数据库 `shiku`，持久卷 `shiku_postgres-data`，容器内挂载 `/var/lib/postgresql/data`。应通过 SQL 查看，不直接编辑卷里的数据库文件。

| 内容 | 服务端表/存储 |
| --- | --- |
| 注册邮箱、密码哈希、角色、注册时间 | `public.users`；密码为 Argon2 哈希，无法查看原密码 |
| 昵称、地区、头像资料 | `public.user_profile`，地区字典 `public.regions` |
| 设备及登录状态 | `public.devices`；不向只读查看账号开放令牌哈希 |
| 已同步库存、记餐、采购 | `public.food_items`、`public.meal_records`、`public.shopping_list` |
| 记餐图片索引 | `public.meal_photo`；图片文件在 MinIO 私有桶 |
| 计划和偏好等工作区 | `public.account_workspace` |
| AI 问题和回答历史 | **目前不写入 PostgreSQL** |

注册成功即写入服务器。客户端本地记录是否上传仍取决于同步设置；未同步内容只在对应设备上。

## AI 问答为什么查不到

目前设计不持久化私人对话。流式任务暂存在 API 内存，结束后约60秒过期，后续任务清理时移除；取消会清空正文，进程重启后不保留。网关没有将问题/回答写入数据库，Docker 运行日志也不能当作完整对话历史。因此过去未存储的回答无法补查。

若要新增运营质检/用户历史，应另行开发：用户明确知情与授权、可关闭的历史保存、限定保留时间、账号隔离、用户删除和管理员查看审计。当前未偷偷启用全量问答留存，也没有建立虚假的历史记录。
