"""Recover complete dishes across old atlas cell boundaries; candidates require visual review."""
from pathlib import Path
import runpy,json,argparse,math,hashlib
import numpy as np
from PIL import Image,ImageFilter,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
cutout=runpy.run_path(str(ROOT/'scripts/brand-monster-art.py'))['cutout']
WORK=ROOT/'work/generated-art/crop-audit'

def component_mask(binary,cx,cy):
    active=np.asarray(binary).copy()>128;h,w=active.shape;groups=[]
    for y,x in zip(*np.nonzero(active)):
        if not active[y,x]:continue
        pending=[(int(y),int(x))];points=[];active[y,x]=False
        while pending:
            py,px=pending.pop();points.append((py,px))
            for ny,nx in ((py-1,px),(py+1,px),(py,px-1),(py,px+1)):
                if 0<=ny<h and 0<=nx<w and active[ny,nx]:active[ny,nx]=False;pending.append((ny,nx))
        if len(points)>100:groups.append(points)
    def score(points):
        ys,xs=zip(*points);x=sum(xs)/len(xs);y=sum(ys)/len(ys)
        return len(points)*math.exp(-8*((x-cx)**2/w**2+(y-cy)**2/h**2))
    points=max(groups,key=score);mask=np.zeros((h,w),dtype='uint8')
    for y,x in points:mask[y,x]=255
    return Image.fromarray(mask)

def prepare(names):
    m=json.loads((ROOT/'art-source/recipe-covers/manifest.json').read_text());records=[]
    for name in names:
        f=next(f for f in m['files'] if f['name']==name);s=m['sheets'][f['sheet']]
        if f.get('correctionSource'):continue
        im=Image.open(ROOT/s['source']).convert('RGB');w,h=im.size;cw=w/3;ch=h/s['rows'];c=f['cell']%3;r=f['cell']//3
        box=(max(0,round((c-.16)*cw)),max(0,round((r-.16)*ch)),min(w,round((c+1.16)*cw)),min(h,round((r+1.16)*ch)))
        cell=cutout(im.crop(box));alpha=cell.getchannel('A');opened=alpha.filter(ImageFilter.MinFilter(25))
        main=component_mask(opened,(c+.5)*cw-box[0],(r+.5)*ch-box[1]).filter(ImageFilter.MaxFilter(29))
        a=np.asarray(alpha).copy();a[np.asarray(main)==0]=0
        final_main=component_mask(Image.fromarray(a).point(lambda v:255 if v>100 else 0),(c+.5)*cw-box[0],(r+.5)*ch-box[1]).filter(ImageFilter.MaxFilter(3))
        a[np.asarray(final_main)==0]=0;cell.putalpha(Image.fromarray(a));cell=cell.crop(cell.getbbox())
        cell.thumbnail((440,440),Image.Resampling.LANCZOS);out=Image.new('RGBA',(512,512));out.alpha_composite(cell,((512-cell.width)//2,(512-cell.height)//2))
        path=WORK/Path(f['path']).name;out.save(path,'WEBP',lossless=True,method=6)
        records.append(dict(name=name,path=str(path.relative_to(ROOT)),target=f['path'],recipeId=f['recipeId'],source=s['source'],source_crop_box=list(box)))
    (ROOT/'work/reports/recipe-crop-repairs.json').write_text(json.dumps({'status':'candidate_review','files':records},ensure_ascii=False,indent=2)+'\n')
    font=ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',16)
    for start in range(0,len(records),24):
        group=records[start:start+24];board=Image.new('RGB',(1440,((len(group)+2)//3)*280),'#dce8ee');draw=ImageDraw.Draw(board)
        for n,f in enumerate(group):
            x=n%3*480;y=n//3*280
            for off,p in [(0,f['target']),(240,f['path'])]:
                im=Image.open(ROOT/p).convert('RGBA');im.thumbnail((232,238));board.paste(im,(x+off,y),im)
            draw.text((x+4,y+242),f['name']+'   old → recovered',fill='#29434b',font=font)
        board.save(WORK/f'recovered-{start//24:02}.jpg',quality=94)
    print('Prepared',len(records),'candidates')

def accept():
    p=ROOT/'work/reports/recipe-crop-repairs.json';d=json.loads(p.read_text());mp=ROOT/'art-source/recipe-covers/manifest.json';m=json.loads(mp.read_text())
    for r in d['files']:
        f=next(f for f in m['files'] if f['recipeId']==r['recipeId']);src=ROOT/r['path'];target=ROOT/r['target'];r['old_sha256']=hashlib.sha256(target.read_bytes()).hexdigest();src.replace(target)
        f['sha256']=hashlib.sha256(target.read_bytes()).hexdigest();f['cropRecovery']=dict(source=r['source'],source_crop_box=r['source_crop_box'],strategy='expanded atlas crop, separated primary subject; no new generated dish');r['sha256']=f['sha256']
    mp.write_text(json.dumps(m,ensure_ascii=False,indent=2));d['status']='accepted_visual_review';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print('Accepted',len(d['files']))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['prepare','accept']);p.add_argument('--names',default='葱煎豆腐');a=p.parse_args()
    prepare(a.names.split(',')) if a.action=='prepare' else accept()
