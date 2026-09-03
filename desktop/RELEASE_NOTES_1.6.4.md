# DeepTutor Desktop 1.6.4

基于官方 DeepTutor **v1.6.4** 的 macOS 桌面封装（Electron 瘦包，官方源码零改动）。

## 本版变化

- 同步官方上游 **v1.6.0 → v1.6.4**（266 个提交，1641 个文件变更，+236298 / -32870 行）。
- 桌面层版本号跟随官方，由 `1.6.0` 升到 `1.6.4`。
- 桌面层代码本身无改动，仅版本号与发布说明更新。

### 官方 v1.6.4 主要更新

本次更新聚焦于「更轻量启动、更清晰状态、更稳定跨页面」的学习工作区体验。

**新功能**

- **更轻量启动与隔离重型任务**：内置工具和能力按需加载，provider SDK 客户端改用有界连接池；文档解析等重型任务通过独立 worker 进程运行，避免主进程崩溃或内存溢出。
- **Books 生成计划透明化**：生成前显示实时章节预估，可选择仅生成部分内容；支持 queued / running / paused / resumed / interrupted 等状态跟踪。
- **Mastery Path 精准覆盖**：本地知识库可限定至单个文件；生成主题后若未覆盖所选材料，可触发补全生成或确认省略。
- **Reading 持久化书签**：支持保存和恢复文本/EPUB 位置，提供上一页/下一页单元反馈、排版控制和笔记本导出功能。
- **对话跨页面保持状态**：阅读与对话切换时保留未读状态、归档/恢复、笔记本捕获和标题更新。
- **统一活动语言**：Chat、Books、Co-Writer 和侧边栏共享同一套进度/完成/中断状态表达。
- **Model 端点自描述**：LLM 和 Task 配置可选 OpenAI Chat Completions / Responses 或 Anthropic Messages，支持 per-model 的工具调用、图片输入、JSON 输出、推理控制声明。

**修复与优化**

- 兼容模式迁移：`wire_api` 设置自动迁移至 `api_format`，遗留 Anthropic 绑定继续加载。
- 记忆 Markdown 路径迁移：从 `data/user/workspace/memory` 移至 `data/memory`，冲突时备份而非覆盖。
- scheduler 依赖随主应用安装，无需单独 `croniter`。

## ✨ 桌面层功能（承袭自 1.5.15 / 1.5.16 / 1.5.17 / 1.6.0）

- **启动动画**：启动时 logo 呼吸动画，主页就绪后自动切换，告别启动白屏空窗。
- **无标题栏窗口**：隐藏 macOS 原生标题栏，改为 28px 自定义标题栏空间——左上角红绿灯按钮、顶部按住可拖动、双击可缩放。
- **主题跟随标题栏**：标题栏空间颜色实时跟随官方主题（浅色 / 深色 / 琉璃 / 奶油），并随左侧边栏收缩/展开联动。
- **托盘状态图标**：服务运行中托盘图标变为绿色（#34C759），停止/异常时恢复黑色模板图标（自动适配菜单栏明暗）。
- **进程隔离**：子进程调用官方 `deeptutor start`，不 import 官方 Python 代码；官方内部实现变化对桌面层无感知。
- **PATH 兜底**：GUI 启动时自动补 `/opt/homebrew/bin`、`/usr/local/bin` 与用户级 TeX Live（Manim 公式渲染依赖）。

## 📦 安装说明

1. 解压 zip，将 `DeepTutor.app` 拖入「应用程序」。
2. macOS 15 对未签名应用有安全提示：**首次运行请右键 DeepTutor.app → 打开**，在弹窗中点击「打开」。
3. 应用数据目录：`~/Library/Application Support/DeepTutor`。

> 需要完整安装的额外依赖（可选）：dev / partners / matrix / matrix-e2e / math-animator，对应官方 `pip install -e ".[...]"`。
