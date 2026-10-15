@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $p=Join-Path $env:TEMP 'crm-engview-sync-install.ps1'; Invoke-WebRequest -UseBasicParsing 'https://musteri-takip-crm.musteritakipcrm.workers.dev/engview-agent.ps1' -OutFile $p; & $p -Install"
if errorlevel 1 echo Kurulum tamamlanamadi. Ekrandaki hata ile birlikte tekrar deneyin.
pause
