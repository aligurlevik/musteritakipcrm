param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$Code
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
if ($Code -notmatch '^\d{6}$') { throw '6 haneli eşleştirme kodu geçersiz.' }

$AppDir = Join-Path $env:LOCALAPPDATA 'MusteriTakipCRM'
New-Item -ItemType Directory -Force -Path $AppDir | Out-Null

$pairBody = @{ code = $Code; label = ($env:COMPUTERNAME + ' Windows Alarm') } | ConvertTo-Json -Compress
$pair = Invoke-RestMethod -Uri ($BaseUrl + '/api/native-alarm/pair') -Method Post -ContentType 'application/json; charset=utf-8' -Body $pairBody -TimeoutSec 20
if (-not $pair.token) { throw 'Bilgisayar eşleştirilemedi.' }

$config = [ordered]@{
  baseUrl = $BaseUrl
  token = [string]$pair.token
  deviceId = [string]$pair.deviceId
  installedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
}
$config | ConvertTo-Json | Set-Content -Path (Join-Path $AppDir 'alarm-config.json') -Encoding UTF8

$agentPath = Join-Path $AppDir 'windows-alarm-agent.ps1'
Invoke-WebRequest -Uri ($BaseUrl + '/windows-alarm-agent.ps1') -UseBasicParsing -OutFile $agentPath -TimeoutSec 30

$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'MusteriTakipCRM Alarm.lnk'
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $agentPath + '"'
$shortcut.WorkingDirectory = $AppDir
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,167"
$shortcut.Description = 'Müşteri Takip CRM arka plan alarm servisi'
$shortcut.Save()

# Eski çalışan ajan varsa kapat; yeni sürümü hemen başlat.
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object {
  $_.CommandLine -like '*windows-alarm-agent.ps1*'
} | ForEach-Object {
  try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
}

Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$agentPath) -WindowStyle Hidden

Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show('Kurulum tamamlandı. CRM kapalı olsa bile bilgisayar açıkken ajanda alarmı arka planda çalışacak.','CRM Windows Alarmı','OK','Information') | Out-Null
