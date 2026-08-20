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
- **Snooze** — postpone a break without disabling reminders permanently.

## How it works

1. On startup, [`activate()`](src/extension.ts) starts a background
   `setInterval` heartbeat and schedules the first break.
2. When the timer fires, [`BreakReminderController`](src/breakReminderPanel.ts)
   opens a webview panel and starts the 20-second countdown.
3. [`AnnoyingSoundPlayer`](src/sound.ts) generates a PCM WAV at runtime and
   plays it via `System.Media.SoundPlayer` (Windows), `afplay` (macOS), or
   `paplay`/`aplay` (Linux).
4. When the countdown reaches zero, the panel closes and the next break is
   scheduled automatically.

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
