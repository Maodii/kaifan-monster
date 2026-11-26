# 账号生命周期（本轮新增）

迁移 `011_account_lifecycle.sql` 必须先应用，原有注册/登录/刷新/退出接口保留。注销账号被登录及AuthGuard拒绝，找回密码后所有旧设备access/refresh会话撤销。

## 客户端接口

基础路径 `/api/v1/auth`：

| 接口 | 鉴权 | 请求 / 结果 |
|---|---|---|
| GET `/account` | 当前账号 | `{email,emailVerified,mailDelivery}` |
| POST `/email/request` | 当前账号 | `{email}`，必须当前邮箱；开发文件投递或503明确未配置 |
| POST `/email/confirm` | 当前账号 | `{email,token}`，成功`{verified:true}` |
| POST `/password/request-reset` | 无 | `{email}`；未知邮箱同样受理响应，避免账号枚举 |
| POST `/password/reset` | 无 | `{email,token,newPassword}`，10–128字符密码；成功必须重新登录 |
| DELETE `/account` | 当前账号 | `{password,confirmation:"注销我的账号"}`；成功退出登录，客户端另行询问保留/清除本机数据 |

验证码为64位小写十六进制随机令牌，15分钟有效；只在数据库保存SHA256摘要，单次使用、用途和账号绑定；同用途重发使旧令牌无效，每账号同用途请求间隔60秒。输入令牌仅用于本地开发验证流程，尚无真实邮件供应商适配和深链唤起。

默认邮件服务不可用，接口503并明确说明，不能在UI显示“已发送”。本地开发若明确配置 `AUTH_MAIL_MODE=local-outbox`、`AUTH_MAIL_OUTBOX=/absolute/private/path`，系统以0700目录、0600文件生成开发邮件，API不返回令牌。生产模式禁止开发文件投递。开发邮件含敏感令牌，需由开发者读取，不应进入日志、版本管理、截图、公开静态目录。账号不存在不写文件。测试会删除其自建邮件文件。

## 注销行为与边界

密码再认证且必须精确输入中文确认；失败不修改数据。存在家庭成员关系或家庭共享记录时409阻断，避免静默破坏他人数据。此阶段家庭数据迁移/转让尚未提供完整UI，应明确展示阻断原因。

无共享依赖时，事务内清除该账号私有记录、头像索引、示例主体资料、备份、学习事件、提交和点赞；撤回社区帖子并清空内容，将已有评论正文替换为“账号已注销”以保留其他用户回复关系。账号邮箱匿名化、随机不可用密码、deleted_at和设备撤销阻止继续登录；保留不含原邮箱的用户/设备引用墓碑以维持关系完整性。物理图片删除写入现有持久化删除队列（6分钟宽限），先前已签发链接最多可能仍有效300秒。此API不删除手机本地数据库。

已同步清理本轮discovery_favorite/discovery_search、social_favorite、双向social_follow与发送/接收的social_notification。今后新增用户表仍需同时纳入注销清理；不要把本接口宣称为已完成所有未来模块的数据擦除。客户端同机多账号独立数据库由主对话处理，本模块不修改LocalStore。

## 验证

`npm run typecheck`通过；`node --import tsx test/account-outbox.test.ts`的5组文件权限、令牌摘要、无假投递、跨账号拒绝、提交失败补偿和输入门禁检查通过。该文件系统测试用合成数据库适配器，不代替PostgreSQL测试。`node --env-file=../.env --import tsx test/account-lifecycle.integration.ts`使用随机隔离schema、测试账号和临时开发邮件，覆盖用途/账号/过期/重放、旧令牌重发作废、会话撤销、家庭阻断、注销及其他账号隔离。本机PostgreSQL恢复后真实集成5组通过，临时schema和开发邮件已清理；新增社区关系迁移后再次回归通过。未重启共享服务、模拟器，未操作真实账号或照片。
