# 开饭小怪：50项交互与40项美术落地核对

90项方向均已定位到实现：本轮增强或补齐27项，另外63项复核现有实现后保留。源码覆盖不等于90项独立测试通过，真机验收另列。

“复核保留”表示已有功能或模型细节本轮核对后继续采用；“本轮增强／补齐”表示此次修改。源码定位用于追溯，运行与画面验证另见测试报告。

| 编号 | 方向 | 本轮处理 | 实现定位 |
|---|---|---|---|
| I01 | 按做饭／记餐选择首次使用偏好 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:1273` |
| I02 | 首页直接记录早午晚餐 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:1219` |
| I03 | 一键复用上次用餐 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:438` |
| I04 | 收藏夹组合复用与安排 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:445` |
| I05 | 先拍照片，再补记餐信息 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:2237` |
| I06 | 按用餐场景展示字段，店铺仅外食选填 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:2252` |
| I07 | 常用金额点选，保留手动输入 | 本轮补齐 | `android/web/polish.js:22` |
| I08 | 五档味道感受与无障碍名称 | 本轮增强 | `client/entry/src/main/ets/model/InteractionPolishCore.ets:34` |
| I09 | 半份／常规／大份独立记录 | 本轮补齐 | `client/entry/src/main/ets/pages/Index.ets:125` |
| I10 | 保存后撤销，检查后续修改 | 本轮补齐 | `android/web/polish.js:104` |
| I11 | 滑动切换日历周／日期 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:330` |
| I12 | 周历月历收展 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:164` |
| I13 | 历史记餐与未来计划区分 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:452` |
| I14 | 将计划转为实际用餐 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:1205` |
| I15 | 补记过去缺少的一餐 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:452` |
| I16 | 首页统计精简，详细统计进入独立页面 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:1718` |
| I17 | 保留筛选、日期、主分区和返回滚动位置 | 本轮增强 | `android/web/polish.js:50` |
| I18 | 统一分层返回规则 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:322` |
| I19 | 表单、横向列表和页面切换手势分区 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:319` |
| I20 | 本机草稿恢复与主动丢弃 | 本轮补齐 | `client/entry/src/main/ets/pages/Index.ets:426` |
| I21 | 食材左右滑动进入消耗／历史 | 本轮补齐 | `client/entry/src/main/ets/pages/Index.ets:1091` |
| I22 | 按全部、一半、四分之一快速选择消耗量 | 本轮增强 | `android/web/polish.js:153` |
| I23 | 购买与消耗时间线 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:908` |
| I24 | 搜索与查看已吃完的批次 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:928` |
| I25 | 复用上次采购记录 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:8` |
| I26 | 临期食材跳转关联菜谱 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:1083` |
| I27 | 采购合并前预览数量和来源 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:13` |
| I28 | 实际做菜前库存扣减预览 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:10` |
| I29 | 不兼容单位停止自动换算 | 复核保留 | `client/entry/src/main/ets/model/DailyFlowCore.ets:2` |
| I30 | 食材批量操作 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:215` |
| I31 | 菜谱与社区独立搜索 | 复核保留 | `android/web/search.js:17` |
| I32 | 最多30条历史，支持单条和全部清理 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:1127` |
| I33 | 筛选面板分组导航 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:1425` |
| I34 | 选择时实时显示结果数量 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:717` |
| I35 | 明确提示矛盾条件并逐项调整 | 本轮补齐 | `client/entry/src/main/ets/model/InteractionPolishCore.ets:26` |
| I36 | 单独取消任意已选条件 | 本轮补齐 | `client/entry/src/main/ets/model/InteractionPolishCore.ets:20` |
| I37 | 排序独立收纳，支持时间／费用／收藏 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:1488` |
| I38 | 红心收藏与安全撤销 | 本轮增强 | `android/web/polish.js:86` |
| I39 | 做菜步骤模式、用量与计时器 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:1134` |
| I40 | 主料、辅料、调味品按需展开 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:2030` |
| I41 | 抽餐人数、预算、时间与菜汤组合收纳 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:154` |
| I42 | 锁住满意菜品，只重抽其他菜 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:162` |
| I43 | 简洁解释推荐原因 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:2095` |
| I44 | 抽餐后进入备料、做法、采购和安排 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:154` |
| I45 | 照片拍摄／选择、裁切、排序与草稿 | 本轮补齐 | `client/entry/src/main/ets/model/NativeMedia.ets:12` |
| I46 | 从菜谱关联自己的成品分享 | 复核保留 | `client/entry/src/main/ets/pages/Index.ets:2216` |
| I47 | 首次短时提示3D操作，不常驻占位 | 本轮补齐 | `prototypes/3d-lobby/native/runtime.js:39` |
| I48 | 3D轻点打开、长按查看、拖动旋转 | 复核保留 | `prototypes/3d-lobby/native/runtime.js:45` |
| I49 | 部件查看后返回先前相机位置 | 本轮补齐 | `prototypes/3d-lobby/native/runtime.js:37` |
| I50 | 自适应分辨率与减少动态效果 | 本轮增强 | `prototypes/3d-lobby/native/runtime.js:34` |
| A01 | 统一材质、色彩和光照基准 | 本轮增强 | `prototypes/3d-lobby/native/art-direction.js:4` |
| A02 | 五个场景独立强调色 | 本轮补齐 | `prototypes/3d-lobby/native/art-direction.js:60` |
| A03 | 控制高饱和颜色面积 | 本轮增强 | `prototypes/3d-lobby/native/art-direction.js:5` |
| A04 | 非对称轮廓与自然不规则构图 | 本轮增强 | `android/web/style.css:1267` |
| A05 | 统一倒角半径和边缘语言 | 复核保留 | `scripts/lobby3d/detail/common.py:51` |
| A06 | 物体尺度与比例关系 | 复核保留 | `scripts/lobby3d/detail/common.py:1` |
| A07 | 镜头适配场景真实边界 | 复核保留 | `prototypes/3d-lobby/native/runtime.js:136` |
| A08 | 远中近景的细节层级 | 复核保留 | `scripts/lobby3d/detail/common.py:27` |
| A09 | 木纹跟随物体方向 | 复核保留 | `scripts/lobby3d/detail/refinement.py:462` |
| A10 | 木头端面与截面细节 | 复核保留 | `scripts/lobby3d/detail/mirror_finish.py:64` |
| A11 | 木纹UV错位减少机械重复 | 复核保留 | `scripts/lobby3d/detail/refinement.py:469` |
| A12 | 区分黄铜、拉丝钢与深色金属 | 本轮增强 | `prototypes/3d-lobby/native/art-direction.js:38` |
| A13 | 金属实际接头、螺丝与连接 | 复核保留 | `scripts/lobby3d/detail/common.py:89` |
| A14 | 陶瓷釉面分层反光 | 本轮补齐 | `prototypes/3d-lobby/native/art-direction.js:36` |
| A15 | 杯、碗和玻璃内腔及液面 | 复核保留 | `scripts/lobby3d/detail/common.py:110` |
| A16 | 织物纹理、褶皱和绒面反射 | 本轮增强 | `prototypes/3d-lobby/native/art-direction.js:34` |
| A17 | 织物包边、缝线与受力褶皱 | 复核保留 | `scripts/lobby3d/detail/refinement.py:450` |
| A18 | 纸张分层与非塑料粗糙度 | 复核保留 | `scripts/lobby3d/detail/refinement.py:284` |
| A19 | 真实镜面反射、曲面边缘与分辨率分档 | 复核保留 | `prototypes/3d-lobby/native/runtime.js:80` |
| A20 | 镜框背板、层次和固定配件 | 复核保留 | `scripts/lobby3d/detail/mirror_finish.py:36` |
| A21 | 墙脚、踢脚线、地板收口 | 复核保留 | `scripts/lobby3d/detail/mirror_finish.py:52` |
| A22 | 柜子内部层板和结构 | 复核保留 | `scripts/lobby3d/detail/refinement.py:174` |
| A23 | 冰箱内胆、门封、风道材质分层 | 复核保留 | `scripts/lobby3d/detail/refinement.py:297` |
| A24 | 弧形小配件细分和平滑 | 复核保留 | `scripts/lobby3d/detail/common.py:63` |
| A25 | 食物具有具体菜品辨识度 | 复核保留 | `scripts/lobby3d/detail/props.py:50` |
| A26 | 食物切面、纤维与菌褶结构 | 复核保留 | `scripts/lobby3d/detail/refinement.py:99` |
| A27 | 按食材区分油润、含水与干燥质感 | 本轮增强 | `prototypes/3d-lobby/native/art-direction.js:42` |
| A28 | 食物分布保留自然差异 | 复核保留 | `scripts/lobby3d/detail/refinement.py:64` |
| A29 | 食物与餐具接触阴影 | 复核保留 | `prototypes/3d-lobby/native/runtime.js:230` |
| A30 | 热汤按操作出现克制蒸汽，结束释放 | 本轮补齐 | `prototypes/3d-lobby/native/runtime.js:187` |
| A31 | 小怪毛流分区梳理 | 复核保留 | `scripts/lobby3d/detail/fur.py:6` |
| A32 | 毛发长度、密度和冠毛差异 | 复核保留 | `scripts/lobby3d/detail/refinement.py:416` |
| A33 | Q萌面部比例与材质协调 | 复核保留 | `scripts/lobby3d/detail/cute_character.py:22` |
| A34 | 手、碗和脚的接触关系 | 复核保留 | `scripts/lobby3d/detail/refinement.py:425` |
| A35 | 统一主光方向与柔和补光 | 复核保留 | `prototypes/3d-lobby/native/runtime.js:233` |
| A36 | 接触阴影偏移与高低画质分档 | 复核保留 | `prototypes/3d-lobby/native/runtime.js:233` |
| A37 | 控制曝光，保留亮部细节 | 本轮增强 | `prototypes/3d-lobby/native/runtime.js:207` |
| A38 | 设计昼夜配色和局部灯光 | 本轮补齐 | `prototypes/3d-lobby/native/runtime.js:233` |
| A39 | 标题字体层次与紧凑单行布局 | 本轮增强 | `client/entry/src/main/ets/pages/Index.ets:497` |
| A40 | 统一转场时长、曲线与低动态规则 | 复核保留 | `android/web/experience.js:244` |

照片功能采用最多4张的可排序拼图，发布结果是一张图，原图保留。裁切提供居中填满与完整显示两档；不是任意自由裁剪工具。

均衡画质按实际渲染耗时降低分辨率；未用桌面测试冒充手机帧率验收。3D部件查看支持明确返回旧视角；蒸汽只在热锅打开时短暂出现，切后台和减少动态效果时释放。

鸿蒙模拟器目前仅能显示明确标注的同源场景预览，WebGL1/2上下文仍被系统环境拒绝；真机GPU、相机授权、原生照片合成及发布签名仍需设备验收。
