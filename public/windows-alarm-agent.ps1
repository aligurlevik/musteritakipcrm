# VERSION: 2026.09.24.3
$ErrorActionPreference = 'SilentlyContinue'

$AppDir = Join-Path $env:LOCALAPPDATA 'MusteriTakipCRM'
$ConfigPath = Join-Path $AppDir 'alarm-config.json'
if (!(Test-Path $ConfigPath)) { exit 2 }

try { $Config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json } catch { exit 3 }
if (-not $Config.baseUrl -or -not $Config.token) { exit 4 }

function Update-SelfIfNeeded {
    try {
        if (-not $PSCommandPath) { return }
        $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        $remoteUrl = ([string]$Config.baseUrl).TrimEnd('/') + '/windows-alarm-agent.ps1?v=' + $stamp
        $tmp = Join-Path $env:TEMP ('crm-alarm-agent-' + [guid]::NewGuid().ToString('N') + '.ps1')
        Invoke-WebRequest -Uri $remoteUrl -UseBasicParsing -OutFile $tmp -TimeoutSec 15
        if (!(Test-Path $tmp)) { return }

        $currentHash = (Get-FileHash -Algorithm SHA256 -Path $PSCommandPath).Hash
        $remoteHash = (Get-FileHash -Algorithm SHA256 -Path $tmp).Hash
        if ($currentHash -ne $remoteHash) {
            Copy-Item -Path $tmp -Destination $PSCommandPath -Force
            Remove-Item $tmp -Force -ErrorAction SilentlyContinue
            Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$PSCommandPath) -WindowStyle Hidden
            exit 0
        }
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    } catch {}
}

Update-SelfIfNeeded

$created = $false
$mutex = New-Object System.Threading.Mutex($true, 'Local\MusteriTakipCRMAlarmAgent', [ref]$created)
if (-not $created) { exit 0 }

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName System

function Invoke-CrmRequest {
    param([string]$Path, [string]$Method = 'GET', $Body = $null)
    $headers = @{ Authorization = ('Bearer ' + [string]$Config.token) }
    $uri = ([string]$Config.baseUrl).TrimEnd('/') + $Path
    if ($null -eq $Body) {
        return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -TimeoutSec 15
    }
    return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ($Body | ConvertTo-Json -Compress) -TimeoutSec 15
}

function Show-CrmAlarm {
    param($Reminder)

    [xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        Title="CRM AJANDA UYARISI" Width="560" Height="350"
        WindowStartupLocation="CenterScreen" Topmost="True"
        ResizeMode="NoResize" Background="#FFF5CC">
  <Border Name="AlarmBorder" BorderBrush="#DC2626" BorderThickness="7" CornerRadius="14" Padding="22" Background="#FFF5CC">
    <Grid>
      <Grid.RowDefinitions>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="*"/>
        <RowDefinition Height="Auto"/>
      </Grid.RowDefinitions>
      <TextBlock Grid.Row="0" Text="⚠ AJANDA UYARISI" FontSize="22" FontWeight="Bold" Foreground="#991B1B" Margin="0,0,0,14"/>
      <TextBlock Grid.Row="1" Name="AlarmTitle" FontSize="30" FontWeight="Bold" Foreground="#173F63" TextWrapping="Wrap" Margin="0,0,0,14"/>
      <ScrollViewer Grid.Row="2" VerticalScrollBarVisibility="Auto">
        <TextBlock Name="AlarmBody" FontSize="21" Foreground="#1F2937" TextWrapping="Wrap"/>
      </ScrollViewer>
      <Button Grid.Row="3" Name="StopButton" Content="TAMAM — UYARIYI KAPAT" Height="58" Margin="0,18,0,0" FontSize="18" FontWeight="Bold" Background="#173F63" Foreground="White"/>
    </Grid>
  </Border>
</Window>
'@

    try {
        $reader = New-Object System.Xml.XmlNodeReader $xaml
        $window = [Windows.Markup.XamlReader]::Load($reader)
        $border = $window.FindName('AlarmBorder')
        $window.FindName('AlarmTitle').Text = [string]$Reminder.title
        $window.FindName('AlarmBody').Text = [string]$Reminder.body
        $window.FindName('StopButton').Add_Click({ $window.Close() })

        $flashOn = $false
        $flashTimer = New-Object System.Windows.Threading.DispatcherTimer
        $flashTimer.Interval = [TimeSpan]::FromMilliseconds(500)
        $flashTimer.Add_Tick({
            $flashOn = -not $flashOn
            if ($flashOn) {
                $border.Background = [Windows.Media.Brushes]::LightYellow
                $border.BorderBrush = [Windows.Media.Brushes]::Red
            } else {
                $border.Background = [Windows.Media.Brushes]::White
                $border.BorderBrush = [Windows.Media.Brushes]::OrangeRed
            }
        })
        $window.Add_Loaded({ $flashTimer.Start(); $window.Activate() })
        $window.Add_Closed({ try { $flashTimer.Stop() } catch {} })

        [void]$window.ShowDialog()
    } catch {
        try { [System.Windows.MessageBox]::Show(([string]$Reminder.body), ([string]$Reminder.title), 'OK', 'Exclamation') | Out-Null } catch {}
    }
}

$lastUpdateCheck = [DateTime]::UtcNow

while ($true) {
    try {
        $data = Invoke-CrmRequest '/api/native-alarm/reminders'
        $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        foreach ($r in @($data.reminders)) {
            $when = [int64]$r.when
            if ($when -le ($now + 15000) -and $when -ge ($now - 300000)) {
                try {
                    Invoke-CrmRequest '/api/native-alarm/ack' 'POST' @{ id = [int]$r.id; remind_at = [string]$r.remind_at } | Out-Null
                } catch {}
                Show-CrmAlarm $r
            }
        }
    } catch {}

    if (([DateTime]::UtcNow - $lastUpdateCheck).TotalMinutes -ge 10) {
        Update-SelfIfNeeded
        $lastUpdateCheck = [DateTime]::UtcNow
    }

    Start-Sleep -Seconds 15
}
