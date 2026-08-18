/**
 * tray.js — 系统托盘
 *
 * 职责：菜单栏图标 + 右键菜单（启动/停止/终端/退出）。
 */

const { Tray, Menu, nativeImage } = require("electron");
const path = require("path");

let tray = null;

/**
 * 创建菜单栏图标。
 * 使用「模板图标」（纯黑 + 透明），macOS 会自动适配深浅色菜单栏：
 * 浅色菜单栏显示黑色，深色菜单栏自动变白色。
 * 文件名带 Template 后缀 + 代码里 setTemplateImage(true)，双保险。
 */
function createTrayIcon() {
  // 尝试加载 assets 下的图标，没有就用内置生成的
  const iconPath = path.join(__dirname, "assets", "trayTemplate.png");
  const fromFile = nativeImage.createFromPath(iconPath);
  if (!fromFile.isEmpty()) {
    // 显式标记为模板图标，让 macOS 自动适配深浅色菜单栏
    fromFile.setTemplateImage(true);
    return fromFile;
  }

  // 内置兜底：生成一个 16x16 的简单图标（一个圆点）
  // 注：真实产品建议提供 trayTemplate.png / trayTemplate@2x.png
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = 0;
    buf[i * 4 + 1] = 0;
    buf[i * 4 + 2] = 0;
    buf[i * 4 + 3] = 255;
  }
  const img = nativeImage.createFromBitmap(buf, {
    width: size,
    height: size,
  });
  img.setTemplateImage(true);
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
  tray = new Tray(createTrayIcon());
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
 * 外部（主进程）在服务状态变化时调用，刷新菜单文案。
 */
function refresh(handlers) {
  if (tray) {
    rebuildMenu(handlers);
  }
}

module.exports = { createTray, refresh };
