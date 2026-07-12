#!/usr/bin/env node
// postinstall: auto-install the patch after npm install
// Silently skip if OpenCode Desktop is not found
try {
  const { install } = require("../lib/patch");
  install();
} catch (e) {
  // Silently skip errors during postinstall
}
