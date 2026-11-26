# 开饭小怪 0.9.6：页面侧边伙伴

首页左上角小怪是直接入口，点击即在当前页面上展开对话。删除首页原有“小怪帮你”整块入口卡片。菜谱、食材、记录等页面有侧边小怪，支持拖动、左右吸边与尺寸变化后的位置约束；对话关闭后仍在当前页面。

对话以纸纹浮层呈现，背景虚化，底层内容暂不可操作。复用已有 AI 的授权、问题编辑、追问、菜品对比、收藏、计划和采购功能。打开不自动请求，不自动发送库存、照片或位置；关闭时取消尚未完成的请求，保留问题及标注为未完成的已收到文字。对话和拖动位置只在内存保留，不申请系统悬浮窗权限。

Android 覆盖层独立于业务路由和原页面 DOM，记餐写到一半时打开/关闭不会重新创建表单。点推荐菜会暂时收起对话进入真实菜谱，返回恢复原页面与会话。背景数据变化可在非编辑页面关闭时刷新；账号变化关闭私有浮层并清空会话。返回键、关闭按钮或点虚化区域可收起，键盘焦点限制在对话内，关闭后恢复入口焦点。

HarmonyOS 使用 ArkTS Stack、独立 Scroller、背景 blur 和原生菜单；保留当前页面，在覆盖层内复用原生 AI builders。推荐菜返回支持恢复覆盖层。两端实现不同，鸿蒙运行时键盘、系统大字体、菜单及手势还需真机验收，不能用宿主截图代替。

## 动作与美术

沿用原紫色乱毛、米饭碗和青绿勺。用 `api-image` 参考原姿态图生成新的探头、打盹、伸懒腰和惊喜四姿态，移除外部白底并导出透明 256×256 PNG；既有六姿态保持原 384×384 资源。十个独立姿态配合呼吸、探头、招手摇摆、拉伸、吃饭点头、打盹等变换。新图原稿及完整提示词在 `art-source/ai-mascot/companion-poses-*`，运行资源只保留正式四图。

Android 长按轮换招手/吃饭/伸腰/打盹，普通点击直接开聊；鸿蒙长按打开招手、吃饭、打盹菜单。拖动不会误触开聊。待机按低频有限序列切换，不使用每帧 JavaScript 渲染循环；退后台与减少动态效果时停止侧边动作计时器。原生组件不可见或不活跃时停止姿态计时。账号/做菜指引等易遮挡页面和 3D 大厅不重复显示侧边入口。

## 参考研究

阅读了 GitHub README 与以下实现，参考动作状态、有限事件队列、过渡结束和卸载清理的处理；没有复制第三方角色、美术、Live2D 模型或源码到运行工程，也未加入桌面全局键鼠监听。

- [BongoCat：MotionClip](https://github.com/ayangweb/BongoCat/blob/master/crates/bongocat-live2d-playback/src/motion/clip.rs)：一次动作的结束状态、淡出与播放范围。
- [BongoCat：motion events](https://github.com/ayangweb/BongoCat/blob/master/crates/bongocat-live2d-playback/src/motion/event.rs)：有序、有限的动作事件。
- [AIRI：移动端图标过渡](https://github.com/moeru-ai/airi/blob/main/apps/stage-pocket/src/components/IconAnimation.vue)及[生命周期清理](https://github.com/moeru-ai/airi/blob/main/apps/stage-pocket/src/composables/icon-animation.ts)：位置/尺寸过渡和卸载时结束状态。
- [Open-LLM-VTuber](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber)：阅读 README，参考对话与虚拟形象分离的产品结构；未集成语音或其运行服务。

阅读证据：`work/reports/companion-github-research.json`。首次外链抓取部分失败，随后通过 GitHub Contents API 读到了上述文件。

## 验证与交付

- `companion-ui.json`：11 组新增宿主交互；包含头像直达、真实目录菜谱跳转、拖动、长按、未保存表单、取消晚到回复、账号切换、后台暂停和四种屏幕尺寸。
- `companion-core.json`：4 组共享几何边界、显示策略、尺寸变更和有限姿态序列检查。
- `assistant-ui.json`：49 组原有 AI 宿主交互回归。
- `companion-art.json`：四张透明资源尺寸及指纹。
- `companion-performance.json`：开发机 Chromium 反复开关 12 次、显式 GC 前后 JS/DOM 指标及后台暂停。不是手机 GPU 或原生内存结论。
- 原有共享 SQLite、业务输入导航及 API 业务回归重新执行；后端/网关没有代码变更，本轮不重复部署或调用付费模型做演示。
- `assistant-release.json`：双包 0.9.6 / code24、不同包名、签名范围、源码资源一致性及凭据扫描。

实际 Android Web UI 宿主预览：`work/screenshots/companion-home-dialog.png`、`companion-chat-answer.png`、`companion-home-side.png`；演示回答为测试替身。动画：`work/reports/companion-preview.gif`。

安装包覆盖原交付路径：`outputs/kaifan-monster-android-debug.apk`（调试签名）和 `outputs/shiku-mvp-unsigned.hap`（需要开发者签名）。没有公网 HTTPS 域名，云端访问沿用现有 SSH/USB 测试转发。未启动 IDE、模拟器或系统悬浮窗，真机验收仍待设备。
