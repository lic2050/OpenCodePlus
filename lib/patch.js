const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { findOpenCodeDir, getAsarPath, getExtractDir, getBackupPath, getPatchedPath } = require("./paths");

const PROMPT_MANAGER_JS = fs.readFileSync(path.join(__dirname, "..", "assets", "prompt-manager.js"), "utf8");

const MAIN_PATCH_ADDITIONS = `
  var _pmCachedCwd = process.cwd();
  var _pmCurrentCwd = _pmCachedCwd;
  // ── Prompt Manager IPC Handlers (wrapped in try-catch for safety) ──
  try {
  function pmParseFp(filePath) {
    try {
      const content = readFileSync(filePath, "utf8");
      const m = content.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---\\r?\\n([\\s\\S]*)$/);
      if (!m) return null;
      const fm = m[1];
      return {
        name: fm.match(/name:\\s*(.+)/)?.[1]?.trim() || basename(filePath, ".md"),
        description: fm.match(/description:\\s*(.+)/)?.[1]?.trim() || "",
        enabled: fm.match(/enabled:\\s*(true|false)/)?.[1] !== "false",
        scope: fm.match(/scope:\\s*(.+)/)?.[1]?.trim() || "project",
        body: m[2].trim(),
        file: filePath,
      };
    } catch (e) { return null; }
  }
  function pmLoadDir(dir) {
    try {
      return readdirSync(dir).filter(f => f.endsWith(".md"))
        .map(f => pmParseFp(join(dir, f))).filter(Boolean);
    } catch (e) { return []; }
  }
  async function pmResolveCwd(event) {
    try {
      if (_pmCurrentCwd && _pmCurrentCwd !== '/' && _pmCurrentCwd !== homedir()) return _pmCurrentCwd;
      var cwd = await event.sender.executeJavaScript('window.__pmCwd||null');
      if (cwd) _pmCurrentCwd = cwd;
    } catch (e) {}
    return _pmCurrentCwd;
  }
  ipcMain.handle("pm-list-prompts", async (_event) => {
    try {
      await pmResolveCwd(_event);
      return [...pmLoadDir(pmGetGlobalDir()), ...pmLoadDir(pmGetProjectDir())];
    } catch (e) { console.error("[PM] pm-list-prompts error:", e); return []; }
  });
  ipcMain.handle("pm-toggle", (_event, filePath) => {
    try {
      let c = readFileSync(filePath, "utf8");
      const m = c.match(/enabled:\\s*(true|false)/);
      if (m) {
        c = c.replace(/enabled:\\s*(true|false)/, "enabled: " + (m[1] === "true" ? "false" : "true"));
        writeFileSync(filePath, c, "utf8");
      }
      return pmParseFp(filePath);
    } catch (e) { console.error("[PM] pm-toggle error:", e); return null; }
  });
  ipcMain.handle("pm-add", async (_event, name, scope, description, body) => {
    try {
      await pmResolveCwd(_event);
      const isGlobal = scope === "global";
      const dir = isGlobal ? pmGetGlobalDir() : pmGetProjectDir();
      mkdirSync(dir, { recursive: true });
      const fp = join(dir, name + ".md");
      const content = "---\\nname: " + name + "\\ndescription: " + (description || name) + "\\nenabled: true\\nscope: " + scope + "\\ncreated: " + new Date().toISOString().slice(0, 10) + "\\n---\\n\\n" + (body || "# " + (description || name)) + "\\n";
      writeFileSync(fp, content, "utf8");
      return pmParseFp(fp);
    } catch (e) { console.error("[PM] pm-add error:", e); return null; }
  });
  ipcMain.handle("pm-remove", (_event, filePath) => {
    try { rmSync(filePath); return true; } catch (e) { return false; }
  });
  ipcMain.handle("pm-get-cwd", () => { try { return _pmCurrentCwd; } catch (e) { return ""; } });
  ipcMain.handle("pm-update-cwd", (_event, cwd) => { try { if (cwd) _pmCurrentCwd = cwd; } catch (e) {} });
  ipcMain.handle("pm-open-in-explorer", (_event, filePath) => {
    try { if (filePath) shell.showItemInFolder(filePath); return true; } catch (e) { console.error("[PM] open-in-explorer error:", e); return false; }
  });

  // ── Sync Config ──
  function pmSyncConfigPath() {
    return join(
      process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
      "opencode", "opencode-plus-sync.json"
    );
  }
  function pmReadSyncConfig() {
    try { return JSON.parse(readFileSync(pmSyncConfigPath(), "utf8")); } catch { return {}; }
  }
  function pmWriteSyncConfig(cfg) {
    const dir = dirname(pmSyncConfigPath());
    mkdirSync(dir, { recursive: true });
    writeFileSync(pmSyncConfigPath(), JSON.stringify(cfg, null, 2), "utf8");
  }
  function pmGetSyncRepoDir() {
    return join(
      process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
      "opencode", "prompts", "plus"
    );
  }
  function pmGetGlobalDir() {
    var cfg = pmReadSyncConfig();
    if (cfg.remote) return join(pmGetSyncRepoDir(), "global");
    return join(
      process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
      "opencode", "prompts", "global"
    );
  }
  function pmGetProjectKey() {
    try {
      var url = pmGitRun("remote get-url origin", _pmCurrentCwd);
      if (!url) return null;
      url = url.replace(/\\.git$/, '')
        .replace(/^(git@|https?:\\/\\/|ssh:\\/\\/)/, '')
        .replace(/:/g, '-').replace(/\\//g, '-');
      return url;
    } catch (e) { return null; }
  }
  function pmGetFallbackKey() {
    var cwd = _pmCurrentCwd;
    if (!cwd || cwd === '/' || cwd === homedir()) return 'unknown';
    return cwd.replace(/^\/+/, '').replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  function pmGetProjectDir() {
    var cfg = pmReadSyncConfig();
    if (cfg.remote) {
      var key = pmGetProjectKey();
      if (key) return join(pmGetSyncRepoDir(), "projects", key);
      return join(pmGetSyncRepoDir(), "projects", pmGetFallbackKey());
    }
    return join(
      process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
      "opencode", "prompts", "project"
    );
  }
  var pmGitLastError = '';
  var pmGitShell = process.platform === 'win32' ? 'cmd' : 'sh';
  var pmGitShellFlag = process.platform === 'win32' ? '/c' : '-c';
  var pmGitEnv = Object.assign({}, process.env, {
    HOME: process.env.HOME || homedir(),
    PATH: process.env.PATH || ['/usr/local/bin','/opt/homebrew/bin','/opt/homebrew/sbin','/usr/bin','/bin','/usr/sbin','/sbin'].join(':'),
  });
  if (process.platform !== 'win32' && !pmGitEnv.SSH_AUTH_SOCK) {
    try { pmGitEnv.SSH_AUTH_SOCK = '/tmp/ssh-agent.sock'; } catch(e) {}
  }
  function pmGitRun(args, cwd) {
    try {
      pmGitLastError = '';
      var r = spawnSync(pmGitShell, [pmGitShellFlag, 'git ' + args], { encoding: "utf8", timeout: 30000, cwd: cwd || pmGetSyncRepoDir(), env: pmGitEnv });
      pmGitLastError = (r.stderr || '').trim();
      if (r.status !== 0) throw new Error(pmGitLastError || ("git " + args + " exit " + r.status));
      return (r.stdout || '').trim();
    } catch (e) {
      pmGitLastError = pmGitLastError || e.message;
      console.error("[PM] git error:", pmGitLastError);
      return null;
    }
  }

  ipcMain.handle("pm-sync-config", (_event, updates) => {
    try {
      if (updates) {
        const cfg = pmReadSyncConfig();
        Object.assign(cfg, updates);
        pmWriteSyncConfig(cfg);
        return cfg;
      }
      return pmReadSyncConfig();
    } catch (e) { console.error("[PM] pm-sync-config error:", e); return {}; }
  });

  ipcMain.handle("pm-sync-status", () => {
    try {
      const dir = pmGetSyncRepoDir();
      const cfg = pmReadSyncConfig();
      if (!cfg.remote) return { configured: false };
      if (!existsSync(join(dir, ".git"))) return { configured: true, initialized: false };
      const ahead = pmGitRun("rev-list --count @{u}..HEAD", dir);
      const behind = pmGitRun("rev-list --count HEAD..@{u}", dir);
      const branch = pmGitRun("branch --show-current", dir);
      const lastSync = cfg.lastSync || null;
      return { configured: true, initialized: true, ahead: parseInt(ahead)||0, behind: parseInt(behind)||0, branch: branch||"main", lastSync, remote: cfg.remote };
    } catch (e) { console.error("[PM] pm-sync-status error:", e); return { configured: false }; }
  });

  ipcMain.handle("pm-get-project-key", async (_event) => { try { await pmResolveCwd(_event); return pmGetProjectKey(); } catch (e) { return null; } });

  ipcMain.handle("pm-sync-init", async (_event, remoteUrl, strategy) => {
    try {
      const dir = pmGetSyncRepoDir();
      console.log("[PM] sync-init: dir=" + dir);
      mkdirSync(dir, { recursive: true });
      mkdirSync(join(dir, "global"), { recursive: true });
      mkdirSync(join(dir, "projects"), { recursive: true });
      const isGitDir = existsSync(join(dir, ".git"));
      console.log("[PM] sync-init: isGitDir=" + isGitDir);
      if (!isGitDir) {
        const initResult = pmGitRun("init", dir);
        console.log("[PM] sync-init: git init result=" + initResult);
        if (initResult === null) return { ok: false, error: "git init failed: " + (pmGitLastError || "unknown") };
      }
      pmGitRun("branch -M main", dir);
      pmGitRun("remote remove origin", dir);
      pmGitRun("remote add origin " + remoteUrl, dir);
      if (pmGitRun("fetch origin", dir) === null) return { ok: false, error: "git fetch failed: " + (pmGitLastError || "unknown") };
      const remoteHas = pmGitRun("rev-parse origin/main", dir);
      console.log("[PM] sync-init: remoteHas=" + remoteHas);
      const localHas = pmGitRun("rev-parse HEAD", dir);
      console.log("[PM] sync-init: localHas=" + localHas);
      if (remoteHas) {
        const cfg = pmReadSyncConfig();
        cfg.remote = remoteUrl;
        pmWriteSyncConfig(cfg);
        return { ok: true, needsConflict: true };
      }
      pmGitRun("add -A", dir);
      pmGitRun('commit --allow-empty -m "OpenCodePlus: initial sync"', dir);
      if (pmGitRun("push -u origin main", dir) === null) return { ok: false, error: "git push failed: " + (pmGitLastError || "unknown") };
      const cfg = pmReadSyncConfig();
      cfg.remote = remoteUrl;
      cfg.lastSync = new Date().toISOString();
      cfg.autoSync = cfg.autoSync !== false;
      pmWriteSyncConfig(cfg);
      return { ok: true };
    } catch (e) { console.error("[PM] pm-sync-init error:", e); return { ok: false, error: e.message }; }
  });

  ipcMain.handle("pm-sync-push", async () => {
    try {
      const dir = pmGetSyncRepoDir();
      const status = pmGitRun("status --porcelain", dir);
      if (status) {
        pmGitRun("add -A", dir);
        pmGitRun('commit -m "OpenCodePlus: sync ' + new Date().toISOString().slice(0,19) + '"', dir);
      }
      if (pmGitRun("rev-parse HEAD", dir) === null) {
        pmGitRun("add -A", dir);
        pmGitRun('commit --allow-empty -m "OpenCodePlus: initial"', dir);
      }
      var branch = pmGitRun("branch --show-current", dir) || "main";
      const result = pmGitRun("push -u origin " + branch, dir);
      const cfg = pmReadSyncConfig();
      cfg.lastSync = new Date().toISOString();
      pmWriteSyncConfig(cfg);
      return { ok: result !== null, error: result === null ? pmGitLastError : undefined };
    } catch (e) { console.error("[PM] pm-sync-push error:", e); return { ok: false, error: e.message }; }
  });

  ipcMain.handle("pm-sync-pull", async () => {
    try {
      const dir = pmGetSyncRepoDir();
      const status = pmGitRun("status --porcelain", dir);
      if (status) {
        pmGitRun("add -A", dir);
        pmGitRun('commit --allow-empty -m "OpenCodePlus: pre-pull snapshot ' + new Date().toISOString().slice(0,19) + '"', dir);
      }
      const headExists = pmGitRun("rev-parse HEAD", dir) !== null;
      if (!headExists) {
        if (pmGitRun("fetch origin", dir) === null) return { ok: false, error: "git fetch failed: " + (pmGitLastError || "unknown") };
        if (pmGitRun("rev-parse origin/main", dir) !== null) {
          pmGitRun("reset --hard origin/main", dir);
        }
      } else {
        if (pmGitRun("pull --rebase origin", dir) === null) return { ok: false, error: pmGitLastError || "pull failed" };
      }
      const cfg = pmReadSyncConfig();
      cfg.lastSync = new Date().toISOString();
      pmWriteSyncConfig(cfg);
      return { ok: true };
    } catch (e) { console.error("[PM] pm-sync-pull error:", e); return { ok: false, error: e.message }; }
  });

  ipcMain.handle("pm-sync-resolve", async (_event, strategy) => {
    try {
      const dir = pmGetSyncRepoDir();
      if (strategy === "cloud") {
        pmGitRun("reset --hard origin/main", dir);
      } else if (strategy === "local") {
        pmGitRun("add -A", dir);
        pmGitRun('commit --allow-empty -m "OpenCodePlus: resolve to local"', dir);
        pmGitRun("push -u origin main", dir);
      }
      const cfg = pmReadSyncConfig();
      cfg.lastSync = new Date().toISOString();
      pmWriteSyncConfig(cfg);
      return { ok: true };
    } catch (e) { console.error("[PM] pm-sync-resolve error:", e); return { ok: false }; }
  });

  function pmGetEnabledPromptText() {
    try {
      const all = [...pmLoadDir(pmGetGlobalDir()), ...pmLoadDir(pmGetProjectDir())];
      const enabled = all.filter(p => p.enabled);
      if (!enabled.length) return "";
      return "## User Prompts (managed by Prompt Manager)\\n\\n" +
        enabled.map(p => "### " + p.name + "\\n" + p.body).join("\\n\\n");
    } catch (e) { return ""; }
  }
  globalThis.__pmGetEnabledPromptText = pmGetEnabledPromptText;
  } catch (pmInitErr) { console.error("[PM] Failed to initialize Prompt Manager:", pmInitErr); }
`;

