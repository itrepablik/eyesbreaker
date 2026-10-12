<#
Generates desktop/assets/icon.png for the Eyesbreaker desktop app.

The design is drawn as vector shapes (ellipses), not an upscaled bitmap, so it
stays crisp at any size. The default is 1024x1024, which satisfies the icon
requirements enforced by electron-builder:

    - macOS:  at least 512x512  (electron-builder converts the PNG to .icns)
    - Windows: at least 256x256  (converted to .ico)
    - Linux:  any size           (used as-is)

Usage:
    powershell -ExecutionPolicy Bypass -File .\make-icon.ps1
    powershell -ExecutionPolicy Bypass -File .\make-icon.ps1 -Size 512
#>
param(
    [int]$Size = 1024
)

Add-Type -AssemblyName System.Drawing

if ($Size -lt 512) {
    Write-Warning "macOS requires an icon of at least 512x512; using 512."
    $Size = 512
}

# The original design coordinates were authored on a 256px grid; scale them up.
$s = $Size / 256.0

$bmp = New-Object System.Drawing.Bitmap $Size, $Size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$bg = [System.Drawing.Color]::FromArgb(255, 30, 30, 46)
$g.Clear($bg)

# Eye white
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.FillEllipse($whiteBrush, [float](24 * $s), [float](78 * $s), [float](208 * $s), [float](100 * $s))

# Iris
$irisBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
$g.FillEllipse($irisBrush, [float](108 * $s), [float](96 * $s), [float](40 * $s), [float](64 * $s))

# Pupil
$pupilBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$g.FillEllipse($pupilBrush, [float](118 * $s), [float](106 * $s), [float](20 * $s), [float](44 * $s))

$g.Dispose()

$outDir = Join-Path $PSScriptRoot 'assets'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outPath = Join-Path $outDir 'icon.png'
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Wrote ${Size}x${Size} icon to $outPath"
