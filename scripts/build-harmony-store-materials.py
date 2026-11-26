#!/usr/bin/env python3
"""Compose store artwork from native screenshots and export legal pages from app source."""
from pathlib import Path
import json,subprocess,html,hashlib,shutil
from PIL import Image,ImageDraw,ImageFont,ImageFilter
R=Path(__file__).resolve().parents[1];O=R/'outputs/harmony-store';P=O/'promo';P.mkdir(parents=True,exist_ok=True)
node=r"""const fs=require('fs'),vm=require('vm'),ts=require('./backend/node_modules/typescript');const m={exports:{}};const code=ts.transpileModule(fs.readFileSync('client/entry/src/main/ets/model/ReleaseLegal.ets','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports:m.exports,require:()=>({})});const c=JSON.parse(fs.readFileSync('client/entry/src/main/resources/rawfile/release-legal.json'));console.log(JSON.stringify(['privacy','terms','support','permissions','ai','about'].map(key=>({key,title:m.exports.legalTitle(key),paragraphs:m.exports.legalParagraphs(key,c,'0.9.25 (43)')}))));"""
data=json.loads(subprocess.check_output(['node','-e',node],cwd=R,text=True))
css='body{margin:0;background:#f8f4e8;color:#354e43;font-family:system-ui,-apple-system,sans-serif;line-height:1.9}main{max-width:880px;margin:auto;padding:40px 24px}h1{font-size:32px}p{white-space:pre-wrap;background:#fffdf6;padding:24px;border-radius:16px}a{color:#6e5781}img{max-width:100%;border-radius:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:18px}.note{background:#f2e5d1;padding:18px;border-radius:12px}small{color:#747266}'
for doc in data:
 content=''.join('<p>'+html.escape(t)+'</p>' for t in doc['paragraphs'])
 (O/(doc['key']+'.html')).write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>开饭小怪 · '+doc['title']+'</title><style>'+css+'</style><main><h1>'+doc['title']+'</h1>'+content+'</main></html>')
 (O/(doc['key']+'.md')).write_text('# '+doc['title']+'\n\n'+'\n\n'.join(doc['paragraphs'])+'\n')
media=R/'client/entry/src/main/resources/base/media';font='/System/Library/Fonts/STHeiti Medium.ttc';light='/System/Library/Fonts/STHeiti Light.ttc'
def f(sz,bold=False):return ImageFont.truetype(font if bold else light,sz)
def txt(d,xy,text,size=40,color='#36564D',bold=False):d.text(xy,text,font=f(size,bold),fill=color)
def center(d,y,text,size,color='#36564D',bold=False,w=1080):
 ft=f(size,bold);box=d.textbbox((0,0),text,font=ft);d.text(((w-(box[2]-box[0]))/2,y),text,font=ft,fill=color)
texture=Image.open(media/'crayon_paper_tile.png').convert('RGB');mascot=Image.open(media/'brand_monster.png').convert('RGBA')
features=[('01-today','store-current-home.jpeg','今天也要好好吃饭','从三餐安排，开始照顾日常','今日概览 · 日历 · 用餐记录','#DDE7D9'),('02-draw','store-current-draw.jpeg','今天吃什么？交给小怪','抽一道，或按人数与时间挑选','抽餐与条件筛选 · 自己确认再安排','#F1E2BC'),('03-recipes','store-current-recipe.jpeg','做饭有步骤，心里有底','准备食材，再一步步做好','分步做法 · 备料参考 · 烹饪计时','#DCE6ED'),('04-ai','store-current-ai.jpeg','和小怪聊聊这道菜','火候、替换、备菜，一起想办法','AI 需联网、登录及本次授权 · 建议需核实','#E6DCEA'),('05-pantry','store-current-pantry.jpeg','食材有记录，安排更从容','把库存、临期与采购放在一起','本机管理可用 · 提醒需主动开启','#E0E9DB')]
artifacts=[];images=[]
for base,shot,title,sub,note,tint in features:
 im=texture.resize((1080,1920));d=ImageDraw.Draw(im);d.ellipse((-230,1140,650,2020),fill=tint);d.ellipse((850,-120,1250,280),fill=tint)
 txt(d,(64,52),'开饭小怪',34,bold=True);txt(d,(64,112),'今天，也要好好吃饭。',24,color='#827665')
 pet=mascot.resize((155,155));im.paste(pet,(870,35),pet)
 center(d,208,title,64,bold=True);center(d,309,sub,31,color='#716D63')
 screen=Image.open(R/'work/screenshots'/shot).convert('RGB');screen.thumbnail((640,1360),Image.Resampling.LANCZOS);sw,sh=screen.size;x=(1080-sw)//2;y=420
 shadow=Image.new('RGBA',im.size);sd=ImageDraw.Draw(shadow);sd.rounded_rectangle((x-18,y-10,x+sw+22,y+sh+32),radius=46,fill='#47605240');shadow=shadow.filter(ImageFilter.GaussianBlur(18));im=Image.alpha_composite(im.convert('RGBA'),shadow);d=ImageDraw.Draw(im);d.rounded_rectangle((x-10,y-10,x+sw+10,y+sh+10),radius=32,fill='#FFFDF6',outline='#B5B4A7',width=2)
 mask=Image.new('L',screen.size,0);ImageDraw.Draw(mask).rounded_rectangle((0,0,sw,sh),radius=22,fill=255);im.paste(screen,(x,y),mask);d=ImageDraw.Draw(im)
 center(d,1802,note,25,color='#706E62');center(d,1853,'实际应用界面 · HarmonyOS',21,color='#8B887C')
 target=P/(base+'.jpg');im.convert('RGB').save(target,quality=94,optimize=True);assert target.stat().st_size<5*1024*1024
 artifacts.append({'path':str(target.relative_to(R)),'kind':'generated_art','purpose':'商店手机竖向介绍图，使用实际鸿蒙界面排版合成','target_path':str(target.relative_to(R)),'source_screenshot':'work/screenshots/'+shot,'capture_tool':'Pillow composition (not a screenshot)'})
 images.append(im.convert('RGB').resize((216,384)))
