"""Trace the agreed90directions to actual sources; behavioral results are separate."""
from pathlib import Path
import json,hashlib,datetime
ROOT=Path(__file__).resolve().parents[1]
INDEX='client/entry/src/main/ets/pages/Index.ets'
POLISH='android/web/polish.js'
CORE='client/entry/src/main/ets/model/InteractionPolishCore.ets'
RUNTIME='prototypes/3d-lobby/native/runtime.js'
ART='prototypes/3d-lobby/native/art-direction.js'
REFINE='scripts/lobby3d/detail/refinement.py'
COMMON='scripts/lobby3d/detail/common.py'
rows=[]
def item(kind,title,path,anchor,change='复核保留',note=''):
 text=(ROOT/path).read_text();assert anchor in text,(title,path,anchor)
 rows.append(dict(id=kind+str(1+sum(r['id'].startswith(kind) for r in rows)).zfill(2),title=title,source=path,line=text[:text.index(anchor)].count('\n')+1,change=change,review='源码已核对；实际操作见验证报告',note=note))
for title,anchor in [
 ('按做饭／记餐选择首次使用偏好','先选一种用法'),
 ('首页直接记录早午晚餐','homeMealCard'),
 ('一键复用上次用餐','repeatPickedMeal'),
 ('收藏夹组合复用与安排','currentCollectionRecipes'),
 ('先拍照片，再补记餐信息','this.mealPhotoControls()'),
 ('按用餐场景展示字段，店铺仅外食选填',"['餐馆','食堂','外卖','外食'].includes(this.mealDining)"),
 ]:item('I',title,INDEX,anchor)
item('I','常用金额点选，保留手动输入',POLISH,'polishAmount','本轮补齐')
item('I','五档味道感受与无障碍名称',CORE,'TASTE_FEELINGS','本轮增强')
item('I','半份／常规／大份独立记录',INDEX,'mealPortion','本轮补齐','份量标签不擅自改变热量；热量比例单独确认。')
item('I','保存后撤销，检查后续修改',POLISH,'记录已有后续修改，不能撤销','本轮补齐')
for title,anchor in [
 ('滑动切换日历周／日期','swipeCalendar'),('周历月历收展','homeCalendarOpen'),
 ('历史记餐与未来计划区分',"this.homeDate>dateString(new Date())"),
 ('将计划转为实际用餐','openHomeMeal'),('补记过去缺少的一餐','this.mealDate=this.homeDate'),
 ('首页统计精简，详细统计进入独立页面','餐费与饮食')]:item('I',title,INDEX,anchor)
