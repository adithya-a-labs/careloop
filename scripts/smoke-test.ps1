$ErrorActionPreference = 'Stop'
$health = Invoke-RestMethod -Uri 'http://localhost:8000/health'
if ($health.status -ne 'ok') { throw 'API health check failed' }
$web = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing
if ($web.StatusCode -ne 200) { throw 'Web smoke test failed' }
Write-Host 'CareLoop smoke test passed'