icon=Image.new('RGB',(1024,1024),'#FFF9EC');foreground=Image.open(R/'client/AppScope/resources/base/media/app_icon.png').convert('RGBA').resize((1024,1024),Image.Resampling.LANCZOS);icon.paste(foreground,(0,0),foreground);icon.save(O/'app-icon-1024.png',optimize=True);assert (O/'app-icon-1024.png').stat().st_size<3*1024*1024
# Extra landscape brand cover; separate from mandatory portrait screenshot group.
cover=texture.resize((1920,1080));d=ImageDraw.Draw(cover);d.ellipse((1200,-100,2150,1100),fill='#E5DDE9');pet=mascot.resize((750,750));cover.paste(pet,(1120,120),pet);txt(d,(130,200),'开饭小怪',126,bold=True);txt(d,(140,385),'今天，也要好好吃饭。',54);txt(d,(143,520),'菜谱 · 抽餐 · 记餐 · 食材管理',36,color='#7A715F');txt(d,(143,600),'和小怪聊聊做法，把一餐安排好。',34,color='#7A715F');txt(d,(143,835),'AI 需联网、登录及授权，生成建议仅供参考',25,color='#7A715F');cover.save(P/'brand-cover-1920x1080.jpg',quality=94,optimize=True)
artifacts.extend([{'path':str((O/'app-icon-1024.png').relative_to(R)),'kind':'generated_art','purpose':'商店图标，复用应用正式图标','target_path':str((O/'app-icon-1024.png').relative_to(R))},{'path':str((P/'brand-cover-1920x1080.jpg').relative_to(R)),'kind':'generated_art','purpose':'补充品牌宣传封面，不与竖向商店介绍图混用','target_path':str((P/'brand-cover-1920x1080.jpg').relative_to(R))}])
gallery=Image.new('RGB',(1080,384),'#FCF8EF')
for i,im in enumerate(images):gallery.paste(im,(216*i,0))
gallery.save(O/'promo-preview.jpg',quality=93)
manifest=R/'work/artifacts.json';a=json.loads(manifest.read_text());paths={x['path'] for x in artifacts};a['files']=[x for x in a['files'] if x['path'] not in paths]+artifacts;manifest.write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n')
links=''.join('<a href="'+x['key']+'.html">'+x['title']+'</a>　' for x in data)
pictures=''.join('<a href="promo/'+b+'.jpg"><img src="promo/'+b+'.jpg" alt="'+title+'"></a>' for b,shot,title,*_ in features)
(O/'index.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>开饭小怪 · 鸿蒙提审材料</title><style>'+css+'</style><main><small>HarmonyOS · 0.9.25 (43)</small><h1>开饭小怪 · 提审材料</h1><div class="note">已准备正式签名 .app 和素材。APP备案、AI资质、政策公网地址及真机验收仍需完成；这不是审核通过保证。</div><p><a href="../kaifan-monster-harmony-release.app">下载上传用 .app</a>　<a href="submission-guide.md">提审指南与服务勾选</a>　<a href="store-copy.md">商店文案</a>　<a href="ai-declaration.md">AI声明与待补证据</a>　<a href="app-icon-1024.png">1024图标</a></p><h2>手机介绍图 · 1080 × 1920</h2><div class="grid">'+pictures+'</div><p>'+links+'</p><p><a href="promo/brand-cover-1920x1080.jpg">补充品牌宣传封面</a> · 1920 × 1080，不与手机竖图混用。</p></main></html>')
print(json.dumps({'output':str(O),'posters':5,'dimensions':'1080x1920','legalPages':6,'iconBytes':(O/'app-icon-1024.png').stat().st_size},ensure_ascii=False))
