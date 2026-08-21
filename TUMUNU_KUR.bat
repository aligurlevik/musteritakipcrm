@echo off
cd /d "%~dp0"
echo ========================================
echo CRM TUM OZELLIKLER TEK PAKET
echo ========================================
echo.
echo 1/2 Veritabani guncelleniyor...
node migrate_all.js
if errorlevel 1 (
  echo.
  echo VERITABANI GUNCELLEMESINDE HATA OLDU.
  pause
  exit /b 1
)
echo.
echo 2/2 CRM yayinlaniyor...
npm run deploy
if errorlevel 1 (
  echo.
  echo DEPLOY HATASI OLDU.
  pause
  exit /b 1
)
echo.
echo TAMAMLANDI.
echo Tarayicida CRM sayfasinda CTRL+F5 yap.
pause
