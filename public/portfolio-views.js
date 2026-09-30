(function(){
  'use strict';

  let currentView='list';
  let renderQueued=false;

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const parseArray=value=>{try{const x=Array.isArray(value)?value:JSON.parse(value||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
  const todayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

  function dataRows(){
    try{return Array.isArray(visibleRows)?visibleRows:[]}catch(_){return []}
  }
  function meetingRows(){
    try{return Array.isArray(meetings)?meetings:[]}catch(_){return []}
  }
  function priorityText(c){
    const p=String(c?.priority||'NORMAL').toUpperCase();
    return p==='KRİTİK'?'Yüksek':p==='YÜKSEK'?'Orta':'Düşük';
  }
  function resultText(c){
    const stage=String(c?.stage||'').toLocaleLowerCase('tr');
    if(stage.includes('kazan'))return 'Olumlu';
    if(stage.includes('kaybed')||String(c?.record_status||'')==='Pasif')return 'Olumsuz';
    if(stage.includes('bekle'))return 'Beklemede';
    return 'Sonuçlanmamış';
  }
  function contactText(c){
    const direct=String(c?.contact_name||'').trim();
    if(direct)return direct.split(/\r?\n/)[0];
    const contacts=parseArray(c?.contacts_json);
    return String(contacts[0]?.name||'').trim()||'—';
  }
  function phoneText(c){return String(c?.phone||parseArray(c?.phones_json)[0]||'').trim()||'—'}
  function mailText(c){return String(c?.email||parseArray(c?.emails_json)[0]||'').trim()||'—'}
  function sectorText(c){return String(c?.categories||c?.sector||'').trim()||'—'}
  function statusClass(date){
    if(!date)return '';
    const t=todayKey();
    if(date<t)return 'over';
    if(date===t)return 'today';
    return 'future';
  }

  function addStyles(){
    if(document.getElementById('portfolioViewsStyle'))return;
    const style=document.createElement('style');
    style.id='portfolioViewsStyle';
    style.textContent=`
      #portfolioAltView{display:none;min-height:620px;padding:14px;background:#fff}
      #portfolioAltView.show{display:block}
      .pv-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}
      .pv-title h2{margin:0;font-size:18px;color:#0f172a}.pv-title span{font-size:11px;color:#64748b}
      .pv-empty{padding:48px 20px;text-align:center;color:#64748b;font-weight:700}
      .pv-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:12px}
      .pv-customer-card{border:1px solid #dce5ef;border-radius:12px;padding:13px;background:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(15,23,42,.04);transition:.15s ease}
      .pv-customer-card:hover{transform:translateY(-1px);border-color:#9ec1ff;box-shadow:0 7px 18px rgba(23,105,246,.10)}
      .pv-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px}.pv-company{font-size:14px;font-weight:900;color:#1769f6}
      .pv-pill{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:10px;font-weight:900;background:#eef4ff;color:#315ed2;white-space:nowrap}.pv-pill.high{background:#ffe4e6;color:#be123c}.pv-pill.mid{background:#fff1cf;color:#a16207}.pv-pill.low{background:#dcfce7;color:#15803d}
      .pv-card-info{display:grid;grid-template-columns:1fr 1fr;gap:7px}.pv-info{border:1px solid #edf1f6;border-radius:8px;padding:8px;background:#f8fafc;min-width:0}.pv-info.wide{grid-column:1/-1}.pv-label{font-size:9px;font-weight:900;color:#64748b;margin-bottom:3px;text-transform:uppercase;letter-spacing:.2px}.pv-value{font-size:11px;font-weight:800;color:#172033;overflow-wrap:anywhere}
      .pv-analysis-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.pv-stat{border:1px solid #dce5ef;border-radius:11px;padding:12px;background:#f8fafc}.pv-stat b{display:block;font-size:24px;line-height:1;color:#0f172a;margin-bottom:5px}.pv-stat span{font-size:10px;font-weight:800;color:#64748b}
      .pv-panels{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pv-panel{border:1px solid #dce5ef;border-radius:12px;padding:13px;background:#fff}.pv-panel h3{font-size:13px;margin:0 0 10px;color:#172033}.pv-bar-row{display:grid;grid-template-columns:minmax(90px,1fr) 2fr 42px;gap:8px;align-items:center;margin:8px 0}.pv-bar-name{font-size:10px;font-weight:800;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pv-bar{height:9px;background:#eef2f7;border-radius:999px;overflow:hidden}.pv-bar>i{display:block;height:100%;background:#1769f6;border-radius:999px}.pv-bar-num{text-align:right;font-size:10px;font-weight:900;color:#334155}
      .pv-region-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.pv-region{border:1px solid #dce5ef;border-radius:11px;padding:12px;background:#f8fafc}.pv-region-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.pv-region-head b{font-size:13px}.pv-region-head span{font-size:18px;font-weight:900;color:#1769f6}.pv-region-firms{font-size:10px;color:#475569;line-height:1.55}.pv-map-link{display:inline-block;margin-top:8px;font-size:10px;font-weight:900;color:#1769f6;text-decoration:none}
      .pv-timeline{position:relative;padding-left:22px}.pv-timeline:before{content:"";position:absolute;left:7px;top:4px;bottom:4px;width:2px;background:#dce5ef}.pv-event{position:relative;border:1px solid #dce5ef;border-radius:10px;padding:10px 12px;margin:0 0 10px;background:#fff;cursor:pointer}.pv-event:before{content:"";position:absolute;left:-20px;top:15px;width:10px;height:10px;border-radius:50%;background:#1769f6;border:2px solid #fff;box-shadow:0 0 0 1px #1769f6}.pv-event.over:before{background:#ef4444;box-shadow:0 0 0 1px #ef4444}.pv-event.today:before{background:#f59e0b;box-shadow:0 0 0 1px #f59e0b}.pv-event.meeting:before{background:#16a34a;box-shadow:0 0 0 1px #16a34a}.pv-event-top{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:4px}.pv-event-top b{font-size:12px;color:#172033}.pv-event-date{font-size:10px;font-weight:900;color:#64748b}.pv-event-text{font-size:10px;color:#475569;line-height:1.5}
      @media(max-width:1000px){.pv-analysis-grid{grid-template-columns:1fr 1fr}.pv-panels{grid-template-columns:1fr}}@media(max-width:650px){.pv-card-grid,.pv-region-grid{grid-template-columns:1fr}.pv-analysis-grid{grid-template-columns:1fr 1fr}.pv-card-info{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function host(){
    const card=document.querySelector('.workspace .table-card');
    if(!card)return null;
    let alt=document.getElementById('portfolioAltView');
    if(!alt){alt=document.createElement('div');alt.id='portfolioAltView';card.appendChild(alt)}
    return {card,alt,table:card.querySelector('table'),pager:card.querySelector('.pager')};
  }

  function setButtons(view){
    const buttons=[...document.querySelectorAll('.views .viewbtn')],names=['list','cards','analysis','map','timeline'];
    buttons.forEach((button,index)=>{button.dataset.portfolioView=names[index]||'';button.classList.toggle('active',names[index]===view)});
  }
  function openCustomer(id){
    try{if(typeof window.selectCustomer==='function')window.selectCustomer(Number(id));else if(typeof selectCustomer==='function')selectCustomer(Number(id))}catch(error){console.error('Karttan müşteri açılamadı',error)}
  }

  function cardView(rows){
    if(!rows.length)return '<div class="pv-empty">Bu filtrelerde gösterilecek müşteri yok.</div>';
    return `<div class="pv-title"><h2>▣ Kart Görünümü</h2><span>${rows.length} firma</span></div><div class="pv-card-grid">${rows.map(c=>{const cls=String(c.priority||'NORMAL')==='KRİTİK'?'high':String(c.priority||'NORMAL')==='YÜKSEK'?'mid':'low';return `<article class="pv-customer-card" data-customer-id="${Number(c.id)}" tabindex="0"><div class="pv-card-head"><div class="pv-company">${esc(c.company||'Müşteri')}</div><span class="pv-pill ${cls}">${esc(priorityText(c))}</span></div><div class="pv-card-info"><div class="pv-info"><div class="pv-label">Yetkili</div><div class="pv-value">${esc(contactText(c))}</div></div><div class="pv-info"><div class="pv-label">Sonuç</div><div class="pv-value">${esc(resultText(c))}</div></div><div class="pv-info"><div class="pv-label">Telefon</div><div class="pv-value">${esc(phoneText(c))}</div></div><div class="pv-info"><div class="pv-label">E-posta</div><div class="pv-value">${esc(mailText(c))}</div></div><div class="pv-info wide"><div class="pv-label">İş Alanı</div><div class="pv-value">${esc(sectorText(c))}</div></div><div class="pv-info"><div class="pv-label">Aşama</div><div class="pv-value">${esc(c.stage||'—')}</div></div><div class="pv-info"><div class="pv-label">Sonraki İşlem</div><div class="pv-value">${esc(c.follow_date||'—')}</div></div></div></article>`}).join('')}</div>`;
  }

  function countBy(rows,getter){const map=new Map();rows.forEach(row=>{const key=String(getter(row)||'Belirtilmemiş').trim()||'Belirtilmemiş';map.set(key,(map.get(key)||0)+1});return [...map.entries()].sort((a,b)=>b[1]-a[1])}
  function barRows(entries,total){if(!entries.length)return '<div class="pv-empty" style="padding:18px 4px">Veri yok.</div>';return entries.map(([name,count])=>{const pct=total?Math.round(count*100/total):0;return `<div class="pv-bar-row"><div class="pv-bar-name" title="${esc(name)}">${esc(name)}</div><div class="pv-bar"><i style="width:${pct}%"></i></div><div class="pv-bar-num">${count}</div></div>`}).join('')}
  function analysisView(rows){
    const total=rows.length,positive=rows.filter(c=>resultText(c)==='Olumlu').length,overdue=rows.filter(c=>c.follow_date&&c.follow_date<todayKey()&&!['Olumlu','Olumsuz'].includes(resultText(c))).length,high=rows.filter(c=>priorityText(c)==='Yüksek').length;
    return `<div class="pv-title"><h2>⌁ Analiz</h2><span>Aktif filtrelerin özeti</span></div><div class="pv-analysis-grid"><div class="pv-stat"><b>${total}</b><span>Toplam Firma</span></div><div class="pv-stat"><b>${high}</b><span>Yüksek Potansiyel</span></div><div class="pv-stat"><b>${positive}</b><span>Olumlu Sonuç</span></div><div class="pv-stat"><b>${overdue}</b><span>Süresi Geçen Takip</span></div></div><div class="pv-panels"><section class="pv-panel"><h3>Potansiyel Dağılımı</h3>${barRows(countBy(rows,c=>priorityText(c)),total)}</section><section class="pv-panel"><h3>Sonuç Dağılımı</h3>${barRows(countBy(rows,c=>resultText(c)),total)}</section><section class="pv-panel"><h3>İş Alanları</h3>${barRows(countBy(rows,c=>sectorText(c)).slice(0,8),total)}</section><section class="pv-panel"><h3>İl / Bölge Dağılımı</h3>${barRows(countBy(rows,c=>c.region||'Belirtilmemiş').slice(0,8),total)}</section></div>`;
  }

  function mapView(rows){
    const regions=countBy(rows,c=>c.region||'Belirtilmemiş');if(!regions.length)return '<div class="pv-empty">Haritada gösterilecek İl / Bölge bilgisi yok.</div>';
    const byRegion=new Map();rows.forEach(c=>{const region=String(c.region||'Belirtilmemiş').trim()||'Belirtilmemiş';if(!byRegion.has(region))byRegion.set(region,[]);byRegion.get(region).push(c.company||'Müşteri')});
    return `<div class="pv-title"><h2>⌖ Harita</h2><span>İl / Bölge alanlarına göre müşteri dağılımı</span></div><div class="pv-region-grid">${regions.map(([region,count])=>{const firms=(byRegion.get(region)||[]).slice(0,6),more=count-firms.length,link=region==='Belirtilmemiş'?'':`<a class="pv-map-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(region+', Türkiye')}">Haritada aç ↗</a>`;return `<section class="pv-region"><div class="pv-region-head"><b>${esc(region)}</b><span>${count}</span></div><div class="pv-region-firms">${firms.map(esc).join('<br>')}${more>0?`<br>+ ${more} firma daha`:''}</div>${link}</section>`}).join('')}</div>`;
  }

  function timelineView(rows){
    const allowed=new Set(rows.map(c=>Number(c.id))),events=[];
    rows.forEach(c=>{if(c.follow_date)events.push({date:String(c.follow_date).slice(0,10),kind:'follow',company:c.company||'Müşteri',text:`Sonraki işlem · ${resultText(c)} · ${priorityText(c)} potansiyel`,id:c.id})});
    meetingRows().forEach(m=>{if(!allowed.has(Number(m.customer_id)))return;const customer=rows.find(c=>Number(c.id)===Number(m.customer_id)),date=String(m.meeting_date||m.created_at||'').slice(0,10);if(date)events.push({date,kind:'meeting',company:customer?.company||'Müşteri',text:`Görüşme · ${m.result||'Beklemede'}${m.note?' · '+m.note:''}`,id:m.customer_id})});
    events.sort((a,b)=>b.date.localeCompare(a.date)||String(a.company).localeCompare(String(b.company),'tr'));if(!events.length)return '<div class="pv-empty">Zaman çizelgesinde gösterilecek görüşme veya takip tarihi yok.</div>';
    return `<div class="pv-title"><h2>◷ Zaman Çizelgesi</h2><span>${events.length} kayıt</span></div><div class="pv-timeline">${events.map(event=>`<article class="pv-event ${event.kind==='meeting'?'meeting':statusClass(event.date)}" data-customer-id="${Number(event.id)}"><div class="pv-event-top"><b>${esc(event.company)}</b><span class="pv-event-date">${esc(event.date)}</span></div><div class="pv-event-text">${esc(event.text)}</div></article>`).join('')}</div>`;
  }

  function renderCurrent(){
    renderQueued=false;if(currentView==='list')return;const h=host();if(!h)return;const rows=dataRows();
    if(currentView==='cards')h.alt.innerHTML=cardView(rows);else if(currentView==='analysis')h.alt.innerHTML=analysisView(rows);else if(currentView==='map')h.alt.innerHTML=mapView(rows);else if(currentView==='timeline')h.alt.innerHTML=timelineView(rows);
    h.alt.querySelectorAll('[data-customer-id]').forEach(el=>{el.addEventListener('click',()=>openCustomer(el.dataset.customerId));el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openCustomer(el.dataset.customerId)}})});
  }
  function queueRender(){if(renderQueued||currentView==='list')return;renderQueued=true;requestAnimationFrame(renderCurrent)}
  function showView(view){const h=host();if(!h)return;currentView=view;setButtons(view);const list=view==='list';if(h.table)h.table.style.display=list?'':'none';if(h.pager)h.pager.style.display=list?'':'none';h.alt.classList.toggle('show',!list);if(!list)renderCurrent()}

  function install(){
    addStyles();const buttons=[...document.querySelectorAll('.views .viewbtn')];if(buttons.length<2){setTimeout(install,250);return}const names=['list','cards','analysis','map','timeline'];
    buttons.forEach((button,index)=>{if(button.dataset.pvBound==='1')return;button.dataset.pvBound='1';button.type='button';button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();showView(names[index]||'list')})});setButtons(currentView);
    const body=document.getElementById('rows');if(body&&!body.dataset.pvObserved){body.dataset.pvObserved='1';new MutationObserver(queueRender).observe(body,{childList:true,subtree:false})}
    const count=document.getElementById('rowCount');if(count&&!count.dataset.pvObserved){count.dataset.pvObserved='1';new MutationObserver(queueRender).observe(count,{childList:true,characterData:true,subtree:true})}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();