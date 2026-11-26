"""Exercise real native typo/pinyin/fallback messaging without cloud requests."""
from pathlib import Path
import json,hashlib
h=Path(__file__).with_name('native-discovery-ui.py');exec(compile(h.read_text().split('\ntry:\n')[0],str(h),'exec'))
try:
 restart();click('菜谱');click('清空筛选')
 field('fanqiechaodan');expect('番茄炒蛋');expect('已按拼音或近似文字，为你找到相关菜谱');ui.screenshot('discovery-search-pinyin.jpeg');checks.append('full pinyin returns original tomato/egg recipe with honest match message')
 field('宫爆鸡丁');expect('宫保鸡丁');checks.append('homophone typo recalls actual kung pao recipe')
 field('番茄鸡蛋');expect('西红柿鸡蛋汤');checks.append('unspaced Chinese query retrieves actual tomato-and-egg recipes')
 field('川菜 火星菜');expect('没有找到完全匹配的结果，为你推荐相似菜系');ui.screenshot('discovery-search-fallback.jpeg');assert scroll_cards();checks.append('no direct match clearly identified as similar-cuisine suggestions')
 field('zzqvwx998877');expect('没有找到匹配结果，先看看这些家常菜灵感');assert scroll_cards();checks.append('nonsense never claimed to match; constrained home-cooking suggestions remain accessible')
 for query,summary in [('想吃不辣的鸡蛋','不辣'),('十分钟内','10分钟内'),('不要花生的宫保鸡丁','排除花生'),('有鸡蛋没番茄','需要鸡蛋')]:
  field(query);expect_contains(summary);checks.append('native natural-language constraints: '+query)
 field('0分钟内');expect('时间需大于0且不超过1440分钟');assert not ids(ui.dump());checks.append('invalid zero-minute constraint visibly rejected without fallback cards');ui.screenshot('discovery-search-constraints.jpeg')
 click('清空筛选');click('今日')
 result={'passed':True,'checks':checks,'source_sha256':hashlib.sha256((ui.ROOT/'client/entry/src/main/ets/pages/Index.ets').read_bytes()).hexdigest(),'scope':'Actual native pinyin/Chinese segmentation/typo/fallback messages; no stock, meal or account writes'}
except Exception as e:result={'passed':False,'checks':checks,'error':str(e)};raise
finally:
 (ui.ROOT/'work/reports/native-discovery-search.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
