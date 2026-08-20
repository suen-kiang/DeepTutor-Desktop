/**
 * main.js — 主进程入口
 *
 * 职责：把「服务管家 + 窗口 + 托盘」串起来，协调整个应用的生命周期。
 *
 * 启动流程：
 *   1. 检查 Python 环境是否就绪（venv 是否已建、deeptutor 是否可用）。
 *   2. 启动服务（子进程 deeptutor start）。
 *   3. 服务就绪后，创建窗口加载 3782 页面。
 *   4. 建立托盘。
 */

const { app, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const serviceManager = require("./service-manager");
const trayManager = require("./tray");
const windowManager = require("./window");
const terminal = require("./terminal");
const config = require("./config");

// 简单日志：写入日志文件，方便排查 GUI 应用启动问题
const LOG_FILE = path.join(os.homedir(), "Library", "Logs", "deeptutor-desktop.log");
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}`;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch (e) {
    // 忽略日志写入失败
  }
}

// 单实例锁：避免重复启动多个桌面实例
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

function isEnvironmentReady() {
  // venv 里的 python 和 deeptutor 命令是否存在
  return fs.existsSync(config.venvPython) && fs.existsSync(config.deeptutorBin);
}

let quitting = false;

// 托盘回调集合
function trayHandlers() {
  return {
    isRunning: () => serviceManager.getState() === "running",
    onOpenWindow: () => {
      // 从托盘打开窗口：先恢复 Dock 图标，再显示窗口
      windowManager.createWindow();
    },
    onToggleService: async () => {
      if (serviceManager.getState() === "running") {
        await serviceManager.stop();
      } else {
        const r = await serviceManager.start();
        if (r.ok) {
          windowManager.createWindow();
        } else {
          dialog.showErrorBox("DeepTutor", r.message);
        }
      }
      trayManager.refresh(trayHandlers());
    },
    onOpenTerminal: async () => {
      const r = await terminal.openTerminal();
      if (!r.ok) {
        dialog.showErrorBox("DeepTutor", r.message);
      }
    },
    onQuit: async () => {
      quitting = true;
      windowManager.setQuitting(true);
      // 退出前恢复 Dock 图标，避免残留后台状态
      if (app.dock) app.dock.show();
      await serviceManager.stop();
      app.quit();
    },
  };
}

app.on("second-instance", () => {
  // 用户再次双击图标时，唤起已有窗口
  windowManager.createWindow();
});

app.whenReady().then(async () => {
  log("=== DeepTutor 桌面应用启动 ===");
  log("projectRoot =", config.projectRoot);
  log("venvPython =", config.venvPython);
  log("deeptutorBin =", config.deeptutorBin);
  log("dataHome =", config.dataHome);

  // 1. 环境检查
  if (!isEnvironmentReady()) {
    log("环境未就绪：venvPython 或 deeptutorBin 不存在");
    dialog.showErrorBox(
      "DeepTutor",
      [
        "运行环境未就绪，请先执行以下步骤：",
        "",
        `1. 安装依赖：cd ${config.projectRoot} && brew install python@3.12`,
        `2. 创建虚拟环境：python3.12 -m venv .venv`,
        `3. 安装 DeepTutor：.venv/bin/pip install -e .`,
      ].join("\n"),
    );
    app.quit();
    return;
  }
  log("环境检查通过");

  // 2. 建立托盘（先建，保证应用常驻菜单栏）
  trayManager.createTray(trayHandlers());
  log("托盘已建立");

  // 3. 启动服务
  log("开始启动服务...");
  const r = await serviceManager.start();
  log("服务启动结果:", JSON.stringify(r));
  if (r.ok) {
    // 4. 服务就绪后创建窗口
    windowManager.createWindow();
    // 服务已 running，托盘图标刷新为绿色
    trayManager.refresh(trayHandlers());
    log("窗口已创建");
  } else {
    dialog.showErrorBox("DeepTutor", `服务启动失败：${r.message}`);
    log("服务启动失败:", r.message);
    // 即便失败也保留托盘，让用户能从托盘重试
  }

  // 5. 定时做状态恢复检测（每 30 秒）
  setInterval(async () => {
    await serviceManager.recover();
    trayManager.refresh(trayHandlers());
  }, 30000);
});

// macOS：点击 Dock 图标时重新显示窗口
app.on("activate", () => {
  windowManager.createWindow();
});

// 所有窗口关闭时不退出（macOS 惯例），保持托盘常驻
app.on("window-all-closed", () => {
  // 不调用 app.quit()，让托盘继续运行
});
