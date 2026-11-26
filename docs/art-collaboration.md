# 食库美术与主程序协作

用户于 2026-11-03 明确授权以下两个对话并发工作、相互发送需求与交付信息。后续食库生图与动画制作集中在美术对话进行。

| 分工 | 对话 | threadId |
| --- | --- | --- |
| 菜名与图片对应、菜品图片、UI 美术、动画制作与素材验证 | 生成食库美术素材 | 01a1a000-8404-7573-9331-25e8fc25ac01 |
| 主程序、菜谱数据、数据库、推荐逻辑、素材接入与运行验证 | 部署食库开发环境 | 01a19f30-f4fc-7823-8b17-045904cf2911 |

共享工程根目录：`/Users/developer/Documents/ChatGPT/HarmonyOS`。

## 需求与交付

- 主程序侧向美术侧发送菜名、稳定 recipe ID、用途、尺寸、格式、风格参考及动画运行约束；缺失的普通规格可由美术侧提出默认方案。
- 美术侧交付相对路径、菜名/recipe ID 映射、尺寸、格式、透明通道情况；动画额外记录时长、帧率、循环方式与实际交付格式。生成示意图不可当作真实菜品照片或运行截图。
- 具体批次的新要求优先。原有 `docs/design.md` 和 `art-source/style-reference.png` 仅作为旧版背景；当前重设计方向为现代美食杂志式细线水彩、暖象牙纸底、墨蓝/陶土/鼠尾草绿，淘汰粗黑边与大面积亮黄色窗格。正文与标题排版由主程序侧处理。
- 主程序侧负责业务代码引用、构建与运行确认；美术侧负责生成资源及其质量核对。根据首批交接约定，美术侧不修改 `.ets`、`.ts`、SQL、`work/artifacts.json` 或现有正式图；仅交付候选及独立清单 `work/reports/art-delivery.json`，由主程序侧确认后写入正式资源、映射和总清单。
- 接到明确批次后开始制作，避免重复生成、无需求的大批量生成和反复轮询。双方可通过获授权的对话消息交换需求与结果。

## 文件约定

| 路径 | 用途 |
| --- | --- |
| `work/generated-art/` | 生图候选、拆分试验与失败生成物 |
| `art-source/` | 需要保留的正式原图、提示词与许可 |
| `client/entry/src/main/resources/base/media/` | 正式接入客户端的图片资源 |
| `work/screenshots/` | 实际浏览器、引擎或设备确认截图 |
| `work/reports/` | 验证报告与必要证据 |
| `work/artifacts.json` | 单份素材及截图清单；追加时保留其他对话记录 |

素材记录包括 `path`、`kind`、`purpose`、`target_path`，存在 UUID 时一并记录；截图记录实际 `capture_tool`。动画的运行资源目录按主程序接入方案确定。

不创建整项目备份或重复成果目录；仅清理本次制作且确认废弃、未被引用的中间产物。未知用途原图、现有用户修改及其他任务文件保留。

## 当前批次

当前批次 `editorial-refresh-02`，状态 `integrated_and_native_verified`，仅制作纸纹、四个头像与分量选择页头图，不扩批。两次 API 生成的必要源图和提示词已移至 `art-source/editorial-paper-header.png`、`art-source/editorial-avatars.png` 及同名 `-prompt.txt`。六项正式资源位于 `client/entry/src/main/resources/base/media/`： `paper_ivory_tile.png`（1024×1024，相对边缘像素一致）、`portion_editorial_header.webp`（1536×512，中央留白）、`avatar_editorial_{tomato,rice,cat,mushroom}.png`（各512×512，真实透明背景，主体最大300px，四周至少102px留白）。头像原始低透明度晕边已清理，成品在粉色与鼠尾草绿色背景上完成目视核对，QA临时拼图已删除。

纸纹/头图 API 实际源图为887×1774，未符合请求的1536×2048；交付尺寸通过本地裁切缩放获得，不能称为原生高分辨率生成。纸纹另完成低对比、象牙色均值和周期边缘处理。所有裁切、透明处理、尺寸、SHA-256与限制均记录在 `work/reports/art-delivery.json`。主程序已完成正式接入和总清单登记，并报告在本任务后台 ARM64 原生模拟器实际渲染及目检通过；确认截图为 `work/screenshots/shiku-home.jpeg`、`work/screenshots/shiku-profile-account.jpeg`、`work/screenshots/shiku-register.jpeg`。美术侧核对六项正式资源 SHA-256 与原交付一致，原图、提示词及截图路径均存在。本轮仅更新两份记录，不扩批、不生成重复素材或备份。

## 已完成旧批次

首批仅制作家常菜、快手菜、汤类、粥类、大菜、主食六类封面。状态：`integrated_and_native_verified`。画布 1536×1024，3×2 排列，每格 512×512；正式资源命名 `category_home`、`category_quick`、`category_soup`、`category_congee`、`category_feast`、`category_staple`，格式 WebP。图片不烘焙文字，沿用既有手绘风格。动画与下一批单菜专图尚未开始；新增菜谱身份须读取落盘数据，不能自行发明 UUID。

首批六张封面已由主程序正式接入，主开发对话确认原生构建与模拟器展示通过，确认截图为 `work/screenshots/shiku-library.jpeg`。源画布与提示词已移至 `art-source/category-covers.png`、`art-source/category-covers-prompt.txt`；六张正式图片位于 `client/entry/src/main/resources/base/media/category_{home,quick,soup,congee,feast,staple}.webp`。每个源格缩至 432×432，居中放入 512×512 奶油底，增加 40px 外围留白。独立清单 `work/reports/art-delivery.json` 已更新正式路径、裁切信息与验证证据；美术侧核对六张正式文件的 SHA-256 均与原交付一致。总清单 `work/artifacts.json` 由主程序侧登记，本轮美术侧仅更新协作说明与独立交付清单，不扩展生图批次。
