# OpenCodePlus

Prompt Manager plugin for OpenCode Desktop. Adds a floating panel with toggle, copy, edit, delete functionality for global and project prompts.

## Install

```bash
npm install -g opencode-plus
```

Or run directly:

```bash
npx opencode-plus
```

## Usage

```bash
# Install the patch
opencode-plus

# Check status
opencode-plus status

# Uninstall (restore original)
opencode-plus uninstall
```

## Features

- Floating panel accessible from the toolbar
- Toggle prompts on/off
- Copy, edit, delete prompts
- Global prompts (`~/.config/opencode/prompts/global/`)
- Project prompts (`.opencode/prompts/`)
- Drag to resize, remembers size
- Auto-center on window resize
- Enabled prompts injected into system prompt

## How it works

This package patches OpenCode Desktop's `app.asar` to add the Prompt Manager UI and IPC handlers. A backup of the original `app.asar` is created automatically.

## Uninstall

```bash
opencode-plus uninstall
```

This restores the original `app.asar` from backup.

## License

MIT
