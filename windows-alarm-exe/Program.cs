using Microsoft.Win32;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CRMWindowsAlarm;

internal static class Program
{
    private const string BaseUrl = "https://musteri-takip-crm.musteritakipcrm.workers.dev";

    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();

        if (!Installer.EnsureInstalled()) return;

        using var mutex = new Mutex(true, @"Local\CRMWindowsAlarmExe", out var firstInstance);
        if (!firstInstance) return;

        LegacyCleanup.Run();

        var config = ConfigStore.Load();
        if (config is null)
        {
            using var pairForm = new PairForm(BaseUrl);
            if (pairForm.ShowDialog() != DialogResult.OK || pairForm.Config is null) return;
            config = pairForm.Config;
            ConfigStore.Save(config);
        }

        StartupRegistration.Ensure();
        Application.Run(new AlarmApplicationContext(config));
    }
}

internal static class Installer
{
    internal static string AppDirectory => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "MusteriTakipCRM");

    internal static string InstalledExePath => Path.Combine(AppDirectory, "CRM-Windows-Alarm.exe");

    internal static bool EnsureInstalled()
    {
        var current = Path.GetFullPath(Environment.ProcessPath ?? Application.ExecutablePath);
        var target = Path.GetFullPath(InstalledExePath);
        if (string.Equals(current, target, StringComparison.OrdinalIgnoreCase)) return true;

        try
        {
            Directory.CreateDirectory(AppDirectory);

            foreach (var process in Process.GetProcessesByName("CRM-Windows-Alarm"))
            {
                try
                {
                    if (process.Id == Environment.ProcessId) continue;
                    var file = process.MainModule?.FileName;
                    if (file is not null && string.Equals(Path.GetFullPath(file), target, StringComparison.OrdinalIgnoreCase))
                    {
                        process.Kill(true);
                        process.WaitForExit(3000);
                    }
                }
                catch { }
                finally { process.Dispose(); }
            }

            File.Copy(current, target, true);
            Process.Start(new ProcessStartInfo(target) { UseShellExecute = true });
            return false;
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "CRM Windows Alarm kurulamadı.\n\n" + ex.Message,
                "CRM Windows Alarm",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return false;
        }
    }
}

internal static class LegacyCleanup
{
    internal static void Run()
    {
        try
        {
            var startup = Environment.GetFolderPath(Environment.SpecialFolder.Startup);
            var legacyShortcut = Path.Combine(startup, "MusteriTakipCRM Alarm.lnk");
            if (File.Exists(legacyShortcut)) File.Delete(legacyShortcut);
        }
        catch { }

        try
        {
            var script = "Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" | " +
                         "Where-Object { $_.CommandLine -like '*windows-alarm-agent.ps1*' } | " +
                         "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden
            };
            psi.ArgumentList.Add("-NoProfile");
            psi.ArgumentList.Add("-WindowStyle");
            psi.ArgumentList.Add("Hidden");
            psi.ArgumentList.Add("-Command");
            psi.ArgumentList.Add(script);
            Process.Start(psi)?.Dispose();
        }
        catch { }
    }
}

internal static class StartupRegistration
{
    private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string ValueName = "MusteriTakipCRMAlarmExe";

    internal static void Ensure()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKey, writable: true) ??
                            Registry.CurrentUser.CreateSubKey(RunKey, writable: true);
            key.SetValue(ValueName, $"\"{Installer.InstalledExePath}\" --background");
        }
        catch { }
    }
}

internal sealed class PairForm : Form
{
    private readonly string _baseUrl;
    private readonly TextBox _codeBox = new();
    private readonly Label _status = new();
    private readonly Button _pairButton = new();

    internal AppConfig? Config { get; private set; }

