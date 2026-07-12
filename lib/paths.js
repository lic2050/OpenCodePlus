const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const APP_NAME = "OpenCode";
const APP_ID = "ai.opencode.desktop";
const ASAR_NAME = "app.asar";

function findOpenCodeDir() {
  const platform = os.platform();

  if (platform === "win32") {
    return findWindows();
  } else if (platform === "darwin") {
    return findMac();
  } else {
    return findLinux();
  }
}

function findWindows() {
  // Method 1: Check standard install paths
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  const candidates = [
    path.join(localAppData, "Programs", "@opencode-aidesktop"),
    path.join(localAppData, "Programs", "OpenCode"),
  ];
  for (const dir of candidates) {
    const asar = path.join(dir, "resources", ASAR_NAME);
    if (fs.existsSync(asar)) return dir;
  }

  // Method 2: Check registry
  try {
    const reg = execSync(
      'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "OpenCode" /d',
      { encoding: "utf8", timeout: 5000 }
    );
    const match = reg.match(/InstallLocation\s+REG_SZ\s+(.+)/i);
    if (match) {
      const dir = match[1].trim();
      const asar = path.join(dir, "resources", ASAR_NAME);
      if (fs.existsSync(asar)) return dir;
    }
  } catch {}

  // Method 3: where opencode
  try {
    const where = execSync("where OpenCode.exe", { encoding: "utf8", timeout: 5000 }).trim();
    const dir = path.dirname(path.dirname(where));
    const asar = path.join(dir, "resources", ASAR_NAME);
    if (fs.existsSync(asar)) return dir;
  } catch {}

  return null;
}

function findMac() {
  const candidates = [
    "/Applications/OpenCode.app",
    path.join(os.homedir(), "Applications", "OpenCode.app"),
  ];
  for (const app of candidates) {
    const asar = path.join(app, "Contents", "Resources", ASAR_NAME);
    if (fs.existsSync(asar)) return app;
  }
  return null;
}

function findLinux() {
  const candidates = [
    "/opt/OpenCode",
    "/usr/lib/opencode",
    "/usr/local/lib/opencode",
    path.join(os.homedir(), ".local", "share", "opencode"),
  ];
  // Also try AppImage extracted
  try {
    const home = fs.readdirSync(path.join(os.homedir(), ".local", "share"));
    for (const d of home) {
      if (d.includes("opencode")) {
        candidates.push(path.join(os.homedir(), ".local", "share", d));
      }
    }
  } catch {}

  for (const dir of candidates) {
    const asar = path.join(dir, "resources", ASAR_NAME);
    if (fs.existsSync(asar)) return dir;
  }
  return null;
}

function getAsarPath(installDir) {
  const platform = os.platform();
  if (platform === "darwin") {
    return path.join(installDir, "Contents", "Resources", ASAR_NAME);
  }
  return path.join(installDir, "resources", ASAR_NAME);
}

function getExtractDir() {
  return path.join(os.tmpdir(), "opencode-plus-extract");
}

function getBackupPath(asarPath) {
  return asarPath + ".backup";
}

function getPatchedPath() {
  return path.join(os.tmpdir(), "opencode-plus-patched.asar");
}

module.exports = {
  findOpenCodeDir,
  getAsarPath,
  getExtractDir,
  getBackupPath,
  getPatchedPath,
  ASAR_NAME,
  APP_NAME,
};
