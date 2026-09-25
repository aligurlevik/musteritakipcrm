import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const script = fs.readFileSync(new URL('../public/windows-alarm-agent.ps1', import.meta.url), 'utf8');

test('alarm ekrani ayri STA PowerShell surecinde aciliyor', () => {
  assert.match(script, /-STA/);
  assert.match(script, /-DisplayAlarm/);
  assert.match(script, /Start-Process[\s\S]*-PassThru/);
  assert.match(script, /process\.WaitForExit\(\)/);
});

test('alarm penceresi gercek Windows topmost pencere olarak tanimli', () => {
  assert.match(script, /Topmost="True"/);
  assert.match(script, /ShowActivated="True"/);
  assert.match(script, /WindowStyle="None"/);
  assert.match(script, /ShowInTaskbar="True"/);
});

test('Windows foreground lock icin aktif pencerenin UI threadine baglaniyor', () => {
  for (const api of [
    'GetForegroundWindow',
    'GetWindowThreadProcessId',
    'GetCurrentThreadId',
    'AttachThreadInput',
    'SetWindowPos',
    'SetForegroundWindow',
    'BringWindowToTop',
    'SwitchToThisWindow',
    'ShowWindowAsync'
  ]) {
    assert.match(script, new RegExp(api));
  }
  assert.match(script, /AttachThreadInput\(\$currentThread, \$foregroundThread, \$true\)/);
  assert.match(script, /AttachThreadInput\(\$currentThread, \$foregroundThread, \$false\)/);
});

test('alarm acik kaldigi surece 500 ms aralikla tekrar one zorlanir', () => {
  assert.match(script, /keepFrontTimer\.Interval\s*=\s*\[TimeSpan\]::FromMilliseconds\(500\)/);
  assert.match(script, /keepFrontTimer\.Add_Tick\(\{ Force-CrmAlarmForeground \$window \}\)/);
  assert.match(script, /Add_Deactivated\(\{ Force-CrmAlarmForeground \$window \}\)/);
  assert.match(script, /keepFrontTimer\.Stop\(\)/);
});

test('alarm yalnizca ALARMI KAPAT dugmesiyle kapatilabilir ve ses kodu yoktur', () => {
  assert.match(script, /Content="ALARMI KAPAT"/);
  assert.match(script, /StopButton'\)\.Add_Click\(\{ \$window\.Close\(\) \}\)/);
  assert.doesNotMatch(script, /Console\.Beep|SystemSounds|MediaPlayer|SoundPlayer|\.Play\s*\(/i);
});

test('ack ancak gorunur alarm sureci basariyla kapaninca gonderilir', () => {
  const showPos = script.indexOf('$shown = Show-CrmAlarm $r');
  const ackPos = script.indexOf("Invoke-CrmRequest '/api/native-alarm/ack'", showPos);
  assert.ok(showPos >= 0 && ackPos > showPos, 'ack alarm gosterildikten sonra olmali');
  assert.match(script, /return \(\$process\.ExitCode -eq 0\)/);
});
