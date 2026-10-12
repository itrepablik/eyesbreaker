# Eyesbreaker Desktop

A standalone Electron app that applies the 20-20-20 rule outside VS Code:

> Every 20 minutes, look at something 20 feet away for 20 seconds.

It is intentionally self-contained so the VS Code extension in the repository
root stays untouched.

## Download (for everyone — no build tools needed)

Grab the installer for your OS from the
[**Releases**](https://github.com/itrepablik/eyesbreaker/releases) page:

- **Windows** — `Eyesbreaker Setup x.y.z.exe`
- **macOS** — `Eyesbreaker-x.y.z.dmg`
- **Linux** — `Eyesbreaker-x.y.z.AppImage`

New to this? Follow the beginner-friendly, click-by-click
[**Installation & User Guide**](INSTALL.md).

## Features

- **Tray app** — lives in the system tray with a countdown tooltip.
- **Break popup** — a frameless, always-on-top window appears every
  `intervalMinutes` and counts down from `breakSeconds` before closing itself.
- **Annoying sound** — a generated WAV plays automatically through the break
  window (Electron autoplay is enabled explicitly).
- **Break-complete chime** — when the countdown reaches zero, a short, pleasant
  two-note chime plays and the popup lingers for a moment so you can hear it.
  It is distinct from the start alarm and honors your sound settings.
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

Installer output goes to `desktop/release/`. To publish those files so others
can download the app, see [`PUBLISHING.md`](PUBLISHING.md).

## Install

Step-by-step instructions for Windows, macOS, and Linux — including exactly how
to get past the "unsigned app" warnings — are in the dedicated
[**Installation & User Guide**](INSTALL.md). In short:

- **Windows** — run `Eyesbreaker Setup x.y.z.exe`; on the SmartScreen prompt
  choose **More info → Run anyway**.
- **macOS** — open the `.dmg`, drag **Eyesbreaker** to Applications, then
  right-click the app and choose **Open** the first time.
- **Linux** — `chmod +x Eyesbreaker-x.y.z.AppImage` and run it.

After installing, look for the **Eyesbreaker eye icon in your system tray**
(bottom-right on Windows, the menu bar on macOS).

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
