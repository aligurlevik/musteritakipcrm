import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const script = fs.readFileSync(new URL('../public/windows-alarm-agent.ps1', import.meta.url), 'utf8');

test('alarm penceresi Windows topmost olarak tanımlı', () => {
  assert.match(script, /Topmost="True"/);
  assert.match(script, /ShowActivated="True"/);
});

test('Win32 seviyesinde her şeyin önüne zorlanıyor', () => {
  for (const api of ['SetWindowPos', 'SetForegroundWindow', 'BringWindowToTop', 'ShowWindowAsync']) {
    assert.match(script, new RegExp(api));
  }
  assert.match(script, /HWND_TOPMOST/);
});

test('alarm açık kaldığı sürece önde tutma zamanlayıcısı çalışıyor', () => {
  assert.match(script, /keepFrontTimer\.Interval\s*=\s*\[TimeSpan\]::FromMilliseconds\(900\)/);
  assert.match(script, /keepFrontTimer\.Add_Tick\(\{ Set-CrmAlarmForeground \$window \}\)/);
  assert.match(script, /keepFrontTimer\.Stop\(\)/);
});

test('tek kapatma düğmesi alarm penceresini kapatıyor', () => {
  assert.match(script, /Content="ALARMI KAPAT"/);
  assert.match(script, /StopButton'\)\.Add_Click\(\{ \$window\.Close\(\) \}\)/);
});

test('ajan ses üretmiyor ve alarm gösterilmeden ack atmıyor', () => {
  assert.doesNotMatch(script, /Console\.Beep|SystemSounds|MediaPlayer|SoundPlayer|\.Play\s*\(/i);
  const showPos = script.indexOf('$shown = Show-CrmAlarm $r');
  const ackPos = script.indexOf("Invoke-CrmRequest '/api/native-alarm/ack'", showPos);
  assert.ok(showPos >= 0 && ackPos > showPos, 'ack alarm gösterildikten sonra olmalı');
});
