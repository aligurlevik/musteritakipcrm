@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; $p=Join-Path $env:TEMP 'crm-engview-sync-install.ps1'; Invoke-WebRequest -UseBasicParsing 'https://musteri-takip-crm.musteritakipcrm.workers.dev/engview-agent.ps1' -OutFile $p"
if errorlevel 1 goto hata
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%TEMP%\crm-engview-sync-install.ps1" -Install
if errorlevel 1 goto hata
goto bitir
:hata
echo Kurulum tamamlanamadi. Yukaridaki hata mesajini kontrol edin.
:bitir
pause
