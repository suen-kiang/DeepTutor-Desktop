/**
 * tray.js — 系统托盘
 *
 * 职责：菜单栏图标 + 右键菜单（启动/停止/终端/退出）。
 */

const { Tray, Menu, nativeImage } = require("electron");
const path = require("path");

let tray = null;

/**
 * 加载一个托盘图标。
 * @param {string} fileName  assets 下的文件名
 * @param {boolean} asTemplate  是否作为「模板图标」（纯黑，自动适配菜单栏明暗）
 * @returns {Electron.NativeImage}
 */
function buildIcon(fileName, asTemplate) {
  const fromFile = nativeImage.createFromPath(path.join(__dirname, "assets", fileName));
  if (!fromFile.isEmpty()) {
    if (asTemplate) fromFile.setTemplateImage(true);
    return fromFile;
  }

  // 内置兜底：生成一个 16x16 的占位图
  // 模板图标走纯黑；彩色图标（运行中绿）走 #34C759
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  const R = asTemplate ? 0 : 52;
  const G = asTemplate ? 0 : 199;
  const B = asTemplate ? 0 : 89;
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = R;
    buf[i * 4 + 1] = G;
    buf[i * 4 + 2] = B;
    buf[i * 4 + 3] = 255;
  }
  const img = nativeImage.createFromBitmap(buf, {
    width: size,
    height: size,
  });
  if (asTemplate) img.setTemplateImage(true);
  return img;
}

/**
 * 创建托盘。
 * @param {object} handlers 主进程注入的回调
 *   - onToggleService: 切换启动/停止
 *   - onOpenTerminal: 打开终端
 *   - onQuit: 退出应用
 *   - isRunning: 返回服务是否在运行（用于动态切换菜单文案）
 */
function createTray(handlers) {
  tray = new Tray(buildIcon("trayTemplate.png", true));
  tray.setToolTip("DeepTutor");
  rebuildMenu(handlers);
  return tray;
}

/**
 * 根据当前服务状态重建菜单（运行中显示「停止」，否则显示「启动」）。
 */
function rebuildMenu(handlers) {
  const running = handlers.isRunning ? handlers.isRunning() : false;

  const menu = Menu.buildFromTemplate([
    {
      label: "打开主窗口",
      click: () => handlers.onOpenWindow && handlers.onOpenWindow(),
    },
    { type: "separator" },
    {
      label: running ? "停止服务" : "启动服务",
      click: () => handlers.onToggleService && handlers.onToggleService(),
    },
    {
      label: "终端",
      click: () => handlers.onOpenTerminal && handlers.onOpenTerminal(),
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => handlers.onQuit && handlers.onQuit(),
    },
  ]);

  tray.setContextMenu(menu);
}

/**
 * 外部（主进程）在服务状态变化时调用，刷新菜单文案 + 图标颜色。
 * 运行中 → 绿色图标；其他 → 黑色模板图标（自动适配菜单栏明暗）。
 */
function refresh(handlers) {
  if (tray) {
    const running = handlers.isRunning ? handlers.isRunning() : false;
    tray.setImage(buildIcon(running ? "trayGreen.png" : "trayTemplate.png", !running));
    rebuildMenu(handlers);
  }
}

module.exports = { createTray, refresh };
