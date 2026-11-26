# 3D 模块暂时停用（0.9.15 / 33）

两端隐藏 3D 入口、显示模式和画质选项。旧 displayMode=3d 偏好仍保留，但启动统一进入简洁界面。Android 保留 AI 依赖的轻量路由桥接，不创建 3D iframe；鸿蒙不引用或实例化 LobbyView。

安装包不再包含场景、GLB、3D 纹理和离线渲染预览。生成场景通过原地移动保存在 work/lobby3d-bundle，没有复制整套工程。可编辑源文件保留在 prototypes/3d-lobby 和 art-source/lobby3d；原鸿蒙组件保留在 prototypes/3d-lobby/native/LobbyView.ets。

日后恢复须同时恢复双端入口与加载逻辑、鸿蒙组件导入，以及打包资源。scripts/lobby3d/build-native.cjs 当前只生成到 work/lobby3d-bundle，普通 Android 构建不会调用它；两个发布校验脚本已要求包内不含 3D 目录。

验证：双端构建、APK 签名、安装包 ZIP/资源一致性、23 组伙伴交互（含停用回归）、56 组 AI 界面测试通过。鸿蒙模拟器已覆盖安装，首页和外观设置检查通过，无业务数据写入。详见 work/reports/lobby-disabled-release.json。