    internal PairForm(string baseUrl)
    {
        _baseUrl = baseUrl.TrimEnd('/');
        Text = "CRM Windows Alarm Kurulumu";
        Width = 520;
        Height = 330;
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        TopMost = true;
        BackColor = Color.White;

        var title = new Label
        {
            Text = "CRM WINDOWS ALARM",
            Font = new Font("Segoe UI", 20, FontStyle.Bold),
            ForeColor = Color.FromArgb(23, 63, 99),
            AutoSize = false,
            TextAlign = ContentAlignment.MiddleCenter,
            Left = 20,
            Top = 20,
            Width = 460,
            Height = 50
        };

        var help = new Label
        {
            Text = "CRM'deki Windows Alarm sayfasından aldığın 6 haneli eşleştirme kodunu gir:",
            Font = new Font("Segoe UI", 11),
            AutoSize = false,
            TextAlign = ContentAlignment.MiddleCenter,
            Left = 30,
            Top = 78,
            Width = 440,
            Height = 50
        };

        _codeBox.Left = 155;
        _codeBox.Top = 136;
        _codeBox.Width = 190;
        _codeBox.Height = 45;
        _codeBox.MaxLength = 6;
        _codeBox.TextAlign = HorizontalAlignment.Center;
        _codeBox.Font = new Font("Consolas", 23, FontStyle.Bold);
        _codeBox.KeyPress += (_, e) =>
        {
            if (!char.IsControl(e.KeyChar) && !char.IsDigit(e.KeyChar)) e.Handled = true;
        };

        _pairButton.Text = "BAĞLA VE BAŞLAT";
        _pairButton.Left = 130;
        _pairButton.Top = 194;
        _pairButton.Width = 240;
        _pairButton.Height = 48;
        _pairButton.Font = new Font("Segoe UI", 12, FontStyle.Bold);
        _pairButton.BackColor = Color.FromArgb(23, 63, 99);
        _pairButton.ForeColor = Color.White;
        _pairButton.FlatStyle = FlatStyle.Flat;
        _pairButton.Click += PairButton_Click;

        _status.Left = 30;
        _status.Top = 248;
        _status.Width = 440;
        _status.Height = 36;
        _status.TextAlign = ContentAlignment.MiddleCenter;
        _status.ForeColor = Color.DimGray;

        Controls.AddRange([title, help, _codeBox, _pairButton, _status]);
        AcceptButton = _pairButton;
    }

    private async void PairButton_Click(object? sender, EventArgs e)
    {
        var code = _codeBox.Text.Trim();
        if (code.Length != 6 || !code.All(char.IsDigit))
        {
            _status.Text = "6 haneli kodu eksiksiz gir.";
            _status.ForeColor = Color.Firebrick;
            return;
        }

        _pairButton.Enabled = false;
        _status.Text = "Bağlanıyor...";
        _status.ForeColor = Color.DimGray;

        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
            using var response = await client.PostAsJsonAsync(
                _baseUrl + "/api/native-alarm/pair",
                new { code, label = Environment.MachineName + " Windows EXE Alarm" });

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadFromJsonAsync<ApiError>();
                throw new InvalidOperationException(error?.Error ?? "Eşleştirme başarısız.");
            }

            var pair = await response.Content.ReadFromJsonAsync<PairResponse>();
            if (pair is null || string.IsNullOrWhiteSpace(pair.Token))
                throw new InvalidOperationException("Sunucudan cihaz anahtarı alınamadı.");

            Config = new AppConfig
            {
                BaseUrl = _baseUrl,
                Token = pair.Token,
                DeviceId = pair.DeviceId ?? string.Empty
            };

            _status.Text = "Bağlandı. Alarm servisi başlatılıyor.";
            _status.ForeColor = Color.DarkGreen;
            await Task.Delay(350);
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex)
        {
            _status.Text = ex.Message;
            _status.ForeColor = Color.Firebrick;
            _pairButton.Enabled = true;
        }
    }
}

internal sealed class AlarmApplicationContext : ApplicationContext
{
    private readonly AppConfig _config;
    private readonly HttpClient _client;
    private readonly System.Windows.Forms.Timer _pollTimer;
    private bool _busy;

    internal AlarmApplicationContext(AppConfig config)
    {
        _config = config;
        _client = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", config.Token);

        _pollTimer = new System.Windows.Forms.Timer { Interval = 5000 };
        _pollTimer.Tick += PollTimer_Tick;
        _pollTimer.Start();
    }

