import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, publicRoot, siteRoot } from './paths.mjs';
const escape = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function renderLegal() {
  const configured=JSON.parse(fs.readFileSync(path.join(projectRoot,'client/entry/src/main/resources/rawfile/release-legal.json'),'utf8')).supportEmail?.trim();
  const publishedSupport=fs.readFileSync(path.join(projectRoot,'outputs/harmony-store/support.md'),'utf8');
  const siteConfig=JSON.parse(fs.readFileSync(path.join(siteRoot,'site-config.json'),'utf8'));
  const supportEmail=siteConfig.supportEmail || configured || publishedSupport.match(/客服及支持[：:]\s*([^\s]+@[^\s]+)/)?.[1];
  if(!supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail))throw Error('官网支持邮箱需要有效的实际资料，拒绝生成空联系链接');
  const contact=`<a href="mailto:${escape(supportEmail)}">${escape(supportEmail)}</a>`;
  const pages={
    'website-privacy':{title:'官网隐私说明',intro:'安心使用，从了解信息如何被处理开始。',body:[
      ['关于这份说明','本页说明开饭小怪官网如何处理信息。应用内的账号、同步、照片与 AI 功能，请以各端应用内的隐私政策和授权提示为准。'],
      ['浏览官网','官网不设置账号或提交表单，不设置 Cookie，不接入广告或第三方统计，不请求相机、麦克风或定位权限。页面所用图片、字体和脚本由本站提供。'],
      ['页面上的小互动','抽菜、记住灵感与页面切换仅在当前页面内运行。记住的灵感不上传，不写入应用记录，刷新页面后即清除。'],
      ['访问与联系','打开网页需要由浏览器请求本站资源。本站不记录逐次访问日志；服务器仅保留必要的运行错误日志用于故障排查，并按日轮转清理，不用于广告或行为分析。点击邮箱后，由你选择的邮件应用处理邮件，只有你确认发送后才会提交给收件人。请勿在反馈中发送密码、登录令牌或其他敏感信息。'],
      ['应用中的示例主体记录','本机记录、云端同步、照片上传和 AI 数据处理各有对应授权范围。使用前可在应用内查看详细政策；重要记录建议定期导出，避免卸载或清除数据后无法恢复。'],
      ['隐私相关问题',`如需咨询示例主体信息处理或提出隐私请求，请联系 ${contact}。`]
    ]},
    'website-terms':{title:'官网使用说明',intro:'每一份日常灵感，都希望你用得自在。',body:[
      ['内容与功能','官网用于介绍开饭小怪的菜谱、食材管理、记餐、抽餐和可选 AI 助手。页面图片展示应用界面；各端界面与系统能力可能存在差异，具体以实际应用为准。'],
      ['灵感与安全','菜谱、份量、时间和 AI 建议仅供日常参考，不替代医疗、营养诊疗或食品安全判断。请自行确认过敏原、食材新鲜度、熟度及厨具安全。'],
      ['尊重内容','请依法使用网站与应用，尊重品牌、界面、图片、菜谱及其他内容对应的合法权利。提供来源链接不等于自动获得转载授权。'],
      ['关于页面互动','官网抽菜只提供菜谱灵感，不依据示例主体库存作出承诺，不会同步数据或创建用餐记录。页面内“记住灵感”只在本次浏览中有效。'],
      ['应用服务与反馈',`账号、云端功能与其他应用服务适用应用内的用户协议。对官网或应用有疑问，欢迎联系 ${contact}。`]
    ]},
    support:{title:'想说的话，写给小怪',intro:'一点建议、一个疑问，或今天做成的一道菜。',body:[
      ['联系小怪',`客服支持与隐私联系邮箱：${contact}。我们会协助处理使用问题、账号与隐私请求，以及 AI 内容反馈。`],
      ['反馈问题时','告诉我们应用版本、设备型号、系统版本和复现步骤，会更方便定位问题。附图前请遮挡账号、照片等示例主体信息，不要发送密码、令牌或密钥。'],
      ['关于回复','根据现有支持说明，收到请求后会在 15 个工作日内答复处理进展。涉及隐私或账号的请求，可能需要先核验身份。'],
      ['重要记录，请多一份惦记','换机或清理设备前，记得主动导出重要记录，并保留未同步照片的原文件。不要把系统提醒当作重要事项的唯一提醒方式。']
    ]}
  };
  for (const [file, title] of [['privacy','隐私政策'],['terms','用户服务协议']]) {
    const source=fs.readFileSync(path.join(projectRoot,`outputs/harmony-store/${file}.md`),'utf8').trim();
    const blocks=source.split(/\n\s*\n/).filter(block=>!block.startsWith('# '));
    const date=blocks.shift();
    const body=blocks.map(block=>{
      const [heading,...lines]=block.split('\n');
      return [heading,escape(lines.join('\n'))];
    });
    body.push(['联系我们',`客服支持与隐私联系邮箱：${contact}。`]);
    pages[file]={title,intro:`开饭小怪应用 · ${escape(date)}`,body};
  }
  for(const [file,{title,intro,body}] of Object.entries(pages)){
    const content=body.map(([h,p])=>`<h2>${escape(h)}</h2><p>${p}</p>`).join('\n');
    const html=`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · 开饭小怪</title><meta name="theme-color" content="#f8f5ec"><link rel="icon" href="/assets/monster.webp"><link rel="stylesheet" href="/style.css"></head><body><header class="header"><div class="wrap nav"><a class="brand" href="/index.html"><img src="/assets/monster.webp" alt="" width="46" height="46"><span>开饭小怪</span></a><a class="text-link" href="/index.html#preview">逛逛应用 ↗</a></div></header><main class="wrap legal-page"><a class="legal-back" href="/index.html">← 返回首页</a><h1>${title}</h1><p class="legal-scope">${intro}</p>${content}</main><footer class="wrap footer"><div class="footer-links"><a href="/privacy.html">应用隐私政策</a><a href="/terms.html">用户服务协议</a><a href="/support.html">联系小怪</a></div><p>今天也要好好吃饭。</p></footer></body></html>\n`;
    fs.writeFileSync(path.join(publicRoot,`${file}.html`),html);
    if(file==='privacy'||file==='terms'){
      fs.mkdirSync(path.join(publicRoot,file),{recursive:true});
      fs.writeFileSync(path.join(publicRoot,file,'index.html'),html);
    }
  }
}
if(process.argv[1] && path.resolve(process.argv[1])===new URL(import.meta.url).pathname) renderLegal();
