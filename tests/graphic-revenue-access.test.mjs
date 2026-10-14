import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

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

test('deployed Grafik Isleri revenue layer shows the monthly card beside the daily card',async()=>{
  const [wrangler,revenueEntry]=await Promise.all([
    readProjectFile('wrangler.jsonc'),
    readProjectFile('src/graphic_weekly_revenue_entry.js')
  ]);

  const deployedEntry=wrangler.match(/"main"\s*:\s*"([^"]+)"/)?.[1];
  assert.equal(deployedEntry,'src/graphic_weekly_revenue_entry.js');
  assert.match(revenueEntry,/import worker from '\.\/graphic_calendar_security_entry\.js'/);
  assert.match(revenueEntry,/#graphicMonthlyRevenue\{display:flex!important/);
  assert.ok(cssRuleHides(revenueEntry,/#graphicTurnoverPanel>#graphicPeriodTotals/));
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
    'legacy seven-day totals must be hidden for non-admin roles'
  );

  assert.ok(cssRuleHides(revenueEntry,/body:not\(\.crm-role-admin\)[^,{]*#graphicMonthlyRevenue/),'monthly revenue must be hidden for non-admin roles');

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


test('monthly revenue includes the final day, follows the selected month and clears on logout',async()=>{
  const entry=await readProjectFile('src/graphic_calendar_security_entry.js');
  const source=entry.slice(entry.indexOf('let monthlyTimer'),entry.indexOf('function mountMiniCalendar'));
  let admin=true,selected='2026-10-14',box,requested=[];
  const host={appendChild(node){box=node;node.isConnected=true}};
  const context=vm.createContext({
    document:{
      body:{classList:{contains:()=>admin}},
      getElementById(id){return id==='g_date'?{value:selected}:id==='graphicMonthlyRevenue'?box:id==='graphicTurnoverPanel'?host:null},
      createElement(){return {remove(){box=undefined}}}
    },
    fetch:async url=>{requested.push(url);return {ok:true,json:async()=>[{price:850},{price:1700}]}},
    console,Date,setTimeout,clearTimeout
  });
  await vm.runInContext(''+source+';renderMonthlyRevenue()',context);
  assert.match(requested[0],/created_from=2026-10-01&created_to=2026-10-31/);
  assert.match(box.textContent,/EKİM 2026: 2.550 TL • 2 iş/);
  selected='2026-02-14';
  await vm.runInContext('renderMonthlyRevenue()',context);
  assert.match(requested[1],/created_from=2026-02-01&created_to=2026-02-28/);
  assert.match(box.textContent,/ŞUBAT 2026/);
  admin=false;
  await vm.runInContext('renderMonthlyRevenue()',context);
  assert.equal(box,undefined);
  assert.equal(requested.length,2);
});
