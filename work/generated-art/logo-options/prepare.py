from pathlib import Path
from PIL import Image,ImageFont,ImageDraw,ImageFilter
import json,hashlib
root=Path.cwd();folder=root/'work/generated-art/logo-options';src=Image.open(folder/'source.png').convert('RGB');w,h=src.size
items=[('01','饭搭子','一碗装下两个好搭子','meal-buddy','#B85E48'),('02','饭转转','转一下，今天吃什么','meal-spin','#607C4C'),('03','饭点星球','把每天的好吃记进小星球','meal-planet','#4C7093'),('04','开饭小怪','认真吃饭，快乐捣蛋','hungry-monster','#8D658E')]
board=Image.new('RGB',(1440,1700),'#FFF9EF');draw=ImageDraw.Draw(board);font='client/entry/src/main/resources/rawfile/fonts/shiku_hand.ttf';title=ImageFont.truetype(font,61);caption=ImageFont.truetype(font,31)
records=[]
for i,(num,name,desc,slug,color) in enumerate(items):
 x=(i%2)*w//2;y=(i//2)*h//2;im=src.crop((x,y,x+w//2,y+h//2));p=folder/(slug+'.png');im.save(p)
 px=(i%2)*720;py=(i//2)*850;tile=im.resize((610,610),Image.Resampling.LANCZOS);mask=Image.new('L',tile.size,0);md=ImageDraw.Draw(mask);md.rectangle((12,12,598,598),fill=255);mask=mask.filter(ImageFilter.GaussianBlur(8));board.paste(tile,(px+55,py+20),mask)
 text=num+'  '+name;box=draw.textbbox((0,0),text,font=title);draw.text((px+360-(box[2]-box[0])/2,py+653),text,font=title,fill=color,stroke_width=0)
 box=draw.textbbox((0,0),desc,font=caption);draw.text((px+360-(box[2]-box[0])/2,py+746),desc,font=caption,fill='#766D61')
 records.append({'id':num,'name':name,'concept':desc,'path':str(p.relative_to(root)),'dimensions':list(im.size),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'status':'candidate_awaiting_user_selection'})
(root/'outputs').mkdir(exist_ok=True);out=root/'outputs/logo-options.png';board.save(out)
report={'options':records,'model':'gpt-image-2.5-flare','mode':'reference_edit','requested_dimensions':[2048,2048],'actual_source_dimensions':list(src.size),'source':'work/generated-art/logo-options/source.png','prompt':'work/generated-art/logo-options/prompt.txt','style_reference':'art-source/ui-icons/atlas.png','comparison':'outputs/logo-options.png','current_app_logo_changed':False,'note':'候选名字可自由混搭；尚未做商标或名称可用性检索。'}
(root/'work/reports/logo-options.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
p=root/'work/artifacts.json';d=json.loads(p.read_text());new=[{'path':r['path'],'kind':'generated_ui','purpose':'Logo候选 '+r['id']+' '+r['name'],'target_path':'pending_user_selection'} for r in records]+[{'path':'work/generated-art/logo-options/source.png','kind':'generated_art','purpose':'四个原创Logo候选必要原图，参考既有蜡笔画风'},{'path':'outputs/logo-options.png','kind':'generated_ui','purpose':'供用户选择的四个Logo与名字对照图'}];paths={f['path'] for f in new};d['files']=[f for f in d['files'] if f['path'] not in paths]+new;p.write_text(json.dumps(d,ensure_ascii=False,indent=2));print(out)
