import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {CRM_SAFE_ROOT_HTML as root} from '../src/crm_safe_root_page.js';
import {CLEAN_PORTFOLIO_HTML as portfolio} from '../src/portfolio_clean_page.js';

test('new customer saves once and refreshes the unified portfolio instead of the old customer table',async()=>{
 const script=root.match(/async function saveCustomer\(\)\{[\s\S]*?\n\}\n/)[0];
 const values={c_company:'ANOLSAN',c_id:'',c_emails:'',c_first_meeting_date:'2026-09-10'};
 const calls=[];
 const context={
  $:id=>({value:values[id]||''}),readCustomerContacts:()=>[],
  document:{querySelectorAll:()=>[]},customerNoteImageData:'',
  req:async(url,opts)=>{calls.push([url,opts]);return {id:9}},
  closeM:()=>{},showMsg:()=>{},localStorage:{removeItem:key=>calls.push(['clear',key])},
  activateCrmPage:async page=>calls.push(['page',page])
 };
 vm.createContext(context);vm.runInContext(script,context);await context.saveCustomer();
 assert.equal(calls[0][0],'/api/customers');assert.equal(calls[0][1].method,'POST');
 assert.equal(JSON.parse(calls[0][1].body).company,'ANOLSAN');
 assert.equal(JSON.parse(calls[0][1].body).first_meeting_date,'2026-09-10');
 assert.deepEqual(calls.at(-1),['page','portfolio']);
});
test('portfolio opens the customer form directly and the single menu retains portfolio features',()=>{
 assert.doesNotMatch(root,/<button data-page="customers"/);
 assert.match(root,/data-page="portfolio">Müşteriler \/ Portföy/);
 assert.match(portfolio,/window.parent.openCustomer\(\)/);
 assert.match(root,/frame.contentWindow.loadAll\(\)/);
 assert.match(portfolio,/Görüşmeler & Notlar/);
 for(const html of [root,portfolio])for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
});

test('dashboard menu is removed and old dashboard links open the shared customer portfolio',()=>{
 assert.doesNotMatch(root,/<button data-page="dash"/);
 assert.doesNotMatch(portfolio,/>⌂ Ana Ekran<\/a>/);
 const fn=root.match(/function requestedCrmPage\(\)\{[\s\S]*?\n\}/)[0];
 for(const [search,saved,expected] of [['?page=dash','dash','portfolio'],['','dash','notes'],['','','notes'],['?page=graphicJobs','','graphicJobs']]){
  const c={URLSearchParams,location:{search},sessionStorage:{getItem:()=>saved},CRM_PAGES:new Set(['dash','portfolio','graphicJobs'])};vm.createContext(c);vm.runInContext(fn,c);assert.equal(c.requestedCrmPage(),expected);
 }
});


test('first meeting date is editable and never filled from card creation; back controls are on the left',()=>{
 assert.match(root,/id="c_first_meeting_date" type="date"/);
 assert.match(portfolio,/id="dFirstMeetingDate" type="date"/);
 assert.match(portfolio,/selected.first_meeting_date\|\|''/);
 assert.doesNotMatch(root,/customerCreatedAt|Kart Açılış Tarihi|İlk Kayıt Tarihi/);
 assert.doesNotMatch(portfolio,/dCardCreatedAt|Kart Açılış Tarihi/);
 assert.match(portfolio,/<div class="detail-head"><button[^>]+onclick="closeCustomerDetail\(\)"[^>]*>← Liste/);
 assert.match(root,/left:20px;bottom:20px/);
});
