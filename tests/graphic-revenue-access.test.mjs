import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const readProjectFile=path=>readFile(new URL(`../${path}`,import.meta.url),'utf8');

function cssRuleHides(source,selectorPattern){
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some(([,selectors,declarations])=>
    selectorPattern.test(selectors)&&/display\s*:\s*none\s*!important/i.test(declarations)
  );
}

function contextAfter(source,marker,length=1600){
  const index=source.indexOf(marker);
  return index<0?'':source.slice(index,index+length);
}

test('deployed Grafik Isleri revenue layer reuses the existing seven-day card',async()=>{
  const [wrangler,revenueEntry]=await Promise.all([
    readProjectFile('wrangler.jsonc'),
    readProjectFile('src/graphic_weekly_revenue_entry.js')
  ]);

  const deployedEntry=wrangler.match(/"main"\s*:\s*"([^"]+)"/)?.[1];
  assert.equal(deployedEntry,'src/graphic_weekly_revenue_entry.js');
  assert.match(revenueEntry,/import worker from '\.\/graphic_calendar_security_entry\.js'/);
  assert.match(revenueEntry,/#graphicPeriodTotals/);
  assert.doesNotMatch(revenueEntry,/graphicWeeklyRevenue/);
  assert.doesNotMatch(revenueEntry,/renderWeeklyRevenue/);
  assert.doesNotMatch(revenueEntry,/created_from=/);
  assert.doesNotMatch(revenueEntry,/fetch\(['"`]/);
});

test('revenue totals are admin-only while Cagatay keeps the price input',async()=>{
  const [revenueEntry,securityEntry,publicPage,safeRoot]=await Promise.all([
    readProjectFile('src/graphic_weekly_revenue_entry.js'),
    readProjectFile('src/graphic_calendar_security_entry.js'),
    readProjectFile('public/index.html'),
    readProjectFile('src/crm_safe_root_page.js')
  ]);

  assert.ok(
    cssRuleHides(revenueEntry,/body:not\(\.crm-role-admin\)[^,{]*\.graphic-daily-total/),
    'BUGUN CIRO must be hidden for non-admin roles'
  );
  assert.ok(
    cssRuleHides(revenueEntry,/body:not\(\.crm-role-admin\)[^,{]*#graphicPeriodTotals/),
    '7 GUNLUK CIRO must be hidden for non-admin roles'
  );

  for(const role of ['admin','graphic','tracking']){
    assert.match(
      securityEntry,
      new RegExp(`classList\\.toggle\\('crm-role-${role}',role==='${role}'\\)`)
    );
  }
  assert.equal(
    cssRuleHides(securityEntry,/body:not\(\.crm-role-admin\)\s+#g_price/),
    false,
    'generic non-admin styling must not hide Cagatay price entry'
  );
  assert.ok(
    cssRuleHides(securityEntry,/body\.crm-role-tracking\s+#g_price/),
    'only the tracking/Recep role should hide the price entry'
  );

  const injectedSync=contextAfter(securityEntry,'applyAccess');
  const publicApplyAccess=contextAfter(publicPage,'function applyAccess(role)');
  const bundledApplyAccess=contextAfter(safeRoot,'function applyAccess(role)');
  const syncsAfterLogin=/setRole\(role\)/.test(injectedSync)||
    [publicApplyAccess,bundledApplyAccess].some(source=>
      /crm-role-admin/.test(source)&&/crm-role-graphic/.test(source)&&/crm-role-tracking/.test(source)
    );
  assert.ok(syncsAfterLogin,'role classes must be synchronized when applyAccess runs after login');
});

test('direct graphic revenue summary is bounded to the trailing seven days',async()=>{
  const entry=await readProjectFile('src/portfolio_company_link_entry.js');
  const start=entry.indexOf("url.pathname==='/api/graphic-jobs-summary'");
  const end=entry.indexOf("url.pathname==='/api/portfolio-health'",start);
  assert.notEqual(start,-1,'direct graphic summary route must exist');
  assert.notEqual(end,-1,'direct graphic summary route must have a bounded source block');
  const summaryRoute=entry.slice(start,end);

  assert.match(summaryRoute,/WHERE\s+work_date\s*>=\s*\?\s+AND\s+work_date\s*<=\s*\?/i);
  assert.match(summaryRoute,/\.bind\(\s*from\s*,\s*to\s*\)/);
  assert.ok(
    /Date\.now\(\)\s*-\s*6\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(summaryRoute)||
      /setDate\([^)]*-\s*6\s*\)/.test(summaryRoute),
    'summary range must start six days before its end date'
  );
});
