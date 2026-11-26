# 在线菜谱到离线目录

本轮增加有内容版本的增量更新。服务端仅分发 `recipe_catalog` 管理的公共内置目录，不包含私有菜谱、库存、记餐或待审投稿；四道代码内置菜谱仍由客户端保留。

## 协议

- 登录后 `GET /api/v1/catalog/offline/manifest` 返回 format=1、SHA-256 根版本、总数量、UTF-8 总字节数，以及按稳定ID排序的逐菜ID/内容SHA-256/字节数。
- `POST /api/v1/catalog/offline/download` 使用 `{version, ids}`，每次1–25个唯一UUID；返回JSON内容字符串及逐菜摘要。客户端只请求与本机上次目录摘要不同的菜谱，未变更时仅检查manifest。
- 版本由内容产生，不依赖时间戳。管理端保存、撤销及来源导入只要实际内容改变，就会生成新版本；不需要额外发布事件。主键覆盖JSON内过时ID，收藏与历史引用不换ID。
- 下载途中管理端再次修改内容时返回409，本次更新整体放弃；旧版离线数据仍能使用。目录上限10000条、32MiB，每条256KiB。

## 原生接线

模型 `CatalogUpdate.ets` 导出：

1. `readCatalogManifest(db)`：从现有 `catalog_meta` 读取及校验已安装版本，初次返回null。
2. `downloadCatalogUpdate(cloud, manifest)`：读取版本、只下载变化内容、逐条SHA-256/字节数/结构校验，返回 `CatalogUpdatePackage`；此阶段不修改数据库。可用于界面预览新增/更新/退出目录数量后确认。
3. `applyCatalogUpdate(db, package)`：复核摘要与基准版本，在一个SQLite事务中保存变化菜谱及remoteManifest；任一写入失败整体回滚。调用方应放入LocalStore写队列，并在完成后重读builtinRecipes、递增revision。

退出远端目录的菜谱不物理删除，以免断开历史/收藏；ID记录在catalog_meta.remoteRetiredIds。界面可在日常发现中隐藏它们，同时保留历史详情访问。私有documents数据不改动。

客户端升级带来的内置源版本变化，需要在重新种入本机离线目录后清除remoteManifest（下次检查重新获取）或明确保留远端覆盖；不能保留旧remoteManifest却覆盖其内容，否则下次相同摘要检查不会重下。

## 验证与边界

- `work/reports/catalog-delivery-api.json`：7组隔离真实PostgreSQL/Nest HTTP测试，覆盖鉴权、DTO、25条分批、摘要、单项变更、并发版本失效、退场。测试schema已移除，真实目录不改动。
- `work/reports/catalog-update-client.json`：9组实际ArkTS逻辑+临时SQLite测试，覆盖分批增量、损坏/断网、写入故障回滚、过期预览、退场保留与私有数据隔离。测试临时目录已清除。
- HTTPS服务身份由现有Cloud连接策略保证，SHA-256用于传输及版本完整性，不宣称离线包另有数字签名。
- 本协议只更新文字和数据；远端新增图片不随包下载，未知imageKey使用现有封面回退。当前454张内置封面保持不变。
- 此报告不是模拟器/真机验收；真机环境仍需完成实际网络、重启和界面测试。
