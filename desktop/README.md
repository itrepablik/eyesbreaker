# Eyesbreaker Desktop

A standalone Electron app that applies the 20-20-20 rule outside VS Code:

> Every 20 minutes, look at something 20 feet away for 20 seconds.

It is intentionally self-contained so the VS Code extension in the repository
root stays untouched.

## Features

- **Tray app** — lives in the system tray with a countdown tooltip.
- **Break popup** — a frameless, always-on-top window appears every
  `intervalMinutes` and counts down from `breakSeconds` before closing itself.
- **Annoying sound** — a generated WAV plays automatically through the break
  window (Electron autoplay is enabled explicitly).
- **Settings window** — the same webview-style form used by the VS Code
  extension: interval, break length, sound pattern, volume, and snooze.
- **Launch at Login** — toggle from the tray menu.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Master switch |
| `intervalMinutes` | `20` | Minutes between breaks |
| `breakSeconds` | `20` | Seconds the popup stays visible |
| `soundEnabled` | `true` | Play sound on break start |
| `soundVolume` | `1` | Volume 0.0–1.0 |
| `soundPattern` | `alarm` | `alarm`, `beep`, or `siren` |
| `snoozeMinutes` | `5` | Snooze length |
| `launchAtLogin` | `false` | Start at OS login |

Settings are stored in `settings.json` inside the Electron user-data folder.

## Run in development

```powershell
cd desktop
npm install
npm start
```

## Package

```powershell
cd desktop
npm run dist
```

Installer output goes to `desktop/release/`.

## Install

### Windows

1. Double-click `Eyesbreaker Setup 0.1.0.exe`.
2. If Windows SmartScreen shows a warning, click **More info** → **Run anyway**
   (the build is unsigned).
3. Launch Eyesbreaker from the Start Menu; it runs in the system tray.

### macOS

1. Open the `.dmg` and drag `Eyesbreaker` into Applications.
2. On first launch, right-click the app and choose **Open**, then confirm
   (the build is unsigned).

### Linux

1. Run `chmod +x Eyesbreaker-0.1.0.AppImage`.
2. Execute it with `./Eyesbreaker-0.1.0.AppImage`.

## Publisher name and code signing

The Windows "Publisher" shown by SmartScreen comes from a digital signature,
not from `package.json`. To display `INT8Code` there, the installer must be
signed with an Authenticode code-signing certificate issued to INT8Code.

The `publisherName` in [`package.json`](package.json) is set to `INT8Code` so
the app is listed as INT8Code in **Control Panel → Programs and Features**
after installation.

## How the pieces fit together

- [`src/scheduler.ts`](src/scheduler.ts) — platform-independent heartbeat and
  countdown.
- [`src/main.ts`](src/main.ts) — Electron main process, tray, windows, and IPC.
- [`src/ui.ts`](src/ui.ts) — the break and settings screens as HTML strings.
- [`src/sound.ts`](src/sound.ts) — runtime WAV generation.
- [`src/store.ts`](src/store.ts) — JSON settings persistence.
- [`src/preload.ts`](src/preload.ts) — context-isolated renderer bridge.
