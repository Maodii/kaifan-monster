#!/usr/bin/env python3
"""Prepare/resume per-recipe illustration sheets using the user's provider skill.
No credentials enter this project. Each cell has a stable recipe ID and becomes one asset.
"""
from pathlib import Path
import argparse, json, subprocess, sys, time, hashlib, concurrent.futures, html
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parent.parent
ART=ROOT/'art-source/recipe-covers'; WORK=ROOT/'work/generated-art/recipe-covers'
SKILL=Path('/Users/developer/.codex/skills/api-image/scripts/generate_image.py')
PYTHON='/Users/developer/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
MANIFEST=ART/'manifest.json'

def catalog():
 rs=json.loads((ROOT/'client/entry/src/main/resources/rawfile/recipes.json').read_text())['recipes']
 # The four built-ins live in Models.ets; preserve those stable IDs too.
 originals=[dict(id='tomato-eggs',name='番茄炒蛋',category='家常菜',ingredients=[dict(name='西红柿'),dict(name='鸡蛋')],steps=['番茄切块，鸡蛋打散。','鸡蛋先炒凝固盛出；番茄炒软，再加鸡蛋拌匀。']),dict(id='greens',name='清炒时蔬',category='家常菜',ingredients=[dict(name='青菜')],steps=['青菜洗净，热锅快炒至熟，呈现青菜叶和浅色菜梗。']),dict(id='soup',name='菜干猪骨汤',category='汤类',ingredients=[dict(name='猪骨'),dict(name='菜干')],steps=['猪骨焯水，菜干泡软，慢煲成清澈金黄汤汁，骨块和深绿色菜干清晰可见。']),dict(id='steamed-eggs',name='嫩滑蒸蛋',category='快手菜',ingredients=[dict(name='鸡蛋')],steps=['蛋液加温水过筛，入碗蒸成平滑淡黄色凝乳表面，不是炒蛋、蛋花汤或面条。'])]
 allrs=originals+rs
 assert len({r['id'] for r in allrs})==len(allrs)
 pilot=['番茄炒蛋','清炒时蔬','菜干猪骨汤','嫩滑蒸蛋','微波炉鸡蛋羹','皮蛋瘦肉粥','徽派红烧肉','咖喱炒蟹']
 diet=next(r['name'] for r in rs if '藜麦' in r['name'])
 pilot.append(diet)
 first=[]
 for name in pilot:
  first.append(next(r for r in allrs if r['name']==name and r['id'] not in {v['id'] for v in first}))
 return first+[r for r in allrs if r['id'] not in {v['id'] for v in first}]

def prompt_for(rs):
 rows=(len(rs)+2)//3
 text=f'''用途：食库App的菜谱专属封面素材。制作一张严格3列、{rows}行的菜品插画分割原图，共{len(rs)}格。每一格最终会裁切成完全独立的正方形图片，务必严格按下列从左到右、从上到下顺序绘制，不能交换位置、合并菜品或遗漏。
参考图角色：仅作为手绘食物的色彩、纸感和笔触参考，绝不能复制参考图的四格布局或替代下面指定的菜品。
画风：温暖而鲜活的美食手帐插画，精细水粉结合彩色铅笔、细腻的不规则深棕线条、轻微纸纤维，食物必须可辨识、可口、有具体结构。柔和奶油白纸底，碗盘可用雾蓝、珊瑚粉、姜黄、鼠尾草绿，色彩丰富但不要荧光。45度俯视，统一柔和左上光，轻微接触阴影。
构图：每格只画指定的一份最终成品及一个合适的碗/盘，碗盘完整可见、居中，留出至少12%的四周安全边距；汤和粥用碗，炒菜用盘，饮品用杯。菜品不能跨出各自格子，整张原图按等大正方形格子精确排列，不要分割线、数字、标题、文字、水印、图例、餐具、人物、眼睛、脸或无关装饰。不要把所有菜都画成泛化的蔬菜拼盘。平滑蒸蛋、碎米粥、清汤、面条、酥炸、红烧必须各自呈现对应质地。
准确性：以下原料和步骤是事实依据，主角原料与切法、烹饪成色、汤汁形态必须一致。只展示成品而非生食、配料盘或制作过程；不擅加主要食材，调味料无需逐样可见。同名不同做法也各画一张独立图片。
'''
 for i,r in enumerate(rs):
  ingredients='、'.join(v['name'] for v in r['ingredients'][:12])
  steps=r['steps'];fact='；'.join(steps[:3]+(steps[-2:] if len(steps)>3 else []))[:650]
  text+=f"\n第{i+1}格（第{i//3+1}行第{i%3+1}列）：{r['name']}。类别：{r.get('category','家常菜')}。原料：{ingredients}。做法事实：{fact}。只能画这道菜的成品。\n"
 return text

