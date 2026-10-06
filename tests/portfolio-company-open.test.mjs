import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('zengin portföy ekranı günlük değerlendirmeyi ve tam müşteri kartını korur', async () => {
  const wrapper = await readFile(new URL('../src/portfolio_company_link_entry.js', import.meta.url), 'utf8');
  const recovery = await readFile(new URL('../src/portfolio_api_recovery_entry.js', import.meta.url), 'utf8');
  const embedded = await readFile(new URL('../src/portfolio_clean_page.js', import.meta.url), 'utf8');
  const page = await readFile(new URL('../public/musteri-portfoyu-v2.html', import.meta.url), 'utf8');

  assert.match(wrapper, /CLEAN_PORTFOLIO_HTML/);
  assert.match(wrapper, /clean-v3-inline/);
  assert.doesNotMatch(wrapper, /env\.ASSETS\.fetch/);
  assert.match(recovery, /restorePortfolioCustomers/);
  assert.match(wrapper, /\/api\/portfolio-bootstrap/);
  assert.match(wrapper, /directBootstrap/);
  assert.match(wrapper, /directMeetings/);
  assert.match(wrapper, /\/api\/portfolio-meetings/);
  assert.match(wrapper, /restorePortfolioCustomers/);
  assert.match(wrapper, /x-crm-portfolio-api/);

  for (const source of [embedded,page]) {
    assert.match(source, /PORTFOY RICH V10/);
    assert.match(source, /Günlük Değerlendirme/);
    assert.match(source, /<th>Mail<\/th>/);
    assert.match(source, /<th>Son Görüşme<\/th>/);
    assert.match(source, /Görüşmeler & Notlar/);
    assert.match(source, /Teklifler/);
    assert.match(source, /Müşteri Analizi/);
    assert.doesNotMatch(source, /data-tab="orders"/);
    assert.doesNotMatch(source, /id="tabOrders"/);
    assert.doesNotMatch(source, /orderSummary/);
    assert.match(source, /Memnuniyet Durumu/);
    assert.match(source, /Şikayet Durumu/);
    assert.match(source, /Şikayet \/ Çözüm Notu/);
    assert.match(source, /Kaybedilme Sebebi/);
    assert.match(source, /Müşteri Analizini Kaydet/);
    assert.match(source, /Müşteri analizi kaydedildi/);
    assert.match(source, /ANALYSIS_MARKER/);
    assert.match(source, /function saveCustomerAnalysis\(\)/);
    assert.match(source, /company-open-btn/);
    assert.match(source, /body:not\(\.customer-open\) \.workspace/);
    assert.match(source, /body\.customer-open \.workspace/);
    assert.match(source, /minmax\(690px,1\.08fr\)/);
    assert.match(source, /detail-title\{font-size:20px/);
    assert.match(source, /info-row input,\.info-row select\{font-size:12\.5px/);
    assert.match(source, /tab\{font-size:12px/);
    assert.match(source, /body:not\(\.customer-open\) \.workspace \.detail\{display:none/);
    assert.match(source, /function normalizeRows\(data,key\)/);
    assert.match(source, /api\('\/api\/portfolio-bootstrap\?ts='\+Date\.now\(\)\)/);
    assert.match(source, /PORTFOLIO_CACHE_KEY/);
    assert.match(source, /function loadMeetingData\(\)/);
    assert.match(source, /api\('\/api\/portfolio-meetings\?ts='\+Date\.now\(\)\)/);
    assert.match(source, /Son başarılı müşteri listesi gösteriliyor/);
    assert.doesNotMatch(source, /Promise\.allSettled\(\[api\('\/api\/customers/);
    assert.match(source, /function closeCustomerDetail\(\)/);
    assert.match(source, /document\.body\.classList\.add\('customer-open'\)/);
    assert.doesNotMatch(source, /portfolio-fullscreen-detail\.js/);
    assert.doesNotMatch(source, /portfolio-fullscreen-stable\.js/);
  }

  const start = page.lastIndexOf('<script>');
  const end = page.indexOf('</script>', start);
  assert.ok(start >= 0 && end > start, 'portföy sayfasında inline script bulunmalı');
  const inlineScript = page.slice(start + '<script>'.length, end);
  assert.doesNotThrow(() => new Function(inlineScript));
});
