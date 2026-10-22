import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {CLEAN_PORTFOLIO_HTML as html} from '../src/portfolio_clean_page.js';
const script=readFileSync(new URL('../public/portfolio-views.js',import.meta.url),'utf8');
function element(){const classes=new Set();return {dataset:{},style:{},innerHTML:'',events:{},classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k)},contains:k=>classes.has(k)},addEventListener(k,fn){this.events[k]=fn},querySelectorAll:()=>[]};}
function setup(){
 const nodes={},buttons=['list','analysis','map','timeline'].map(view=>Object.assign(element(),{dataset:{view}}));
 const table=element(),pager=element(),card=element();card.querySelector=s=>s==='table'?table:pager;card.appendChild=e=>{nodes[e.id]=e};
 nodes.rows=element();nodes.rowCount=element();nodes.city={value:''};nodes.district={value:''};
 const doc={readyState:'complete',head:{appendChild:e=>{nodes[e.id]=e}},getElementById:id=>nodes[id]||null,createElement:element,querySelector:s=>s==='.workspace .table-card'?card:null,querySelectorAll:s=>s==='.views .viewbtn'?buttons:[]};
 const observers=[];
 const ctx={document:doc,window:{},console,requestAnimationFrame:f=>f(),MutationObserver:class{constructor(fn){observers.push(fn)}observe(){}},visibleRows:[{id:1,company:'Anolsan',city:'Ankara',district:'Yenimahalle',neighborhood:'İvedikköy',priority:'KRİTİK',follow_date:'2026-10-23'}],meetings:[{customer_id:1,meeting_date:'2026-10-22',note:'İlk görüşme',result:'Beklemede'}],customerLocation:c=>c};
 vm.createContext(ctx);vm.runInContext(script,ctx);return {ctx,nodes,buttons,table,pager,observers,click(i){buttons[i].events.click({preventDefault(){},stopPropagation(){}})}};
}
test('live page loads view controller and removes card view',()=>{assert.match(html,/src="\/portfolio-views\.js\?v=20261022-views2"/);assert.doesNotMatch(html,/Kart Görünümü/);new vm.Script(script)});
test('analysis, map and timeline buttons render filtered data; list restores the table',()=>{
 const s=setup();s.click(1);assert.match(s.nodes.portfolioAltView.innerHTML,/Ankara|Toplam Firma/);assert.equal(s.table.style.display,'none');
 s.nodes.city.value='Ankara';s.nodes.district.value='Yenimahalle';s.click(2);assert.match(s.nodes.portfolioAltView.innerHTML,/Ankara \/ Yenimahalle \/ İvedikköy/);assert.match(s.nodes.portfolioAltView.innerHTML,/google.com\/maps\/search/);
 s.click(3);assert.match(s.nodes.portfolioAltView.innerHTML,/İlk görüşme/);assert.match(s.nodes.portfolioAltView.innerHTML,/2026-10-23/);
 s.ctx.visibleRows=[];s.observers[0]();assert.match(s.nodes.portfolioAltView.innerHTML,/gösterilecek görüşme veya takip tarihi yok/);
 s.click(0);assert.equal(s.table.style.display,'');assert.equal(s.pager.style.display,'');assert.equal(s.nodes.portfolioAltView.classList.contains('show'),false);
});
test('location columns reveal district after province and neighborhood after district; clear hides both',()=>{
 const fn=html.match(/function syncLocationColumns\(\)\{[^\n]+/)[0];const state=element(),values={city:{value:''},district:{value:''}};
 const ctx={document:{body:state},$:id=>values[id]};vm.createContext(ctx);vm.runInContext(fn,ctx);
 ctx.syncLocationColumns();assert.equal(state.classList.contains('show-location-district'),false);
 values.city.value='Ankara';ctx.syncLocationColumns();assert.equal(state.classList.contains('show-location-district'),true);assert.equal(state.classList.contains('show-location-neighborhood'),false);
 values.district.value='Yenimahalle';ctx.syncLocationColumns();assert.equal(state.classList.contains('show-location-neighborhood'),true);
 values.city.value='';ctx.syncLocationColumns();assert.equal(state.classList.contains('show-location-district'),false);assert.equal(state.classList.contains('show-location-neighborhood'),false);
});
