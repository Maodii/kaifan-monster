# REST API

统一前缀 `/api/v1`，JSON；HTTPS由Caddy终止。除注册、登录、刷新、health外，均要求 `Authorization: Bearer <accessToken>`。用户ID、设备ID取自JWT并再次查询数据库验证当前设备未撤销；不能通过请求正文冒充他人。POST通常返回201，DELETE/PUT/PATCH返回200；校验400、未登录401、越权403、不可见404，限流429。DTO拒绝未知顶层字段。

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | /health | 健康与时间 |
| POST | /auth/register | 邮箱/密码/设备名注册 |
| POST | /auth/login | 登录并登记新设备 |
| POST | /auth/refresh | 单次使用刷新令牌，防重放 |
| POST | /auth/logout | 撤销当前设备 |
| POST | /auth/password | 校验旧密码，修改后撤销所有设备 |
| GET | /devices | 当前用户设备列表 |
| PATCH / PUT | /devices/:id | 修改自己的有效设备名 |
| DELETE | /devices/:id | 解绑自己的设备 |
| GET / POST | /families | 列出/创建家庭 |
| POST | /families/join | 邀请码加入，生成共享记录历史增量 |
| GET | /families/:id/members | 当前家庭成员 |
| DELETE | /families/:id/members/:member | 管理员移除普通成员 |
| DELETE | /families/:id | 所有者解散，撤销成员并轮换邀请码 |
| POST | /sync/push | 最多100条变更，事务/幂等/版本冲突 |
| GET | /sync/pull?since=0 | 最多500条增量，下一游标与当前家庭范围 |
| GET | /records/:type?familyId= | 当前私有或有权限的家庭记录 |
| POST | /photos/presign | 所有者用餐照片PUT签名，5分钟 |
| POST | /photos/:id/complete | HEAD校验大小/类型，标记已上传 |
| GET | /photos/:id/download | 有当前访问权限才签发GET URL，5分钟 |
| DELETE | /photos/:id | 队列删除私有对象和索引 |
| GET | /catalog/barcodes/:code | 私有/当前家庭/审核公共条码，公共结果Redis缓存 |
| GET | /catalog/recipes?search=&taste=&sort= | 公共审核菜谱；latest/cost/minutes排序 |
| POST | /catalog/submissions | 提交自己的条码/菜谱到公共待审 |
| GET | /catalog/submissions/mine | 自己的提交状态 |
| GET | /catalog/admin/pending | 管理员待审核目录 |
| POST | /catalog/admin/:id/review | 管理员通过/拒绝 |
| GET | /catalog/recommendations?taste=&excluded=&recentDays= | 固定规则排序，当前私有/家庭库存 |
| POST | /catalog/recommendations/events | open/select/skip行为日志 |
| GET | /insights/meals?from=&to= | 私有用餐估算/餐次/标签/菜品聚合 |
| GET | /insights/replenishment | 低库存/已吃完建议，排除丢弃 |
| POST | /insights/backups | 显式创建当前私有数据一致性快照 |
| GET | /insights/backups | 列出自己的快照 |
| GET / DELETE | /insights/backups/:id | 下载/删除自己的快照 |
| GET | /insights/admin/metrics | 管理员基础表计数 |
| POST | /community/posts | 私有/家庭/公开分享；必须confirmed |
| GET | /community/posts?scope=public | public/family/private/mine列表 |
| GET / DELETE | /community/posts/:id | 可见详情/作者或管理员撤回 |
| POST / DELETE | /community/posts/:id/like | 幂等点赞/取消 |
| GET / POST | /community/posts/:id/comments | 评论与同动态内回复(parentId) |
| POST | /community/posts/:id/reports | 举报 |
| GET | /community/users/:id | 仅审核通过的公开作品 |
| GET | /community/admin/pending | 管理员动态/举报队列 |
| POST | /community/admin/posts/:id/review | 通过/拒绝动态 |
| POST | /community/admin/reports/:id/review | 处理举报，通过则下架动态 |

## 同步请求

```json
{
  "changes": [{
    "changeId": "每次逻辑变更独立UUID",
    "entityType": "food_items",
    "entityId": "实体UUID",
    "operation": "upsert",
    "baseVersion": 0,
    "modifiedAt": "2026-11-03T04:00:00.000Z",
    "payload": {"name":"鸡蛋","quantity":6,"unit":"个","expiryDate":"2026-11-20"}
  }]
}
```

