param([switch]$Install)
$ErrorActionPreference = 'Stop'
$CrmBase = 'https://musteri-takip-crm.musteritakipcrm.workers.dev'
$Root = Join-Path $env:LOCALAPPDATA 'CRM-EngView'
$ConfigFile = Join-Path $Root 'connection.xml'
$AgentFile = Join-Path $Root 'engview-agent.ps1'
$Folder = 'J:\Dat2026'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if ($Install) {
    Write-Host 'CRM EngView - Tek bilgisayara bir kez kurun.'
    if (!(Test-Path -LiteralPath $Folder)) { throw 'J:\Dat2026 bulunamadi. Ortak surucuye bagli bilgisayarda kurun.' }
    $Token = Read-Host 'CRM EngView baglantisi ekranindaki anahtari yapistirin' -AsSecureString
    $Credential = New-Object System.Management.Automation.PSCredential('engview', $Token)
    $Plain = $Credential.GetNetworkCredential().Password.Trim()
    if ($Plain -notmatch '^[a-f0-9]{64}$') { throw 'Anahtar 64 karakter olmali.' }
    # A harmless validation request: 400 means the token is valid but no job code was supplied.
    try { Invoke-WebRequest -UseBasicParsing -Uri ($CrmBase + '/api/engview/sync') -Method Put -Headers @{Authorization=('Bearer ' + $Plain)} | Out-Null }
    catch { if (!$_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ne 400) { throw 'CRM anahtari dogrulanamadi. Baglantiyi ve anahtari kontrol edin.' } }
    New-Item -ItemType Directory -Force -Path $Root | Out-Null
    (New-Object System.Management.Automation.PSCredential('engview',(ConvertTo-SecureString $Plain -AsPlainText -Force))) | Export-Clixml -LiteralPath $ConfigFile
    Copy-Item -LiteralPath $PSCommandPath -Destination $AgentFile -Force
    $LaunchFile = Join-Path $Root 'Baslat.vbs'
    $Command = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $AgentFile + '"'
    $Vbs = 'CreateObject("WScript.Shell").Run "' + $Command.Replace('"','""') + '", 0, False'
    Set-Content -LiteralPath $LaunchFile -Value $Vbs -Encoding Unicode
    Copy-Item -LiteralPath $LaunchFile -Destination (Join-Path ([Environment]::GetFolderPath('Startup')) 'CRM-EngView.vbs') -Force
    Start-Process wscript.exe -ArgumentList ('"' + $LaunchFile + '"')
    Write-Host 'Kuruldu. EVD dosyalarinizi her zamanki gibi J:\Dat2026 klasorune kaydedin.'
    Write-Host 'Durum: CRM > Grafik Isleri > EngView baglantisi. Hatalar: %LOCALAPPDATA%\CRM-EngView\aktarim.log'
    Write-Host 'Kaldirmak icin: CRM baglantisini iptal edin ve Baslangic klasorundeki CRM-EngView.vbs dosyasini silin.'
    exit
}
New-Item -ItemType Directory -Force -Path $Root | Out-Null
$Mutex = New-Object System.Threading.Mutex($false, 'Local\CRMEngViewSync')
if (!$Mutex.WaitOne(0)) { exit }
function Write-Log([string]$Message) {
    $Log = Join-Path $Root 'aktarim.log'
    if ((Test-Path $Log) -and (Get-Item $Log).Length -gt 1048576) { Move-Item $Log ($Log + '.old') -Force }
    Add-Content -LiteralPath $Log -Value ((Get-Date -Format 's') + ' ' + $Message) -Encoding UTF8
}
try {
    $StateFile = Join-Path $Root 'state.xml'
    $State = @{}
    if (Test-Path $StateFile) { try { $State = Import-Clixml -LiteralPath $StateFile } catch { $State = @{} } }
    while ($true) {
        try {
            $Credential = Import-Clixml -LiteralPath $ConfigFile
            $Headers = @{Authorization=('Bearer ' + $Credential.GetNetworkCredential().Password)}
            if (!(Test-Path -LiteralPath $Folder)) { throw 'J:\Dat2026 erisilemiyor; yeniden denenecek.' }
            $Changed = $false
            # Only this folder; Deleted and other subfolders are intentionally excluded.
            foreach ($File in Get-ChildItem -LiteralPath $Folder -Filter '*.evd' -File) {
                if ($File.BaseName -notmatch '^[A-Za-z0-9_-]{1,100}$') { continue }
                if ($File.LastWriteTimeUtc -gt [DateTime]::UtcNow.AddSeconds(-5)) { continue }
                $Stamp = [string]$File.Length + ':' + [string]$File.LastWriteTimeUtc.Ticks
                if ($State[$File.Name] -eq $Stamp) { continue }
                if ($File.Length -le 0 -or $File.Length -gt 1048576) { Write-Log ($File.Name + ': bos veya 1 MB sinirini asiyor.'); continue }
                try {
                    # Deny concurrent writers while taking the snapshot; never alter the source.
                    $Stream = [IO.File]::Open($File.FullName,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read)
                    try { $Memory = New-Object IO.MemoryStream; $Stream.CopyTo($Memory); $Bytes = $Memory.ToArray(); $Memory.Dispose() } finally { $Stream.Dispose() }
                    $File.Refresh()
                    if (([string]$File.Length + ':' + [string]$File.LastWriteTimeUtc.Ticks) -ne $Stamp) { continue }
                    Invoke-RestMethod -Uri ($CrmBase + '/api/engview/sync?code=' + [Uri]::EscapeDataString($File.BaseName)) -Method Put -Headers $Headers -ContentType 'application/octet-stream' -Body $Bytes -TimeoutSec 60 | Out-Null
                    $State[$File.Name] = $Stamp
                    $Changed = $true
                    Write-Log ($File.Name + ': aktarildi.')
                } catch {
                    Write-Log ($File.Name + ': aktarilamadi; yeniden denenecek. ' + $_.Exception.Message)
                    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) { throw 'Baglanti anahtari iptal edilmis; CRM ekranindan yeniden kurun.' }
                }
            }
            if ($Changed) { $State | Export-Clixml -LiteralPath $StateFile }
        } catch { Write-Log $_.Exception.Message }
        Start-Sleep -Seconds 30
    }
} finally { $Mutex.ReleaseMutex(); $Mutex.Dispose() }
