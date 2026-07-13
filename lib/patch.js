const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { findOpenCodeDir, getAsarPath, getExtractDir, getBackupPath, getPatchedPath } = require("./paths");

const PROMPT_MANAGER_JS = fs.readFileSync(path.join(__dirname, "..", "assets", "prompt-manager.js"), "utf8");

const MAIN_PATCH_ADDITIONS = `
  // ── Prompt Manager IPC Handlers ──
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
  ipcMain.handle("pm-list-prompts", () => {
    const globalDir = join(
      process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
      "opencode", "prompts", "global"
    );
    const projectDir = join(process.cwd(), ".opencode", "prompts");
    return [...pmLoadDir(globalDir), ...pmLoadDir(projectDir)];
  });
  ipcMain.handle("pm-toggle", (_event, filePath) => {
    let c = readFileSync(filePath, "utf8");
    const m = c.match(/enabled:\\s*(true|false)/);
    if (m) {
      c = c.replace(/enabled:\\s*(true|false)/, "enabled: " + (m[1] === "true" ? "false" : "true"));
      writeFileSync(filePath, c, "utf8");
    }
    return pmParseFp(filePath);
  });
  ipcMain.handle("pm-add", (_event, name, scope, description, body) => {
    const isGlobal = scope === "global";
    const dir = isGlobal
      ? join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "opencode", "prompts", "global")
      : join(process.cwd(), ".opencode", "prompts");
    mkdirSync(dir, { recursive: true });
    const fp = join(dir, name + ".md");
    const content = "---\\nname: " + name + "\\ndescription: " + (description || name) + "\\nenabled: true\\nscope: " + scope + "\\ncreated: " + new Date().toISOString().slice(0, 10) + "\\n---\\n\\n" + (body || "# " + (description || name)) + "\\n";
    writeFileSync(fp, content, "utf8");
    return pmParseFp(fp);
  });
  ipcMain.handle("pm-remove", (_event, filePath) => {
    try { rmSync(filePath); return true; } catch (e) { return false; }
  });
  ipcMain.handle("pm-get-cwd", () => process.cwd());

  function pmGetEnabledPromptText() {
    try {
      const globalDir = join(
        process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
        "opencode", "prompts", "global"
      );
      const projectDir = join(process.cwd(), ".opencode", "prompts");
      const all = [...pmLoadDir(globalDir), ...pmLoadDir(projectDir)];
      const enabled = all.filter(p => p.enabled);
      if (!enabled.length) return "";
      return "## User Prompts (managed by Prompt Manager)\\n\\n" +
        enabled.map(p => "### " + p.name + "\\n" + p.body).join("\\n\\n");
    } catch (e) { return ""; }
  }
  globalThis.__pmGetEnabledPromptText = pmGetEnabledPromptText;
`;

const SYSTEM_PROMPT_PATCH = `typeof __pmGetEnabledPromptText === 'function' ? __pmGetEnabledPromptText() : ''`;

function hasPatch(content) {
  return content.includes("__pmGetEnabledPromptText") || content.includes("pm-list-prompts");
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
