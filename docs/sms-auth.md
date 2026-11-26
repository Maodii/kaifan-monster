# 阿里云短信认证接入

产品为号码认证服务中的短信认证原子能力，非普通短信SendSms，也不需要客户端号码认证HAR。后端使用官方 @alicloud/dypnsapi20170525 2.0.0 的 SendSmsVerifyCode、CheckSmsVerifyCode。系统签名YOUR_APPROVED_SIGN；100001登录注册，100003重置密码，100004绑定新手机，100005已绑定手机验证（注销）。换绑尚未开放，不使用100002。

## 账号契约

- POST /api/v1/auth/sms/send：{phone,purpose:'login'|'reset'}，返回challengeId、expiresIn=300、retryAfter=60、phoneMasked。
- POST /auth/sms/login：{challengeId,code,deviceName}，返回原有JWT Session。已验证手机号查账号，不存在则自动创建。不会按旧账号名称或未验证邮箱推断手机号归属。
- GET /auth/sms/status：登录后获取{enabled,phoneBound,phoneMasked}。
- POST /auth/sms/account/send：登录后{phone,purpose:'bind'|'close'}，绑定与注销验证码绑定当前账号及设备。
- POST /auth/sms/bind：{challengeId,code,currentPassword}，保留用户ID及全部数据；需要原账号密码，已绑定其他账号不合并。
- POST /auth/sms/reset：{challengeId,code,newPassword}，仅已绑定普通用户，成功后撤销所有设备和旧密码重置挑战。
- POST /auth/sms/close：{challengeId,code,confirmation:'注销我的账号'}，复用现有注销和家庭数据保护；支持没有自设密码的短信账号注销。原密码注销也会清除手机号及短信挑战。

除首项外上面简写路径均以/api/v1为前缀。管理员保持原账号密码入口，不允许短信绑定/登录/找回。历史账号先账号密码登录，再明确绑定手机，避免新建独立空间后误以为原数据丢失。

## 安全与费用

密钥只写ECS /opt/kaifan/.env（0600），不写客户端、Git、报告或聊天。用户提供的CSV保留在用户下载目录且chmod0600，不复制。进程不会打印SDK异常详情/手机号/验证码/请求正文。SMS_AUTH_ENABLED控制开关，ALIYUN_SMS_SIGN_NAME指定系统签名，SMS_AUTH_DAILY_LIMIT默认100次/滚动24小时。

PostgreSQL记录挑战ID、手机号、用途、账号/设备、服务端HMAC后的IP、状态、次数和时间，不存验证码。每次挑战独立SchemeName（20字符），验证码由阿里云生成核验；只接受明确PASS。同一手机新挑战使旧挑战失效；核验成功事务内消费，最多5次核验，五分钟到期。服务端每手机号60秒间隔、24小时5次，每IP小时20次，全局每日100次，失败发送也计数，不自动重试可能收费的调用。挑战记录在后续发送时清理7天前数据，注销删除关联数据。数据库不可用时不发送。

真实短信发送可能产生套餐扣费，隔离测试只用模拟供应商。只读账单API用于确认凭证可访问，不证明真实短信送达或模板组合最终被接受。阿里云返回成功也仅代表受理，最终须真实手机验收。

## 配置与验证

- backend/migrations/025_sms_auth.sql：手机号唯一身份、挑战表。
- backend/test/sms-auth.integration.ts：隔离schema验证自动注册/双端共享/不误合并、绑定、用途隔离、持久次数、过期、并发重发、供应商失败、注销和开关；临时schema清除。
- scripts/cloud/test-sms-auth.py：使用专用SSH隧道15432及内存凭证执行短信与原账号生命周期回归。
- backend/test/sms-client-core.cjs：共享手机号输入、发送后手机/用途关联、过期及重发规则。
- scripts/cloud/deploy-sms-auth.py：最小源文件及镜像回退集，部署成功并独立验收后删除；不备份.env或用户数据。

RAM当前为AliyunDypnsFullAccess，后续可改为仅dypns:SendSmsVerifyCode和dypns:CheckSmsVerifyCode的自定义权限（只读账单诊断需另行只读权限）。ECS实例角色是后续免长期密钥的升级路线。

## 本轮交付（0.9.29 / 47）

鸿蒙和安卓新增短信登录/自动注册、旧账号密码入口、显式手机号绑定、重置密码和短信注销入口。保留上一版统一弹窗、日期时间及选择面板。隐私政策版本2026-11-18.1，说明阿里云手机号认证及挑战记录期限；验证码发送前需明确同意。

真实手机1**********已发送1条，用户实际收码后由阿里云核验成功，成功挑战重放被拒绝。新手机号账号保留，临时验收设备会话已退出，不在客户端或报告保存验证码/令牌。该账号是独立手机号账号；没有擅自合并历史账号数据。

服务器来源与最小回退集已验收，回退临时文件和标签已清理。正式API环境包含凭证，后续部署须保留；CSV原件留在用户下载目录，未复制到工程。

报告：work/reports/sms-auth-{integration,cloud,real-phone,android-ui,release}.json。浏览器界面测试使用模拟供应商，不等同于两端真机；真实收码验证发生在正式后端。没有连接真机或提交应用商店。鸿蒙开发证书/Profile未配置，调试HAP未签名；已有正式证书用于release HAP/APP。

## 登录交互精修

两端手机号按中国大陆 `^1[3-9]\d{9}$` 校验；正确后绿勾及文字反馈，发送还需协议同意、冷却结束和无进行中请求。输入框采用180ms浮动标签与焦点描边，减少动态效果设置下关闭动画。注册/重置密码显示6–128位、包含字母、包含数字三项即时提示；密码可显隐。验证码6位、5分钟绝对过期，手机号改变后旧挑战不可提交。

发送后60秒倒计时，安全元数据按服务地址及账号隔离保存，刷新/重启恢复剩余时间，不保存验证码或密码。按钮显示发送/验证状态并禁止重复操作；后端仍为限流及过期的最终裁决者。格式绿勾只表示输入格式正确，不代表号码归属已验证。

本轮新增手机号每日5次、同IP每小时20次及全局预算的隔离供应商测试，短信后端共14组通过；浏览器9组覆盖手机号门禁、密码要求、显隐、刷新冷却及320/390/768宽度。未额外发送真实短信。账号密码入口仍按原账号登录，不宣称已支持手机号密码别名。
