/**
 * window.js — 桌面窗口
 *
 * 职责：创建一个桌面窗口，加载官方前端页面（3782 端口）。
 * 关闭窗口时不退出应用，而是收进托盘 + 隐藏 Dock 图标（转为后台运行）。
 */

const { BrowserWindow, app } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const os = require("os");
const config = require("./config");

let mainWindow = null;

/**
 * 创建（或复用）主窗口。
 * 若服务未启动，窗口加载的页面会打不开——由主进程负责先启动服务再建窗口。
 */
function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // 复用窗口时，恢复 Dock 图标并显示窗口
    if (app.dock) app.dock.show();
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "DeepTutor",
    titleBarStyle: "hidden",
    // 红绿灯三按键放在 28px 标题栏空间内（与页面左上角 deeptutor 元素隔开）
    trafficLightPosition: { x: 12, y: 8 },
    show: false,
    webPreferences: {
      // 桌面壳只加载本地页面，不注入 Node 能力到页面里，保持安全
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 页面加载好后再显示，避免白屏闪烁
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // 拦截新开窗口（比如页面里的外链），交给系统默认浏览器打开，
  // 而不是在应用内再开一个没有菜单的窗口。
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require("electron").shell.openExternal(url);
    return { action: "deny" };
  });

  // 隐藏标题栏后，用"28px 原生标题栏空间"替代：
  //  - 页面内容整体下移 28px，给顶部留出空间
  //  - 顶部 28px 为透明拖拽区（按住拖动、双击按 macOS 系统行为缩放）
  //  - 红绿灯按钮（trafficLightPosition）位于该空间内，与页面左上角元素隔开
  // 样式用 insertCSS（Electron 引擎级注入）：页面脚本/React 渲染无法移除。
  // 颜色与宽度不依赖 CSS 变量继承或事件监听（实测 MutationObserver 不触发），
  // 改为 500ms 轮询直接读取侧边栏的实际渲染背景色（getComputedStyle，所见即所得）：
  //  - 主题切换（class/style/刷新任一机制）→ 侧边栏背景色变化 → 500ms 内同步到顶部条
  //  - 侧边栏收缩/展开 → 宽度变化 → 同步
  const SHELL_CSS = `
    body { padding-top: 28px !important; }
    body > div[class*="h-dvh"] { height: calc(100dvh - 28px) !important; }
    html::before {
      content: "";
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 28px;
      -webkit-app-region: drag;
      z-index: 2147483647;
      background: linear-gradient(to right, var(--dt-bar-secondary, #f5f2ea) 0, var(--dt-bar-secondary, #f5f2ea) var(--dt-sidebar-w, 220px), transparent var(--dt-sidebar-w, 220px));
    }
    a, button, input, select, textarea, [role="button"], [contenteditable="true"] {
      -webkit-app-region: no-drag;
    }
  `;
  const SHELL_JS = `(function(){
    if (document.documentElement.getAttribute("data-dt-shell") === "1") return true;
    var aside = document.querySelector("aside");
    if (!aside) return false;
    document.documentElement.setAttribute("data-dt-shell", "1");
    var lastSig = "";
    function tick() {
      var bg = window.getComputedStyle(aside).backgroundColor;
      // 透明背景（主题过渡动画中）回退到 html 上的 --secondary 变量
      if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") {
        bg = window.getComputedStyle(document.documentElement).getPropertyValue("--secondary").trim() || "#f5f2ea";
      }
      var w = aside.offsetWidth;
      var sig = bg + "|" + w;
      if (sig !== lastSig) {
        lastSig = sig;
        document.documentElement.style.setProperty("--dt-bar-secondary", bg);
        document.documentElement.style.setProperty("--dt-sidebar-w", w + "px");
        console.log("[deeptutor-shell] paint bg=" + bg + " w=" + w);
      }
    }
    setInterval(tick, 500);
    tick();
    return true;
  })();`;

  // 主进程日志（与 service-manager 同文件），记录注入诊断
  const SHELL_LOG = path.join(os.homedir(), "Library", "Logs", "deeptutor-desktop.log");
  mainWindow.webContents.on("console-message", (_e, _level, message) => {
    if (String(message).includes("[deeptutor-shell]")) {
      try {
        fs.appendFileSync(SHELL_LOG, `[${new Date().toISOString()}] ${message}\n`);
      } catch (err) {
        // 忽略
      }
    }
  });

  // 主页加载后应用：insertCSS（引擎级，持久） + JS 轮询等侧边栏出现后每 500ms 同步颜色/宽度
  async function applyShell() {
    mainWindow.webContents.insertCSS(SHELL_CSS).catch(() => {});
    for (let i = 0; i < 15; i++) {
      try {
        const ok = await mainWindow.webContents.executeJavaScript(SHELL_JS, true);
        if (ok) return;
      } catch (err) {
        // 页面未就绪，继续等
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  mainWindow.webContents.on("dom-ready", () => {
    const url = mainWindow.webContents.getURL();
    if (url.startsWith(config.FRONTEND_URL)) {
      applyShell();
    }
  });

  // 启动期：先显示本地 splash 动画页（零延迟），主页 3782 可达后再切换
  const splashPath = path.join(__dirname, "splash.html");
  mainWindow.loadFile(splashPath);

  let switched = false;
  let poll = null;
  const switchToApp = () => {
    if (switched || (mainWindow && mainWindow.isDestroyed())) return;
    switched = true;
    if (poll) { clearInterval(poll); poll = null; }
    mainWindow.loadURL(config.FRONTEND_URL);
  };
  const probe = () => {
    if (switched || (mainWindow && mainWindow.isDestroyed())) return;
    const req = http.get(config.FRONTEND_URL, (res) => {
      res.resume();
      if (res.statusCode === 200) switchToApp();
    });
    req.on("error", () => {});
    req.setTimeout(1500, () => req.destroy());
  };
  poll = setInterval(probe, 800);
  // 90 秒兜底：服务可能挂了，强制切到主页让用户看到错误页
  setTimeout(() => switchToApp(), 90000);

  // 关闭窗口 = 收进托盘 + 隐藏 Dock 图标（转为后台运行，不退出应用）
  mainWindow.on("close", (event) => {
    if (!appIsQuitting()) {
      event.preventDefault();
      mainWindow.hide();
      // 隐藏 Dock 栏图标，应用转为纯后台运行（只留菜单栏托盘）
      if (app.dock) app.dock.hide();
    }
  });

  return mainWindow;
}

let quitting = false;

function appIsQuitting() {
  return quitting;
}

function setQuitting(value) {
  quitting = value;
}

function getWindow() {
  return mainWindow;
}

module.exports = {
  createWindow,
  getWindow,
  appIsQuitting,
  setQuitting,
};