    private async void PollTimer_Tick(object? sender, EventArgs e)
    {
        if (_busy) return;
        _busy = true;

        try
        {
            using var response = await _client.GetAsync(_config.BaseUrl.TrimEnd('/') + "/api/native-alarm/reminders");
            if (!response.IsSuccessStatusCode) return;

            var data = await response.Content.ReadFromJsonAsync<ReminderResponse>();
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var due = (data?.Reminders ?? [])
                .Where(r => r.When <= now + 10000 && r.When >= now - 300000)
                .OrderBy(r => r.When)
                .ThenBy(r => r.Id)
                .ToList();

            foreach (var reminder in due)
            {
                using var alarm = new AlarmForm(reminder);
                var result = alarm.ShowDialog();
                if (result == DialogResult.OK)
                {
                    await Acknowledge(reminder);
                }
            }
        }
        catch
        {
            // Ağ geçici olarak yoksa bir sonraki turda tekrar denenir.
        }
        finally
        {
            _busy = false;
        }
    }

    private async Task Acknowledge(Reminder reminder)
    {
        try
        {
            await _client.PostAsJsonAsync(
                _config.BaseUrl.TrimEnd('/') + "/api/native-alarm/ack",
                new { id = reminder.Id, remind_at = reminder.RemindAt });
        }
        catch { }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _pollTimer.Stop();
            _pollTimer.Dispose();
            _client.Dispose();
        }
        base.Dispose(disposing);
    }
}

internal sealed class AlarmForm : Form
{
    private readonly System.Windows.Forms.Timer _frontTimer = new() { Interval = 350 };
    private bool _allowClose;

    private static readonly IntPtr HwndTopmost = new(-1);
    private const uint SwpNoSize = 0x0001;
    private const uint SwpNoMove = 0x0002;
    private const uint SwpShowWindow = 0x0040;
    private const int SwShow = 5;

