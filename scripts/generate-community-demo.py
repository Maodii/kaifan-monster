"""Bounded two-worker provider jobs; credentials stay inside the skill runtime."""
from pathlib import Path
import concurrent.futures,json,subprocess,time
ROOT=Path(__file__).resolve().parent.parent
PYTHON='/Users/developer/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3'
GEN='/Users/developer/.codex/skills/api-image/scripts/generate_image.py'
import hashlib
existing=ROOT/'art-source/community-demo/manifest.json'
if existing.is_file():
 prior=json.loads(existing.read_text())
 if prior.get('reviewed') and all((ROOT/x['path']).is_file() and hashlib.sha256((ROOT/x['path']).read_bytes()).hexdigest()==x['sha256'] for x in prior['items']):
  print('All eight reviewed formal photographs already exist; no paid image jobs started.');raise SystemExit(0)
scenes=[
 ('tomato-eggs','晚饭不用复杂，一盘番茄炒蛋就够香','家常菜','番茄炒蛋','青绿色浅盘里一份番茄炒蛋，番茄是看得见的红色块状，鸡蛋金黄蓬松，有少量葱花；旁边一小碗白米饭，一双木筷，浅色木餐桌，背景是朦胧的普通家庭厨房，不要加入其他主菜。','下班只想快一点吃上热饭。番茄炒到出汁再拌入鸡蛋，留一点汤汁拌饭。两人份，一盘菜配米饭就很舒服。'),
 ('chicken-bento','明天的便当，今晚先安排好','便当','鸡胸肉便当','一个没有品牌的奶油白长方形分隔便当盒，里面是煎熟的鸡胸肉切片、焯熟西兰花、橙色胡萝卜片、少量糙米饭、半颗熟鸡蛋，鸡肉切面完全熟透。便当盒放在灰蓝色布垫上，傍晚厨房窗边侧光，构图只出现这一份便当。','鸡胸肉、西兰花和糙米分格放，酱汁另外装。明天带去上班，午饭就不用再纠结。这里没有称重，热量不作精确记录。'),
 ('winter-soup','降温之后，想喝一碗热乎的汤','汤类','冬瓜排骨汤','一只米白陶瓷汤碗，盛清澈略带微金色的冬瓜排骨汤，明确可见半透明冬瓜块和煮熟排骨，表面点缀极少葱花，不是浓稠奶汤；有一把家常汤勺，桌边灰色格子餐巾，暖色台灯光，微弱自然蒸汽。','排骨炖到软，再把冬瓜放进去。今天想吃清淡一点，喝汤的时候慢慢把一天的疲惫放下来。'),
 ('tofu-dinner','豆腐也能当晚饭主角','清淡少油','香菇豆腐','普通家用白瓷盘里是煎到边缘淡金色的老豆腐厚块和棕色香菇片，少量淡棕色薄芡汁，青色葱段点缀，豆腐块形状略不规则而自然，旁边只露出半碗米饭边缘；温暖旧木桌，午后窗光，近景有真实食物纹理。','选老豆腐，擦干表面再下锅，翻面时慢一点。加一点香菇一起煮，不靠很重的调味也能吃得有滋有味。'),
 ('noodle-shop','不想做饭的晚上，认真吃一碗面','在外吃','牛肉面','一家没有招牌与品牌的普通小面馆餐桌，一只深蓝边陶瓷大碗盛牛肉汤面，淡褐色清汤、细长面条、少量煮熟牛肉薄片和青菜，面条形态自然不打结成怪形，旁边木筷平放，不含人物和手，暖色室内光，真实手机随手拍角度。','今天在外面吃，点了一碗牛肉面。汤头偏清爽，面条软硬正合适。地点先留空，花费与评分只是演示用的虚构记录。'),
 ('breakfast-porridge','把早餐吃暖一点，今天慢慢来','早餐','南瓜小米粥','一碗温润金黄色的南瓜小米粥，能看见细小米粒和小块煮软南瓜，不是光滑奶油浓汤，旁边一个剥开半边壳的完全熟鸡蛋和一把小瓷勺，浅麻布桌布，清晨低角度柔和窗光，安静普通家庭早餐桌。','南瓜切小块，和小米一起煮到柔软。配一个鸡蛋，早餐简单一点，也给出门前留一点不慌张的时间。'),
 ('weekend-fish','周末两人餐，清蒸鱼也有仪式感','周末小灶','清蒸鲈鱼','一只真实比例的熟制整条清蒸鲈鱼，躺在椭圆白瓷鱼盘中央，银灰色自然鱼皮、剖开后蒸熟的鱼肉，少量细姜丝和葱丝铺上方，底部一层浅棕酱汁，不要过多装饰；背景有两只白饭碗，普通家庭圆餐桌，黄昏柔光，鱼的鳍和尾形态自然。','先把蒸鱼的时间留出来，再准备配菜。两示例主体围着一盘鱼慢慢吃，周末不用把餐桌安排得很满。鱼肉需要蒸熟再吃。'),
 ('takeaway-bowl','外卖也可以搭配得清爽一点','外卖记录','鸡肉饭','无任何品牌的圆形牛皮纸外卖餐碗，里面是白米饭、熟鸡肉片、熟西兰花、胡萝卜、熟鸡蛋半颗，酱汁在一个小透明杯里单独放在碗旁边，纸盖随意靠在旁边，家中书桌但不出现电子屏幕与文字，柔和日光，真实外卖开盒后的生活感。','没有开火的一天，选了一份鸡肉饭，酱汁单独放。记下这餐吃了什么，比要求自己每顿都做饭更容易坚持。')]
