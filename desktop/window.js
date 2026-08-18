/**
 * window.js — 桌面窗口
 *
 * 职责：创建一个桌面窗口，加载官方前端页面（3782 端口）。
 * 关闭窗口时不退出应用，而是收进托盘 + 隐藏 Dock 图标（转为后台运行）。
 */

const { BrowserWindow, app } = require("electron");
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

  mainWindow.loadURL(config.FRONTEND_URL);

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
