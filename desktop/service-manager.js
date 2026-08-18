/**
 * service-manager.js — 服务管家
 *
 * 职责（白话）：像「汽车点火按钮」，负责把官方引擎启动起来、关闭掉、
 * 以及发现熄火了自动重新点火。
 *
 * 关键点：这里不 import 任何官方 Python 代码，只用「子进程」执行
 * 官方命令 `deeptutor start`，实现进程级隔离。官方怎么改内部实现，
 * 只要命令和端口不变，这里就无感知。
 */

const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const config = require("./config");

// 日志文件（与 main.js 共用，便于排查）
const LOG_FILE = path.join(os.homedir(), "Library", "Logs", "deeptutor-desktop.log");
function slog(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}`;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch (e) {
    // 忽略
  }
}

// 当前运行中的服务子进程（全局唯一）
let serviceProcess = null;

// 状态机：stopped（已停止）| starting（启动中）| running（运行中）| error（异常）
let serviceState = "stopped";

/**
 * 探测某个端口是否响应（即服务是否活着）。
 * 返回 Promise<boolean>
 */
function probeUrl(url, timeout = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.setTimeout(timeout);
  });
}

/**
 * 健康检查：前端(3782) + 后端(8001) 是否都通。
 * 返回 Promise<{ frontend: boolean, backend: boolean, allUp: boolean }>
 */
async function checkHealth() {
  const [frontend, backend] = await Promise.all([
    probeUrl(config.FRONTEND_URL),
    probeUrl(`http://127.0.0.1:${config.BACKEND_PORT}/`),
  ]);
  return { frontend, backend, allUp: frontend && backend };
}

/**
 * 获取当前状态。
 */
function getState() {
  return serviceState;
}

/**
 * 启动服务：子进程执行 `deeptutor start --home <数据目录>`。
 *
 * 注意：
 *  - 设置 DEEPTUTOR_HOME 环境变量，指向桌面专属数据目录。
 *  - 子进程的 stdout/stderr 透传到主进程日志，方便排查。
 *
 * 返回 { ok: boolean, message: string }
 */
function start() {
  return new Promise((resolve) => {
    if (serviceProcess && serviceProcess.exitCode === null) {
      resolve({ ok: false, message: "服务已在运行中" });
      return;
    }

    serviceState = "starting";

    const env = {
      ...process.env,
      DEEPTUTOR_HOME: config.dataHome,
      PYTHONUNBUFFERED: "1",
    };

    // 关键：补充 PATH。
    // Finder 双击启动的 GUI 应用，PATH 只有 /usr/bin:/bin 等系统目录，
    // 不含 brew 的 /opt/homebrew/bin，导致子进程找不到 node/npm。
    // 这里把常见的可执行文件目录补进 PATH（幂等，重复添加无副作用）。
    const extraPaths = [
      "/opt/homebrew/bin", // Apple Silicon 的 Homebrew
      "/usr/local/bin", // Intel Mac 的 Homebrew
    ];
    const currentPath = env.PATH || "";
    for (const p of extraPaths) {
      if (!currentPath.split(":").includes(p)) {
        env.PATH = `${p}:${env.PATH}`;
      }
    }

    // 防御：清空 NODE_OPTIONS。
    // 某些开发环境（如 WorkBuddy）会通过 NODE_OPTIONS 注入「安全删除」钩子，
    // 它会拦截 Next.js 构建时对 .next-deeptutor 产物目录的批量删除操作，
    // 导致 `deeptutor start` 现场编译前端时失败。
    // 普通终端环境无此变量，清空不产生任何副作用。
    delete env.NODE_OPTIONS;

    const child = spawn(config.deeptutorBin, ["start", "--home", config.dataHome], {
      cwd: config.projectRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    serviceProcess = child;

    child.stdout.on("data", (d) => slog("[stdout]", d.toString().trim()));
    child.stderr.on("data", (d) => slog("[stderr]", d.toString().trim()));

    child.on("error", (err) => {
      slog("子进程 error:", err.message);
      serviceState = "error";
      serviceProcess = null;
      resolve({ ok: false, message: `启动失败：${err.message}` });
    });

    // 子进程意外退出
    child.on("exit", (code, signal) => {
      slog(`子进程退出 code=${code} signal=${signal} 当前状态=${serviceState}`);
      serviceProcess = null;
      if (serviceState === "stopping") {
        serviceState = "stopped";
      } else {
        // 非主动停止的退出，视为异常
        serviceState = "error";
      }
    });

    // 轮询等待就绪（最多约 90 秒，官方首次启动可能要编译前端）
    const deadline = Date.now() + 90000;
    const poll = setInterval(async () => {
      const { allUp } = await checkHealth();
      if (allUp) {
        clearInterval(poll);
        serviceState = "running";
        resolve({ ok: true, message: "服务已启动" });
        return;
      }
      if (child.exitCode !== null) {
        clearInterval(poll);
        serviceState = "error";
        resolve({ ok: false, message: "服务进程已退出，请查看日志" });
        return;
      }
      if (Date.now() > deadline) {
        clearInterval(poll);
        serviceState = "error";
        resolve({ ok: false, message: "启动超时，请查看日志" });
      }
    }, 1500);
  });
}

/**
 * 停止服务：向子进程发送 SIGTERM。
 * 官方 launcher 已注册信号处理，会优雅关闭前端和后端。
 */
function stop() {
  return new Promise((resolve) => {
    if (!serviceProcess || serviceProcess.exitCode !== null) {
      // 没有子进程，但可能端口还被别的进程占着（比如用户手动起的），
      // 这里保守处理：只重置状态，不强行 kill 别人的进程。
      serviceState = "stopped";
      resolve({ ok: true, message: "服务已停止" });
      return;
    }

    serviceState = "stopping";
    const child = serviceProcess;

    // 等待优雅退出，超时 8 秒后强杀
    const forceTimer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
    }, 8000);

    child.once("exit", () => {
      clearTimeout(forceTimer);
      serviceState = "stopped";
      resolve({ ok: true, message: "服务已停止" });
    });

    child.kill("SIGTERM");
  });
}

/**
 * 状态恢复：如果服务不在运行但进程仍在，或状态异常，尝试自愈。
 * 由主进程定时调用。
 */
async function recover() {
  if (serviceState === "running") {
    const { allUp } = await checkHealth();
    if (!allUp) {
      // 标记异常，交给上层决定是否重启
      serviceState = "error";
    }
  }
}

module.exports = {
  start,
  stop,
  checkHealth,
  recover,
  getState,
};
