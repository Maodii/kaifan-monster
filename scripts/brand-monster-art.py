"""Selected existing mascot and recipe paper-edge treatment; no generation or business edits."""
from pathlib import Path
import argparse, json, hashlib, math
from collections import deque
import numpy as np
from PIL import Image,ImageDraw,ImageFilter,ImageOps

ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'work/generated-art/brand-monster'
REPORT=ROOT/'work/reports/brand-monster-art.json'
MANIFEST=ROOT/'art-source/recipe-covers/manifest.json'

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def cutout(im):
    rgb=np.asarray(im.convert('RGB')).astype('int16');r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    paper=(r>219)&(g>204)&(b>168)&((r-g)<30)&((g-b)<48)
    candidate=np.pad(paper,1,constant_values=True)
    mask=Image.fromarray((candidate*255).astype('uint8')).copy()
    ImageDraw.floodfill(mask,(0,0),128,thresh=0)
    bg=np.asarray(mask)[1:-1,1:-1]==128
    alpha=Image.fromarray((~bg*255).astype('uint8'))
    # Preserve contours with a small outward fill; keep all interior cream food and porcelain intact.
    alpha=alpha.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(.45))
    out=im.convert('RGBA');out.putalpha(alpha)
    return out

def paper_edge(im):
    # A deliberately irregular paper silhouette outside a smaller complete source, no squared corners.
    # Reflect only the outer paper pixels; fully preserve all original source pixels in the inset.
    a=np.asarray(im.convert('RGB'))
    extended=np.pad(a,((36,36),(36,36),(0,0)),mode='edge')
    out=Image.fromarray(extended).convert('RGBA')
    w,h=out.size;scale=3;mask=Image.new('L',(w*scale,h*scale),0)
    points=[]
    for n in range(720):
        t=n*2*math.pi/720;c,s=math.cos(t),math.sin(t)
        # Superellipse encloses the dish's full round silhouette while removing every rectangular corner.
        wobble=1+.013*math.sin(7*t+.4)+.009*math.sin(13*t+1.1)+.004*math.sin(23*t)
        x=w/2+(w/2-8)*math.copysign(abs(c)**(2/3.5),c)*wobble
        y=h/2+(h/2-8)*math.copysign(abs(s)**(2/3.5),s)*wobble
        points.append((x*scale,y*scale))
    ImageDraw.Draw(mask).polygon(points,fill=255)
    mask=mask.resize((w,h),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.65))
    out.putalpha(mask)
    return out.resize((512,512),Image.Resampling.LANCZOS)

def dish_cutout(im):
    result=cutout(im)
    # Isolate the primary contiguous dish: old atlas crops can contain a neighboring rim fragment.
    alpha=np.asarray(result.getchannel('A')).copy();active=alpha>128;h,w=active.shape
    components=[]
    for y,x in zip(*np.nonzero(active)):
        if not active[y,x]:continue
        stack=[(int(y),int(x))];points=[];active[y,x]=False
        while stack:
            py,px=stack.pop();points.append((py,px))
            for ny,nx in ((py-1,px),(py+1,px),(py,px-1),(py,px+1)):
                if 0<=ny<h and 0<=nx<w and active[ny,nx]:active[ny,nx]=False;stack.append((ny,nx))
        components.append(points)
    main=max(components,key=len)
    fraction=len(main)/(w*h)
    if fraction<.035 or fraction>.90:return paper_edge(im),'irregular_paper_fallback'
    keep=np.zeros((h,w),dtype='uint8')
    for py,px in main:keep[py,px]=255
    keep=np.asarray(Image.fromarray(keep).filter(ImageFilter.MaxFilter(3)))>0
    alpha[~keep]=0;result.putalpha(Image.fromarray(alpha))
    inset=Image.new('RGBA',(536,536));inset.alpha_composite(result,(12,12))
    return inset.resize((512,512),Image.Resampling.LANCZOS),'connected_paper_cutout'

def preview():
    WORK.mkdir(parents=True,exist_ok=True)
    m=json.loads(MANIFEST.read_text());names=['嫩滑蒸蛋','清炒时蔬','山药鸡蛋早餐羹','红薯藜麦粥','烤苹果肉桂酸奶杯','白萝卜牛肉清汤']
    board=Image.new('RGB',(1200,1800),'#dce8ee');draw=ImageDraw.Draw(board)
    for row,name in enumerate(names):
        f=next(f for f in m['files'] if f['name']==name);im=Image.open(ROOT/f['path'])
        for col,result in enumerate([im.convert('RGBA'),cutout(im),paper_edge(im)]):
            result.thumbnail((290,270));x=col*400+(400-result.width)//2;y=row*300
            board.paste(result,(x,y),result);draw.text((col*400+8,y+275),['original','cutout trial','irregular paper'][col],fill='#29434b')
    board.save(WORK/'sample-review.jpg',quality=94)
    print(WORK/'sample-review.jpg')

