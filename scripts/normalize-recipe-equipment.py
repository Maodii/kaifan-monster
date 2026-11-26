"""Keep source tools as equipment; never count them as edible ingredients."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parent.parent
p=ROOT/'backend/data/recipes.json';d=json.loads(p.read_text());changes=[]
TOOL_NAMES=set('密封袋 量杯 厨房秤 刷子 盆 菜刀一个 菜刀 削皮刀 一次性手套 厨房用夹 定时器 杯子 秒表 圆碟子 蒸架 轻食机 过滤网 小刀 刮刀 克数称 刨丝器 筛网 烘焙刮刀 一次性塑料手套 烘焙纸 餐刀 隔热手套 铝箔纸 滤网 捣药罐 小斧头 消毒纱布 烧烤炉 烤网 炭火或燃气 锡箔纸 汤匙 燃气灶 擦丝器 煲汤盅 布 烘焙油纸 披萨石 蒸篦子 额外的盆 电饼铛 电磁炉/灶台 冰箱 铲子 蒸箱 搅拌器'.split())
HEADERS={'注','原则','主料','辅料','必备','可根据口味选择增加','大约','直径','面食材料','菜类材料'}
for r in d['recipes']:
 tools=[i for i in r['ingredients'] if i['name'] in TOOL_NAMES or re.search(r'微波炉|面包机|平底锅|炒锅|蒸锅|烤箱|电饭煲|模具|烤盘|砂锅|空气炸锅|炖锅|高压锅|砧板|蒸笼|打蛋器|分蛋器|擀面杖|搅拌机|容器|碗|盘子|盘夹|耐热盘|玻璃碗|塑料盆|厨房纸|筛网|洗菜盆|簸箕|吸油纸|小铁盆',i['name'])]
 headers=[i for i in r['ingredients'] if i['name'] in HEADERS]
 if headers:r['sourceIngredientNotes']=r.get('sourceIngredientNotes',[])+headers;r['ingredients']=[i for i in r['ingredients'] if i not in headers]
 if not tools and not headers:continue
 r['equipment']=list(dict.fromkeys(r.get('equipment',[])+[i['name'] for i in tools]));r['ingredients']=[i for i in r['ingredients'] if i not in tools]
 changes.append({'recipeId':r['id'],'name':r['name'],'equipment':r['equipment']})
if changes:
 d['sourceRevision']=d['sourceRevision'].split('+equipment-v2')[0]+'+equipment-v2'
 payload=json.dumps(d,ensure_ascii=False,separators=(',',':'))
 p.write_text(payload);(ROOT/'client/entry/src/main/resources/rawfile/recipes.json').write_text(payload)
 (ROOT/'work/reports/recipe-equipment-normalization.json').write_text(json.dumps({'changes':changes,'policy':'Source raw lists and steps kept unchanged; only normalized edible ingredient list corrected, equipment explicit.'},ensure_ascii=False,indent=2))
print('Normalized equipment in',len(changes),'recipes')
