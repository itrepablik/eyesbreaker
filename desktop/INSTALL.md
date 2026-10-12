# Eyesbreaker Desktop — Installation & User Guide

Welcome! 👁️⏰ **Eyesbreaker** is a tiny helper that reminds you to follow the
**20-20-20 rule** for healthier eyes:

> Every **20 minutes**, look at something **20 feet away** for **20 seconds**.

This guide is written for people who **do not use VS Code**. No coding, no
commands, no build tools — just download, install, and let it run quietly in
your system tray.

---

## 1. What you get

- A small app that lives in your **system tray** (the row of little icons next
  to your clock).
- Every 20 minutes, a friendly full-screen reminder pops up with a countdown.
- When the reminder **starts**, it plays an alarm so you actually look away.
- When the countdown **finishes**, it plays a short, pleasant **chime** so you
  know the break is over and you can look back at your screen.

> 💡 **New:** the break-complete chime. You no longer have to keep an eye on the
> countdown — the app tells you, audibly, when your 20 seconds are up.

---

## 2. System requirements

| Platform | Requirement |
| --- | --- |
| Windows | Windows 10 or 11 (64-bit) |
| macOS | macOS 11 (Big Sur) or newer |
| Linux | A modern 64-bit desktop (AppImage; needs FUSE) |

No administrator rights are required. The app installs **per-user**.

---

## 3. Download

