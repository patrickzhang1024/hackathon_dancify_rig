# Build the compiled release into rig/dist/.
# No bundler/npm here, so "compile" = concatenate the classic DANCE.* scripts
# (in load order) into one bundle, copy the vendored ES-module deps + the VRM
# asset + styles, then emit a slim index.html that swaps the many classic
# <script> tags for the single bundle while keeping the ES-module VRM boot block.
#
# NOTE: the compiled app still needs to be served over http:// (the VRM is
# fetched with GLTFLoader, which file:// blocks). See README.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$src  = Join-Path $root 'src'
$dist = Join-Path $root 'dist'

# Classic-script load order MUST match src/index.html (excludes the ESM block).
$order = @(
  'config/constants.js',
  'render/moves.js',
  'agent/seeds.js',
  'agent/choreographer.js',
  'render/rigLimits.js',
  'render/fingers.js',
  'render/springs.js',
  'render/character.js',
  'render/orbit.js',
  'render/scene.js',
  'render/sequencer.js',
  'render/selfcheck.js',
  'main.js'
)

# Reset dist.
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Force -Path `
  $dist, `
  (Join-Path $dist 'vendor'), `
  (Join-Path $dist 'vendor/jsm/loaders'), `
  (Join-Path $dist 'assets/vrm') | Out-Null

# Concatenate the classic bundle.
$bundle = Join-Path $dist 'app.bundle.js'
"// Built by rig/build.ps1 — do not edit. Concatenation of rig/src in load order." |
  Set-Content -Path $bundle -Encoding UTF8
foreach ($f in $order) {
  $p = Join-Path $src $f
  if (-not (Test-Path $p)) { throw "Missing source: $f" }
  Add-Content -Path $bundle -Value "`n/* ---- $f ---- */" -Encoding UTF8
  Add-Content -Path $bundle -Value (Get-Content -Raw -Encoding UTF8 -Path $p) -Encoding UTF8
}

# Copy static assets + vendored ES-module deps.
Copy-Item (Join-Path $src 'styles.css') (Join-Path $dist 'styles.css') -Force
Copy-Item (Join-Path $root 'vendor/three.module.js')     (Join-Path $dist 'vendor/three.module.js') -Force
Copy-Item (Join-Path $root 'vendor/three-vrm.module.js') (Join-Path $dist 'vendor/three-vrm.module.js') -Force
Copy-Item (Join-Path $root 'vendor/jsm/loaders/GLTFLoader.js') (Join-Path $dist 'vendor/jsm/loaders/GLTFLoader.js') -Force
Copy-Item (Join-Path $root 'assets/vrm/character.vrm')   (Join-Path $dist 'assets/vrm/character.vrm') -Force

# Compiled index.html: transform the known-good src/index.html so we keep its
# exact markup + charset + the ESM VRM boot block, swapping only the classic
# module-script list for the one bundle and fixing ../ paths to ./.
# (Reading src as UTF-8 avoids embedding non-ASCII in this .ps1, which a GBK
#  console would otherwise corrupt.)
$html = Get-Content -Raw -Encoding UTF8 (Join-Path $src 'index.html')
$html = $html.Replace('Theme 3 Release Test', 'Theme 3 (Compiled)')

# Collapse the classic <script src="./config/constants.js"> ... <script src="./main.js"> run into one tag.
$scriptBlock = '  <script src="./app.bundle.js"></script>'
$html = [regex]::Replace(
  $html,
  '(?s)[ \t]*<script src="\./config/constants\.js"></script>.*?<script src="\./main\.js"></script>',
  { param($m) $scriptBlock })

# The ESM block references ../vendor and ../assets (relative to src/); in dist
# these live under ./. Rewrite both.
$html = $html.Replace('../vendor/', './vendor/').Replace('../assets/', './assets/')

Set-Content -Path (Join-Path $dist 'index.html') -Value $html -Encoding UTF8

$size = [math]::Round((Get-Item $bundle).Length / 1KB, 1)
Write-Host "Built rig/dist: app.bundle.js = $size KB; index.html + styles.css + vendor (ESM three + three-vrm + GLTFLoader) + assets/vrm/character.vrm copied."
Write-Host "Serve over http (e.g. 'python -m http.server' from rig/dist), then open index.html."
