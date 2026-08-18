# DeepTutor 桌面应用（Electron 封装层）

这是 DeepTutor 官方项目的 macOS 桌面封装层，位于 `desktop/` 目录，**不改动任何官方源码**。

## 它是什么

一个"外壳"：把官方的 Web 服务（后端 8001 + 前端 3782）用一个原生 macOS 应用包起来，提供：

- 桌面窗口（加载官方 Web UI）
- 系统托盘（启动 / 停止 / 终端 / 退出）
- 打包成 `.app`

官方代码通过「子进程」被调起，进程级隔离，官方更新不影响桌面层。

## 目录结构

```
desktop/
├── main.js              # 主进程入口：生命周期编排
├── config.js            # 唯一配置源（路径 / 端口，官方接口有变动只改这里）
├── service-manager.js   # 服务管家：启动 / 停止 / 健康检查
├── window.js            # 桌面窗口
├── tray.js              # 系统托盘
├── terminal.js          # 「终端」菜单项：打开 Terminal 连进 DeepTutor CLI
├── assets/icon.icns     # 应用图标
├── package.json         # 依赖 + electron-builder 打包配置
└── dist/mac-arm64/      # 打包产物（DeepTutor.app 在这里）
```

## 使用前提（瘦包方案）

桌面层**不打包 Python/Node 运行时**，依赖本机环境：

1. **Python**：brew 的 `python@3.12`，并在项目根目录建好 `.venv` 并 `pip install -e .`。
2. **Node**：本机任意版本（前端产物在打包阶段预生成，运行时只 `node server.js`）。

## 如何运行（开发模式）

```bash
cd desktop
npm install            # 首次，下载 Electron
npm start              # 开发模式运行
```

## 如何打包成 .app

```bash
cd desktop
npm run pack           # 生成 dist/mac-arm64/DeepTutor.app
npm run dist           # 生成 .dmg（需配置代码签名）
```

打包是未签名的（本地使用无碍）。正式分发需配置 Apple 开发者证书。

## 路径配置（重要）

打包后 `.app` 里代码路径会变，`config.js` 按以下优先级定位 DeepTutor 源码根目录：

1. 环境变量 `DEEPTUTOR_ROOT`（最高优先级）
2. 开发模式：自动定位（`desktop/` 上一级）
3. 打包模式：默认 `~/Documents/work_projects/DeepTutor`

如果你的源码不在默认位置，设置环境变量 `DEEPTUTOR_ROOT` 即可。

## 已知注意事项

1. **家目录 package.json 干扰**：若 `~/package.json` 存在（非本项目的误创建文件），会导致 Next.js 把工作区根误判为家目录，前端 standalone 产物路径错误，`deeptutor start` 现场编译失败。建议保持家目录干净。
2. **首次启动需配置模型**：后端启动时会提示"无活跃 LLM 模型"，需在 Web 界面 Settings 里配置。
3. **端口占用**：8001/3782 被占用时服务启动会失败。
