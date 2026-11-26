import { ClientTelemetry } from './ClientTelemetry';
import { preferences } from '@kit.ArkData';
import { common } from '@kit.AbilityKit';
import { util } from '@kit.ArkTS';
export class LegalConfig {
 organization:string='';supportEmail:string='';privacyEmail:string='';appRecordNumber:string='';policyVersion:string='2026-11-18.1';
}
export class PrivacyAccess {
 static allowed:boolean=false;
 static analyticsEnabled:boolean=false;
 static require():void{if(!PrivacyAccess.allowed){throw new Error('当前为本机模式。请到我的 → 关于与支持 → 隐私与联网选择，阅读并同意后开启云功能');}}
}
export class LegalStore {
 config:LegalConfig=new LegalConfig();private prefs:preferences.Preferences|undefined=undefined;
 async load(context:common.UIAbilityContext):Promise<string>{
  PrivacyAccess.allowed=false;PrivacyAccess.analyticsEnabled=false;ClientTelemetry.clear();
  const bytes:Uint8Array=await context.resourceManager.getRawFileContent('release-legal.json');
  this.config=JSON.parse(util.TextDecoder.create('utf-8').decodeToString(bytes)) as LegalConfig;
  this.prefs=await preferences.getPreferences(context,{name:'kaifan_privacy'});
  if((await this.prefs.get('version','')).toString()!==this.config.policyVersion){return '';}
  PrivacyAccess.analyticsEnabled=(await this.prefs.get('analytics','false')).toString()==='true';const choice:string=(await this.prefs.get('choice','')).toString();PrivacyAccess.allowed=choice==='cloud';return choice;
 }
 async aiGranted(owner:string):Promise<boolean>{if(!owner||!this.prefs||!PrivacyAccess.allowed){return false;}return String(await this.prefs.get('aiConsent:'+owner,''))===this.config.policyVersion+'|'+String(await this.prefs.get('chosenAt',''));}
 async setAiGranted(owner:string,on:boolean):Promise<void>{if(!owner||!this.prefs){throw new Error('授权无法保存');}const stamp:string=this.config.policyVersion+'|'+String(await this.prefs.get('chosenAt',''));await this.prefs.put('aiConsent:'+owner,on?stamp:'');await this.prefs.flush();}
 async setAnalytics(enabled:boolean):Promise<void>{
  if(!this.prefs){throw new Error('隐私设置暂不可用');}await this.prefs.put('analytics',enabled?'true':'false');await this.prefs.flush();PrivacyAccess.analyticsEnabled=enabled;ClientTelemetry.clear();
 }
 async choose(cloud:boolean):Promise<void>{
  if(!this.prefs){throw new Error('隐私选择暂未保存，请重试');}
  await this.prefs.put('version',this.config.policyVersion);await this.prefs.put('choice',cloud?'cloud':'local');await this.prefs.put('chosenAt',new Date().toISOString());await this.prefs.flush();PrivacyAccess.allowed=cloud;if(!cloud){ClientTelemetry.clear();}
 }
}
export function legalTitle(key:string):string{
 if(key==='privacy'){return '隐私政策';}if(key==='terms'){return '用户服务协议';}if(key==='ai'){return '使用守则';}if(key==='permissions'){return '权限与第三方服务';}if(key==='support'){return '使用帮助';}return '版本与更新';
}
export function legalParagraphs(key:string,c:LegalConfig,version:string):string[]{
 const stamp:string='更新日期：2026年11月25日';
 if(key==='privacy'){return [stamp,
 '运营主体：'+c.organization+'\n备案号：'+c.appRecordNumber+'\n隐私联系邮箱：'+c.privacyEmail,
 '使用与选择\n不登录也能浏览菜谱、记录用餐和管理食材。记录保存在设备上，卸载或清除应用数据可能导致未备份内容丢失。账号、同步及云端 AI 均由你选择开启。',
 '短信认证\n你主动获取验证码时，手机号会由应用后端提交阿里云号码认证服务，用于发送及核验验证码，实现注册、登录、绑定或找回密码。验证码5分钟有效，核验成功后失效。服务端保存手机号绑定关系，并为防滥用记录用途、时间、结果及IP的不可逆摘要；不保存验证码，挑战记录在后续发送时清理7天前数据。注销时清除绑定关系和关联挑战。已有账号需先登录后明确绑定，不自动合并账号。',
 '账号与同步\n注册时处理你填写的账号、密码、昵称及可选头像和地区。密码以哈希保存。主动同步的用餐、食材、采购和计划用于账号恢复与多设备使用。自动同步可在设置中关闭。服务会处理必要的网络与安全日志。',
 '云服务质量统计\n为维护云服务稳定性和改进体验，服务端记录账号关联的接口类型、调用时间、状态和耗时，以及AI回答结果类别、首字耗时和你主动选择的评价原因；不为统计保存聊天原文、照片、请求正文、IP或设备指纹。统计记录保存90天，到期分批清理，仅管理员可访问。管理员和演示账号可单独筛选。仅使用本机功能时不发送这些云端记录。',
 '可选客户端体验统计\n在“我的 → 关于与支持”可单独开启或关闭，默认关闭。开启后且同意云功能并登录时，记录应用前台启动、固定页面分类、AI发送/取消/重试/完成和耗时、图片上传成败与耗时，以及平台和应用版本；不采集原文、图片、搜索词、设备标识或指纹。只在内存短暂排队，最多60条，每批20条，失败最多尝试3次；关闭、退出、切换账号或服务地址时清除待发记录。已发往服务端的记录按90天规则清理，注销时删除。此开关不影响云服务必要的运行与安全日志。',
 '照片与权限\n拍照或选图只在你点击相应按钮后调用，只读取你选择的照片，不批量读取相册。不申请定位、通讯录或录音权限。提醒与通知由你选择开启。',
 'AI 与百炼 API\n云端回答通过应用服务器调用阿里云百炼 API。发送内容包括本次问题、所选菜谱摘要和本次条件；需要查询菜谱做法、新菜灵感或实时资料时，自动联网；所选内容也用于百炼内置搜索工具检索公开资料，并展示工具实际返回的来源。未联网时基于模型知识回答。只有你选择时才附带库存名称或上一轮问答。不会自动发送照片、密码或完整历史。输入输出的服务商处理规则适用阿里云服务约定。',
 '保护与管理\n云服务使用 HTTPS 和账号访问控制。可修改资料、导出记录、关闭自动同步或撤回云功能同意；撤回不会自动删除已有记录。注销入口：我的 → 账号与同步 → 账号资料/安全。应用不含广告追踪功能。',
 '未成年人和更新\n未成年人请在监护人指导下使用。隐私规则发生重要变化时会提示并重新征求相关同意。权限与第三方服务详情可在使用帮助中查看。'];}
 if(key==='terms'){return [stamp,
 '服务范围\n开饭小怪提供菜谱、抽餐、记餐、食材管理与可选 AI 饮食助手。部分联网服务需登录并同意隐私政策。',
 '使用责任\n请妥善保管账号，只上传你有权使用的内容。禁止冒用、攻击服务、绕过访问控制或获取其他用户的数据。',
 '饮食与 AI 建议\n菜谱、用量、费用、时间和热量仅供参考。请核对过敏原、新鲜度、熟度与厨具安全。AI 可能出错，不能替代医疗诊断或专业建议。',
 '内容与权益\n你的私有记录不会因保存而自动公开。原创内容及第三方内容的权利归各自权利人。不得利用本服务侵害他人合法权益。',
 '费用与服务变化\n当前无应用内购买、订阅或广告。网络流量可能由运营商收费。未来收费或重要协议变更会另行提示，不自动扣费。服务可能因维护或故障暂时不可用。',
 '退出与注销\n可退出账号、关闭云功能或注销账号。注销云端账号与删除设备记录是独立操作。请先备份重要内容；法定权利不因本协议被排除。'];}
 if(key==='permissions'){return [
 '网络与提醒\n联网用于账号、同步、目录更新和你主动请求的 AI；网络状态用于判断 Wi-Fi 同步条件。通知与系统提醒用于你开启的临期提醒和烹饪计时。',
 '拍照、选图与文件\nScan Kit 用于扫码；Camera Picker 用于主动拍照；Photo Picker 仅读取所选照片。文件选择器用于导入和导出；剪贴板仅在你点击复制时写入。拒绝这些能力不影响手动记录。',
 '云端受托服务\n阿里云提供云端数据托管和短信认证，短信认证按你主动操作处理手机号及验证码核验；阿里云百炼 API 根据本次授权处理问题及所选上下文，生成饮食建议。服务商隐私政策：https://terms.alicdn.com/legal-agreement/terms/suit_bu1_ali_cloud/suit_bu1_ali_cloud201902141733_81641.html',
 '第三方能力\n系统提供数据库、照片选择、文件及提醒等能力。应用未接入广告或第三方统计 SDK。'];}
 if(key==='ai'){return [
 '让小怪帮你吃好每一餐\n小怪可协助选菜、整理记餐草稿、检查库存和准备采购。云端回答使用阿里云百炼 API，AI 生成内容仅供参考。',
 '先核对，再执行\n扣减库存、保存菜谱或记餐等操作需先查看草稿，再由你确认。选图、拍照和上传也需主动操作。不要将尚未保存或上传的内容视为已经完成。',
 '保护账号与隐私\n不要输入密码、密钥、身份证号或他人敏感信息。不允许注入指令、冒用身份、攻击服务或访问他人数据。',
 '适用范围\n助手用于做饭、食材、采购、用餐记录和饮食计划，不用于通用编程、违法内容或医疗诊断。过敏、营养及食品安全信息请自行核实。'];}
 if(key==='support'){return ['反馈邮箱：'+c.supportEmail,
 '快速开始\n今日查看三餐与计划；菜谱里找菜、筛选或抽一餐；记餐记录吃了什么；食材管理库存与购买记录。',
 '一句话记餐\n对小怪说“今天吃了辣椒炒肉，帮我记入晚餐”，核对草稿后保存。想添加照片，在记餐页选择拍照或相册。',
 'AI 无法使用\n检查网络、登录状态、云功能授权和助手联网授权。服务额度或供应商维护也可能影响使用。AI 使用阿里云百炼 API。',
 '同步与换机\n登录后主动同步记录。照片需要选择上传；未同步的原图请另行保留。换机前建议导出备份。',
 '提醒与问题反馈\n提醒未送达时检查系统通知设置。反馈问题时注明版本、设备型号和操作步骤，截图先遮挡隐私，不要发送密码或令牌。',
 '权限与第三方服务\n相关说明见本页“权限与第三方服务”入口。'];}
 return ['开饭小怪\n版本 '+version,
 '运营主体：'+c.organization+'\n备案号：'+c.appRecordNumber+'\n反馈邮箱：'+c.supportEmail,
 '本次更新\n统一确认、提醒、选择、日期与时间窗口的配色、间距与按钮。\n选项较多时支持查找，统一选中样式与触控高度。\n优化窗口取消、返回、长内容滚动与窄屏适配。',
 'AI 服务\n云端 AI 通过阿里云百炼 API 提供，生成内容仅供参考。'];
}
