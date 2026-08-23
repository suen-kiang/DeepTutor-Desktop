# DeepTutor Desktop 1.5.16

基于官方 DeepTutor **v1.5.16** 的 macOS 桌面封装（Electron 瘦包，官方源码零改动）。

## 本版变化

- 同步官方上游 **v1.5.15 → v1.5.16**。
- 桌面层版本号跟随官方，由 `1.5.15` 升到 `1.5.16`（沿用 `desktop-v1.5.16` tag 命名）。

### 官方 v1.5.16 主要更新

- **新增 MarginNote 4 知识库接入**：可将 MarginNote 4 的笔记本作为已连接知识库使用，支持知识中心网格展示、设备桥接鉴权边界收敛、索引进度文案国际化，以及「一个知识库对应唯一存储」的规则修正。
- **聊天与工具调用修复**：流式工具调用改用后端分配 ID（不再追加拼接）；会话中已删除知识库的引用会被自动清理；provider 错误体写入日志前做长度收敛。
- **LLM 稳定性**：模型内置覆盖项改由模型自身解析（而非路由层）；provider 错误映射与 Codex OAuth provider 加固。
- **RAG 管线**：LlamaIndex 管线并行处理图片描述（带超时与进度）；LightRAG 传输失败与取消逻辑收敛。
- **Embedding**：兼容要求显式 `encoding_format` 的网关。
- **Docker**：开发镜像补齐其编译所用的 web 源码。

## ✨ 桌面层功能（承袭自 1.5.15）

- **启动动画**：启动时 logo 呼吸动画（20% → 70% → 50% 往复循环），主页就绪后自动切换，告别启动白屏空窗。
- **无标题栏窗口**：隐藏 macOS 原生标题栏，改为 28px 自定义标题栏空间——左上角红绿灯按钮、顶部按住可拖动窗口、双击可缩放。
- **主题跟随标题栏**：标题栏空间颜色实时跟随官方主题（浅色 / 深色 / 琉璃 / 奶油），并随左侧边栏收缩/展开联动。
- **托盘状态图标**：服务运行中托盘图标变为绿色（#34C759），停止/异常时恢复黑色模板图标（自动适配菜单栏明暗）。

## 🔧 修复与改进（承袭自 1.5.15）

- 修复打包产物缺失 `service-manager.js` 导致应用启动报错（`Cannot find module`）的问题。
- `service-manager` 补充用户级 TeX Live 到 PATH（`math-animator` 数学公式渲染依赖 latex/xelatex/dvisvgm）。
- 补齐 web 前端依赖 `pdfjs-dist`，解决前端构建失败。

## 📦 安装说明

1. 解压 zip，将 `DeepTutor.app` 拖入「应用程序」。
2. macOS 15 对未签名应用有安全提示：**首次运行请右键 DeepTutor.app → 打开**，在弹窗中点击「打开」。
3. 应用数据目录：`~/Library/Application Support/DeepTutor`。

> 需要完整安装的额外依赖（可选）：dev / partners / matrix / matrix-e2e / math-animator，对应官方 `pip install -e ".[...]"`。
