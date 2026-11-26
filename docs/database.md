# 食库数据库结构

本地客户端使用HarmonyOS RDB保存documents、settings、change outbox、推荐反馈等；本地记录先落盘，账号会话使用安全存储，手动同步才把待同步记录上传。云端PostgreSQL由backend/migrations按序演进；Redis为缓存/同步互斥增强，MinIO保存私有对象。

## 账号与权限

- users保存唯一邮箱、Argon2密码摘要、角色；devices与refresh_tokens负责设备及刷新会话轮换。
- user_profile通过user_id与用户一对一，保存昵称、地区、预设/自定义头像、简介、饮食目标、版本、创建/更新时间。
- regions为34个省级地区字典，资料使用外键，避免自由文字地区漂移；地区与菜系通过共享ProfileCore规则映射。
- user_avatar保存所有者、私有object_key、MIME、大小和时间，限制5MB；资料外键删除头像时置空。对象删除队列负责旧头像和孤立上传对象的延迟清理。
- families/family_member负责家庭授权；访问时重验当前成员资格，不依赖客户端隐藏按钮。

## 业务与菜谱

food_items、barcode_lib、shopping_list、recipes、recipe_favorites、meal_records保留归属、家庭范围、版本、逻辑删除与JSON payload，满足增量同步、冲突与旧版数据兼容。sync日志/幂等记录用于重放和版本检查，不把这些业务表误当临时缓存删除。

recipe_catalog存内置目录与完整原始payload。迁移007新增recipe_ingredient、recipe_step、recipe_diet_tag，分别按recipe_id+position/tag约束唯一，含级联删除及食材/标签查找索引。原料保存数量、单位、是否可选、原始用量文字、来源和估算依据，便于换算与来源展示。recipe_source索引保存公开来源事实（具体字段以迁移为准）。

`npm --prefix backend run seed:recipes` 在事务和advisory lock内按版本幂等更新目录与规范化明细，保留用户菜谱及用餐记录。新补充菜谱从backend/data/recipes-editorial.json进入生成流水线；不能直接编辑生成结果后重新导入覆盖。

## 一致性与隐私

资料PATCH用行锁与预期version避免覆盖其他设备的编辑。同步使用事务锁及独立changeId；库存制作先确认，再以事务更新库存与用餐。示例主体资料和头像默认私有，公共发布仍需二次确认及审核。

同步过的客户端数据库绑定原账号；目前不提供两个账号在同一RDB中的自动隔离切换。仅从未同步的数据可显式解除绑定，保留本地记录，再由用户决定是否同步。

邮箱验证、找回密码邮件、账号注销及跨设备头像真机完整联调尚未实现，不以本地注册成功代替这些能力。

## 购买与消耗历史（本轮）

食材文档新增 `purchasedQuantity`、`purchasePrice` 和 `movements`；流水包含时间、用量、成本、消耗/丢弃原因、菜名及前后余额。原购买快照创建后独立保留，消耗与做菜扣库存和流水在同一事务内保存。现有SQLite文档与服务端JSONB承载，备份与同步保留这些字段，服务端校验数量差与日期等。旧记录无法恢复的原量显示未记录，原金额可从现余金额及累计消费/浪费恢复；不补造历史流水。

`dailyMenu`、`drawDisliked`、`quickstartDone` 为本机偏好。每日结果保存已应用的餐型、人数、费用时间条件与抽选次数；不承诺跨设备同步。386条导入菜谱增加 `editorialGuide`，保留来源原步骤与链接；4条内置菜使用相同运行时模板。模板含摘要、器具、准备清单、步骤标题、操作、取料、火候、时间、完成判断；未载明信息明确标记。

## 当前状态补充（迁移020）

此节更新上文早期实现边界：本机现已按账号分离SQLite与偏好空间；访客记录不自动绑定新账号，需显式导出/预览迁入。账号恢复与注销能力以当前账号模块和验收记录为准，真实邮件提供商尚未接入。

account_workspace：user_id 为 users 外键兼主键、删除账号级联删除；payload JSONB、递增 version、updated_at 和本次写入 device_id。工作区同步计划与指定偏好，不扩展同步实体枚举。CAS 在用户行锁内检查版本后 upsert；本机 plans/preferences/version 在同一SQLite事务保存。workspace_settings 是原始字符串，不应当作食材/家庭实体JSON处理。

开封、分摊、原餐关联、试做内容仍由已有文档JSON承载，不需要为每一可选字段增加关系列。消费撤销追加 restored 流水，并同步补偿后的完整食材文档；不得覆盖后续编辑。剩菜实际记餐使用计划UUID作为记餐UUID，记录sourceMealId，成本为0，原子完成计划；不重复采购和扣库存。当前内置菜谱为454道，早期390道计数属历史记录。

## 0.3.0 菜谱纠错与摄入记录（迁移021）

recipe_corrections以user_id/recipe_id关联账号与公共目录，内容2–1000字、限定分类；pending/resolved/dismissed生命周期。提交在用户行锁内去重并限制每日20条，处理在记录行锁内只允许pending→终态并记录admin_audit。账号删除级联删除其反馈，报告不改变原菜谱。

Meal文档新增energyReference/consumedFraction可选字段；calories存实际吃下值，不能再次除以人数。新有reference的记录严格核对来源与比例，旧未知reference不重算历史。部分采购在一个SQLite事务写实购批次/outbox与原清单余量；快照不匹配整个事务拒绝，避免相同毫秒时间戳漏检。

### 0.4.0 本机日常数据

账号SQLite documents新增leftover_batches与trash；不增加六类同步实体。leftover_batches保存原餐ID、容器、储存方式、手动起止日期、总/余份数、处理流水。处理份数与余量、记餐、出站队列同事务，拒绝旧快照。批次当前仅本机，通过可选备份迁移。

trash存显式删除的库存、采购、记餐、私房菜快照，最多30条、30天，恢复产生新私有ID及version0，原ID删除队列保留；不自动重建原料扣减或原餐关联。登录凭据不进入备份。encrypted envelope版本1：PBKDF2-SHA256/210000/key32B，salt16B，AES256-GCM/iv12B/tag16B，AAD `kaifan-backup:v1`，标准base64，ciphertext包含尾部tag；不自动创建备份或历史文件。