    internal AlarmForm(Reminder reminder)
    {
        Text = "CRM AJANDA UYARISI";
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = true;
        TopMost = true;
        StartPosition = FormStartPosition.Manual;
        BackColor = Color.FromArgb(17, 24, 39);
        Bounds = Screen.PrimaryScreen?.Bounds ?? new Rectangle(0, 0, 1280, 720);
        KeyPreview = true;

        var card = new Panel
        {
            Width = 720,
            Height = 420,
            BackColor = Color.FromArgb(255, 248, 220)
        };

        var header = new Label
        {
            Text = "AJANDA UYARISI",
            Font = new Font("Segoe UI", 23, FontStyle.Bold),
            ForeColor = Color.FromArgb(153, 27, 27),
            TextAlign = ContentAlignment.MiddleCenter,
            Left = 30,
            Top = 28,
            Width = 660,
            Height = 50
        };

        var title = new Label
        {
            Text = reminder.Title,
            Font = new Font("Segoe UI", 27, FontStyle.Bold),
            ForeColor = Color.FromArgb(23, 63, 99),
            TextAlign = ContentAlignment.MiddleCenter,
            Left = 36,
            Top = 85,
            Width = 648,
            Height = 82,
            AutoEllipsis = true
        };

        var body = new Label
        {
            Text = reminder.Body,
            Font = new Font("Segoe UI", 17, FontStyle.Regular),
            ForeColor = Color.FromArgb(31, 41, 55),
            TextAlign = ContentAlignment.MiddleCenter,
            Left = 42,
            Top = 175,
            Width = 636,
            Height = 135,
            AutoEllipsis = true
        };

        var stop = new Button
        {
            Text = "ALARMI KAPAT",
            Font = new Font("Segoe UI", 17, FontStyle.Bold),
            BackColor = Color.FromArgb(23, 63, 99),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Left = 185,
            Top = 328,
            Width = 350,
            Height = 64,
            TabStop = true
        };
        stop.FlatAppearance.BorderSize = 0;
        stop.Click += (_, _) =>
        {
            _allowClose = true;
            DialogResult = DialogResult.OK;
            Close();
        };

        card.Controls.AddRange([header, title, body, stop]);
        Controls.Add(card);

        void CenterCard()
        {
            card.Left = Math.Max(0, (ClientSize.Width - card.Width) / 2);
            card.Top = Math.Max(0, (ClientSize.Height - card.Height) / 2);
        }

        Resize += (_, _) => CenterCard();
        CenterCard();

        _frontTimer.Tick += (_, _) => ForceForeground();
        Shown += (_, _) =>
        {
            ForceForeground();
            _frontTimer.Start();
            stop.Focus();
        };
        Activated += (_, _) => ForceForeground();
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (!_allowClose)
        {
            e.Cancel = true;
            ForceForeground();
            return;
        }

        _frontTimer.Stop();
        base.OnFormClosing(e);
    }

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        if (keyData == (Keys.Alt | Keys.F4))
        {
            ForceForeground();
            return true;
        }
        return base.ProcessCmdKey(ref msg, keyData);
    }

    private void ForceForeground()
    {
        if (!IsHandleCreated || IsDisposed) return;

        var handle = Handle;
        var foreground = NativeMethods.GetForegroundWindow();
        var currentThread = NativeMethods.GetCurrentThreadId();
        uint foregroundThread = 0;
        var attached = false;

        try
        {
            if (foreground != IntPtr.Zero && foreground != handle)
            {
                foregroundThread = NativeMethods.GetWindowThreadProcessId(foreground, out _);
                if (foregroundThread != 0 && foregroundThread != currentThread)
                {
                    attached = NativeMethods.AttachThreadInput(currentThread, foregroundThread, true);
                }
            }

            NativeMethods.ShowWindowAsync(handle, SwShow);
            NativeMethods.SetWindowPos(handle, HwndTopmost, 0, 0, 0, 0, SwpNoMove | SwpNoSize | SwpShowWindow);
            NativeMethods.BringWindowToTop(handle);
            NativeMethods.SetForegroundWindow(handle);
            NativeMethods.SetActiveWindow(handle);
            NativeMethods.SetFocus(handle);
            TopMost = true;
            Activate();
        }
        catch { }
        finally
        {
            if (attached && foregroundThread != 0)
            {
                try { NativeMethods.AttachThreadInput(currentThread, foregroundThread, false); } catch { }
            }
        }
    }
}

internal static class NativeMethods
{
    [DllImport("user32.dll")]
    internal static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    internal static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("kernel32.dll")]
    internal static extern uint GetCurrentThreadId();

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    internal static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool attach);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    internal static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    internal static extern IntPtr SetActiveWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    internal static extern IntPtr SetFocus(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    internal static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    internal static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    internal static extern bool SetWindowPos(
        IntPtr hWnd,
        IntPtr hWndInsertAfter,
        int x,
        int y,
        int cx,
        int cy,
        uint flags);
}

internal static class ConfigStore
{
    private static string ConfigPath => Path.Combine(Installer.AppDirectory, "alarm-exe-config.json");

    internal static AppConfig? Load()
    {
        try
        {
            if (!File.Exists(ConfigPath)) return null;
            return JsonSerializer.Deserialize<AppConfig>(File.ReadAllText(ConfigPath));
        }
        catch { return null; }
    }

    internal static void Save(AppConfig config)
    {
        Directory.CreateDirectory(Installer.AppDirectory);
        File.WriteAllText(ConfigPath, JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true }));
    }
}

internal sealed class AppConfig
{
    public string BaseUrl { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string DeviceId { get; set; } = string.Empty;
}

internal sealed class PairResponse
{
    public string? Token { get; set; }
    public string? DeviceId { get; set; }
}

internal sealed class ApiError
{
    public string? Error { get; set; }
}

internal sealed class ReminderResponse
{
    public List<Reminder> Reminders { get; set; } = [];
}

internal sealed class Reminder
{
    public int Id { get; set; }
    public string Title { get; set; } = "Ajanda alarmı";
    public string Body { get; set; } = "Hatırlatma zamanı geldi.";
    public long When { get; set; }

    [JsonPropertyName("remind_at")]
    public string RemindAt { get; set; } = string.Empty;
}