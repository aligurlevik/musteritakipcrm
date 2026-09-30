import worker from './phone_reminders_entry.js';

function rebuildHtml(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

const FORCED_VIEWS_SCRIPT = String.raw`
(function(){
  'use strict';
  var version='20260930-1555';
  function q(sel){return document.querySelector(sel)}
  function qa(sel){return Array.prototype.slice.call(document.querySelectorAll(sel))}
  function esc2(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function getRows(){try{return Array.isArray(visibleRows)?visibleRows:[]}catch(_){return []}}
  function getMeetings(){try{return Array.isArray(meetings)?meetings:[]}catch(_){return []}}
  function resultText(c){var s=String(c&&c.stage||'').toLocaleLowerCase('tr');if(s.indexOf('kazan')>=0)return'Olumlu';if(s.indexOf('kaybed')>=0||String(c&&c.record_status||'')==='Pasif')return'Olumsuz';if(s.indexOf('bekle')>=0)return'Beklemede';return'Sonuçlanmamış'}
  function potentialText(c){var p=String(c&&c.priority||'NORMAL').toUpperCase();return p==='KRİTİK'?'Yüksek':p==='YÜKSEK'?'Orta':'Düşük'}
  function contactText(c){return String(c&&c.contact_name||'').trim()||'—'}
  function phoneText(c){var x=String(c&&c.phone||'').trim();if(x)return x;try{var a=JSON.parse(c&&c.phones_json||'[]');return Array.isArray(a)&&a[0]?String(a[0]):'—'}catch(_){return'—'}}
  function mailText(c){var x=String(c&&c.email||'').trim();if(x)return x;try{var a=JSON.parse(c&&c.emails_json||'[]');return Array.isArray(a)&&a[0]?String(a[0]):'—'}catch(_){return'—'}}
  function areaText(c){return String(c&&c.categories||c&&c.sector||'—')}
  function host(){
    var card=q('.workspace .table-card');
    if(!card)return null;
    var alt=document.getElementById('portfolioAltViewForced');
    if(!alt){alt=document.createElement('div');alt.id='portfolioAltViewForced';alt.style.cssText='display:none;min-height:620px;padding:16px;background:#fff';card.appendChild(alt)}
    return {card:card,alt:alt,table:card.querySelector('table'),pager:card.querySelector('.pager')};
  }
  function ensureStyle(){
    if(document.getElementById('portfolioViewsForcedStyle'))return;
    var s=document.createElement('style');s.id='portfolioViewsForcedStyle';s.textContent='\n#portfolioAltViewForced h2{margin:0 0 14px;font-size:20px;color:#0f172a}.pvf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.pvf-card,.pvf-box{border:1px solid #dce5ef;border-radius:12px;background:#fff;padding:13px}.pvf-card{cursor:pointer}.pvf-card b{color:#1769f6;font-size:14px}.pvf-mini{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.pvf-mini div{background:#f8fafc;border:1px solid #edf1f6;border-radius:8px;padding:8px;font-size:11px}.pvf-label{display:block;color:#64748b;font-size:9px;font-weight:800;margin-bottom:3px}.pvf-analysis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}.pvf-stat{border:1px solid #dce5ef;border-radius:10px;padding:12px;background:#f8fafc}.pvf-stat strong{display:block;font-size:24px}.pvf-list{display:grid;gap:8px}.pvf-row{border:1px solid #dce5ef;border-radius:9px;padding:10px;background:#f8fafc;font-size:11px}.pvf-titleline{display:flex;justify-content:space-between;gap:10px;font-weight:800}.pvf-muted{color:#64748b;font-size:10px;margin-top:4px}@media(max-width:900px){.pvf-analysis{grid-template-columns:1fr 1fr}}';document.head.appendChild(s);
  }
  function setActive(index){qa('.views .viewbtn').forEach(function(b,i){b.classList.toggle('active',i===index);b.setAttribute('data-force-view',String(i))})}
  function cardsHtml(rows){
    if(!rows.length)return '<h2>▣ Kart Görünümü</h2><div class="pvf-box">Gösterilecek müşteri yok.</div>';
    return '<h2>▣ Kart Görünümü</h2><div class="pvf-grid">'+rows.map(function(c){return '<div class="pvf-card" data-customer-id="'+Number(c.id)+'"><b>'+esc2(c.company||'Müşteri')+'</b><div class="pvf-mini"><div><span class="pvf-label">Yetkili</span>'+esc2(contactText(c))+'</div><div><span class="pvf-label">Telefon</span>'+esc2(phoneText(c))+'</div><div><span class="pvf-label">E-posta</span>'+esc2(mailText(c))+'</div><div><span class="pvf-label">Potansiyel</span>'+esc2(potentialText(c))+'</div><div><span class="pvf-label">Sonuç</span>'+esc2(resultText(c))+'</div><div><span class="pvf-label">Aşama</span>'+esc2(c.stage||'—')+'</div><div style="grid-column:1/-1"><span class="pvf-label">İş Alanı</span>'+esc2(areaText(c))+'</div></div></div>'}).join('')+'</div>';
  }
  function countBy(rows,getter){var m={};rows.forEach(function(c){var k=String(getter(c)||'Belirtilmemiş').trim()||'Belirtilmemiş';m[k]=(m[k]||0)+1});return Object.keys(m).sort(function(a,b){return m[b]-m[a]}).map(function(k){return [k,m[k]]})}
  function analysisHtml(rows){
    var high=rows.filter(function(c){return potentialText(c)==='Yüksek'}).length;
    var positive=rows.filter(function(c){return resultText(c)==='Olumlu'}).length;
    var overdue=rows.filter(function(c){var d=String(c.follow_date||'');return d&&d<new Date().toISOString().slice(0,10)&&resultText(c)!=='Olumlu'&&resultText(c)!=='Olumsuz'}).length;
    function block(title,items){return '<div class="pvf-box"><b>'+esc2(title)+'</b><div class="pvf-list" style="margin-top:8px">'+items.map(function(x){return '<div class="pvf-row"><span>'+esc2(x[0])+'</span><b style="float:right">'+x[1]+'</b></div>'}).join('')+'</div></div>'}
    return '<h2>⌁ Analiz</h2><div class="pvf-analysis"><div class="pvf-stat"><strong>'+rows.length+'</strong>Toplam Firma</div><div class="pvf-stat"><strong>'+high+'</strong>Yüksek Potansiyel</div><div class="pvf-stat"><strong>'+positive+'</strong>Olumlu</div><div class="pvf-stat"><strong>'+overdue+'</strong>Süresi Geçen</div></div><div class="pvf-grid">'+block('Potansiyel',countBy(rows,potentialText))+block('Sonuç',countBy(rows,resultText))+block('İş Alanı',countBy(rows,areaText))+block('İl / Bölge',countBy(rows,function(c){return c.region||'Belirtilmemiş'}))+'</div>';
  }
  function mapHtml(rows){
    var groups=countBy(rows,function(c){return c.region||'Belirtilmemiş'});
    return '<h2>⌖ Harita</h2><div class="pvf-grid">'+groups.map(function(g){var region=g[0],firms=rows.filter(function(c){return String(c.region||'Belirtilmemiş')===region}).map(function(c){return c.company||'Müşteri'});return '<div class="pvf-box"><div class="pvf-titleline"><span>'+esc2(region)+'</span><span>'+g[1]+' firma</span></div><div class="pvf-muted">'+firms.map(esc2).join('<br>')+'</div></div>'}).join('')+'</div>';
  }
  function timelineHtml(rows){
    var allowed={};rows.forEach(function(c){allowed[Number(c.id)]=c});var events=[];
    rows.forEach(function(c){if(c.follow_date)events.push({date:String(c.follow_date).slice(0,10),company:c.company||'Müşteri',text:'Sonraki işlem · '+resultText(c),id:c.id})});
    getMeetings().forEach(function(m){var c=allowed[Number(m.customer_id)];if(!c)return;var d=String(m.meeting_date||m.created_at||'').slice(0,10);if(d)events.push({date:d,company:c.company||'Müşteri',text:'Görüşme · '+String(m.result||'Beklemede')+(m.note?' · '+m.note:''),id:m.customer_id})});
    events.sort(function(a,b){return b.date.localeCompare(a.date)});
    return '<h2>◷ Zaman Çizelgesi</h2><div class="pvf-list">'+(events.length?events.map(function(e){return '<div class="pvf-row" data-customer-id="'+Number(e.id)+'"><div class="pvf-titleline"><span>'+esc2(e.company)+'</span><span>'+esc2(e.date)+'</span></div><div class="pvf-muted">'+esc2(e.text)+'</div></div>'}).join(''):'<div class="pvf-box">Gösterilecek tarih kaydı yok.</div>')+'</div>';
  }
  function show(index){
    var h=host();if(!h)return;ensureStyle();setActive(index);var list=index===0;
    if(h.table)h.table.style.display=list?'':'none';if(h.pager)h.pager.style.display=list?'':'none';h.alt.style.display=list?'none':'block';
    if(list)return;var rows=getRows();if(index===1)h.alt.innerHTML=cardsHtml(rows);else if(index===2)h.alt.innerHTML=analysisHtml(rows);else if(index===3)h.alt.innerHTML=mapHtml(rows);else h.alt.innerHTML=timelineHtml(rows);
  }
  document.addEventListener('click',function(ev){
    var b=ev.target&&ev.target.closest?ev.target.closest('.views .viewbtn'):null;if(!b)return;
    var buttons=qa('.views .viewbtn'),index=buttons.indexOf(b);if(index<0)return;
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();show(index);
  },true);
  document.addEventListener('click',function(ev){var x=ev.target&&ev.target.closest?ev.target.closest('#portfolioAltViewForced [data-customer-id]'):null;if(!x)return;try{if(typeof selectCustomer==='function')selectCustomer(Number(x.getAttribute('data-customer-id')))}catch(_){}});
  window.__portfolioViewControlsVersion=version;
})();
`;

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==='GET'&&['/portfolio-inline-editor.js','/portfolio-views.js'].includes(url.pathname)){
      const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }

    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      if(!html.includes('/portfolio-inline-editor.js'))html=html.replace(/<\/body>/i,'<script src="/portfolio-inline-editor.js?v=20260930-1518"></script>\n</body>');
      html=html.replace(/<script[^>]*data-portfolio-views[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<script\s+src=["']\/portfolio-views\.js[^>]*><\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-portfolio-views-forced="20260930-1555">\n${FORCED_VIEWS_SCRIPT}\n</script>\n</body>`);
      return rebuildHtml(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};