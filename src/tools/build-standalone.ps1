# Builds Nitzutz from src\ into one self-contained HTML file.
#   build-standalone.ps1           build the website at the repository root: index.html, icons, manifest (for GitHub Pages)
#   build-standalone.ps1 -Desktop  also build src\dist\Nitzutz.html and install it as a desktop app with shortcuts
# (Kept ASCII-only on purpose: Windows PowerShell 5.1 reads BOM-less scripts as ANSI.)
param([switch]$Desktop)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot          # src
$site = Split-Path -Parent $root                  # repository root
$assets = Join-Path $root 'assets'
New-Item -ItemType Directory -Force $assets | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)

# ---------- icons: the mascot, drawn from the same shapes as the SVG in js/icons.js ----------
# $fill = share of the canvas height the mascot uses; $bg = optional solid background (for iPhone and maskable icons)
function New-NitzutzPng([int]$size, [double]$fill, [string]$bg) {
  $s = $size * $fill / 140.0
  $ox = ($size - 120 * $s) / 2.0
  $oy = ($size - 140 * $s) / 2.0 + $size * 0.01
  function Pt([double]$x, [double]$y) { [System.Drawing.PointF]::new([single]($x * $s + $ox), [single]($y * $s + $oy)) }
  function Rect([double]$x, [double]$y, [double]$w, [double]$h) { [System.Drawing.RectangleF]::new([single]($x * $s + $ox), [single]($y * $s + $oy), [single]($w * $s), [single]($h * $s)) }

  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  if ($bg) { $g.Clear([System.Drawing.ColorTranslator]::FromHtml($bg)) } else { $g.Clear([System.Drawing.Color]::Transparent) }

  $body = New-Object System.Drawing.Drawing2D.GraphicsPath
  $body.AddBezier((Pt 60 6), (Pt 66 22), (Pt 80 32), (Pt 90 46))
  $body.AddBezier((Pt 90 46), (Pt 100 60), (Pt 102 74), (Pt 100 86))
  $body.AddBezier((Pt 100 86), (Pt 97 110), (Pt 80 128), (Pt 60 128))
  $body.AddBezier((Pt 60 128), (Pt 40 128), (Pt 22 112), (Pt 20 88))
  $body.AddBezier((Pt 20 88), (Pt 18 70), (Pt 26 56), (Pt 36 46))
  $body.AddBezier((Pt 36 46), (Pt 38 56), (Pt 42 62), (Pt 48 64))
  $body.AddBezier((Pt 48 64), (Pt 44 46), (Pt 50 24), (Pt 60 6))
  $body.CloseFigure()
  $top = [System.Drawing.Color]::FromArgb(255, 255, 216, 77)
  $bottom = [System.Drawing.Color]::FromArgb(255, 255, 122, 61)
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush (Pt 50 6), (Pt 75 128), $top, $bottom
  $g.FillPath($grad, $body)

  $shine = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(140, 255, 255, 255)), ([single](5 * $s))
  $shine.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shine.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawBezier($shine, (Pt 33 80), (Pt 33 66), (Pt 39 56), (Pt 46 51))

  $ink = [System.Drawing.Color]::FromArgb(255, 27, 30, 60)
  $inkBrush = New-Object System.Drawing.SolidBrush $ink
  $white = [System.Drawing.Brushes]::White
  $cheek = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(77, 255, 92, 122))
  $g.FillEllipse($cheek, (Rect 32.5 95.6 11 6.8))
  $g.FillEllipse($cheek, (Rect 76.5 95.6 11 6.8))
  foreach ($cx in 47, 73) {
    $g.FillEllipse($white, (Rect ($cx - 8.5) 74 17 20))
    $g.FillEllipse($inkBrush, (Rect ($cx - 4.6) 81.4 9.2 9.2))
    $g.FillEllipse($white, (Rect ($cx + 0.1) 82.7 3 3))
  }
  $mouth = New-Object System.Drawing.Pen $ink, ([single](3.5 * $s))
  $mouth.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $mouth.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawBezier($mouth, (Pt 52 101), (Pt 56 106.3), (Pt 64 106.3), (Pt 68 101))
  $g.Dispose()

  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  return ,$ms.ToArray()
}
function Write-Ico([byte[]]$png, [string]$path) {
  $icoStream = New-Object System.IO.MemoryStream
  $w = New-Object System.IO.BinaryWriter $icoStream
  $w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]1)
  $w.Write([Byte]0); $w.Write([Byte]0); $w.Write([Byte]0); $w.Write([Byte]0)
  $w.Write([UInt16]1); $w.Write([UInt16]32); $w.Write([UInt32]$png.Length); $w.Write([UInt32]22)
  $w.Write($png)
  $w.Flush()
  [System.IO.File]::WriteAllBytes($path, $icoStream.ToArray())
}

$png256 = New-NitzutzPng 256 0.957 ''
[System.IO.File]::WriteAllBytes((Join-Path $assets 'nitzutz-256.png'), $png256)
Write-Ico $png256 (Join-Path $assets 'nitzutz.ico')
$favicon = 'data:image/png;base64,' + [Convert]::ToBase64String($png256)

