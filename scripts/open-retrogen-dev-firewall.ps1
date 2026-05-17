# Открывает входящие TCP 5173 (Vite) и 3000 (API) для локальной разработки Retrogen.
# Запуск: правый клик по PowerShell → «Запуск от имени администратора», затем:
#   Set-Location D:\Project\retrogen; .\scripts\open-retrogen-dev-firewall.ps1

$ErrorActionPreference = "Stop"
$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "Ошибка: запустите скрипт от имени администратора." -ForegroundColor Red
  exit 1
}

$rules = @(
  @{ Name = "Retrogen Vite Dev 5173"; Port = 5173 },
  @{ Name = "Retrogen API Dev 3000"; Port = 3000 }
)

foreach ($r in $rules) {
  netsh advfirewall firewall delete rule name=$($r.Name) 2>$null | Out-Null
  netsh advfirewall firewall add rule name=$($r.Name) dir=in action=allow protocol=TCP localport=$($r.Port) profile=any
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Не удалось добавить правило $($r.Name)" -ForegroundColor Red
    exit $LASTEXITCODE
  }
  Write-Host "Добавлено: $($r.Name) (TCP $($r.Port))" -ForegroundColor Green
}

Write-Host "`nГотово. Проверьте с другого устройства: http://<ваш-внешний-IP>:5173/" -ForegroundColor Cyan