def append_request(path):
 d=prepare();request=json.loads(Path(path).read_text());by_id={r['id']:r for r in catalog()}
 old={f['recipeId'] for f in d['files']};rs=[]
 assert request['count']==len(request['recipes'])
 for r in request['recipes']:
  assert r['id'] in by_id and by_id[r['id']]['name']==r['name']
  if r['id'] not in old:rs.append((r,by_id[r['id']]))
 # Six full sheets, then six and four cells: never generate a lone dish in a 3-column row.
 groups=[]
 while len(rs)>12:groups.append(rs[:9]);rs=rs[9:]
 if len(rs)>9:groups.extend([rs[:6],rs[6:]])
 elif rs:groups.append(rs)
 for group in groups:
  idx=len(d['sheets']);rows=(len(group)+2)//3;prompt=ART/f'prompt-{idx:03}.txt'
  text=prompt_for([r for _,r in group])
  if len(group)<rows*3:text+='\n未指定的剩余格子必须保持空白奶油纸底，不增画其他菜品。\n'
  prompt.write_text(text)
  d['sheets'].append(dict(index=idx,recipeIds=[r['id'] for r,_ in group],rows=rows,prompt=str(prompt.relative_to(ROOT)),source=f'art-source/recipe-covers/sheet-{idx:03}.png',status='pending'))
  for cell,(req,r) in enumerate(group):
   key=Path(req['imageFile']).stem
   assert key.replace('_','').isalnum()
   d['files'].append(dict(recipeId=r['id'],name=r['name'],category=r.get('category','家常菜'),sheet=idx,cell=cell,resource=key,path=f'client/entry/src/main/resources/base/media/{key}.webp',sourceUrl=r.get('sourceUrl',''),status='pending'))
 d['total']=len(d['files']);MANIFEST.write_text(json.dumps(d,ensure_ascii=False,indent=2))
 print('Appended',sum(len(g) for g in groups),'recipes; total',d['total'])

