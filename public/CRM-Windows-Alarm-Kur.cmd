@echo off
chcp 65001 >nul
setlocal
set "BASE=https://musteri-takip-crm.musteritakipcrm.workers.dev"
cls
echo ===============================================
echo     MUSTERI TAKIP CRM - WINDOWS ALARM KURULUMU
echo ===============================================
echo.
echo CRM icinde Windows Alarm Kur sayfasindan 6 haneli kodu al.
echo.
set /p CODE=6 haneli eslestirme kodu: 
if "%CODE%"=="" goto :bad
set "SETUP=%TEMP%\crm-windows-alarm-install.ps1"
echo.
echo Kurulum baslatiliyor...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing '%BASE%/windows-alarm-install.ps1' -OutFile '%SETUP%'"
if errorlevel 1 goto :fail
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SETUP%" -BaseUrl "%BASE%" -Code "%CODE%"
if errorlevel 1 goto :fail
echo.
echo KURULUM TAMAMLANDI.
echo Bu pencereyi kapatabilirsin.
pause
exit /b 0

:bad
echo Kod girilmedi.
pause
exit /b 1

:fail
echo.
echo Kurulum tamamlanamadi. Yeni bir eslestirme kodu alip tekrar dene.
pause
exit /b 1