1. Open the
   [**Eyesbreaker Releases**](https://github.com/itrepablik/eyesbreaker/releases)
   page in your browser.
2. Find the newest release at the top.
3. Under **Assets**, click the file that matches your computer:

| Your computer | Download this file |
| --- | --- |
| Windows | `Eyesbreaker Setup x.y.z.exe` |
| macOS | `Eyesbreaker-x.y.z.dmg` |
| Linux | `Eyesbreaker-x.y.z.AppImage` |

> `x.y.z` is the version number, for example `0.1.0`. If you don't see an
> installer for your platform, the maintainers may not have built one yet — you
> can still [build it yourself](README.md#package).

---

## 4. Installing

The builds are **not code-signed** (code-signing certificates cost money), so
your operating system will warn you the first time. That is expected — the
steps below show exactly what to click.

### Windows

1. **Download** `Eyesbreaker Setup x.y.z.exe` from the Releases page.
2. **Double-click the downloaded file.**
3. Windows may show a blue **"Windows protected your PC"** window
   (SmartScreen). This is normal for new, unsigned apps.
   - Click **More info**.
   - Click **Run anyway**.
4. Follow the installer:
   - Choose whether to install for **just you** (recommended) or all users.
   - If you like, change the install folder.
   - Click **Install**. It finishes in a few seconds.
5. The app starts automatically and an **eye icon** appears in the system tray
   near your clock. (You may need to click the **^** arrow to reveal hidden
   icons.)
6. Optional: tick **Launch at Login** from the tray menu so it starts with your
   computer (see [section 7](#7-launch-at-login)).

> ❓ **"Windows protected your PC" won't let me click Run anyway?**
> Click **More info** first — the **Run anyway** button only appears after that.
> If your company blocks unsigned installers entirely, contact your IT team.

### macOS

1. **Download** `Eyesbreaker-x.y.z.dmg`.
2. **Double-click the `.dmg`** to open it.
3. **Drag the Eyesbreaker icon** onto the **Applications** folder shortcut.
4. Open **Applications** and try to open Eyesbreaker. macOS will say it
   "cannot be opened because the developer cannot be verified."
   - **Right-click** (or Control-click) the **Eyesbreaker** icon and choose
     **Open**.
   - Click **Open** again in the dialog. macOS remembers this choice, so you
     only do it once.
5. An **eye icon** appears in the menu bar (top-right).

> ❓ **Still blocked?** Open **System Settings → Privacy & Security**, scroll to
> the message about Eyesbreaker, and click **Open Anyway**.

### Linux

1. **Download** `Eyesbreaker-x.y.z.AppImage`.
2. Make it executable. In a terminal:
   ```bash
   chmod +x ~/Downloads/Eyesbreaker-x.y.z.AppImage
   ```
3. Run it:
   ```bash
   ~/Downloads/Eyesbreaker-x.y.z.AppImage
   ```
4. An **eye icon** appears in your system tray / app indicator area.

> ❓ **"AppImages require FUSE" error?** Install FUSE (for example,
> `sudo apt install libfuse2` on Debian/Ubuntu) or run the AppImage with
> `--appimage-extract-and-run`.

---

## 5. First launch — what you'll see

1. The app starts and sits quietly in the **system tray**. There is no main
   window to close — that is intentional.
2. Hover the tray icon to see the **countdown** to your next break, e.g.
   `Eyesbreaker: 18:42`.
3. After 20 minutes (or whenever you choose **Start Break Now**), a
   frameless, always-on-top popup appears in the center of your screen with:
   - a big **countdown** (20 → 0),
   - a progress bar,
   - the 20-20-20 reminder text,
   - **"I'm looking away"** and **"Snooze"** buttons.
4. When the popup opens, the **start alarm** plays.
5. When the countdown hits zero, the **completion chime** plays and the popup
   closes itself. You're done — look back at your screen. 🎉

> Tip: to try it right now without waiting 20 minutes, right-click the tray
> icon and choose **Start Break Now**.

---

## 6. Using the tray menu

**Right-click the tray icon** to open the menu:

| Menu item | What it does |
| --- | --- |
| `Next break in mm:ss` | Shows the current countdown (not clickable) |
| **Start Break Now** | Triggers a break immediately (great for testing) |
| **Open Settings** | Opens the settings window |
| **Enabled** | Master on/off switch for reminders |
| **Launch at Login** | Start Eyesbreaker automatically when you sign in |
| **Quit** | Fully exits the app |

Inside the break popup itself:

- **I'm looking away** — dismiss this break immediately.
- **Snooze x min** — postpone the break for the configured number of minutes.
- **Replay annoying sound** — play the start alarm again (and confirm your
  speakers work).

---

## 7. Launch at login

Right-click the tray icon → tick **Launch at Login**. Eyesbreaker will now start
with your computer and begin counting down automatically.

- **Windows / macOS:** fully supported.
- **Linux:** not supported by the app; add it to your desktop environment's
  startup applications instead.

---

## 8. Settings

Right-click the tray icon → **Open Settings**. Everything is saved instantly.

| Setting | Default | What it does |
| --- | --- | --- |
| **Enabled** | On | Master switch for all reminders |
| **Interval** | 20 minutes | How often to remind you |
| **Break length** | 20 seconds | How long the popup stays up |
| **Sound** | On | Play the start alarm **and** the completion chime |
| **Pattern** | Alarm | Style of the *start* alarm: Alarm, Beep, or Siren |
| **Volume** | 100% | Volume for both sounds |
| **Snooze** | 5 minutes | How long the Snooze button postpones a break |

Buttons:

- **Test Break Now** — start a break immediately (also plays the completion
  chime when it ends).
- **Restore Default Settings** — reset everything to the values above.

> The annoying start alarm is intentional — that is what gets you to look away.
> Prefer silence? Turn **Sound** off; both the alarm and the completion chime
> will go quiet.

Your settings are stored in a small `settings.json` file inside the Electron
user-data folder, for example:

- **Windows:** `%APPDATA%\eyesbreaker-desktop\settings.json`
- **macOS:** `~/Library/Application Support/eyesbreaker-desktop/settings.json`
- **Linux:** `~/.config/eyesbreaker-desktop/settings.json`

---

## 9. Updating

1. Visit the
   [Releases](https://github.com/itrepablik/eyesbreaker/releases) page.
2. Download the installer for the newer version.
3. Run it — it installs over the old version and **keeps your settings**.

There is no in-app auto-updater; updating is a quick manual download.

---

## 10. Uninstalling

### Windows

1. **Settings → Apps → Installed apps**.
2. Find **Eyesbreaker**, click the **⋯** menu, then **Uninstall**.

### macOS

1. Quit Eyesbreaker from the menu bar icon.
2. Open **Applications**, drag **Eyesbreaker** to the **Trash**.

### Linux

1. Quit Eyesbreaker from the tray.
2. Delete the `Eyesbreaker-x.y.z.AppImage` file.

To also remove your saved settings, delete the user-data folder listed in
[section 8](#8-settings).

---

## 11. Troubleshooting

**I don't see the tray icon.**
Click the **^** (show hidden icons) arrow on Windows, or check the Windows
taskbar settings to always show the Eyesbreaker icon. On macOS, check the
menu bar at the top-right.

**The popup appears but I hear no sound.**
- Open **Settings** and make sure **Sound** is on and **Volume** is above 0%.
- Check your system volume and that the correct output device is selected.
- Use **Replay annoying sound** in the popup to test.

**The completion chime doesn't play, but the start alarm does.**
The chime only plays when the countdown runs all the way to **zero**. If you
dismiss or snooze a break before it ends, there is nothing to announce.

**The popup is too short or too long.**
Open **Settings** and change **Break length** (5–300 seconds).

**It reminds me too often / not often enough.**
Open **Settings** and change **Interval** (1–120 minutes).

**Windows Defender / SmartScreen complains.**
Expected for an unsigned app. Choose **More info → Run anyway**. To remove the
warning for everyone, the project would need a code-signing certificate — see
[`PUBLISHING.md`](PUBLISHING.md#code-signing-optional-but-recommended).

**"AppImages require FUSE" (Linux).**
Install FUSE (`sudo apt install libfuse2`) or run with
`--appimage-extract-and-run`.

**A full-screen break interrupts presentations or games.**
Open **Settings** and turn **Enabled** off temporarily, or set a longer
**Interval**. You can also toggle reminders quickly from the tray's **Enabled**
checkbox.

---

## 12. FAQ

**Do I need VS Code?**
No. The desktop app is completely standalone. (VS Code users can install the
extension from the marketplace instead.)

**Does it collect any data or phone home?**
No. Eyesbreaker is fully offline and stores only your local settings.

**Where does the "annoying" sound come from?**
It is generated in the app at runtime — there is no bundled audio file and
nothing is downloaded.

**Can I choose a different end-of-break sound?**
The completion chime is a fixed, gentle two-note tone, intentionally different
from the start alarm so the two are easy to tell apart. You can lower the
**Volume** or turn all sound off.

**Does it use a lot of resources?**
No. It is a lightweight tray app that wakes once per second to update its
countdown.

---

## Still stuck?

Open an issue on the
[GitHub issue tracker](https://github.com/itrepablik/eyesbreaker/issues) with
your OS and a short description of the problem.