familyId为可选UUID，仅创建共享记录时传；不能通过同步把已有记录改归其他家庭。实体类型只接受food_items、barcode_lib、shopping_list、recipes、recipe_favorites、meal_records。单位/数量/日期/菜谱等有业务校验。

响应 `accepted[{changeId,entityId,version}]`、`conflicts[{changeId,entityId,server,local,suggested}]`。version是实体版本；pull的version是当前用户日志游标。重复changeId不重复执行。冲突返回完整两端，不执行覆盖；suggested只供显示，不直接应用。用户选择后以新changeId和当前server.version重新提交。

pull返回 `changes`、`hasMore`、`nextVersion`、`familyIds`；每次按当前成员身份过滤。客户端同步前核对家庭范围，离组记录从共享缓存移除；离组后尚未提交的本地编辑保留待用户处理，不上传到示例主体/其他家庭。

## 照片

presign请求 `{mealId,contentType:"image/jpeg"}`，返回 `{id,uploadUrl,expiresIn,contentType}`。客户端直接PUT对象存储，之后complete；最大20MB，支持JPEG/PNG/WebP。数据库仅保存索引/URL，不接收图片二进制。删除记录立即撤销照片访问并排队删除；对象宽限期覆盖已发出的5分钟PUT签名，失败退避重试。调用前已签发GET链接在过期前可能仍有效，不能声称可即时撤销签名。

## 发布与隐私

发布请求 `{sourceId,kind:"meal"|"recipe",visibility:"private"|"family"|"public",showPrice:false,confirmed:true,familyId?}`。源记录须归当前用户所有；公开一律pending，管理员approved后对外可见。家庭内容重验当前成员资格。对他人返回白名单业务字段，showPrice=false时剔除嵌套金额，且不返回本机文件路径。自由备注由用户填写，无法自动识别其文本中自行写出的金额。

Swagger入口 `/api/docs`；管理员页面 `/admin/`。完整业务类型参考dto.ts及各模块DTO，数据库定义参考migrations，不把Swagger自动推断的空结构视为完整响应契约。

家庭邀请码仅管理员可读取：`GET /families/:id/invite`；更换使用`POST /families/:id/invite`，旧码立即失效。成员移除、加入、更换码与共享同步写入使用一致的事务锁顺序。同步推送同时使用Redis每用户互斥；已有同步时返回409供客户端重试，Redis不可用时依靠PostgreSQL事务锁继续保证正确性。

## 示例主体资料（迁移007）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /regions | 无需登录；34个省级地区，code/name |
| GET | /account/profile | 当前账号自己的资料，不返回邮箱 |
| PATCH | /account/profile | 必传version、displayName、avatarPreset、bio、dietGoal；regionCode可选 |
| POST | /account/avatar | multipart字段avatar；JPEG/PNG/WebP，最大5MB |
| GET | /account/avatar/:id | 仅所有者获取5分钟下载URL |

注册可附带displayName、regionCode、avatarPreset；与用户、设备在同一事务创建资料。资料返回displayName、regionCode、regionName、avatarPreset、avatarId、bio、dietGoal、version、updatedAt。昵称2–24字，简介最多160字；饮食目标为均衡饮食/控制热量/高蛋白/清淡少油。旧账号迁移时自动补建资料。

修改必须提交读取时的version，过期返回409，重新读取后再编辑。avatarMode=keep保留上传头像；preset恢复预设，旧对象排队延迟删除。头像私有存储，所有者之外拒绝签名。上传头像后版本变化，应使用返回的最新资料。

菜谱search同时匹配规范化食材名。推荐接口未指定homeRegion/goal时使用账号地区映射与饮食目标；显式参数优先。头像接口与用餐照片接口互不混用。

推荐增量参数：maxMinutes=0或1..1440、intent=cook或record、batch=0..1000000；非法值返回400。record模式去除库存/临期评分，筛选、忌口与显式地区仍生效。maxMinutes=0不限时；非零时排除未知耗时。


