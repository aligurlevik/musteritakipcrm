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
  assert.match(recovery, /async function directCustomers\(env\)\{\n  await restorePortfolioCustomers\(env\);/);

  for (const source of [embedded,page]) {
    assert.match(source, /PORTFOY RICH V4/);
    assert.match(source, /Günlük Değerlendirme/);
    assert.match(source, /<th>Mail<\/th>/);
    assert.match(source, /<th>Son Görüşme<\/th>/);
    assert.match(source, /Görüşmeler & Notlar/);
    assert.match(source, /Teklifler/);
    assert.match(source, /Siparişler/);
    assert.match(source, /Müşteri Analizi/);
    assert.match(source, /company-open-btn/);
    assert.match(source, /function normalizeRows\(data,key\)/);
    assert.match(source, /Müşteriler yüklenemedi/);
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
