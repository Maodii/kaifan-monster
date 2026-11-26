from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json,hashlib
root=Path(__file__).resolve().parent.parent
existing=root/'art-source/community-demo/manifest.json'
if existing.is_file():
 prior=json.loads(existing.read_text())
 if prior.get('reviewed') and all((root/x['path']).is_file() and hashlib.sha256((root/x['path']).read_bytes()).hexdigest()==x['sha256'] for x in prior['items']):
  print('Formal photographs already reviewed; no duplicate exports created.');raise SystemExit(0)
p=root/'art-source/community-demo/manifest.json';m=json.loads(p.read_text())
font=ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc',23)
thumbs=[]
for item in m['items']:
 source=root/item['candidate_path'];im=Image.open(source).convert('RGB');im.thumbnail((1440,960),Image.Resampling.LANCZOS)
 draw=ImageDraw.Draw(im);text='AI生成 · 演示';box=draw.textbbox((0,0),text,font=font);width=box[2]-box[0]+30;height=44
 x,y=20,im.height-height-20
 draw.rounded_rectangle((x,y,x+width,y+height),radius=12,fill='#F7F2E6');draw.text((x+15,y+9),text,font=font,fill='#5B624F')
 target=root/item['path'];im.save(target,'JPEG',quality=86,optimize=True,progressive=True)
 item.update({'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'width':im.width,'height':im.height,'bytes':target.stat().st_size,'synthetic':True,'visible_label':'AI生成 · 演示'})
 thumb=ImageOps.contain(im,(360,240));canvas=Image.new('RGB',(380,280),'#F7F4EB');canvas.paste(thumb,((380-thumb.width)//2,10));ImageDraw.Draw(canvas).text((12,250),item['dish'],font=font,fill='#2E463B');thumbs.append(canvas)
gallery=Image.new('RGB',(1520,560),'#F7F4EB')
for i,t in enumerate(thumbs):gallery.paste(t,((i%4)*380,(i//4)*280))
# A generated-art contact sheet for review, never registered as a confirmation screenshot.
gallery.save(root/'work/generated-art/community-demo/contact-sheet.jpg',quality=90)
m['reviewed']=False;p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'images':len(thumbs),'total_bytes':sum(x['bytes'] for x in m['items']),'contact_sheet':'work/generated-art/community-demo/contact-sheet.jpg'},ensure_ascii=False))
