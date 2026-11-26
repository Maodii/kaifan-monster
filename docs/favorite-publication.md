# 本机收藏、示例主体同步与社区热度

示例主体收藏（`recipe_favorites`）可离线使用，经现有同步协议保存私人备份。社区热度（`discovery_favorite`）是用户明确发布的当前收藏投影，每个账号每道菜只计一次。为避免把历史备份自动算成新热度，普通登录、读取热度、旧客户端的私人收藏同步均不会自动导入社区统计。

## 新客户端接入协议

1. 本机收藏是页面显示的依据。离线新增/取消先落本机并写原同步队列；不要用 `GET /discovery/summary.mine` 覆盖本机列表。`mine` 只表示此前已发布的公开投影。
2. 连接有效账号后调用 `GET /discovery/summary`，读取 `favoriteRevision`，提示“发布本机收藏热度”。用户确认才调用 `POST /discovery/favorites/snapshot`：

```json
{"recipeIds":["当前本机收藏的菜谱ID"],"confirmed":true,"expectedRevision":0}
```

3. 接口以这份完整列表替换当前账号的公开投影。空数组明确清除该账号此前发布的全部热度贡献，其他账号不受影响。只统计当前内置/已审核公开菜谱；私人、未知、撤回 ID 被忽略，返回 `publishedCount`、`ignoredCount`，不上传私人菜谱内容。
4. 返回 `favoriteRevision` 供后续使用。409 表示其他设备或单菜操作已更新，禁止静默重试旧列表；刷新热度后由用户确认再次发布。本机取消记录不得因远端投影仍有旧 ID 而恢复。
5. 公布投影不改本机数据，也不改私人 `recipe_favorites` 或其版本/同步日志。示例主体收藏多设备同步仍走原有同步与冲突处理。快照接口不承诺把其他设备示例主体收藏自动合并。
6. 发布时捕获本机列表及本机修订；响应期间若本机再次修改，保留“尚未发布”状态，不能把新修改标为已发布。网络失败保持本机收藏和待发布状态，不声称社区计数已成功更新。

已有 `PUT /discovery/favorites/:id {saved:boolean}` 可用于当前连接状态下的单项热度更新；返回 `favoriteRevision`。此接口也会让旧快照版本失效。断网操作应用完整本机快照补齐，不能仅靠登录刷新。

未接新按钮的旧客户端行为保持清晰：单菜在线操作可更新热度；离线取消/历史示例主体备份不会自动发布，热度可能暂时滞后，`mine` 绝不是本机数据恢复入口。不得把此边界描述为“收藏已全量云同步”。

## 服务端验证

迁移：`backend/migrations/013_favorite_publication.sql`。

`node --env-file=../.env --import tsx test/discovery-catalog.integration.ts` 在隔离 PostgreSQL schema 运行真实 `SyncService.push` 与发现控制器：验证历史同步不产生公开热度、显式确认、空快照取消、跨账号隔离、重复 ID、未知/撤回过滤、旧版本拒绝及私人同步数据不变。报告在 `work/reports/discovery-catalog-integration.json`；未代替原生 UI 或 HTTP 鉴权验证。
