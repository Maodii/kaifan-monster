# Android 0.4.4 紧凑搜索入口

唯一APK：outputs/kaifan-monster-android-debug.apk，0.4.4/code10，47220303字节。

SHA256：3c0fce11820d172ed9c23406919fe9d897f912818574cc5d30867a7896622a40

冻结Index：4c864cb06a8cbbc8df67501f5c059737c6509672b2876ebd5fd7e6093126dfa4

之前搜索条的上下10px padding、29px图标字号与48/50px最小高度叠加，入口显得过高。本次只追加三条作用于搜索入口的CSS规则：最小44px、横padding12/纵0、小异形圆角、图标20px、提示15px。文字使用rem，保留88%/max480px窄宽，不改业务脚本。

新执行12个组合：320/390/768宽×字体1/1.3×菜谱/社区。实测均44px高，无纵向裁字、水平越界或子项遮挡；点击进入各自独立搜索页，返回原入口。版本标签为Android0.4.4·10。额外2倍字体检查实际增高至62px，证明没有固定高度裁字。

13组release通过：签名与实际版本、32共享模型、544媒体、454封面、共享字体及桌面图标一致。新报告android-compact-search-tests.json绑定最终core与9个页面文件。

没有重跑0.4.3的59UI/504布局、38业务或6crypto。原执行报告及hash原样保留。android-compact-evidence.json记录旧build行与hash；验证器从新core替换回旧build行，精确重建旧core hash，证明只有版本和Index参考元数据变化。当前CSS去掉明确的搜索条追加文本后精确重建旧style hash，另外8个页面和原生源指纹均不变。发布报告明确区分新验证与保留证据。

两张Playwright代表图android-host-compact-search-recipes.png和android-host-compact-search-community.png已登记work/artifacts.json；保留之前4张正式响应式代表图。本轮没有source截图或重复APK，没有启动模拟器、前置窗口或全量备份。宿主证据不代替Android真机WebView或双端逐像素验收。主线程独立双包复核待确认。
