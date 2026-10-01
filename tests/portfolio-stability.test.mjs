import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

async function text(path){return String(await readFile(path,'utf8'))}

test('portföy müşteri ve görüşme okumaları doğrudan D1 üzerinden korunur',async()=>{
  const source=await text('src/portfolio_data_guard_entry.js');
  assert.match(source,/x-crm-portfolio-guard':'direct-d1-v2/);
  assert.match(source,/if\(isCustomerList\)return json\(await directCustomers\(url,env\)\)/);
  assert.match(source,/if\(isMeetings\)return json\(await directMeetings\(url,env\)\)/);
  assert.match(source,/const data=await directHistory/);
  assert.match(source,/await restorePortfolioCustomers\(env\)/);
});

test('restore resolved promise kalıcı cache olarak tutulmaz',async()=>{
  const source=await text('src/restore_portfolio_customers.js');
  assert.match(source,/finally\{\s*restorePromise=null;\s*\}/s);
  assert.match(source,/COUNT\(DISTINCT company\)/);
});

test('müşteri kartı sekmelerinin yalnızca tek merkezi controllerı yüklenir',async()=>{
  const bridge=await text('src/sales_care_bridge_entry.js');
  assert.match(bridge,/data-customer-card-tabs-controller/);
  assert.match(bridge,/customer-card-tabs-controller\.js/);
  assert.match(bridge,/data-portfolio-section-layout/);
  assert.match(bridge,/data-sales-meetings-merge/);
  assert.match(bridge,/data-customer-mail-tab-fix/);
  assert.match(bridge,/data-portfolio-tab-hotfix/);
  assert.match(bridge,/data-portfolio-blank-recovery/);
});

test('portföy runtime müşterileri tek yardımcı endpoint hatasında sıfıra düşürmez',async()=>{
  const runtime=await text('public/portfolio-runtime-stability.js');
  assert.match(runtime,/loadCustomersWithRetry/);
  assert.match(runtime,/loadMeetingsSafe/);
  assert.match(runtime,/previousCustomers\.length/);
  assert.match(runtime,/mevcut müşteri listeniz korunuyor/);
});

test('root tab controller beklenen altı sekmeyi tek noktadan yönetir',async()=>{
  const tabs=await text('public/customer-card-tabs-controller.js');
  for(const label of ['Genel','Satış & Görüşmeler','Yapılacaklar','Teknik & Notlar','Teklifler','Mail'])assert.match(tabs,new RegExp(label.replace('&','\\&')));
  assert.match(tabs,/crm-root-tabbar/);
  assert.match(tabs,/function activate\(editor,sections,index\)/);
});