def prepare():
 if MANIFEST.exists():return json.loads(MANIFEST.read_text())
 ART.mkdir(parents=True,exist_ok=True);WORK.mkdir(parents=True,exist_ok=True)
 rs=catalog();sheets=[];files=[]
 for b,start in enumerate(range(0,len(rs),9)):
  group=rs[start:start+9];prompt=ART/f'prompt-{b:03}.txt';prompt.write_text(prompt_for(group))
  sheets.append(dict(index=b,recipeIds=[r['id'] for r in group],rows=(len(group)+2)//3,prompt=str(prompt.relative_to(ROOT)),source=f'art-source/recipe-covers/sheet-{b:03}.png',status='pending'))
  for cell,r in enumerate(group):
   key='dish_'+r['id'].replace('-','_')
   files.append(dict(recipeId=r['id'],name=r['name'],category=r.get('category','家常菜'),sheet=b,cell=cell,resource=key,path=f'client/entry/src/main/resources/base/media/{key}.webp',sourceUrl=r.get('sourceUrl',''),status='pending'))
 d=dict(version=1,model='gpt-image-2.5-flare',styleReference='art-source/doodle-recipes.png',total=len(files),sheets=sheets,files=files)
 MANIFEST.write_text(json.dumps(d,ensure_ascii=False,indent=2));return d

def generate(sheet):
 idx=sheet['index'];out=WORK/f'sheet-{idx:03}.png';source=ROOT/sheet['source']
 if source.exists() or out.exists():return idx,'exists'
 prompt=(ROOT/sheet['prompt']).read_text();print(f'START sheet={idx:03} count={len(sheet["recipeIds"])}',flush=True)
 cmd=[PYTHON,str(SKILL),'--model','gpt-image-2.5-flare','--prompt',prompt,'--image',str(ROOT/'art-source/doodle-recipes.png'),'--image-role','Style and palette reference only. Ignore its grid layout and food identities.','--size',f'2880x{sheet["rows"]*960}','--quality','high','--timeout','900','--out',str(out)]
 t=time.time();result=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=960)
 # The bundled script prints only job status, paths and provider errors; never read auth ourselves.
 (WORK/f'sheet-{idx:03}.log').write_text(result.stdout+result.stderr)
 if result.returncode:raise RuntimeError(f'sheet {idx:03} provider failed: '+(result.stderr[-1400:]))
 with Image.open(out) as im:im.verify()
 print(f'DONE sheet={idx:03} seconds={time.time()-t:.1f}',flush=True)
 return idx,'generated'

def accept(indices):
 d=prepare()
 for idx in indices:
  sheet=d['sheets'][idx];candidate=WORK/f'sheet-{idx:03}.png';source=ROOT/sheet['source']
  if sheet['status']=='accepted':continue  # Preserve separately reviewed cell corrections on resume.
  if not source.exists():candidate.replace(source)
  with Image.open(source) as im:
   w,h=im.size
   if w < 768 or h < 256*sheet['rows']:raise ValueError(f'insufficient source resolution {idx}: {im.size}')
   for f in [v for v in d['files'] if v['sheet']==idx]:
    col=f['cell']%3;row=f['cell']//3
    cell=im.crop((round(col*w/3),round(row*h/sheet['rows']),round((col+1)*w/3),round((row+1)*h/sheet['rows']))).convert('RGB')
    # The provider can return a different aspect from the requested canvas. Never stretch food.
    cell.thumbnail((512,512),Image.Resampling.LANCZOS)
    canvas=Image.new('RGB',(512,512),cell.getpixel((0,0)))
    canvas.paste(cell,((512-cell.width)//2,(512-cell.height)//2))
    target=ROOT/f['path'];canvas.save(target,'WEBP',quality=88,method=6)
    f['status']='accepted';f['sha256']=hashlib.sha256(target.read_bytes()).hexdigest()
  sheet['status']='accepted';sheet['dimensions']=[w,h];sheet['output_fit']='contained on square canvas; never stretched'
 MANIFEST.write_text(json.dumps(d,ensure_ascii=False,indent=2));print('ACCEPTED',indices,flush=True)

def review(indices):
 d=prepare();font=ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',19)
 for idx in indices:
  sheet=d['sheets'][idx];source=ROOT/sheet['source'];candidate=WORK/f'sheet-{idx:03}.png'
  path=source if source.exists() else candidate
  with Image.open(path) as im:
   w,h=im.size;preview=Image.new('RGB',(900,sheet['rows']*340),'#FAF6EC');draw=ImageDraw.Draw(preview)
   for f in [v for v in d['files'] if v['sheet']==idx]:
    col=f['cell']%3;row=f['cell']//3
    cell=im.crop((round(col*w/3),round(row*h/sheet['rows']),round((col+1)*w/3),round((row+1)*h/sheet['rows']))).convert('RGB')
    cell.thumbnail((294,294));preview.paste(cell,(col*300+(300-cell.width)//2,row*340))
    draw.text((col*300+8,row*340+299),f"{idx:02}.{f['cell']+1} {f['name']}",fill='#263E46',font=font)
   preview.save(WORK/f'review-{idx:03}.jpg',quality=90)
 print('Review contact sheets ready:',indices)

def finalize():
 d=prepare();expected=len(catalog());assert len(d['files'])==expected
 assert all(f['status']=='accepted' for f in d['files']), 'Every sheet must be visually accepted before integration'
 assert {r['id'] for r in catalog()}=={f['recipeId'] for f in d['files']}
 hashes=[]
 for f in d['files']:
  path=ROOT/f['path'];digest=hashlib.sha256(path.read_bytes()).hexdigest();assert digest==f['sha256'];hashes.append(digest)
  with Image.open(path) as im:assert im.size==(512,512)
 assert len(set(hashes))==expected, 'Duplicate picture assigned to different recipe IDs'
 lines=["// Generated by scripts/recipe-cover-art.py; one stable ID per accepted illustration.","export function builtinRecipeCover(id: string): Resource | undefined {", " switch (id) {"]
 for f in d['files']:lines.append("  case '"+f['recipeId']+"': return $r('app.media."+f['resource']+"');")
 lines += ['  default: return undefined;',' }','}']
 (ROOT/'client/entry/src/main/ets/model/RecipeCoverMap.ets').write_text('\n'.join(lines)+'\n')
 # Only update cover keys in the current catalogs; preserve all other concurrent business fields.
 cover_by_id={f['recipeId']:f['resource'] for f in d['files']}
 for relative in ['backend/data/recipes.json','client/entry/src/main/resources/rawfile/recipes.json']:
  path=ROOT/relative;data=json.loads(path.read_text())
  for recipe in data['recipes']:recipe['imageKey']=cover_by_id[recipe['id']]
  data['sourceRevision']=hashlib.sha256(json.dumps(data['recipes'],ensure_ascii=False,sort_keys=True).encode()).hexdigest()
  path.write_text(json.dumps(data,ensure_ascii=False,indent=2))
 # Shared artifacts are merged by the main task during concurrent work.
 total_bytes=sum((ROOT/f['path']).stat().st_size for f in d['files'])
 (ROOT/'work/reports/recipe-covers.json').write_text(json.dumps(dict(passed=True,count=expected,unique_ids=expected,unique_hashes=expected,size=[512,512],asset_bytes=total_bytes,manifest=str(MANIFEST.relative_to(ROOT))),indent=2))
 cards=[]
 for f in d['files']:
  cards.append('<article data-search="'+html.escape(f['name']+' '+f['category'],quote=True)+'"><img loading="lazy" src="../../'+f['path']+'" alt="'+html.escape(f['name'],quote=True)+'"><strong>'+html.escape(f['name'])+'</strong><small>'+html.escape(f['category'])+'</small></article>')
 gallery='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>食库 · 390道菜专属插画</title><style>*{box-sizing:border-box}body{margin:0;background:#faf5e9;color:#29434b;font:16px system-ui,sans-serif}header{padding:32px 5vw;background:linear-gradient(115deg,#f5dbb9,#dce9de)}h1{margin:0 0 12px}p{line-height:1.6}input{width:min(460px,100%);padding:12px;border:1px solid #a6b7ac;border-radius:12px;font:inherit}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;padding:24px 5vw}article{overflow:hidden;background:#fffaf1;border:1px solid #ddd7c7;border-radius:18px;box-shadow:0 3px 12px #29434b0a}img{width:100%;aspect-ratio:1;object-fit:contain}strong,small{display:block;margin:8px 14px}small{color:#687b76;margin-bottom:14px}article[hidden]{display:none}</style><header><h1>一菜一画 · 食库</h1><p>390道菜对应390张独立手绘风插画。图片为AI生成的成品示意，实际食材与步骤以菜谱为准。此页直接引用客户端正式资源，不复制图片。</p><input type="search" placeholder="搜索菜名或分类" aria-label="搜索菜名或分类"><p id="count">390道菜</p></header><main>'''+''.join(cards)+'''</main><script>document.querySelector('input').addEventListener('input',e=>{let n=0;document.querySelectorAll('article').forEach(a=>{a.hidden=!a.dataset.search.includes(e.target.value.trim());if(!a.hidden)n++});document.querySelector('#count').textContent=n+'道菜'})</script></html>'''
 (ROOT/'work/reports/recipe-cover-gallery.html').write_text(gallery.replace('390道',str(expected)+'道').replace('390张',str(expected)+'张'))
 print('PASS',expected,'unique ID-linked assets; bytes=',total_bytes)

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('action',choices=['prepare','append','generate','review','accept','finalize']);p.add_argument('--request',default=str(ROOT/'work/reports/recipe-expansion-image-request.json'));p.add_argument('--sheets',default='0');p.add_argument('--workers',type=int,default=3);a=p.parse_args();d=prepare();indices=list(range(len(d['sheets']))) if a.sheets=='all' else [int(v) for v in a.sheets.split(',')]
 if a.action=='prepare':print(f'{d["total"]} recipes, {len(d["sheets"])} sheets prepared; no API calls')
 elif a.action=='append':append_request(a.request)
 elif a.action=='accept':accept(indices)
 elif a.action=='review':review(indices)
 elif a.action=='finalize':finalize()
 else:
  errors=[]
  with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as pool:
   jobs={pool.submit(generate,d['sheets'][i]):i for i in indices}
   for job in concurrent.futures.as_completed(jobs):
    try:print(job.result(),flush=True)
    except Exception as e:errors.append(str(e));print('ERROR',str(e),flush=True)
  if errors:raise SystemExit(1)