common='用途：开饭小怪社区的虚构演示餐食照片。生成一张独立、完整、写实的食物生活摄影，不是插画，不是拼贴或九宫格，不是海报。画面是一位普通人用手机在自然环境中随手拍下的正准备吃的一餐，略有生活痕迹而干净卫生，主体准确可辨，食材形状和器皿比例合理，食物完全熟制。横向3:2构图，45度俯视或微俯视，食物占画面约65%，碗盘边缘完整、四周留有少量自然空间；真实柔和光线，克制景深和锐化，保留细微油光、米粒和陶瓷质地，不要塑料般光滑，不要广告棚拍，不要夸张拉丝、喷溅或浓烟。不要任何文字、水印、品牌、标签、菜单、人物、人脸或手，不要精确营养数值。后续应用会自行标注AI生成演示。场景：'
manifest={'batch':'kaifan-photo-demo-v1','model':'gpt-image-2.5-flare','synthetic':True,'items':[]}
for slug,title,tag,dish,scene,notes in scenes:
 prompt=common+scene
 (ROOT/'art-source/community-demo'/f'{slug}-prompt.txt').write_text(prompt+'\n')
 manifest['items'].append({'slug':slug,'title':title,'tag':tag,'dish':dish,'notes':notes,'prompt_path':f'art-source/community-demo/{slug}-prompt.txt','candidate_path':f'work/generated-art/community-demo/{slug}.jpg','path':f'art-source/community-demo/{slug}.jpg'})
(ROOT/'art-source/community-demo/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
def job(item):
 target=ROOT/item['candidate_path'];start=time.time()
 if target.is_file():return {'slug':item['slug'],'status':'existing','seconds':0}
 log=ROOT/'work/reports'/('community-image-'+item['slug']+'.log')
 command=[PYTHON,GEN,'--model',manifest['model'],'--prompt',(ROOT/item['prompt_path']).read_text(),'--size','1536x1024','--quality','high','--output-format','jpeg','--output-compression','90','--timeout','600','--out',str(target)]
 with log.open('w') as out:
  p=subprocess.run(command,stdout=out,stderr=subprocess.STDOUT,timeout=660)
 result={'slug':item['slug'],'status':'generated' if p.returncode==0 and target.is_file() else 'failed','seconds':round(time.time()-start,1),'log':str(log.relative_to(ROOT))}
 print(json.dumps(result,ensure_ascii=False),flush=True);return result
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for result in pool.map(job,manifest['items']):results.append(result)
report={'passed':all(x['status']!='failed' for x in results),'results':results,'concurrency':2,'model':manifest['model']}
(ROOT/'work/reports/community-image-generation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
if not report['passed']:raise SystemExit(1)
