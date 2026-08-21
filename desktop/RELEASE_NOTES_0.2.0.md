# DeepTutor Desktop 0.2.0

基于官方 DeepTutor **v1.5.14** 的 macOS 桌面封装（Electron 瘦包，官方源码零改动）。

## ✨ 新增功能

- **启动动画**：启动时 logo 呼吸动画（20% → 70% → 50% 往复循环），主页就绪后自动切换，告别启动白屏空窗。
- **无标题栏窗口**：隐藏 macOS 原生标题栏，改为 28px 自定义标题栏空间——左上角红绿灯按钮、顶部按住可拖动窗口、双击可缩放。
- **主题跟随标题栏**：标题栏空间颜色实时跟随官方主题（浅色 / 深色 / 琉璃 / 奶油），并随左侧边栏收缩/展开联动。
- **托盘状态图标**：服务运行中托盘图标变为绿色（#34C759），停止/异常时恢复黑色模板图标（自动适配菜单栏明暗）。

## 🔧 修复与改进

- 修复打包产物缺失 `service-manager.js` 导致应用启动报错（`Cannot find module`）的问题。
- `service-manager` 补充用户级 TeX Live 到 PATH（`math-animator` 数学公式渲染依赖 latex/xelatex/dvisvgm）。
- 补齐 web 前端依赖 `pdfjs-dist`（官方 v1.5.14 阅读器功能需要），解决前端构建失败。

## 📦 安装说明

1. 解压 zip，将 `DeepTutor.app` 拖入「应用程序」。
2. macOS 15 对未签名应用有安全提示：**首次运行请右键 DeepTutor.app → 打开**，在弹窗中点击「打开」。
3. 应用数据目录：`~/Library/Application Support/DeepTutor`。

> 需要完整安装的额外依赖（可选）：dev / partners / matrix / matrix-e2e / math-animator，对应官方 `pip install -e ".[...]"`。

