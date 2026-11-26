"""Prepare current art batch; never edits runtime resources or shared manifests."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent
OUT = ROOT / 'work/generated-art/recipe-community'
OUT.mkdir(parents=True, exist_ok=True)

def clean(image):
    arr = np.asarray(image.convert('RGBA')).copy()
    if image.mode != 'RGBA':
        rgb = arr[:, :, :3].astype(float)
        alpha = np.clip((245 - rgb.min(axis=2)) / 25, 0, 1)
        arr[:, :, :3] = np.clip((rgb - 255 * (1-alpha[:, :, None])) / np.maximum(alpha[:, :, None], .001), 0, 255).astype('uint8')
        arr[:, :, 3] = (alpha * 255).astype('uint8')
    else:
        arr[:, :, 3][arr[:, :, 3] < 220] = 0
        arr[:, :, 3][arr[:, :, 3] >= 220] = 255
    mask = arr[:, :, 3] > 0
    height, width = mask.shape
    for y,x in zip(*np.nonzero(mask)):
        if not mask[y,x]:
            continue
        pending=[(int(y),int(x))]
        component=[]
        mask[y,x]=False
        while pending:
            py,px=pending.pop()
            component.append((py,px))
            for ny,nx in ((py-1,px),(py+1,px),(py,px-1),(py,px+1)):
                if 0<=ny<height and 0<=nx<width and mask[ny,nx]:
                    mask[ny,nx]=False
                    pending.append((ny,nx))
        if len(component)<70:
            for py,px in component:
                arr[py,px,3]=0
    arr[arr[:, :, 3] == 0, :3] = 0
    return Image.fromarray(arr)

def fit(image, size, fill):
    image = clean(image)
    image = image.crop(image.getbbox())
    image.thumbnail((round(size[0]*fill[0]), round(size[1]*fill[1])), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', size)
    canvas.alpha_composite(image, ((size[0]-image.width)//2,(size[1]-image.height)//2))
    return canvas

files = []
def save(image, name, purpose):
    path = OUT / name
    image.save(path, **({'lossless': True} if path.suffix == '.webp' else {}))
    bbox = image.getbbox()
    files.append({'path': str(path.relative_to(ROOT)), 'kind':'generated_art', 'purpose':purpose,
        'target_path':'client/entry/src/main/resources/base/media/'+name,
        'dimensions':list(image.size), 'alpha_bbox':list(bbox),
        'transparent_margins_px':[bbox[0],bbox[1],image.width-bbox[2],image.height-bbox[3]],
        'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size})

im=Image.open(SOURCE/'meal-icons-source.png')
for n,(key,label) in enumerate([('lunch','午餐'),('dinner','晚餐'),('snack','加餐')]):
    cell=im.crop((round(n*im.width/3),0,round((n+1)*im.width/3),im.height))
    save(fit(cell,(256,256),(.68,.68)),f'meal_{key}.png',label+'餐次入口与筛选')

im=Image.open(SOURCE/'states-source.png')
for n,(key,label) in enumerate([('community_welcome','社区未登录邀请'),('community_empty','社区暂无动态'),('community_compose','发布尚未选择照片'),('community_pending','动态等待审核'),('recipe_no_results','筛选无结果'),('community_connection','网络失败重试')]):
    c,r=n%3,n//3
    cell=im.crop((round(c*im.width/3),round(r*im.height/2),round((c+1)*im.width/3),round((r+1)*im.height/2)))
    save(fit(cell,(512,384),(.76,.74)),key+'.png',label)

save(fit(Image.open(SOURCE/'banner-source.png'),(1536,512),(.82,.78)),'community_banner.webp','社区广场页标题下方横幅，首页短入口不强制使用')

board=Image.new('RGB',(1200,1040),'#f7f3ea')
draw=ImageDraw.Draw(board)
for n,item in enumerate(files[:9]):
    im=Image.open(ROOT/item['path']); im.thumbnail((340,250))
    x=(n%3)*400+(400-im.width)//2; y=(n//3)*270
    board.paste(im,(x,y),im)
    draw.text(((n%3)*400+16,y+245),Path(item['path']).name,fill='#234c50')
im=Image.open(OUT/'community_banner.webp'); im.thumbnail((1120,220))
board.paste(im,((1200-im.width)//2,815),im)
board.save(OUT/'art-review.jpg',quality=92)

report={'status':'art_prepared_visual_qa_pending','owner_thread':'01a1a000-8404-7573-9331-25e8fc25ac01',
 'integration_owner_thread':'01a19f30-f4fc-7823-8b17-045904cf2911','model':'gpt-image-2.5-flare',
 'reference':'art-source/crayon/crayon-pack-source.png','files':files,
 'preview':'work/generated-art/recipe-community/art-review.jpg',
 'notes':['早餐复用ui_breakfast.png','全部无字，Contain不裁切','主任务统一接入并更新work/artifacts.json','未修改任何业务代码或runtime资源','横幅用于社区页面，首页只保留短入口'],
 'validation':{'actual_source_sizes':{'meal_icons':[2172,724],'states':[1774,887],'banner':[2172,724]},'native_integration':'pending_main_task'}}
(ROOT/'work/reports/recipe-community-art.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'assets':len(files),'total_bytes':sum(x['bytes'] for x in files)},ensure_ascii=False))
