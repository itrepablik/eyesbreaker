# Eyesbreaker 👁️⏰

A Visual Studio Code extension that reminds developers to follow the
**20-20-20 rule** to prevent digital eye strain:

> Every **20 minutes**, look at something **20 feet away** for **20 seconds**.

Reference: [American Optometric Association — 20-20-20 rule](https://www.aoa.org/AOA/Images/Patients/Eye%20Conditions/20-20-20-rule.pdf)

## Features

- **Background timers** — a heartbeat timer runs every second in the extension
  host and schedules a break every 20 minutes (configurable).
- **Annoying sound** — when a break starts, Eyesbreaker plays a generated alarm
  through the OS audio player (no webview autoplay restrictions). Choose from
  `alarm`, `beep`, or `siren`.
- **20-second countdown popup** — a full webview panel appears with a big
  countdown, a progress bar, and the 20-20-20 instructions. It disappears
  automatically after 20 seconds.
- **Webview settings** — an Activity Bar panel styled like the reference
  [AISUG](https://github.com/itrepablik/aisug) project, with toggles, number
  inputs, a dropdown, and a volume slider. Everything is saved to VS Code
  settings.
- **Status bar countdown** — see the time until your next break at a glance.
- **Synced across windows** — open several VS Code windows? They all share one
  schedule, so every status bar shows the same countdown and only **one** break
  popup appears at a time.
- **Snooze** — postpone a break without disabling reminders permanently.

## ✨ What's new

Open multiple VS Code windows at once? Eyesbreaker now keeps them all in sync:

- **One source of truth** — the next-break time is stored once in shared
  storage instead of a separate timer per window, so every window counts down
  to the exact same break.
- **Only one popup** — when a break fires, a single 20-20-20 panel appears
  (and the annoying sound plays once). The other windows just mirror the
  remaining time in their status bars instead of popping their own reminders.
- **Continuous across sessions** — closing and reopening VS Code resumes the
  same countdown, and an overdue schedule from a previous session is never
  fired as a surprise break.

## How it works

1. On startup, [`activate()`](src/extension.ts) starts a background
   `setInterval` heartbeat and establishes the shared schedule.
2. [`ScheduleStore`](src/scheduleStore.ts) keeps the next-break time in a small
   file inside the extension's global storage, which is **shared by every VS
   Code window** on the same machine. Every window reads it and converges on
   the same countdown, so there is a single source of truth.
3. When the timer fires, [`BreakReminderController`](src/breakReminderPanel.ts)
   opens a webview panel and starts the 20-second countdown.
4. [`AnnoyingSoundPlayer`](src/sound.ts) generates a PCM WAV at runtime and
   plays it via `System.Media.SoundPlayer` (Windows), `afplay` (macOS), or
   `paplay`/`aplay` (Linux).
5. When the countdown reaches zero, the panel closes and the next break is
   scheduled automatically.

### Multiple VS Code windows

When several VS Code windows are open, they all share one schedule, so every
status bar shows the same countdown and breaks fire at the same time:

- The next-break time is stored once in the shared schedule file; any window
  that changes it (settings change, snooze, or after a break) writes the new
  value and the other windows pick it up within a second.
- Only **one** window ever shows the break popup. When a break is due, the
  windows race to claim it with an OS-level exclusive file
  (`break.claim.json`); exactly one wins and opens the popup, while the other
  windows mirror the remaining time in their status bars instead.
- Closing a window mid-break releases its claim so the remaining windows take
  over cleanly; a stale claim (e.g. from a crashed window) is reclaimed
  automatically once the break would have ended.
- Reopening VS Code resumes the same countdown. A schedule left over from a
  previous session that is long past due is re-established, so you never get a
  surprise break popup just for opening the editor.

## Commands

| Command | Description |
| --- | --- |
| `Eyesbreaker: Open Settings` | Open the Activity Bar settings webview |
| `Eyesbreaker: Start Break Now` | Trigger a break immediately (handy for testing) |
| `Eyesbreaker: Toggle Reminders` | Enable or disable reminders |

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `eyesbreaker.enabled` | `true` | Master switch for reminders |
| `eyesbreaker.intervalMinutes` | `20` | Minutes between breaks (1–120) |
| `eyesbreaker.breakSeconds` | `20` | Seconds the reminder stays visible (5–300) |
| `eyesbreaker.soundEnabled` | `true` | Play the annoying sound |
| `eyesbreaker.soundVolume` | `1` | Sound volume (0.0–1.0) |
| `eyesbreaker.soundPattern` | `alarm` | `alarm`, `beep`, or `siren` |
| `eyesbreaker.snoozeMinutes` | `5` | Minutes to snooze a break (1–60) |

## Recommendations

- Keep the default `20` / `20` / `20` values — they match the optometric
  guidance the extension is based on.
- Leave the sound on but lower `eyesbreaker.soundVolume` if you work in an
  open office; the "annoying" part is the point, but volume should stay
  courteous.
- Use **Snooze** only when you are in the middle of something critical — it
  postpones the current break without turning the whole feature off.
- Pair this with a standing/water reminder for an even healthier workday.

## Development

```powershell
npm install
npm run compile
```

Then press **F5** in VS Code to launch an Extension Development Host with
Eyesbreaker running. To test quickly without waiting 20 minutes, run the
`Eyesbreaker: Start Break Now` command or use the **Test Break Now** button in
the settings webview.

## Packaging

```powershell
npx @vscode/vsce package
```

## Desktop app

A standalone Electron version is available in [`desktop/`](desktop/README.md).
It runs in the system tray and shows the same 20-second break popup outside
VS Code.

```powershell
cd desktop
npm install
npm run dist
```

The installer is written to `desktop/release/`. See
[`desktop/README.md`](desktop/README.md) for download and installation
instructions.
