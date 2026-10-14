; Custom NSIS hooks for the Eyesbreaker desktop app.
;
; electron-builder merges this file into the generated installer and uninstaller
; (see the "nsis.include" entry in desktop/package.json).
;
; Note: electron-builder treats NSIS warnings as errors, and not every
; electron-builder variable is defined for the uninstaller. This script
; therefore uses literal names only (no ${...} defines) to avoid
; "unknown variable/constant" warnings.

!macro customUnInstall
  ; Eyesbreaker is a tray app: it keeps running (main + GPU + renderer
  ; processes) until it is explicitly quit. If the user uninstalls while it is
  ; still running, Windows cannot delete Eyesbreaker.exe, and the orphaned
  ; process keeps showing break popups (with sound) - and, when "Launch at
  ; Login" was enabled, it is started again the next time the user signs in.
  ;
  ; Stop it before the uninstaller removes the files. Electron's helper
  ; processes share the same executable name, so "/IM Eyesbreaker.exe /T"
  ; covers them all, including their child processes.
  nsExec::ExecToLog 'taskkill /F /IM "Eyesbreaker.exe" /T'
  Pop $0
  Sleep 500

  ; Remove any "Launch at Login" entry the app registered so it cannot be
  ; started again after it has been uninstalled. Electron derives the registry
  ; value name from the app name, so both the packaged product name
  ; ("Eyesbreaker") and the npm package name ("eyesbreaker-desktop") are
  ; covered.
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Eyesbreaker"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "eyesbreaker-desktop"
!macroend
