/**
 * terminal.js — 打开终端连接进 DeepTutor
 *
 * 职责：托盘菜单里的「终端」项。点击后打开一个系统终端（Terminal.app），
 * 自动激活项目 venv，进入 deeptutor 命令行环境，用户可以敲 deeptutor 命令
 * （如 `deeptutor chat` 进入对话）。
 *
 * 实现：用 macOS 的 osascript 控制 Terminal.app，无需额外依赖。
 */

const { spawn } = require("child_process");
const config = require("./config");

/**
 * 打开一个终端，连接进 DeepTutor 的 CLI 环境。
 * 返回 Promise<{ ok: boolean, message: string }>
 */
function openTerminal() {
  return new Promise((resolve) => {
    // 终端里要执行的命令：进入项目目录 → 激活 venv → 提示可用命令
    const shellCommand = [
      `cd "${config.projectRoot}"`,
      `source .venv/bin/activate`,
      `clear`,
      `echo "DeepTutor 命令行环境已就绪"`,
      `echo "常用命令：deeptutor chat（对话）  deeptutor start（启动服务）"`,
      `echo ""`,
    ].join(" && ");

    // osascript 让 Terminal.app 新建一个窗口并执行上面的命令
    const script = `tell application "Terminal" to do script "${shellCommand.replace(/"/g, '\\"')}"`;

    const child = spawn("osascript", ["-e", script], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", (err) => {
      resolve({ ok: false, message: `无法打开终端：${err.message}` });
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ ok: true, message: "已打开终端" });
      } else {
        resolve({ ok: false, message: `打开终端失败：${stderr.trim() || code}` });
      }
    });
  });
}

module.exports = { openTerminal };
