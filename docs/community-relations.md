# 社区关注、收藏与站内消息

先应用迁移 `012_community_relations.sql`。沿用 `/api/v1/community` 和原有AuthGuard；本轮不增加客户端系统推送，不生成虚假互动或热度。

## 接口

- `GET posts?scope=following`：我关注作者已审核公开动态（最多100条）。
- `GET posts?scope=favorites`：我的收藏，查询时重新检查当前公开/家庭/本人权限；撤回或家庭撤权后自动从结果消失。
- 原有动态列表/详情新增 `favorite_count:number`、`favorited:boolean`。
- `POST posts/:id/favorite`、`DELETE posts/:id/favorite`：收藏/取消；幂等，不会向作者公开收藏者或产生消息。取消可清除已失去访问权限的旧收藏。
- `GET users/:id/relationship` → `{following,followers,following_count}`。
- `POST users/:id/follow`、`DELETE users/:id/follow` → `{following}`；禁止关注自己和注销账号，重复操作不叠加。
- `GET notifications?unread=false|true` → `{items:[{id,kind,actor_id,actor_name,post_id,comment_id,read_at,created_at}],unreadCount}`。最多100条，未读计数按所有当前有权限消息计算。
- `PATCH notifications/:id/read`、`PATCH notifications/read`：单条/全部已读，仅当前账号。

消息kind：`follow`、`like`、`comment`、`reply`、`new-post`。关注、点赞、评论及回复产生对应真实消息；公开动态必须审核通过后才通知现有粉丝，重复审核不重复通知。不向自己发消息。取消点赞会移除对应点赞通知；取消关注会移除对应关注通知。收藏保持私密。

消息不包含评论正文、原始私有记录或价格，点击后仍走现有动态详情权限。每次拉取消息重新检查当前帖子status/visibility和家庭关系；撤回、审核拒绝、家庭撤权后，相关消息既不显示也不计入未读。已注销actor的消息不显示。标记已读不存在跨账号修改路径。

点赞/评论/收藏在事务内再次检查帖子权限并锁定帖子，避免和撤回/审核并发时先检查后写入。作者账号及目标账号在关系写入时校验未注销。账号注销清理该用户收藏、双向关注，以及其发送/接收的消息。

## 验证

`NODE_OPTIONS=--max-old-space-size=512 node --env-file=../.env --import tsx test/community-relations.integration.ts`通过7组真实PostgreSQL隔离schema测试：公开审核门禁、私有与家庭访问、幂等关注/收藏/点赞及真实计数、嵌套金额隐藏、评论/回复、跨帖子parent拒绝、已读隔离、撤回不可访问、家庭撤权、账号注销清理。使用合成账号与动态，临时schema已删除。

报告 `work/reports/community-relations-integration.json`。测试直接调用服务和控制器方法，不等于原生UI、系统推送或HTTP DTO专项验收。当前列表为有界100条，尚无游标加载更多；消息偏好细分与系统推送未实现。
