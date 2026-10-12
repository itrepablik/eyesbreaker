# Publishing the Desktop App to GitHub

This guide explains how to ship the built **`Eyesbreaker Setup x.y.z.exe`**
(and the macOS/Linux equivalents) so that people who don't use VS Code can
download and install the app.

## Should the `.exe` be committed to the repository?

**No.** Do not commit build output into Git. Use a **GitHub Release** instead.

| Approach | Verdict |
| --- | --- |
| Commit `desktop/release/*.exe` into the repo | ❌ Large binaries (150 MB+) bloat history forever, slow every clone, and get re-committed on every build. |
| Upload the `.exe` as a **GitHub Release asset** | ✅ Versioned, downloadable, off the source tree, and gives users a clean **Releases** page. |

The folder `desktop/release/` is **already ignored** by
[`desktop/.gitignore`](.gitignore) (along with `node_modules` and `dist`), so
there is nothing to change — just never `git add -f` those files.

---

## 1. Prerequisites

- **Node.js 20+** installed.
- The GitHub CLI (`gh`) is optional but makes publishing one step. Install from
  <https://cli.github.com/> and run `gh auth login` once.
- Set the version you are shipping in [`desktop/package.json`](package.json)
  (`"version": "0.1.0"` → your new number). electron-builder names the
  installer from this value.

---

## 2. Build the installers

```powershell
cd desktop
npm install
npm run dist
```

electron-builder writes the artifacts to `desktop/release/`:

| File | Platform |
| --- | --- |
| `Eyesbreaker Setup x.y.z.exe` | Windows installer |
| `Eyesbreaker Setup x.y.z.exe.blockmap` | Windows differential-update data |
| `latest.yml` | Update metadata |
| `Eyesbreaker-x.y.z.dmg` | macOS (when built on macOS) |
| `Eyesbreaker-x.y.z.AppImage` | Linux (when built on Linux) |

> ⚠️ **You can only build each platform's installer on that platform** (a
> Windows `.exe` must be built on Windows, a `.dmg` on macOS, etc.). The
> [automated workflow](#5-automate-with-github-actions-recommended) builds all
> three for you.

---

## 3. Publish a release (manual, web UI)

1. Push your changes and a version tag:
   ```powershell
   git add .
   git commit -m "Release desktop v0.1.0"
   git tag desktop-v0.1.0
   git push origin master
   git push origin desktop-v0.1.0
   ```
2. On GitHub, open **Releases → Draft a new release**.
3. Choose the tag you just pushed (e.g. `desktop-v0.1.0`).
4. Title it `Eyesbreaker Desktop v0.1.0` and add short release notes.
5. **Drag and drop** the files from `desktop/release/` into the **Attach
   binaries** box.
6. Click **Publish release**.

Your **Releases** page now has downloadable assets, and the
[README download links](../README.md#desktop-app-for-users-who-dont-use-vs-code)
point users straight to them.

---

## 4. Publish a release (GitHub CLI)

After building, from the repository root:

```powershell
gh release create desktop-v0.1.0 `
  "desktop/release/Eyesbreaker Setup 0.1.0.exe" `
  "desktop/release/Eyesbreaker Setup 0.1.0.exe.blockmap" `
  "desktop/release/latest.yml" `
  --title "Eyesbreaker Desktop v0.1.0" `
  --notes "Adds a break-complete chime and the usual 20-20-20 reminders."
```

Attach the `.dmg` and `.AppImage` the same way if you built them.

---

## 5. Automate with GitHub Actions (recommended)

A ready-to-use workflow is included at
[`.github/workflows/desktop-release.yml`](../.github/workflows/desktop-release.yml).
It builds Windows, macOS, and Linux installers in parallel and, when you push a
tag like `desktop-v0.1.0`, publishes them to a GitHub Release automatically.

To cut a release:

```powershell
# bump "version" in desktop/package.json first
git commit -am "Release desktop v0.1.0"
git tag desktop-v0.1.0
git push origin master --tags
```

You can also trigger it manually from **Actions → Desktop Release → Run
workflow**.

---

## 6. Code signing (optional, but recommended)

Unsigned installers trigger **Windows SmartScreen** and **macOS Gatekeeper**
warnings, which scares some users (the [install guide](INSTALL.md) walks them
through it). To remove those warnings you need paid certificates:

- **Windows:** an **Authenticode / EV code-signing certificate** issued to your
  organization. Set the subject name to match `publisherName` in
  [`desktop/package.json`](package.json) (`INT8Code`), or SmartScreen will still
  show the old name.
- **macOS:** an **Apple Developer ID** certificate, then configure
  `mac.notarize` in electron-builder.

electron-builder automatically looks for signing credentials via environment
variables in CI (for example `CSC_LINK` and `CSC_KEY_PASSWORD`). Until then,
keep `"signAndEditExecutable": false` in the `win` config so local unsigned
builds still succeed.

---

## 7. Checklist before you publish

- [ ] `version` bumped in [`desktop/package.json`](package.json).
- [ ] `npm run dist` completes with no errors.
- [ ] A smoke test passes on a clean machine: install → tray icon → **Start
      Break Now** → you hear the start alarm **and** the completion chime.
- [ ] Release notes mention user-visible changes (e.g. the completion chime).
- [ ] `desktop/release/` is **not** staged in Git (`git status` should not list
      it).
- [ ] The tag matches `desktop-v*` if you use the automated workflow.
