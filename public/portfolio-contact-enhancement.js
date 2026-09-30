(function(){
  'use strict';

  const BASE='/portfolio-contact-enhancement-base.js?v=20260930-1253';

  function loadBase(){
    const s=document.createElement('script');
    s.src=BASE;
    s.async=false;
    s.onload=boot;
    s.onerror=()=>console.error('Portföy temel scripti yüklenemedi.');
    document.head.appendChild(s);
  }

  const clean=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const parseArray=v=>{try{const x=Array.isArray(v)?v:JSON.parse(v||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
  const uniq=a=>[...new Set(a.map(clean).filter(Boolean))];

  function currentCustomer(){
    try{return typeof selected!=='undefined'?selected:null}catch(_){return null}
  }

  function history(){
    try{return typeof selectedHistory!=='undefined'&&selectedHistory?selectedHistory:{meetings:[],offers:[]}}catch(_){return {meetings:[],offers:[]}}
  }

  function priorityLabel(c){
    const p=clean(c?.priority||'NORMAL');
    return p==='KRİTİK'?'Yüksek':p==='YÜKSEK'?'Orta':'Düşük';
  }

  function resultLabelSafe(c){
    try{if(typeof resultLabel==='function')return resultLabel(c)}catch(_){}
    const stage=clean(c?.stage).toLocaleLowerCase('tr');
    if(stage.includes('kazan'))return 'Olumlu';
    if(stage.includes('kaybed'))return 'Olumsuz';
    if(stage.includes('bekle'))return 'Beklemede';
    return 'Sonuçlanmamış';
  }

  function allContacts(c){
    const direct=parseArray(c?.contacts_json).map(x=>({name:clean(x?.name),role:clean(x?.role),phone:clean(x?.phone),email:clean(x?.email)})).filter(x=>x.name||x.role||x.phone||x.email);
    if(direct.length)return direct;
    const names=clean(c?.contact_name).split(/\r?\n/).map(clean).filter(Boolean);
    const phones=parseArray(c?.phones_json).map(clean);
    const emails=parseArray(c?.emails_json).map(clean);
    const n=Math.max(names.length,phones.length,emails.length,c?.phone?1:0,c?.email?1:0);
    const out=[];
    for(let i=0;i<n;i++){
      const row={name:names[i]||'',role:'',phone:phones[i]||(!i?clean(c?.phone):''),email:emails[i]||(!i?clean(c?.email):'')};
      if(row.name||row.phone||row.email)out.push(row);
    }
    return out;
  }

  function addStyles(){
    if(document.getElementById('portfolioFullInfoStyle'))return;
    const st=document.createElement('style');
    st.id='portfolioFullInfoStyle';
    st.textContent=`
      .detail{max-height:calc(100vh - 24px)!important;overflow:auto!important}
      .portfolio-full-info{border:1px solid #cfdbea;border-radius:10px;background:#fff;margin:10px 0;padding:10px}
      .portfolio-full-title{font-size:12px;font-weight:900;color:#0f172a;margin-bottom:9px;display:flex;align-items:center;justify-content:space-between;gap:8px}
      .portfolio-section-title{font-size:10px;font-weight:900;color:#334155;margin:10px 0 6px;padding-top:8px;border-top:1px solid #e6edf5}
      .portfolio-section-title.first{margin-top:0;padding-top:0;border-top:0}
      .portfolio-full-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      .portfolio-full-item{border:1px solid #e1e8f0;border-radius:8px;padding:8px;background:#f8fafc;min-width:0}
      .portfolio-full-item.wide{grid-column:1/-1}
      .portfolio-full-label{font-size:9px;font-weight:900;color:#64748b;margin-bottom:3px}
      .portfolio-full-value{font-size:10px;font-weight:700;color:#172033;line-height:1.45;overflow-wrap:anywhere;white-space:pre-wrap}
      .portfolio-full-value a{color:#1769f6;text-decoration:none}
      .portfolio-full-empty{color:#94a3b8;font-weight:600}
      .portfolio-history{display:grid;gap:7px}
      .portfolio-history-row{border-left:3px solid #1769f6;background:#f8fafc;border-radius:7px;padding:8px 9px;font-size:10px;line-height:1.45}
      .portfolio-history-row.order{border-left-color:#16a34a;background:#f2fbf6}
      .portfolio-history-row.empty{border-left-color:#cbd5e1;color:#64748b}
      .portfolio-history-head{font-weight:900;color:#172033;margin-bottom:3px}
      @media(max-width:1200px){.portfolio-full-grid{grid-template-columns:1fr}.portfolio-full-item.wide{grid-column:auto}}
    `;
    document.head.appendChild(st);
  }

  function item(label,value,wide=false,html=false){
    const shown=clean(value);
    return `<div class="portfolio-full-item${wide?' wide':''}"><div class="portfolio-full-label">${esc(label)}</div><div class="portfolio-full-value${shown?'':' portfolio-full-empty'}">${shown?(html?value:esc(value)):'—'}</div></div>`;
  }

  function meetingRows(h){
    const rows=Array.isArray(h?.meetings)?h.meetings.slice():[];
    if(!rows.length)return '<div class="portfolio-history-row empty">Görüşme kaydı yok.</div>';
    rows.sort((a,b)=>String(b.meeting_date||b.created_at||'').localeCompare(String(a.meeting_date||a.created_at||'')));
    return rows.map(m=>{
      const date=clean(m.meeting_date||m.created_at).slice(0,10)||'Tarih yok';
      const result=clean(m.result)||'Beklemede';
      const note=clean(m.note)||'Not yok';
      return `<div class="portfolio-history-row"><div class="portfolio-history-head">${esc(date)} · ${esc(result)}</div><div>${esc(note)}</div></div>`;
    }).join('');
  }

  function offerRows(h){
    const rows=Array.isArray(h?.offers)?h.offers:[];
    if(!rows.length)return '<div class="portfolio-history-row empty">Teklif kaydı yok.</div>';
    return rows.map(o=>{
      const no=clean(o.offer_no)||'Teklif';
      const status=clean(o.status)||'Durum yok';
      const amount=Number(o.amount||0).toLocaleString('tr-TR');
      const currency=clean(o.currency)||'TRY';
      const note=clean(o.subject||o.note);
      return `<div class="portfolio-history-row"><div class="portfolio-history-head">${esc(no)} · ${esc(status)} · ${esc(amount)} ${esc(currency)}</div>${note?`<div>${esc(note)}</div>`:''}</div>`;
    }).join('');
  }

  function orderRow(c){
    const result=resultLabelSafe(c);
    if(result==='Olumlu')return '<div class="portfolio-history-row order"><div class="portfolio-history-head">Olumlu / kazanılmış müşteri</div><div>Sipariş takibi yapılabilir. Sipariş detayları varsa Siparişler sekmesinden izlenebilir.</div></div>';
    return '<div class="portfolio-history-row empty">Henüz olumlu sonuçlanmış sipariş görünmüyor.</div>';
  }

  function renderFullInfo(){
    const c=currentCustomer();
    const tab=document.getElementById('tabGeneral');
    if(!c||!tab)return;
    addStyles();

    let box=tab.querySelector('.portfolio-full-info');
    if(!box){
      box=document.createElement('section');
      box.className='portfolio-full-info';
      const summary=tab.querySelector('.summary4');
      if(summary)summary.insertAdjacentElement('afterend',box);else tab.prepend(box);
    }

    const contacts=allContacts(c);
    const phones=uniq([c.phone,...parseArray(c.phones_json),...contacts.map(x=>x.phone)]);
    const emails=uniq([c.email,...parseArray(c.emails_json),...contacts.map(x=>x.email)]);
    const people=contacts.map(x=>[x.name||'Yetkili',x.role].filter(Boolean).join(' — '));
    const h=history();
    const meetings=Array.isArray(h.meetings)?h.meetings:[];
    let lastMeeting='';
    if(meetings.length){
      const m=meetings.slice().sort((a,b)=>String(b.meeting_date||b.created_at||'').localeCompare(String(a.meeting_date||a.created_at||'')))[0];
      lastMeeting=clean(m?.meeting_date||m?.created_at).slice(0,10);
    }

    const phoneHtml=phones.map(p=>`<a href="tel:${esc(p)}">${esc(p)}</a>`).join('<br>');
    const mailHtml=emails.map(e=>`<a href="mailto:${esc(e)}">${esc(e)}</a>`).join('<br>');

    const contactFields=[
      item('Yetkili Kişiler',people.join('\n'),true),
      item('Telefonlar',phoneHtml,false,true),
      item('E-postalar',mailHtml,false,true)
    ].join('');

    const salesFields=[
      item('Potansiyel',priorityLabel(c)),
      item('Sonuç',resultLabelSafe(c)),
      item('Aşama',c.stage),
      item('İş Alanı',c.categories||c.sector),
      item('Sonraki İşlem',c.follow_date),
      item('Son Görüşme',lastMeeting),
      item('Görüşme Sayısı',String(meetings.length)),
      item('Teklif Sayısı',String(Array.isArray(h.offers)?h.offers.length:0)),
      item('Makine / Teknik Bilgi',c.machine_info,true),
      item('Müşteri Talepleri',c.customer_requests,true),
      item('Özel Notlar',c.special_notes,true)
    ].join('');

    box.innerHTML=`
      <div class="portfolio-full-title"><span>📋 ${esc(c.company||'Müşteri')}</span><span style="font-size:9px;color:#64748b">Satış özeti</span></div>
      <div class="portfolio-section-title first">İletişim</div>
      <div class="portfolio-full-grid">${contactFields}</div>
      <div class="portfolio-section-title">Potansiyel ve Takip</div>
      <div class="portfolio-full-grid">${salesFields}</div>
      <div class="portfolio-section-title">Görüşmeler ve Sonuçlar</div>
      <div class="portfolio-history">${meetingRows(h)}</div>
      <div class="portfolio-section-title">Teklifler</div>
      <div class="portfolio-history">${offerRows(h)}</div>
      <div class="portfolio-section-title">Siparişler</div>
      <div class="portfolio-history">${orderRow(c)}</div>`;
  }

  let lastKey='';
  function sync(){
    const c=currentCustomer();
    if(!c)return;
    const h=history();
    const key=[c.id,c.updated_at,c.follow_date,Array.isArray(h.meetings)?h.meetings.length:0,Array.isArray(h.offers)?h.offers.length:0].join('|');
    if(key!==lastKey){lastKey=key;renderFullInfo()}
  }

  function interceptCompanyClick(e){
    const company=e.target?.closest?.('.company');
    if(!company)return;
    const row=company.closest('tr');
    const body=document.getElementById('rows');
    if(!row||!body)return;
    const index=[...body.children].indexOf(row);
    try{
      const c=typeof visibleRows!=='undefined'?visibleRows[index]:null;
      if(!c)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if(typeof window.selectCustomer==='function')window.selectCustomer(c.id);
      setTimeout(renderFullInfo,80);
    }catch(_){}
  }

  function startFullInfo(){
    addStyles();
    window.addEventListener('click',interceptCompanyClick,true);
    document.addEventListener('click',()=>setTimeout(sync,60),true);
    setInterval(sync,350);
    setTimeout(sync,250);
  }

  function boot(){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startFullInfo,{once:true});
    else startFullInfo();
  }

  loadBase();
})();