# Android 0.6.1 搜索图标与红心

本轮范围：只调整搜索入口与收藏呈现/操作反馈，按主端最终Index `0ef5715a21e9766fa25907571e54a30fe37e3626fcd6742b526af97b12518ca1` 同步0.6.1/code13。不重跑整套业务，也不重绑0.6.0旧报告。

实际修改：

- 删除页面顶部独占搜索条，将44×44px按钮放入菜谱/社区标题左侧。按钮在main内，随内容滚动；读屏分别为“搜索菜谱”“搜索社区分享”，仍进入各自独立搜索页。
- 使用现有正式utility_search图片，无新增美术资源；普通字号、1.3倍和2倍文字下保持44px触控面积并允许标题换行。
- 收藏筛选入口显示红心与本机数量；卡片使用44px可点红心与社区计数，选中实心、未选空心，保留aria-pressed、收藏/取消及菜名读屏说明。
- 详情与每日一菜收藏动作改为纯红心，详情顶栏心色同步红色，保留原记录ID与业务动作。
- 普通菜谱列表收藏只更新按钮及收藏总数，保留列表DOM、顺序、滚动、焦点和路由。收藏筛选中取消收藏正常移除目标。
- 修正旧社区筛选插入函数：放在完整标题组之后，避免嵌入标题内部使其竖排。
- 保留上一轮有限局部动效、取消勾号、原图片与用户数据。

源码：android/web/{index.html,app.js,parity.js,living.js,style.css}及AndroidManifest.xml版本。新增check-icon-hearts.cjs与verify-icon-hearts-release.py；test-ui.cjs仅增加定向入口。

## 验证

`work/reports/android-icon-hearts.json`为新执行报告：18个视口/文字/路由组合（320/390/768px，1/1.3/2倍字体，两页面），4组交互检查：独立搜索与返回、44px红心/读屏/数字/键盘、SQLite重载持久化与取消、滚动点击保持DOM顺序与scrollY/不跳详情、收藏筛选内取消即时移除，以及版本和动效结束清理。

`work/reports/android-icon-hearts-release.json`为新包定向验证：包签名与CRC、实际0.6.1/code13、当前5份呈现文件与所有包内web字节、32共享模块、547正式媒体、454封面、原版图标与字体和定向报告绑定。共享core剔除唯一build元数据行后，字节与0.6.0相同；原生适配代码未变。旧业务/完整UI/动效报告保持原哈希，在android-v061-baseline.json记录，明确属于保留证据，并非本轮重新执行。

确认截图：work/screenshots/android-host-icon-hearts-recipes.png、android-host-icon-hearts-community.png；均为Playwright真实浏览器截图，已登记work/artifacts.json，非Android设备截图。不新增模拟器、不创建整项目备份；同路径更新确认图，无候选素材或重复包积累。

本轮未做Android真机、完整业务重跑、帧率或长时稳定性验收。独立双包复核已通过，报告work/reports/search-heart-dual-release.json；设备/帧率/长时稳定性边界不变。

正式APK：outputs/kaifan-monster-android-debug.apk，47830852字节，SHA256 `a1a340d2cec0f6efdb0d4a58526037100cc3a8ea33516673a53a6467508eade2`。core SHA256 `80a92657a9c585923d885d9b2976a724406cc3b65620a0730c8c9a3c234eeee1`。7组定向发布校验通过，主端独立双包核验已通过，报告work/reports/search-heart-dual-release.json。