def logo():
    src=ROOT/'work/generated-art/logo-options/hungry-monster.png'
    im=cutout(Image.open(src));box=im.getbbox();im=im.crop(box)
    brand=Image.new('RGBA',(768,768));im.thumbnail((620,620),Image.Resampling.LANCZOS);brand.alpha_composite(im,((768-im.width)//2,(768-im.height)//2))
    target=ROOT/'client/entry/src/main/resources/base/media/brand_monster.png';brand.save(target)
    # All mascot pixels inside the circular safe area. App icon background deliberately opaque.
    icon=Image.new('RGB',(1024,1024),'#FFF5DF');im.thumbnail((650,650),Image.Resampling.LANCZOS)
    icon.paste(im,((1024-im.width)//2,(1024-im.height)//2),im)
    targets=[]
    for folder in ['client/AppScope/resources/base/media','client/entry/src/main/resources/base/media']:
        p=ROOT/folder/'app_icon.png';icon.save(p);targets.append(str(p.relative_to(ROOT)))
        old=ROOT/folder/'app_icon.svg'
        if old.exists():old.unlink()
    proof=Image.new('RGB',(1120,600),'#dce8ee')
    thumb=brand.copy();thumb.thumbnail((480,480));proof.paste(thumb,(20,30),thumb)
    roundicon=icon.resize((480,480),Image.Resampling.LANCZOS);mask=Image.new('L',(480,480));ImageDraw.Draw(mask).ellipse((0,0,479,479),fill=255)
    proof.paste(roundicon,(600,30),mask);proof.save(WORK/'logo-review.jpg',quality=94)
    return [str(target.relative_to(ROOT))]+targets

def process():
    m=json.loads(MANIFEST.read_text());files=m['files'];assert len(files)==454
    if REPORT.exists() and json.loads(REPORT.read_text()).get('status')=='complete_assets_frozen':
        raise RuntimeError('Already complete; refusing to process paper edges a second time')
    before=[{'path':f['path'],'sha256':f['sha256']} for f in files]
    paths=logo()
    strategies={};review=Image.new('RGB',(1200,1200),'#dce8ee');draw=ImageDraw.Draw(review)
    for n,f in enumerate(files):
        p=ROOT/f['path'];im=Image.open(p);assert im.size==(512,512)
        out,strategy=dish_cutout(im);out.save(p,'WEBP',quality=93,method=6)
        strategies[strategy]=strategies.get(strategy,0)+1
        if n%64==0 or n==453:
            slot=min(n//64,7);tile=out.resize((280,280));x=(slot%4)*300;y=(slot//4)*600
            review.paste(tile,(x,y),tile);draw.text((x+8,y+282),str(n)+' '+strategy,fill='#29434b')
        with Image.open(p) as check:
            check.load();assert check.size==(512,512) and check.mode=='RGBA'
            alpha=np.asarray(check.getchannel('A'));assert alpha[0,0]==alpha[0,-1]==alpha[-1,0]==alpha[-1,-1]==0
        f['sha256']=digest(p);f['paperTreatment']=strategy+'; 512 RGBA, full subject preserved with safe padding'
        if n%50==0:print('PROGRESS',n+1,'/454',flush=True)
    assert len({f['sha256'] for f in files})==454
    MANIFEST.write_text(json.dumps(m,ensure_ascii=False,indent=2))
    review.save(WORK/'batch-review.jpg',quality=94)
    report={'status':'processed_pending_visual_gallery_review','selected_option':'04 开饭小怪','source':'work/generated-art/logo-options/hungry-monster.png',
        'strategy':'Remove only warm-paper pixels connected to image border; preserve enclosed light rice/porcelain/glass and wax contours. Keep principal contiguous dish and remove disconnected atlas fragments. Add transparent safe padding. Fallback to irregular paper silhouette for implausible primary component area.',
        'strategies':strategies,
        'formal_paths':[{'path':p,'sha256':digest(ROOT/p),'dimensions':list(Image.open(ROOT/p).size)} for p in paths],
        'recipe_count':454,'unique_hashes':454,'before':before,'source_atlases_retained':True,
        'validation':{'decode':'454/454 RGBA512x512; four corner alpha=0; 454 unique hashes','logo':'pending visual review','gallery':'pending browser decode'},
        'cleanup':[{'path':'client/AppScope/resources/base/media/app_icon.svg','reason':'replaced with selected monster app_icon.png under same resource name'},{'path':'client/entry/src/main/resources/base/media/app_icon.svg','reason':'replaced with selected monster app_icon.png under same resource name'}]}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('454 paper treatments and selected logo saved; hashes updated')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['preview','process']);args=p.parse_args()
    preview() if args.action=='preview' else process()
