Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$bg = [System.Drawing.Color]::FromArgb(255, 30, 30, 46)
$g.Clear($bg)

# Eye white
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.FillEllipse($whiteBrush, 24, 78, 208, 100)

# Iris
$irisBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
$g.FillEllipse($irisBrush, 108, 96, 40, 64)

# Pupil
$pupilBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
$g.FillEllipse($pupilBrush, 118, 106, 20, 44)

$g.Dispose()

$outDir = Join-Path $PSScriptRoot 'assets'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outPath = Join-Path $outDir 'icon.png'
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Host "Wrote icon to $outPath"