item('I','保留筛选、日期、主分区和返回滚动位置',POLISH,'polishRestoreOffset','本轮增强')
item('I','统一分层返回规则',INDEX,'navigateBack')
item('I','表单、横向列表和页面切换手势分区',INDEX,'backEdge')
item('I','本机草稿恢复与主动丢弃',INDEX,'persistMealEditorDraft','本轮补齐')
item('I','食材左右滑动进入消耗／历史',INDEX,'event.offsetX<0','本轮补齐')
item('I','按全部、一半、四分之一快速选择消耗量',POLISH,'polishConsumeAmount','本轮增强')
for title,anchor in [('购买与消耗时间线','食材的来去都有迹'),('搜索与查看已吃完的批次','已吃完'),('复用上次采购记录','purchaseInsight'),('临期食材跳转关联菜谱','openIngredient'),('采购合并前预览数量和来源','previewProcurement'),('实际做菜前库存扣减预览','previewDeduction')]:item('I',title,INDEX,anchor)
item('I','不兼容单位停止自动换算','client/entry/src/main/ets/model/DailyFlowCore.ets','compatibleUnit')
item('I','食材批量操作',INDEX,'selectedFoods')
item('I','菜谱与社区独立搜索','android/web/search.js','community-search')
item('I','最多30条历史，支持单条和全部清理',INDEX,'term,30')
item('I','筛选面板分组导航',INDEX,'filterTabs')
item('I','选择时实时显示结果数量',INDEX,'draftFilterCount')
item('I','明确提示矛盾条件并逐项调整',CORE,'filterConflicts','本轮补齐','不会自动放宽家庭忌口。')
item('I','单独取消任意已选条件',CORE,'removeFilterToken','本轮补齐')
item('I','排序独立收纳，支持时间／费用／收藏',INDEX,"'价格升序','价格降序','耗时升序'")
item('I','红心收藏与安全撤销',POLISH,'polishUndoActions','本轮增强')
item('I','做菜步骤模式、用量与计时器',INDEX,'beginKitchenTimer')
item('I','主料、辅料、调味品按需展开',INDEX,'preparationItems')
item('I','抽餐人数、预算、时间与菜汤组合收纳',INDEX,'drawAdvanced')
item('I','锁住满意菜品，只重抽其他菜',INDEX,'drawLocked')
item('I','简洁解释推荐原因',INDEX,'ranked.reasons' if 'ranked.reasons' in (ROOT/INDEX).read_text() else '为什么推荐')
item('I','抽餐后进入备料、做法、采购和安排',INDEX,'drawResultTab')
item('I','照片拍摄／选择、裁切、排序与草稿','client/entry/src/main/ets/model/NativeMedia.ets','static async compose','本轮补齐','最多4张合成一张拼图分享；并非多图轮播帖。原图和本机排序保留。')
item('I','从菜谱关联自己的成品分享',INDEX,'createRecipeWork')
item('I','首次短时提示3D操作，不常驻占位',RUNTIME,'showHint','本轮补齐')
item('I','3D轻点打开、长按查看、拖动旋转',RUNTIME,'focusPart')
item('I','部件查看后返回先前相机位置',RUNTIME,'returnInspection','本轮补齐')
item('I','自适应分辨率与减少动态效果',RUNTIME,'qualitySamples','本轮增强','自动降采样只作用于均衡档；省电／高画质保留明确选择。')
for title,path,anchor,change in [
 ('统一材质、色彩和光照基准',ART,'ROOM_PALETTES','本轮增强'),
 ('五个场景独立强调色',ART,'roomPalette','本轮补齐'),
 ('控制高饱和颜色面积',ART,"accent:'#a4664c'",'本轮增强'),
 ('非对称轮廓与自然不规则构图','android/web/style.css','.recipe-list-card:nth-child','本轮增强'),
 ('统一倒角半径和边缘语言',COMMON,'Machined edge radius','复核保留'),
 ('物体尺度与比例关系',COMMON,'Dimensions in metres','复核保留'),
 ('镜头适配场景真实边界',RUNTIME,'all eight actual world-bound corners','复核保留'),
 ('远中近景的细节层级',COMMON,'def part(','复核保留'),
 ('木纹跟随物体方向',REFINE,'assign_metric_uv','复核保留'),
 ('木头端面与截面细节','scripts/lobby3d/detail/mirror_finish.py','Floor exposed end grain','复核保留'),
 ('木纹UV错位减少机械重复',REFINE,'random.Random(ob.name','复核保留'),
 ('区分黄铜、拉丝钢与深色金属',ART,"/brass/",'本轮增强'),
 ('金属实际接头、螺丝与连接',COMMON,'Countersunk screw','复核保留'),
 ('陶瓷釉面分层反光',ART,'clearcoatRoughness','本轮补齐'),
 ('杯、碗和玻璃内腔及液面',COMMON,'Tea meniscus','复核保留'),
 ('织物纹理、褶皱和绒面反射',ART,'sheenRoughness','本轮增强'),
 ('织物包边、缝线与受力褶皱',REFINE,'Apron bound side seam','复核保留'),
 ('纸张分层与非塑料粗糙度',REFINE,'Bag side inward folded gusset','复核保留'),
 ('真实镜面反射、曲面边缘与分辨率分档',RUNTIME,'installMirrorReflection','复核保留'),
 ('镜框背板、层次和固定配件','scripts/lobby3d/detail/mirror_finish.py','Mirror full thickness rear shell','复核保留'),
 ('墙脚、踢脚线、地板收口','scripts/lobby3d/detail/mirror_finish.py','Skirting floor shadow reveal','复核保留'),
 ('柜子内部层板和结构',REFINE,'Cabinet removable shelf','复核保留'),
 ('冰箱内胆、门封、风道材质分层',REFINE,'refine_cold_fan','复核保留'),
 ('弧形小配件细分和平滑',COMMON,'parallel transported frames','复核保留'),
 ('食物具有具体菜品辨识度','scripts/lobby3d/detail/props.py','def fish(','复核保留'),
 ('食物切面、纤维与菌褶结构',REFINE,'Soup ingredient half mushroom cap','复核保留'),
 ('按食材区分油润、含水与干燥质感',ART,'/tomato|oil|broth/','本轮增强'),
 ('食物分布保留自然差异',REFINE,'rng=random.Random(7701)','复核保留'),
 ('食物与餐具接触阴影',RUNTIME,'PCFSoftShadowMap','复核保留'),
 ('热汤按操作出现克制蒸汽，结束释放',RUNTIME,'startSteam','本轮补齐'),
 ('小怪毛流分区梳理','scripts/lobby3d/detail/fur.py','groom_appendages','复核保留'),
 ('毛发长度、密度和冠毛差异',REFINE,'refine_crown_filaments','复核保留'),
 ('Q萌面部比例与材质协调','scripts/lobby3d/detail/cute_character.py','build_character','复核保留'),
 ('手、碗和脚的接触关系',REFINE,'refine_monster_grains','复核保留'),
 ('统一主光方向与柔和补光',RUNTIME,"light.position.set(-5,9,6)",'复核保留'),
 ('接触阴影偏移与高低画质分档',RUNTIME,'light.shadow.normalBias','复核保留'),
 ('控制曝光，保留亮部细节',RUNTIME,'exposure:evening?.94:1.04','本轮增强'),
 ('设计昼夜配色和局部灯光',RUNTIME,"new THREE.PointLight",'本轮补齐'),
 ('标题字体层次与紧凑单行布局',INDEX,"fontFamily('ShikuHand')",'本轮增强'),
 ('统一转场时长、曲线与低动态规则','android/web/experience.js',"cubic-bezier(.2,.7,.2,1)",'复核保留'),
]:item('A',title,path,anchor,change)
assert len(rows)==90 and sum(r['id'].startswith('I') for r in rows)==50
report={'updated_at':datetime.datetime.now().astimezone().isoformat(),'scope':'All90agreed directions mapped to current implementation. Source coverage is not proof of90independent defects or device acceptance. Existing modeled details retained, missing interaction/material behavior added.','counts':{'interaction':50,'art':40},'items':rows,'source_hashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in set(r['source'] for r in rows)},'remaining_acceptance':['Current Harmony emulator WebGL remains denied; no application-only override identified','Physical-device GPU,touch/native camera/canvas and permissions remain unverified','Harmony production signing not configured']}
(ROOT/'work/reports/interaction-art90-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
doc=['# 开饭小怪：50项交互与40项美术落地核对','','90项方向均已定位到实现：本轮增强或补齐27项，另外63项复核现有实现后保留。源码覆盖不等于90项独立测试通过，真机验收另列。','','“复核保留”表示已有功能或模型细节本轮核对后继续采用；“本轮增强／补齐”表示此次修改。源码定位用于追溯，运行与画面验证另见测试报告。','', '| 编号 | 方向 | 本轮处理 | 实现定位 |','|---|---|---|---|']
for r in rows:doc.append(f"| {r['id']} | {r['title']} | {r['change']} | `{r['source']}:{r['line']}` |")
doc+=['','照片功能采用最多4张的可排序拼图，发布结果是一张图，原图保留。裁切提供居中填满与完整显示两档；不是任意自由裁剪工具。','', '均衡画质按实际渲染耗时降低分辨率；未用桌面测试冒充手机帧率验收。3D部件查看支持明确返回旧视角；蒸汽只在热锅打开时短暂出现，切后台和减少动态效果时释放。','', '鸿蒙模拟器目前仅能显示明确标注的同源场景预览，WebGL1/2上下文仍被系统环境拒绝；真机GPU、相机授权、原生照片合成及发布签名仍需设备验收。']
(ROOT/'docs/interaction-art90.md').write_text('\n'.join(doc)+'\n')
print('SOURCE_COVERAGE',len(rows),'items',sum(r['change']!='复核保留' for r in rows),'enhanced')
