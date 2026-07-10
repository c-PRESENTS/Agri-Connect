$ErrorActionPreference = "Stop"

function Write-Check {
  param(
    [string] $Name,
    [string] $Value
  )
  Write-Host ("[OK] {0}: {1}" -f $Name, $Value)
}

function Fail-Check {
  param(
    [string] $Name,
    [string] $Value
  )
  Write-Host ("[FAIL] {0}: {1}" -f $Name, $Value)
  exit 1
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if ($PSVersionTable.PSVersion.Major -ne 5) {
  Fail-Check "PowerShell" ("Expected Windows PowerShell 5.1, got {0} at {1}" -f $PSVersionTable.PSVersion, (Get-Process -Id $PID).Path)
}

Write-Check "PowerShell" ("{0} at {1}" -f $PSVersionTable.PSVersion, (Get-Process -Id $PID).Path)
Write-Check "Project root" (Get-Location).Path

$nodeVersion = (& node -v)
Write-Check "Node" $nodeVersion

$npmVersion = (& npm -v)
Write-Check "npm" $npmVersion

foreach ($shim in @("node_modules\.bin\tsx.cmd", "node_modules\.bin\tsc.cmd", "node_modules\.bin\vite.cmd", "node_modules\.bin\playwright.cmd")) {
  if (!(Test-Path $shim)) {
    Fail-Check "Executable shim" ("Missing {0}. Run npm install from {1}." -f $shim, $projectRoot)
  }
  Write-Check "Executable shim" $shim
}

$envPath = Join-Path $projectRoot ".env"
if (!(Test-Path $envPath)) {
  Fail-Check ".env" "Missing .env file"
}
Write-Check ".env" "present"

$dbProbe = & node --env-file=.env -e "const {Client}=require('pg'); const url=process.env.DATABASE_URL; if(!url){console.error('DATABASE_URL missing'); process.exit(2);} const c=new Client({connectionString:url, ssl:url.includes('localhost')||url.includes('helium')?false:{rejectUnauthorized:false}}); c.connect().then(()=>c.query('select 1 as ok')).then(r=>{console.log('DB_OK '+r.rows[0].ok); return c.end();}).catch(e=>{console.error(e.code||e.message); process.exit(1);});"
if ($LASTEXITCODE -ne 0) {
  Fail-Check "Database" ($dbProbe -join "`n")
}
Write-Check "Database" ($dbProbe -join " ")

$playwrightVersion = (& npm exec playwright -- --version)
if ($LASTEXITCODE -ne 0) {
  Fail-Check "Playwright CLI" ($playwrightVersion -join "`n")
}
Write-Check "Playwright CLI" ($playwrightVersion -join " ")

$browserProbe = & node -e "const { chromium } = require('@playwright/test'); (async () => { const browser = await chromium.launch({ headless: true }); console.log('CHROMIUM_OK '+browser.version()); await browser.close(); })().catch(error => { console.error(error.message); process.exit(1); });"
if ($LASTEXITCODE -ne 0) {
  Fail-Check "Playwright Chromium" ($browserProbe -join "`n")
}
Write-Check "Playwright Chromium" ($browserProbe -join " ")

$healthOk = $false
try {
  $health = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/health" -UseBasicParsing -TimeoutSec 5
  if ($health.StatusCode -eq 200) {
    $healthOk = $true
    Write-Check "Existing dev server" "http://127.0.0.1:5000/api/health returned 200"
  }
} catch {
  Write-Host ("[INFO] Existing dev server: {0}" -f $_.Exception.Message)
}

if (!$healthOk) {
  $logDir = Join-Path $projectRoot "logs"
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $stdout = Join-Path $logDir "codex-env-dev-server.out.log"
  $stderr = Join-Path $logDir "codex-env-dev-server.err.log"
  $npmCmd = (Get-Command npm.cmd -ErrorAction Stop).Source
  $server = Start-Process -FilePath $npmCmd -ArgumentList @("run", "dev") -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
  Start-Sleep -Seconds 12

  if ($server.HasExited) {
    $out = if (Test-Path $stdout) { Get-Content $stdout -Raw } else { "" }
    $err = if (Test-Path $stderr) { Get-Content $stderr -Raw } else { "" }
    Fail-Check "Dev server startup" ("Exited with code {0}`nSTDOUT:`n{1}`nSTDERR:`n{2}" -f $server.ExitCode, $out, $err)
  }

  try {
    $health = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/health" -UseBasicParsing -TimeoutSec 10
    if ($health.StatusCode -ne 200) {
      Fail-Check "Dev server health" ("Expected 200, got {0}" -f $health.StatusCode)
    }
    Write-Check "Started dev server" ("PID {0}; health returned 200" -f $server.Id)
  } catch {
    Fail-Check "Dev server health" $_.Exception.Message
  }
}

$e2eOutput = & npm run e2e:env
if ($LASTEXITCODE -ne 0) {
  Fail-Check "Environment E2E smoke" ($e2eOutput -join "`n")
}
Write-Check "Environment E2E smoke" "passed"

Write-Host "[OK] Codex environment readiness verified."
