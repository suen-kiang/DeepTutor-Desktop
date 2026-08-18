/**
 * config.js — 桌面层唯一配置源
 *
 * 把「Python 路径、项目根目录、数据目录、端口」集中写在这里。
 * 官方若有接口变动（改端口/改命令），只需改这一个文件，其余代码不用动。
 *
 * 关键：路径解析分「开发模式」和「打包模式」两种（见 resolveProjectRoot）。
 */

const path = require("path");
const os = require("os");
const { app } = require("electron");

/**
 * 定位 DeepTutor 源码根目录。
 *
 * 优先级：
 *   1. 环境变量 DEEPTUTOR_ROOT（最灵活，可显式指定）
 *   2. 开发模式（未打包）：desktop/ 的上一级就是源码根，自动定位
 *   3. 打包模式：回退到约定路径（当前用户本机的实际位置），
 *      如与实际不符，请设置环境变量 DEEPTUTOR_ROOT 覆盖。
 */
function resolveProjectRoot() {
  // 1. 环境变量优先
  if (process.env.DEEPTUTOR_ROOT && process.env.DEEPTUTOR_ROOT.trim() !== "") {
    return path.resolve(process.env.DEEPTUTOR_ROOT.trim());
  }
  // 2. 开发模式：__dirname = .../DeepTutor/desktop，上一级即源码根
  if (!app.isPackaged) {
    return path.resolve(__dirname, "..");
  }
  // 3. 打包模式：约定路径（本机 DeepTutor 源码所在位置）
  //    如需改到别处，设置环境变量 DEEPTUTOR_ROOT 即可。
  return path.join(os.homedir(), "Documents", "work_projects", "DeepTutor");
}

// 项目根目录（DeepTutor 源码根目录）
const projectRoot = resolveProjectRoot();

// venv 里的 Python 解释器（用 brew python@3.12 创建）
const venvPython = path.join(projectRoot, ".venv", "bin", "python3");

// venv 里的 deeptutor 命令
const deeptutorBin = path.join(projectRoot, ".venv", "bin", "deeptutor");

// 桌面应用专属数据目录（与命令行数据隔离）
const dataHome =
  process.env.DEEPTUTOR_DESKTOP_HOME ||
  path.join(os.homedir(), "Library", "Application Support", "DeepTutor");

// 端口（与官方默认一致）
const BACKEND_PORT = 8001;
const FRONTEND_PORT = 3782;

// 前端页面地址（桌面窗口加载的地址）
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

module.exports = {
  projectRoot,
  venvPython,
  deeptutorBin,
  dataHome,
  BACKEND_PORT,
  FRONTEND_PORT,
  FRONTEND_URL,
};
