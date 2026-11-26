# 明确确认后的相册备份

## 状态和启用条件

已实现独立页面、前台批量原图上传、账号私有存储、内容去重、进度/失败计数、停止及云端删除。标语为空时开始按钮禁用；页面仍有固定的范围、目标服务、原图元数据和停止/删除说明。用户填写标语不能替代这些说明。

本轮不修改已发布主界面的配置、权限、入口或HAP；页面在临时最小校验工程中单独注册并用实际ArkTS编译器检查，没有安装或操作模拟器。临时工程在校验后删除，只保留报告。

**平台限制：** 当前本机SDK的 `toolchains/lib/PermissionDefinitions.json` 将 `ohos.permission.READ_IMAGEVIDEO` 标为 `user_grant` / `system_basic` / `provisionEnable: true`。应用必须符合平台的权限资质和签名配置要求，用户点击同意本身不保证普通应用具备全量读取能力。本项目不修改APL、不伪造授权、不通过调试命令替真实用户授予权限。拒绝或不支持权限时，不枚举或上传。未做真机权限成功验收。

## 用户填写文案

文件：`client/entry/src/main/ets/model/AlbumBackupCopy.ets`

```ts
export const ALBUM_BACKUP_SLOGAN: string = '';
```

只把引号中的内容换成用户提供的标语。初始空值是主动关闭入口的产品门禁。固定说明明确：上传系统授权可读照片的原文件到页面显示的服务，仅当前账号访问；原图可能包含位置/时间；不含视频/实况视频部分、隐藏/最近删除项目；支持JPEG/PNG/WebP/GIF/HEIC/AVIF，单张50MB，其他格式/读取失败计入未完成；退出页面或后台不继续排队，已在途请求可能已到服务器，已上传项可主动删除。部分授权时只处理获授权项目，不宣称备份了整个手机。

## 主开发接入补丁（由主开发另轮应用）

1. `client/entry/src/main/resources/base/profile/main_pages.json` 的 `src` 数组追加 `"pages/AlbumBackup"`，保留原页面。
2. 在符合平台权限资质后，`client/entry/src/main/module.json5` 的 `requestPermissions` 数组追加以下对象，不申请写相册权限：

```json
{
  "name": "ohos.permission.READ_IMAGEVIDEO",
  "reason": "$string:album_backup_permission_reason",
  "usedScene": { "abilities": ["EntryAbility"], "when": "inuse" }
}
```

3. `client/entry/src/main/resources/base/element/string.json` 的 `string` 数组追加：

```json
{
  "name": "album_backup_permission_reason",
  "value": "用于你主动确认后读取系统授权的相册照片，并上传到你的账号私有备份"
}
```

4. `Index.ets` 的“数据与备份”分组加入按钮，ArkUI导入中补充 `router`：

```ts
Button('整个相册备份').width('100%')
  .onClick(() => router.pushUrl({ url: 'pages/AlbumBackup' }))
```

5. 后端应用009迁移并重新构建/启动；客户端设置中的服务地址需指向该后端。开始按钮默认仍禁用，直到用户填写标语。不要把此页接入原有同步、相册选图、头像或发布回调。

## 接口和存储

- `POST /api/v1/album-backup/consent`：认证账号明确提交 `{noticeVersion:"album-backup-v1",confirmed:true}`，生成24小时有效的独立确认记录。
- `POST /api/v1/album-backup/photos/:consentId`：multipart `photo`，每张原图最多50MB；校验文件头并按SHA-256在同一账号内去重。
- `GET /api/v1/album-backup`：本账号数量和字节数。
- `DELETE /api/v1/album-backup/consent/:id`：停止本次备份，不删除已备份照片。
- `GET /api/v1/album-backup/photos/:id/download`：仅所有者可取5分钟签名链接。
- `DELETE /api/v1/album-backup`：撤销全部有效确认，删除本账号相册备份对象和索引，不删除记餐照片、头像或本机相册。

原图存入现有私有S3/MinIO桶的 `<userId>/album-backup/<uuid>`，数据库只存索引、哈希、大小、类型和确认记录；不会将相册照片转换成用餐记录或公开社区作品。不额外上传手机原路径或文件名。原图中的EXIF等原生元数据属于备份原文件的一部分，固定提示已说明。

上传、停止、删除通过账号级数据库锁串行处理；对象上传前先写现有延迟清理队列，事务成功后移除清理任务，避免中断后遗留无索引对象。插入失败会立即尝试清理，失败由原PhotoService队列重试。对象删除失败可再次操作；不返回删除成功。

前台一次只暂存一张原图到专用cache文件，处理后删除；离页或进入后台会停止后续排队并取消客户端当前上传连接，但服务器已经接收的请求可能完成。不会创建整相册本地副本、后台自动启动或改变原有自动同步。重复运行会再次读取/传送照片，服务端去重；未实现本机增量哈希清单、后台续传或云端相册浏览页。当前没有存储配额管理，上线前应按服务容量配置。

## 验证和限制

- `work/reports/album-backup-page-build.log`：独立注册的新页面及其依赖的实际ArkTS编译结果（未使用已发布工程的成功构建冒充新页通过）。
- `work/reports/album-backup-integration.json`：临时PostgreSQL schema、随机HTTP端口、现有私有对象存储与合成1×1 PNG的端到端验证。覆盖未确认/过期版本/匿名/其他账号拒绝、实际原图字节下载、去重、非法文件和50MB超限、停止、删除、并发上传删除、数据库失败后对象补偿清理。
- `work/reports/album-backup-verification.json`：本轮源文件哈希、文案门禁、配置未接入和验证范围。
- 测试结束删除临时schema及所有剩余合成对象；不读取真实手机相册、不注册真实用户、不触碰主开发占用的模拟器、不更新正式HAP。

重跑后端测试：

```sh
cd backend
npm run build
node --env-file=../.env --import tsx test/album-backup.integration.ts
```

测试通过编译后的Nest模块启动隔离HTTP实例（避免tsx省略装饰器元数据），不重启本机3000服务，不把测试迁移应用到主开发数据库。需要本机PostgreSQL/Redis/私有MinIO可用。