const SYSTEM_PROMPT_PATCH = `typeof __pmGetEnabledPromptText === 'function' ? __pmGetEnabledPromptText() : ''`;

function hasPatch(content) {
  return content.includes("pm-sync-status");
}

function install() {
  const installDir = findOpenCodeDir();
  if (!installDir) {
    console.error("Error: OpenCode Desktop not found. Please ensure it is installed.");
    process.exit(1);
  }

  const asarPath = getAsarPath(installDir);
  const backupPath = getBackupPath(asarPath);
  const extractDir = getExtractDir();
  const patchedPath = getPatchedPath();

  console.log("OpenCode Desktop found at:", installDir);
  console.log("ASAR path:", asarPath);

  // Backup
  if (!fs.existsSync(backupPath)) {
    console.log("Creating backup...");
    fs.copyFileSync(asarPath, backupPath);
  } else {
    console.log("Backup already exists, skipping.");
  }

  // Extract
  console.log("Extracting asar...");
  if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true });
  fs.mkdirSync(extractDir, { recursive: true });
  execSync(`npx @electron/asar extract "${asarPath}" "${extractDir}"`, { stdio: "inherit" });

  // Patch main process
  console.log("Patching main process...");
  const mainJsPath = path.join(extractDir, "out", "main", "index.js");
  let mainJs = fs.readFileSync(mainJsPath, "utf8");
  if (!hasPatch(mainJs)) {
    // Insert IPC handlers before the closing brace of the main function
    const insertPoint = mainJs.indexOf("function sendMenuCommand");
    if (insertPoint > -1) {
      mainJs = mainJs.slice(0, insertPoint) + MAIN_PATCH_ADDITIONS + "\n" + mainJs.slice(insertPoint);
    }

    // Patch system prompt assembly
    mainJs = mainJs.replace(
      /system:\s*\[agent\.info\?\.\s*system,\s*system\.baseline\]/,
      `system: [agent.info?.system, system.baseline, ${SYSTEM_PROMPT_PATCH}]`
    );

    fs.writeFileSync(mainJsPath, mainJs, "utf8");
  } else {
    console.log("Main process already patched, skipping.");
  }

  // Patch renderer - inject script tag
  console.log("Patching renderer...");
  const htmlPath = path.join(extractDir, "out", "renderer", "index.html");
  let html = fs.readFileSync(htmlPath, "utf8");
  if (!html.includes("prompt-manager.js")) {
    html = html.replace("</head>", '<script src="./assets/prompt-manager.js"></script>\n</head>');
    fs.writeFileSync(htmlPath, html, "utf8");
  }

  // Write prompt-manager.js
  const pmPath = path.join(extractDir, "out", "renderer", "assets", "prompt-manager.js");
  fs.writeFileSync(pmPath, PROMPT_MANAGER_JS, "utf8");

  // Patch preload - add sync API methods
  console.log("Patching preload...");
  const preloadPath = path.join(extractDir, "out", "preload", "index.js");
  let preloadJs = fs.readFileSync(preloadPath, "utf8");
  if (!preloadJs.includes("pm-sync-status")) {
    const PM_PRELOAD_ADDITION = `
// ── Prompt Manager API (wrapped for safety) ──
try {
const promptManagerAPI = {
  listPrompts: () => electron.ipcRenderer.invoke("pm-list-prompts"),
  toggle: (filePath) => electron.ipcRenderer.invoke("pm-toggle", filePath),
  add: (name, scope, description, body) => electron.ipcRenderer.invoke("pm-add", name, scope, description, body),
  remove: (filePath) => electron.ipcRenderer.invoke("pm-remove", filePath),
  getCwd: () => electron.ipcRenderer.invoke("pm-get-cwd"),
  updateCwd: (cwd) => electron.ipcRenderer.invoke("pm-update-cwd", cwd),
  openInExplorer: (filePath) => electron.ipcRenderer.invoke("pm-open-in-explorer", filePath),
  getProjectKey: () => electron.ipcRenderer.invoke("pm-get-project-key"),
  setSyncConfig: (updates) => electron.ipcRenderer.invoke("pm-sync-config", updates),
  getSyncConfig: () => electron.ipcRenderer.invoke("pm-sync-config"),
  syncStatus: () => electron.ipcRenderer.invoke("pm-sync-status"),
  syncInit: (remoteUrl, strategy) => electron.ipcRenderer.invoke("pm-sync-init", remoteUrl, strategy),
  syncPush: () => electron.ipcRenderer.invoke("pm-sync-push"),
  syncPull: () => electron.ipcRenderer.invoke("pm-sync-pull"),
  syncResolve: (strategy) => electron.ipcRenderer.invoke("pm-sync-resolve", strategy),
};
electron.contextBridge.exposeInMainWorld("promptManagerAPI", promptManagerAPI);
try { window.promptManagerAPI = promptManagerAPI; } catch(e) {}
} catch(pmPreloadErr) { console.error("[PM] Preload init failed:", pmPreloadErr); }
`;
    preloadJs = preloadJs.replace(
      /electron\.contextBridge\.exposeInMainWorld\("api", api\);/,
      `electron.contextBridge.exposeInMainWorld("api", api);\n${PM_PRELOAD_ADDITION}`
    );
    fs.writeFileSync(preloadPath, preloadJs, "utf8");
  }

  // Repack
  console.log("Repacking asar...");
  execSync(`npx @electron/asar pack "${extractDir}" "${patchedPath}"`, { stdio: "inherit" });

  // Replace
  console.log("Replacing app.asar...");
  fs.copyFileSync(patchedPath, asarPath);

  console.log("\n✓ Patched successfully!");
  console.log("  Restart OpenCode Desktop to use the Prompt Manager.");
  console.log("  Run 'npx opencode-plus uninstall' to restore the original.");
}

