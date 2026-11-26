"""Prepare only the next-utility batch, with reproducible alpha and margins."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw

SOURCE=Path(__file__).resolve().parent
ROOT=SOURCE.parents[1]
OUT=ROOT/'work/generated-art/next-utility'
OUT.mkdir(parents=True,exist_ok=True)

def clean(image):
    a=np.asarray(image.convert('RGBA')).copy()
    if image.mode!='RGBA':
        rgb=a[:,:,:3].astype(float)
        alpha=np.clip((245-rgb.min(axis=2))/25,0,1)
        a[:,:,:3]=np.clip((rgb-255*(1-alpha[:,:,None]))/np.maximum(alpha[:,:,None],.001),0,255).astype('uint8')
        a[:,:,3]=(alpha*255).astype('uint8')
    else:
        a[:,:,3][a[:,:,3]<220]=0
        a[:,:,3][a[:,:,3]>=220]=255
    mask=a[:,:,3]>0
    h,w=mask.shape
    for y,x in zip(*np.nonzero(mask)):
        if not mask[y,x]: continue
        pending=[(int(y),int(x))]; component=[]; mask[y,x]=False
        while pending:
            py,px=pending.pop(); component.append((py,px))
            for ny,nx in ((py-1,px),(py+1,px),(py,px-1),(py,px+1)):
                if 0<=ny<h and 0<=nx<w and mask[ny,nx]:
                    mask[ny,nx]=False; pending.append((ny,nx))
        if len(component)<45:
            for py,px in component: a[py,px,3]=0
    a[a[:,:,3]==0,:3]=0
    return Image.fromarray(a)

files=[]
def save(cell,name,size,purpose,kind='generated_ui'):
    cell=clean(cell); cell=cell.crop(cell.getbbox())
    cell.thumbnail((round(size[0]*.72),round(size[1]*.72)),Image.Resampling.LANCZOS)
    result=Image.new('RGBA',size)
    result.alpha_composite(cell,((size[0]-cell.width)//2,(size[1]-cell.height)//2))
    p=OUT/(name+'.png'); result.save(p)
    b=result.getbbox()
    files.append({'path':str(p.relative_to(ROOT)),'target_path':'client/entry/src/main/resources/base/media/'+p.name,
        'kind':kind,'purpose':purpose,'dimensions':list(size),'alpha_bbox':list(b),
        'transparent_margins_px':[b[0],b[1],size[0]-b[2],size[1]-b[3]],
        'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})

icons=Image.open(SOURCE/'icons-source.png')
items=[('utility_cooking','烹饪模式'),('utility_week_plan','周计划'),('utility_shopping','采购清单'),('utility_cook_again','复刻上餐'),('utility_search','搜索菜谱'),('utility_success','成功反馈')]
for n,(name,purpose) in enumerate(items):
    c,r=n%3,n//3
    box=(round(c*icons.width/3),round(r*icons.height/2),round((c+1)*icons.width/3),round((r+1)*icons.height/2))
    save(icons.crop(box),name,(256,256),purpose)

scenes=Image.open(SOURCE/'scenes-source.png')
items=[('scene_cooking_prep','备菜台小场景',(512,384)),('scene_week_to_table','周计划到餐桌小场景',(512,384)),('layer_steam','独立蒸汽装饰层',(256,256)),('layer_sparkles','独立成功星芒层',(256,256))]
for n,(name,purpose,size) in enumerate(items):
    c,r=n%2,n//2
    box=(round(c*scenes.width/2),round(r*scenes.height/2),round((c+1)*scenes.width/2),round((r+1)*scenes.height/2))
    save(scenes.crop(box),name,size,purpose,'generated_art')

board=Image.new('RGB',(1200,1150),'#f7f3ea'); draw=ImageDraw.Draw(board)
for n,item in enumerate(files[:6]):
    im=Image.open(ROOT/item['path']); x=(n%3)*400+72; y=(n//3)*280
    board.paste(im,(x,y),im); draw.text(((n%3)*400+12,y+255),Path(item['path']).name,fill='#234c50')
for n,item in enumerate(files[6:8]):
    im=Image.open(ROOT/item['path']); im.thumbnail((400,300)); x=n*600+100; y=565
    board.paste(im,(x,y),im); draw.text((x,y+300),Path(item['path']).name,fill='#234c50')
for n,item in enumerate(files[8:]):
    im=Image.open(ROOT/item['path']); im.thumbnail((190,190)); x=n*600+200; y=905
    board.paste(im,(x,y),im); draw.text((x,y+190),Path(item['path']).name,fill='#234c50')
board.save(OUT/'art-review.jpg',quality=92)
report={'status':'generated_prepared_pending_visual_review','model':'gpt-image-2.5-flare',
 'owner_thread':'01a1a000-8404-7573-9331-25e8fc25ac01','integration_owner_thread':'01a19f30-f4fc-7823-8b17-045904cf2911',
 'reference':'art-source/crayon/crayon-pack-source.png','files':files,'preview':'work/generated-art/next-utility/art-review.jpg',
 'source_dimensions':{'icons':list(icons.size),'scenes':list(scenes.size)},
 'validation':{'native_integration':'pending_main_task','animation':'static layers delivered; runtime motion owned by main task'},
 'notes':['No baked text; Contain; no new homepage banner','New recipe covers await confirmed list','Only independent art paths modified']}
(ROOT/'work/reports/next-utility-art.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Prepared',len(files),'assets,',sum(x['bytes'] for x in files),'bytes')
