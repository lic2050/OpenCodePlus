#!/usr/bin/env node
const { install, uninstall, status } = require("../lib/patch");

const cmd = process.argv[2];

if (cmd === "uninstall" || cmd === "remove" || cmd === "restore") {
  uninstall();
} else if (cmd === "status") {
  status();
} else if (cmd === "install" || cmd === undefined) {
  install();
} else {
  console.log("OpenCodePlus - Prompt Manager for OpenCode Desktop\n");
  console.log("Usage:");
  console.log("  opencode-plus              Install the prompt manager patch");
  console.log("  opencode-plus install      Install the prompt manager patch");
  console.log("  opencode-plus uninstall    Restore original app.asar");
  console.log("  opencode-plus status       Check patch status");
}
