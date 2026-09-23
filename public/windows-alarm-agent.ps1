$ErrorActionPreference = 'SilentlyContinue'

$AppDir = Join-Path $env:LOCALAPPDATA 'MusteriTakipCRM'
$ConfigPath = Join-Path $AppDir 'alarm-config.json'
if (!(Test-Path $ConfigPath)) { exit 2 }

try { $Config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json } catch { exit 3 }
if (-not $Config.baseUrl -or -not $Config.token) { exit 4 }

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

    $soundPath = @(
        "$env:WINDIR\Media\Alarm01.wav",
        "$env:WINDIR\Media\Alarm02.wav",
        "$env:WINDIR\Media\Windows Notify Calendar.wav",
        "$env:WINDIR\Media\Windows Notify.wav"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    $player = $null
    try {
        if ($soundPath) {
            $player = New-Object System.Media.SoundPlayer $soundPath
            $player.PlayLooping()
        } else {
            [System.Media.SystemSounds]::Exclamation.Play()
        }
    } catch {}

    [xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        Title="CRM AJANDA ALARMI" Width="560" Height="350"
        WindowStartupLocation="CenterScreen" Topmost="True"
        ResizeMode="NoResize" Background="#FFF5CC">
  <Border BorderBrush="#F59E0B" BorderThickness="5" CornerRadius="14" Padding="22">
    <Grid>
      <Grid.RowDefinitions>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="*"/>
        <RowDefinition Height="Auto"/>
      </Grid.RowDefinitions>
      <TextBlock Grid.Row="0" Text="⏰ AJANDA ALARMI" FontSize="20" FontWeight="Bold" Foreground="#8A4B00" Margin="0,0,0,14"/>
      <TextBlock Grid.Row="1" Name="AlarmTitle" FontSize="28" FontWeight="Bold" Foreground="#173F63" TextWrapping="Wrap" Margin="0,0,0,14"/>
      <ScrollViewer Grid.Row="2" VerticalScrollBarVisibility="Auto">
        <TextBlock Name="AlarmBody" FontSize="20" Foreground="#1F2937" TextWrapping="Wrap"/>
      </ScrollViewer>
      <Button Grid.Row="3" Name="StopButton" Content="TAMAM — SESİ DURDUR" Height="58" Margin="0,18,0,0" FontSize="18" FontWeight="Bold" Background="#173F63" Foreground="White"/>
    </Grid>
  </Border>
</Window>
'@

    try {
        $reader = New-Object System.Xml.XmlNodeReader $xaml
        $window = [Windows.Markup.XamlReader]::Load($reader)
        $window.FindName('AlarmTitle').Text = [string]$Reminder.title
        $window.FindName('AlarmBody').Text = [string]$Reminder.body
        $window.FindName('StopButton').Add_Click({ $window.Close() })
        $window.Add_Closed({ try { if ($player) { $player.Stop() } } catch {} })
        [void]$window.ShowDialog()
    } catch {
        try { if ($player) { $player.Stop() } } catch {}
        try { [System.Windows.MessageBox]::Show(([string]$Reminder.body), ([string]$Reminder.title), 'OK', 'Exclamation') | Out-Null } catch {}
    }
}

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
    Start-Sleep -Seconds 15
}
