#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

function Add-RetrogenInboundRule {
  param(
    [Parameter(Mandatory = $true)][string]$DisplayName,
    [Parameter(Mandatory = $true)][int]$Port
  )
  netsh advfirewall firewall delete rule name="$DisplayName" 2>$null | Out-Null
  netsh advfirewall firewall add rule name="$DisplayName" dir=in action=allow protocol=TCP localport=$Port profile=any | Out-Null
}

Add-RetrogenInboundRule -DisplayName "Retrogen Dev TCP 3000" -Port 3000
Add-RetrogenInboundRule -DisplayName "Retrogen Dev TCP 5173" -Port 5173

Write-Host "OK: inbound TCP 3000 and 5173 allowed for Retrogen dev."
