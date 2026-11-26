# 搜索、排序与同菜做法算法

后续新增分词/拼音/错字与显式相似推荐层，见 `docs/recipe-fuzzy-search.md`。本文 `searchRecipe` 的精确规则仍保留；页面模糊检索通过新的 `RecipeSearchCore` 全集接口实现。

2026-11-04 核实：当时目录有 450 条菜谱，没有 aliases、dishGroupId 或 variantOf 数据。原 Index 搜索把菜名、地区、菜系、原料拼成字符串后 includes，既不拆多个词，也不处理英文大小写和别名。原推荐已有硬筛选、库存覆盖、临期、地区、饮食目标、偏好学习、近期吃过降权、前十二项多样性及固定批次扰动。

## 共享接口

源文件是 `backend/src/recipe-discovery-core.ts`，原生镜像是 `client/entry/src/main/ets/model/RecipeDiscoveryCore.ets`。运行 `python3 scripts/sync-recommendation-core.py` 同步；不要分别维护两份规则。

- `searchRecipe(recipe, query)` 返回 `{matched, score, reasons}`。统一空白、英文大小写及全角英数字，以空格/逗号/顿号/分号拆词，所有词都必须命中。字段独立匹配，不允许菜名尾部与地区开头拼出一个词。菜名完全匹配 120、明确别名/同菜做法 100、菜名开头 80、菜名包含 65、别名包含 55、原料完全匹配 40、原料包含 25、地区/菜系完全匹配 20、包含 10；每个词只取最高分。明确支持番茄/西红柿、土豆/马铃薯、香菜/芫荽等保守等价。不猜测连续中文查询的分词，也不提供拼音/错别字模糊匹配。
- `compareRecipeOrder(a,b,order,query='',people=2)` 支持 `推荐`、`综合排序`、`价格升序`、`价格降序`、`耗时升序`、`耗时降序`。推荐同分保留输入顺序；综合排序按搜索分再菜名/ID稳定排序。耗时未知始终末尾。通用价格使用 usability-core 的 estimateRecipeCost（菜谱已知费用或可用食材推算），不可估计者始终末尾。**页面若展示 DailyExperienceCore.displayCost 的同类预测价格，必须按同一 displayCost 值排序**，不可混用严格估价比较器。
- `groupRecipeVariants(recipes)` 返回 `{key,name,recipes}[]`，保留所有原始对象、独立 ID 及输入顺序；首项可作列表代表。`recipeGroupKey(recipe)` 可对页面现有 Recipe 类型计算同组关系，无须改变 Recommendation 类型。
- `RecommendationCore.matchesRankingConstraints(recipe, options)` 只判断忌口、口味、地区、类型、时间等硬条件；不参考近期用餐和反馈。忌口检查菜名、别名及全部原料（包括可选原料）。其用途是大全完整候选列表，之后页面直接包装 Recommendation 并稳定排序。

## 菜系与做法分组

`CUISINE_GROUPS` 的九个产品分组为川、粤、鲁、苏、浙、闽、湘、徽、其他地方菜。第九项是导航分组，不是第九传统菜系。`recipeCuisineGroup` 优先识别 cuisine，再以 region 做省区导航回退，不声称省区必然证明菜系归属。通用家常、异国风味、缺失/未知数据返回空串；不限菜系时仍完整保留。餐次、菜品类型和菜系分别筛选，同维度 OR、跨维度 AND。`RecipeFilterOptions.cuisines` 使用分组 id（当前与中文 label 相同）。

做法归组优先显式 dishGroupId，然后精确菜名；只有两组保守编辑字典：红烧肉及目录已有的徽派/湖南家常/南派/简易红烧肉，番茄炒蛋的常见等价菜名。不自动删除地区、器具、烹调方法、括号或“版”字；煎蛋/蒸蛋、番茄炒蛋/番茄鸡蛋汤均保持独立。同组并不把各做法步骤合并。

## 推荐与大全

