# Changelog

All notable changes to Eyesbreaker are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims
to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added — Break-complete chime 🔊

You now get an audible cue when a break **ends**, not only when it starts.

- **VS Code extension** — when the 20-second countdown reaches zero, a short,
  pleasant two-note chime (C6 → E6) plays so you know you can look back at your
  screen. It is generated at runtime (no audio asset) and is intentionally
  gentle and distinct from the harsh start alarm.
- **Desktop app** — the standalone Electron app plays the same completion
  chime and keeps the popup up for a brief moment so the sound can be heard
  before the window closes itself.
- **Respects your settings** — the chime uses the existing `soundEnabled` and
  `soundVolume` settings. Turn sound off and both the alarm and the chime stay
  silent. The chime plays only when the countdown runs to **completion** — not
  when a break is dismissed or snoozed.

### Docs

- Added a beginner-friendly desktop
  [Installation & User Guide](desktop/INSTALL.md) for people who don't use
  VS Code.
- Added a [publishing guide](desktop/PUBLISHING.md) explaining how to ship the
  desktop installer through GitHub Releases (instead of committing the
  `.exe`), plus an
  [automated release workflow](.github/workflows/desktop-release.yml).

## [0.1.3] — VS Code extension

- Synced countdown across all open VS Code windows, with a single break popup.

[Unreleased]: https://github.com/itrepablik/eyesbreaker/compare/master...HEAD
[0.1.3]: https://github.com/itrepablik/eyesbreaker/releases
