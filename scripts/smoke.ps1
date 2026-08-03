$ErrorActionPreference = 'Stop'

$apiURL = if ($env:AIGATE_SMOKE_API_URL) { $env:AIGATE_SMOKE_API_URL } else { 'http://localhost:8080' }
$gatewayURL = if ($env:AIGATE_SMOKE_GATEWAY_URL) { $env:AIGATE_SMOKE_GATEWAY_URL } else { 'http://localhost:8081' }
$frontendURL = if ($env:AIGATE_SMOKE_FRONTEND_URL) { $env:AIGATE_SMOKE_FRONTEND_URL } else { 'http://localhost:5173' }

Invoke-RestMethod "$apiURL/healthz" | Out-Null
Invoke-RestMethod "$apiURL/readyz" | Out-Null
Invoke-RestMethod "$gatewayURL/healthz" | Out-Null
Invoke-RestMethod "$gatewayURL/readyz" | Out-Null
Invoke-RestMethod "$frontendURL/healthz" | Out-Null
Write-Host 'AiGate compose smoke passed.'