function uninstall() {
  const installDir = findOpenCodeDir();
  if (!installDir) {
    console.error("Error: OpenCode Desktop not found.");
    process.exit(1);
  }

  const asarPath = getAsarPath(installDir);
  const backupPath = getBackupPath(asarPath);

  if (!fs.existsSync(backupPath)) {
    console.error("Error: No backup found. Cannot restore original app.asar.");
    process.exit(1);
  }

  console.log("Restoring original app.asar...");
  fs.copyFileSync(backupPath, asarPath);
  fs.unlinkSync(backupPath);

  // Cleanup temp
  const extractDir = getExtractDir();
  if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true });

  console.log("\n✓ Restored successfully!");
  console.log("  Restart OpenCode Desktop to use the original version.");
}

function status() {
  const installDir = findOpenCodeDir();
  if (!installDir) {
    console.log("OpenCode Desktop: not found");
    return;
  }

  const asarPath = getAsarPath(installDir);
  const backupPath = getBackupPath(asarPath);
  const patched = fs.existsSync(asarPath) && (() => {
    try {
      const content = execSync(`npx @electron/asar list "${asarPath}" 2>nul`, { encoding: "utf8", timeout: 10000 });
      return content.includes("prompt-manager.js");
    } catch { return false; }
  })();

  console.log("OpenCode Desktop:", installDir);
  console.log("ASAR:", asarPath);
  console.log("Backup:", fs.existsSync(backupPath) ? "yes" : "no");
  console.log("OpenCodePlus:", patched ? "installed" : "not installed");
}

module.exports = { install, uninstall, status };
