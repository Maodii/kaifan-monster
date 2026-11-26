const ClientMetrics=require('ClientTelemetry');
// Native preference consent, shared fail-closed Cloud guard, and Android-specific legal disclosures.
const releaseLegal=require('ReleaseLegal'),legalConfig=window.kaifanLegal;
let releaseStartPending=false;
let releaseStarted=false,legalPanel='',legalReturn='',privacyExpanded=false;
const legalHistory=[];
const legalPref=(key)=>P.invoke('prefGet',{name:'kaifan_privacy',key,fallback:''});
const writeLegal=(key,value)=>P.invoke('prefPut',{name:'kaifan_privacy',key,value});
const legalVersion=()=>`${window.kaifanBuild.versionName} (${window.kaifanBuild.versionCode})`;
const legalKeys=['privacy','terms','permissions','ai','support','about'];
const legalHints={privacy:'信息如何使用，你有哪些选择',terms:'服务范围、使用规则与权益',permissions:'按需使用，随时可以查看',ai:'AI 使用范围与安全',support:'记餐、同步与常见问题',about:'版本号与本次更新'};
function androidLegalText(key){
 if(key==='permissions')return ['权限与第三方服务','网络用于账号、同步和主动请求的 AI；通知用于你开启的提醒与计时。拍照、系统照片选择器和文件选择器仅在你主动操作时使用。扫码由 ZXing 处理，不读取整个相册，不申请定位、通讯录或录音权限。',...releaseLegal.legalParagraphs('permissions',legalConfig,legalVersion()).filter(t=>t.startsWith('云端受托服务'))];
 return releaseLegal.legalParagraphs(key,legalConfig,legalVersion()).map(t=>t.replaceAll('HarmonyOS','Android').replaceAll('com.shiku.foodkeeper','com.kaifan.monster').replaceAll('Scan Kit','ZXing').replaceAll('Camera Picker','系统相机').replaceAll('Photo Picker','系统照片选择器'));
}
function legalLink(key){return `<button class="legal-link" data-action="legalDocument" data-value="${key}"><img src="media/legal_${key}.png" alt=""><span><strong>${esc(releaseLegal.legalTitle(key))}</strong><small>${esc(legalHints[key])}</small></span><b aria-hidden="true">›</b></button>`;}
function legalPaint(){
 let host=document.getElementById('release-legal-panel');if(!legalPanel){host?.remove();document.body.classList.remove('legal-visible');return;}
 if(!host){host=document.createElement('section');host.id='release-legal-panel';host.setAttribute('aria-label','隐私与支持');document.body.append(host);}
 document.body.classList.add('legal-visible');document.getElementById('launch-reveal')?.remove();document.getElementById('companion-pet')?.setAttribute('hidden','');
 const back=releaseStarted||legalPanel!=='gate'?'<button class="legal-back" data-action="legalBack">‹ 返回</button>':'';
 if(legalPanel==='gate')host.innerHTML=`<div class="legal-scroll">${back}<div class="legal-hero"><div><small>HELLO, LITTLE MONSTER</small><h1>好好吃饭，<br>也保护你的隐私</h1><span>本机可用　·　云功能可选</span></div><img src="media/brand_monster.png" alt=""></div><article class="legal-summary"><h2>先了解，再选择</h2><p>阅读协议后，你可以只用本机菜谱、记餐和食材管理。账号同步与云端 AI 均为可选。</p><button data-action="legalExpand" aria-expanded="${privacyExpanded}">哪些内容会发送？ <b>${privacyExpanded?'−':'＋'}</b></button>${privacyExpanded?'<p>注册资料与主动同步内容用于云服务；AI 仅发送本次问题、所选菜谱摘要，以及你主动选择的库存或上一轮问答。首次选择前不初始化云请求。</p>':''}</article><p class="legal-caption">协议与使用说明 · 点开阅读</p>${legalKeys.filter(k=>k!=='about').map(legalLink).join('')}<p class="legal-note">本机模式不代表授权云端处理，以后可在“我的 → 关于与支持”更改选择。</p></div><footer class="legal-actions"><button class="legal-primary" data-action="legalCloud">同意协议和隐私政策，开启云功能 ↗</button><button class="legal-local" data-action="legalLocal">暂不授权云功能，仅使用本机</button><small>使用本机功能需遵守用户服务协议</small></footer>`;
 else if(legalPanel==='hub')host.innerHTML=`<div class="legal-scroll">${back}<h1>关于与支持</h1>${['about','privacy','terms','ai','support'].map(legalLink).join('')}<article class="legal-summary"><h2>帮助改进体验（可选）</h2><p>默认关闭；同意云功能并登录后，上报页面分类、操作成败、耗时和版本，不含聊天、照片或搜索词。</p><button data-action="analyticsToggle" aria-pressed="${releaseLegal.PrivacyAccess.analyticsEnabled}">${releaseLegal.PrivacyAccess.analyticsEnabled?'关闭体验统计':'开启体验统计'}</button><h2>隐私与联网选择</h2><p>${releaseLegal.PrivacyAccess.allowed?'当前已授权云功能':'当前为本机模式，账号、同步及云端 AI 请求已关闭。'}</p><button class="legal-primary" data-action="${releaseLegal.PrivacyAccess.allowed?'legalWithdraw':'legalReopen'}">${releaseLegal.PrivacyAccess.allowed?'撤回云功能同意':'阅读并开启云功能'}</button></article></div>`;
 else host.innerHTML=`<div class="legal-scroll">${back}<div class="legal-doc-title"><img src="media/legal_${legalPanel}.png" alt=""><h1>${esc(releaseLegal.legalTitle(legalPanel))}</h1></div>${legalPanel==='support'?legalLink('permissions'):''}${androidLegalText(legalPanel).map(t=>{const [title,...body]=t.split('\n');return `<article class="legal-summary"><h2>${esc(title)}</h2>${body.length?`<p>${esc(body.join('\n'))}</p>`:''}</article>`;}).join('')}</div>`;
 host.querySelector('.legal-scroll').scrollTop=0;host.querySelector('button')?.focus({preventScroll:true});
}
async function legalChoice(cloudOn){
 writeLegal('version',legalConfig.policyVersion);writeLegal('choice',cloudOn?'cloud':'local');writeLegal('chosenAt',new Date().toISOString());releaseLegal.PrivacyAccess.allowed=cloudOn;if(!cloudOn)ClientMetrics.ClientTelemetry.clear();
 if(!releaseStarted){legalPanel='';legalPaint();await releaseOriginalInit();releaseStarted=!!window.__kaifan;}else{legalPanel='hub';legalPaint();}
}
const releaseOriginalInit=init;
function legalReadError(){
 releaseLegal.PrivacyAccess.allowed=false;legalPanel='';legalPaint();
 document.getElementById('launch-reveal')?.remove();
 screen.innerHTML='<section class="legal-start-error" role="alert"><h1>暂时无法读取设置</h1><p>记录仍在，请重试，无需卸载或清除数据。</p><button type="button" data-action="legalRetry">重新读取</button></section>';
 console.error('Privacy preferences unavailable');
}
init=async function(){
 if(releaseStartPending)return;releaseStartPending=true;
 try{
  let choice;try{choice=legalPref('version')===legalConfig.policyVersion?legalPref('choice'):'';releaseLegal.PrivacyAccess.analyticsEnabled=legalPref('analytics')==='true';}catch(_){legalReadError();return;}
  releaseLegal.PrivacyAccess.allowed=choice==='cloud';ClientMetrics.ClientTelemetry.setVersion(legalVersion());
  if(!['cloud','local'].includes(choice)){legalPanel='gate';legalPaint();return;}
  await releaseOriginalInit();releaseStarted=!!window.__kaifan;
 }finally{releaseStartPending=false;}
};
const releaseOriginalRender=render;
render=function(){releaseOriginalRender();if(!document.hidden)ClientMetrics.ClientTelemetry.record('page_view',ClientMetrics.telemetryPage(page));if(page==='mine'){const target=screen.querySelector('.settings-grid')||screen;target.insertAdjacentHTML('beforeend','<button class="setting-tile" data-action="legalHub"><img src="media/legal_about.png" alt=""><span>关于与支持</span></button>');}if(legalPanel)legalPaint();};
const releaseOriginalActions=actions;
actions=async function(action,value){
 if(action==='analyticsToggle'){const enabled=!releaseLegal.PrivacyAccess.analyticsEnabled;try{writeLegal('analytics',enabled?'true':'false');releaseLegal.PrivacyAccess.analyticsEnabled=enabled;ClientMetrics.ClientTelemetry.clear();if(enabled){ClientMetrics.ClientTelemetry.foreground();ClientMetrics.ClientTelemetry.record('page_view',ClientMetrics.telemetryPage(page));}legalPaint();}catch(_){toast('设置未保存，请重试');}return;}
 if(action==='legalRetry'){await init();return;}
 if(action==='legalHub'){legalHistory.length=0;legalPanel='hub';legalPaint();return;}
 if(action==='legalDocument'&&legalKeys.includes(value)){legalHistory.push(legalPanel);legalReturn=legalPanel;legalPanel=value;legalPaint();return;}
 if(action==='legalBack'){if(legalKeys.includes(legalPanel)){legalPanel=legalHistory.pop()||'hub';}else{legalPanel=releaseStarted?'':'gate';}legalPaint();return;}
 if(action==='legalExpand'){privacyExpanded=!privacyExpanded;legalPaint();return;}
 if(action==='legalCloud'||action==='legalLocal'){await legalChoice(action==='legalCloud');return;}
 if(action==='legalReopen'){legalPanel='gate';legalPaint();return;}
 if(action==='legalWithdraw'){
  if(!confirm('切换为本机模式？将退出云端账号并关闭后续云请求，本机记录保留。'))return;
  releaseLegal.PrivacyAccess.allowed=false;ClientMetrics.ClientTelemetry.clear();writeLegal('choice','local');writeLegal('version',legalConfig.policyVersion);clearAssistant();cloud.session=new C.Session();await Vault.clear();parity.autoSync=false;await setting('autoSync',false);legalPanel='hub';legalPaint();return;
 }
 return releaseOriginalActions(action,value);
};
const releaseOriginalBack=window.handleBack;
window.handleBack=function(){if(legalPanel){if(legalPanel==='gate'&&!releaseStarted)return false;void actions('legalBack');return true;}return releaseOriginalBack();};

document.addEventListener('visibilitychange',()=>{if(document.hidden){ClientMetrics.ClientTelemetry.background();}else{ClientMetrics.ClientTelemetry.foreground();ClientMetrics.ClientTelemetry.record('page_view',ClientMetrics.telemetryPage(page));}});
window.addEventListener('pagehide',()=>ClientMetrics.ClientTelemetry.background());
