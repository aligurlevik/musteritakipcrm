# VERSION: 2026.09.25.3
param(
    [switch]$DisplayAlarm,
    [string]$PayloadPath
)

$ErrorActionPreference = 'SilentlyContinue'

$AppDir = Join-Path $env:LOCALAPPDATA 'MusteriTakipCRM'
$ConfigPath = Join-Path $AppDir 'alarm-config.json'

function Show-CrmAlarmWindow {
    param($Reminder)

    Add-Type -AssemblyName PresentationFramework
    Add-Type -AssemblyName PresentationCore
    Add-Type -AssemblyName WindowsBase
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CrmAlarmWin32 {
    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("user32.dll")]
    public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);
}
'@

    $HWND_TOPMOST = [IntPtr](-1)
    $SWP_NOSIZE = 0x0001
    $SWP_NOMOVE = 0x0002
    $SWP_SHOWWINDOW = 0x0040
    $SW_RESTORE = 9

    function Force-CrmAlarmForeground {
        param($Window)
        try {
            $helper = New-Object System.Windows.Interop.WindowInteropHelper($Window)
            $handle = $helper.Handle
            if ($handle -eq [IntPtr]::Zero) { return }

            $foreground = [CrmAlarmWin32]::GetForegroundWindow()
            $foregroundPid = [uint32]0
            $foregroundThread = [uint32]0
            if ($foreground -ne [IntPtr]::Zero) {
                $foregroundThread = [CrmAlarmWin32]::GetWindowThreadProcessId($foreground, [ref]$foregroundPid)
            }
            $currentThread = [CrmAlarmWin32]::GetCurrentThreadId()
            $attached = $false

            try {
                if ($foregroundThread -ne 0 -and $foregroundThread -ne $currentThread) {
                    $attached = [CrmAlarmWin32]::AttachThreadInput($currentThread, $foregroundThread, $true)
                }

                [CrmAlarmWin32]::ShowWindowAsync($handle, $SW_RESTORE) | Out-Null
                [CrmAlarmWin32]::SetWindowPos($handle, $HWND_TOPMOST, 0, 0, 0, 0, ($SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_SHOWWINDOW)) | Out-Null
                [CrmAlarmWin32]::BringWindowToTop($handle) | Out-Null
                [CrmAlarmWin32]::SwitchToThisWindow($handle, $true)
                [CrmAlarmWin32]::SetForegroundWindow($handle) | Out-Null
                $Window.Topmost = $true
                $Window.Activate() | Out-Null
                $Window.Focus() | Out-Null
            } finally {
                if ($attached) {
                    [CrmAlarmWin32]::AttachThreadInput($currentThread, $foregroundThread, $false) | Out-Null
                }
            }
        } catch {}
    }

    [xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        Title="CRM AJANDA UYARISI" Width="620" Height="390"
        WindowStartupLocation="CenterScreen" Topmost="True" ShowActivated="True"
        ShowInTaskbar="True" ResizeMode="NoResize" WindowStyle="None"
        Background="#FFF8DC" Focusable="True">
  <Border BorderBrush="#DC2626" BorderThickness="7" CornerRadius="14" Padding="24" Background="#FFF8DC">
    <Grid>
      <Grid.RowDefinitions>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="Auto"/>
        <RowDefinition Height="*"/>
        <RowDefinition Height="Auto"/>
      </Grid.RowDefinitions>
      <TextBlock Grid.Row="0" Text="AJANDA UYARISI" FontSize="22" FontWeight="Bold" Foreground="#991B1B" Margin="0,0,0,14" HorizontalAlignment="Center"/>
      <TextBlock Grid.Row="1" Name="AlarmTitle" FontSize="30" FontWeight="Bold" Foreground="#173F63" TextWrapping="Wrap" Margin="0,0,0,14" TextAlignment="Center"/>
      <ScrollViewer Grid.Row="2" VerticalScrollBarVisibility="Auto">
        <TextBlock Name="AlarmBody" FontSize="21" Foreground="#1F2937" TextWrapping="Wrap" TextAlignment="Center"/>
      </ScrollViewer>
      <Button Grid.Row="3" Name="StopButton" Content="ALARMI KAPAT" Height="62" Margin="0,20,0,0" FontSize="19" FontWeight="Bold" Background="#173F63" Foreground="White" IsDefault="True"/>
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

        $keepFrontTimer = New-Object System.Windows.Threading.DispatcherTimer
        $keepFrontTimer.Interval = [TimeSpan]::FromMilliseconds(500)
        $keepFrontTimer.Add_Tick({ Force-CrmAlarmForeground $window })

        $window.Add_SourceInitialized({ Force-CrmAlarmForeground $window })
        $window.Add_Loaded({
            Force-CrmAlarmForeground $window
            $keepFrontTimer.Start()
        })
        $window.Add_Activated({ Force-CrmAlarmForeground $window })
        $window.Add_Deactivated({ Force-CrmAlarmForeground $window })
        $window.Add_Closed({ try { $keepFrontTimer.Stop() } catch {} })

        [void]$window.ShowDialog()
        return $true
    } catch {
        return $false
    }
}

# Alarm ekrani ayri bir STA PowerShell surecinde calisir.
# Boylece arka plandaki gizli ajan Windows'un odak kilidine takilsa bile
# gorunur alarm penceresi kendi UI thread'i ile one zorlanabilir.
if ($DisplayAlarm) {
    if (-not $PayloadPath -or !(Test-Path $PayloadPath)) { exit 20 }
    try {
        $payload = Get-Content -Raw -Path $PayloadPath | ConvertFrom-Json
        if (Show-CrmAlarmWindow $payload) { exit 0 }
        exit 21
    } catch {
        exit 22
    }
}

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
            Start-Process -FilePath "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList @('-NoProfile','-STA','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$PSCommandPath) -WindowStyle Hidden
            exit 0
        }
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    } catch {}
}

Update-SelfIfNeeded

$created = $false
$mutex = New-Object System.Threading.Mutex($false, 'Local\MusteriTakipCRMAlarmAgent', [ref]$created)
$hasMutex = $false
try { $hasMutex = $mutex.WaitOne([TimeSpan]::FromSeconds(10)) } catch { $hasMutex = $false }
if (-not $hasMutex) { exit 0 }

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

    $payloadPath = Join-Path $env:TEMP ('crm-alarm-payload-' + [guid]::NewGuid().ToString('N') + '.json')
    try {
        [ordered]@{
            title = [string]$Reminder.title
            body = [string]$Reminder.body
        } | ConvertTo-Json -Compress | Set-Content -Path $payloadPath -Encoding UTF8

        $powershell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
        $args = '-NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $PSCommandPath + '" -DisplayAlarm -PayloadPath "' + $payloadPath + '"'
        $process = Start-Process -FilePath $powershell -ArgumentList $args -WindowStyle Hidden -PassThru
        if (-not $process) { return $false }
        $process.WaitForExit()
        return ($process.ExitCode -eq 0)
    } catch {
        return $false
    } finally {
        Remove-Item $payloadPath -Force -ErrorAction SilentlyContinue
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
                $shown = Show-CrmAlarm $r
                if ($shown) {
                    try {
                        Invoke-CrmRequest '/api/native-alarm/ack' 'POST' @{ id = [int]$r.id; remind_at = [string]$r.remind_at } | Out-Null
                    } catch {}
                }
            }
        }
    } catch {}

    if (([DateTime]::UtcNow - $lastUpdateCheck).TotalMinutes -ge 10) {
        Update-SelfIfNeeded
        $lastUpdateCheck = [DateTime]::UtcNow
    }

    Start-Sleep -Seconds 15
}