推荐保留覆盖 55、临期 24、地区 10、学习 18、目标等已有权重，近期吃过降 16、近期不喜欢降 20；换批为确定性最多 3 分扰动（原 12 分），固定输入与批次重算一致。前十二项继续按类别与原料做有限多样性调整。近期吃过同组做法一起降权，未来用餐不计入；不会因为近期吃过或不喜欢从大全隐藏。

重复必需原料先按别名和兼容单位合并后判断库存，不能用两枚鸡蛋分别覆盖两枚加一枚的需求。未知/非有限需求量、无效日期、非有限库存、过期或归档库存不能当成备齐。未知口味/地区/类型不再生成“清淡/通用家常/家常菜”学习特征。总耗时缺失时只有 prepMinutes 与 cookMinutes 都合法才求和，不能只把部分已知耗时当完整耗时。

## 验证

在 backend 下执行：

```sh
node --import tsx test/recipe-discovery.test.ts
node --import tsx test/personalization.test.ts
node --import tsx test/recipe-filter.test.ts
node --import tsx test/rules.test.ts
node --import tsx test/usability.test.ts
npm run typecheck
```

上述检查已通过。新增测试包含实际 ArkTS 镜像模块及依赖图执行一致性、跨字段误命中、缺失数据、双向排序、组内保留全部 ID、近期变体与重复库存。450 条目录九组计数为川17、粤16、鲁7、苏4、浙8、闽6、湘7、徽2、其他地方菜33；剩余通用家常/异国风味不强行归入地方菜。页面与整包 ArkTS 编译由主开发对话集成验证。

主开发随后确认整包 ArkTS 首次构建通过，包含三份修改后的共享模块；原生交互验证由主开发继续执行。

## 后端 HTTP 目录接口的已知边界

当前真实入口为 `backend/src/catalog.ts` 的 `CatalogController.recipes`，工程中没有 `catalog.service.ts`。上文搜索规则已接入原生本地列表，**尚未接入 GET /catalog/recipes**。该 HTTP 接口仍有以下旧行为：

- 预置库用单个 SQL ILIKE 模式搜索菜名或原料，公共审核菜谱只搜索菜名；均不调用 searchRecipe，不拆词，不做等价词或相关度。
- SQL ILIKE 的 `%` 和 `_` 仍作为通配符，与本地搜索的字面子串语义不同。
- 预置库查询最多 500 条，公共库最多 200 条，然后合并去重、排序、每页返回 100 条；不能在这个已截断的候选集合上补一次纯库过滤就声称全量搜索一致。
- 预置库支持时间限制、dietTags/快手类别；公共查询尚未应用时间限制，也没有同样的 dietTags/快手类别逻辑。

本轮保留 API 行为，由主开发完成原生完整验证；未改服务器、数据库或部署服务。若下一步统一，应单独修改此控制器：先用不会遗漏搜索命中的方式获取预置与已审核候选（完整、稳定分批遍历或经等价性验证的 SQL 查询），统一 ID 去重和硬约束，再调用 searchRecipe、全局稳定排序，最后按现有每页 100 条分页。不能先按旧搜索或旧 500/200 上限裁掉结果。须新增跨来源、超过旧上限、跨分页、别名/多词、通配符字面语义及公共菜谱时间限制的接口测试，再由主开发安排服务构建更新。

## 2026-11-05 后端边界更新

上节旧限制已在本轮修复：服务端先合并完整内置/已审核目录，再执行共享筛选与搜索、稳定排序、100 条分页；支持食材组、任一/全部食材、排除、难度、预算、耗时和真实收藏排序。无匹配 API 返回空数组，相似推荐只在有明确解释的客户端展示。610 内置＋240 公开的隔离 PostgreSQL 测试及收藏/热搜/显式发布一致性 6 组通过，详见 `work/reports/discovery-catalog-integration.json`。公开热度与私人同步的明确边界见 `docs/favorite-publication.md`；服务端源码通过不代表运行中的旧容器已更新。