# ---------- one self-contained HTML file ----------
$index = [System.IO.File]::ReadAllText((Join-Path $root 'index.html'), $utf8)
$css = [System.IO.File]::ReadAllText((Join-Path $root 'styles.css'), $utf8)
$index = $index.Replace('<link rel="stylesheet" href="styles.css">', "<style>`n" + $css + "`n</style>")
$inline = [System.Text.RegularExpressions.MatchEvaluator] {
  param($m)
  $js = [System.IO.File]::ReadAllText((Join-Path $root $m.Groups[1].Value), $utf8)
  "<script>`n" + $js.Replace('</script', '<\/script') + "`n</script>"
}
$index = [System.Text.RegularExpressions.Regex]::Replace($index, '<script src="([^"]+)"></script>', $inline)
if ($index -match '<(script|link)[^>]+(src|href)="(?!https?:)') { throw 'A local file reference was not inlined.' }
$split = $index.IndexOf('<div id="app"')
$head = $index.Substring(0, $split)
$bodyHtml = $index.Substring($split)

function Build-Html([string]$extraHead) {
  "<!doctype html>`n<html lang=""he"" dir=""rtl"">`n<head>`n<meta charset=""utf-8"">`n" +
  "<meta name=""viewport"" content=""width=device-width,initial-scale=1,viewport-fit=cover"">`n" +
  "<meta name=""theme-color"" content=""#FFB31F"">`n" +
  "<link rel=""icon"" type=""image/png"" href=""" + $favicon + """>`n" +
  $extraHead + $head + "</head>`n<body>`n" + $bodyHtml + "`n</body>`n</html>`n"
}

# ---------- website (GitHub Pages) ----------
[System.IO.File]::WriteAllBytes((Join-Path $site 'icon.png'), $png256)
[System.IO.File]::WriteAllBytes((Join-Path $site 'icon-192.png'), (New-NitzutzPng 192 0.92 ''))
[System.IO.File]::WriteAllBytes((Join-Path $site 'icon-512.png'), (New-NitzutzPng 512 0.92 ''))
[System.IO.File]::WriteAllBytes((Join-Path $site 'icon-512-maskable.png'), (New-NitzutzPng 512 0.62 '#FFF1D2'))
[System.IO.File]::WriteAllBytes((Join-Path $site 'apple-touch-icon.png'), (New-NitzutzPng 180 0.78 '#FFF1D2'))
$manifest = @'
{
  "name": "__APP_NAME__",
  "short_name": "__APP_NAME__",
  "description": "Learn to work with Claude, a little every day",
  "lang": "he",
  "dir": "rtl",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#F3F5FB",
  "theme_color": "#FFB31F",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
'@
$appName = -join [char[]](0x05E0, 0x05D9, 0x05E6, 0x05D5, 0x05E5)   # the app's Hebrew name, built from code points to keep this file ASCII
[System.IO.File]::WriteAllText((Join-Path $site 'manifest.webmanifest'), $manifest.Replace('__APP_NAME__', $appName), $utf8)
$siteHead = "<link rel=""manifest"" href=""manifest.webmanifest"">`n" +
  "<link rel=""apple-touch-icon"" href=""apple-touch-icon.png"">`n" +
  "<meta name=""apple-mobile-web-app-capable"" content=""yes"">`n" +
  "<meta name=""mobile-web-app-capable"" content=""yes"">`n"
$siteIndex = Join-Path $site 'index.html'
[System.IO.File]::WriteAllText($siteIndex, (Build-Html $siteHead), $utf8)
Write-Host ("Built website " + $siteIndex + " (" + [math]::Round((Get-Item $siteIndex).Length / 1KB) + " KB)")
if (-not $Desktop) { return }

# ---------- desktop app: one file + shortcuts ----------
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null
$out = Join-Path $dist 'Nitzutz.html'
[System.IO.File]::WriteAllText($out, (Build-Html ("<link rel=""apple-touch-icon"" href=""" + $favicon + """>`n")), $utf8)
$appDir = Join-Path $env:LOCALAPPDATA 'Nitzutz'
New-Item -ItemType Directory -Force $appDir | Out-Null
$appHtml = Join-Path $appDir 'Nitzutz.html'
$appIco = Join-Path $appDir 'nitzutz.ico'
Copy-Item $out $appHtml -Force
Copy-Item (Join-Path $assets 'nitzutz.ico') $appIco -Force
$url = ([System.Uri]$appHtml).AbsoluteUri
$edge = @(
  (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
  (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe')
) | Where-Object { Test-Path $_ } | Select-Object -First 1
$name = -join [char[]](0x05E0, 0x05D9, 0x05E6, 0x05D5, 0x05E5)   # the app's Hebrew name
$shell = New-Object -ComObject WScript.Shell
foreach ($dir in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  $lnk = $shell.CreateShortcut((Join-Path $dir ($name + '.lnk')))
  if ($edge) { $lnk.TargetPath = $edge; $lnk.Arguments = '--app="' + $url + '"' } else { $lnk.TargetPath = $appHtml; $lnk.Arguments = '' }
  $lnk.WorkingDirectory = $appDir
  $lnk.IconLocation = $appIco + ',0'
  $lnk.Description = 'Nitzutz - learn to work with Claude'
  $lnk.Save()
}
Write-Host ("Installed desktop app to " + $appDir)
