; Custom NSIS hooks for the Eyesbreaker desktop app.
;
; electron-builder merges this file into the generated installer and uninstaller
; (see the "nsis.include" entry in desktop/package.json).

!macro customUnInstall
  ; Eyesbreaker is a tray app: it keeps running (main + GPU + renderer
  ; processes) until it is explicitly quit. If the user uninstalls while it is
  ; still running, Windows cannot delete Eyesbreaker.exe, and the orphaned
  ; process keeps showing break popups (with sound) - and, when "Launch at
  ; Login" was enabled, it is started again the next time the user signs in.
  ;
  ; Stop it before the uninstaller removes the files. Electron's helper
  ; processes share the same executable name, so "/IM <name> /T" covers them
  ; all, including their child processes.
  nsExec::ExecToLog 'taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T'
  Pop $0
  Sleep 500

  ; Remove any "Launch at Login" entry the app registered so it cannot be
  ; started again after it has been uninstalled. Both the packaged product name
  ; and the npm package name are covered, since Electron derives the registry
  ; value from the app name.
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_PRODUCT_FILENAME}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_EXECUTABLE_FILENAME}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Eyesbreaker"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "eyesbreaker-desktop"
!macroend