2026-11-03 双偏好调整：设置分别保存做饭与外食/外卖的地区风味、饮食目标和学习开关，本地优先。菜谱页可切换场景，今日与餐数/支出/热量统计不按场景拆分。做饭参考库存、临期、烹饪时间及在家记录；外食为点菜灵感，不代表实际商家或外卖时效/售价，仅从餐馆、外卖、食堂记录学习。历史未标明用餐方式和旧反馈归做饭。事件 intent=cook/record，后端 migration008 以 (user_id,intent) 隔离模型，DELETE /catalog/recommendations/learning?intent=cook 仅清指定场景反馈；无参保持清除全部兼容行为。两套显式偏好目前仅保存在设备，不宣称跨设备同步。

## 当前账号工作区（迁移020，更新前述设备本地偏好的历史描述）

以下路径均在 `/api/v1` 下，需当前设备 Bearer 登录。GET `/account/workspace` 返回 `{payload,version,updated_at}`；从未上传时 payload=null、version=0。PUT 同路径接受 `{baseVersion,payload:{format:1,plans:[],preferences:{}}}`，返回保存后的记录；过期版本409。用户行锁串行化首次创建和更新，不改变六类实体增量同步游标。

工作区覆盖周计划、收藏夹与保存筛选所在 experience:v1、做饭/外食偏好和 household:v1；允许偏好键以 backend/src/workspace.ts 为准。替换须先对照本地/云端，保留本地内容签名检查；签名按对象键排序、数组保序，防止JSONB排序引起假冲突。照片、账号凭证及设备设置不进入此工作区。当前按整份工作区选择，不承诺字段自动合并。

DELETE `/catalog/recommendations/events/latest?recipeId=UUID&intent=cook|record&action=like|dislike|recently_eaten|too_complex|not_my_taste|skip` 仅撤销当前账号匹配场景和动作的最近事件；action 允许值以 CatalogController 为准。

同步可选字段新增开封日期、费用分摊、剩菜关联及结构化试做，详见 docs/dual-platform-contract.md。费用合计按整数分校验，示例主体份额取分向下；公共社区隐藏私人分摊费用及本地路径。

## 0.3.0 补充（迁移021）

- POST `/catalog/corrections`：登录用户提交公共菜谱的 `{recipeId,category,detail}`；category=做法/用量/时间/来源/其他，trim后detail至少2字、最多1000字。相同用户相同待处理内容在事务内去重；每日最多20条。不会直接修改菜谱。
- GET `/admin/corrections?page=1`：仅管理员，20条分页，待处理优先；不返回报告者身份。POST `/admin/corrections/:id` 接受 `{status:'resolved'|'dismissed',reason}`，仅pending可处理，记录审计，重复409。管理端菜谱纠错可先打开菜谱编辑，再填写处理依据。
- Meal可选 `energyReference`（默认-1未知）与`consumedFraction`（0<值<=1）。已知reference时`calories=round(energyReference*consumedFraction)`，`calorieSource`为手动估算/包装标签/称重计算/菜谱推算。`calories`用于实际摄入统计，reference不是自动AI检测值。旧无reference记录继续兼容。
- 工作区PUT保持原格式。逐项三方合并在客户端完成，提交整个合并结果仍检查baseVersion；本地变化也拒绝覆盖。Cloud.mergeWorkspace先提交CAS，随后事务应用；若此时本地又变，保留本地并要求重新比较，不能假装两端已一致。

### 0.4.0 社区检索与试做自报

`GET /community/posts/page` 保留scope/cursor，增加recipeId、region（地区或菜系）、outcome（空/成功/需改进）、data（all/real/demo）。条件同时满足，游标与整套条件绑定，换条件必须清空cursor。原有访问权限、价格隐藏与演示标识保留。

`GET /community/recipes/:recipeId/trials` 需登录，返回participants、success、needs_improvement、average_minutes（无数据null）、evidence=用户自报、verified=false、excludesDemo=true。每位真实活跃用户仅计最新已审核公开单菜试做，整餐多道菜的耗时不归给单道菜；不公开参与者身份，不将自报标记为专业认证。

### 0.4.1 社区关键词搜索

`GET /community/posts/page` 新增 `q`，最多80字符，trim后对标题/正文/话题/试做经验作大小写不敏感的字面子串匹配，不检索地点与价格。可组合原scope/recipeId/region/outcome/data；关键词也绑定到游标，切换词必须从第一页开始。不向菜谱热度或历史写入数据。
