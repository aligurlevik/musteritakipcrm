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
      .portfolio-full-title{font-size:14px;font-weight:900;color:#0f172a;margin-bottom:9px;display:flex;align-items:center;justify-content:space-between;gap:8px}
      .portfolio-section-title{font-size:12px;font-weight:900;color:#334155;margin:10px 0 6px;padding-top:8px;border-top:1px solid #e6edf5}
      .portfolio-section-title.first{margin-top:0;padding-top:0;border-top:0}
      .portfolio-full-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      .portfolio-full-item{border:1px solid #e1e8f0;border-radius:8px;padding:9px;background:#f8fafc;min-width:0}
      .portfolio-full-item.wide{grid-column:1/-1}
      .portfolio-full-label{font-size:11px;font-weight:900;color:#64748b;margin-bottom:4px}
      .portfolio-full-value{font-size:13px;font-weight:700;color:#172033;line-height:1.45;overflow-wrap:anywhere;white-space:pre-wrap}
      .portfolio-full-value a{color:#1769f6;text-decoration:none}
      .portfolio-full-empty{color:#94a3b8;font-weight:600}
      .portfolio-history{display:grid;gap:7px}
      .portfolio-history-row{border-left:3px solid #1769f6;background:#f8fafc;border-radius:7px;padding:10px 11px;font-size:12px;line-height:1.5}
      .portfolio-history-row.order{border-left-color:#16a34a;background:#f2fbf6}
      .portfolio-history-row.empty{border-left-color:#cbd5e1;color:#64748b}
      .portfolio-history-head{font-size:13px;font-weight:900;color:#172033;margin-bottom:4px}

      #portfolioDetailExpandModal{position:fixed;inset:0;z-index:120000;background:rgba(15,23,42,.58);display:none;align-items:center;justify-content:center;padding:18px}
      #portfolioDetailExpandModal.show{display:flex}
      #portfolioDetailExpandModal .pdem-box{width:min(1180px,97vw);max-height:94vh;background:#f4f7fb;border-radius:16px;box-shadow:0 30px 90px rgba(15,23,42,.34);display:flex;flex-direction:column;overflow:hidden}
      #portfolioDetailExpandModal .pdem-head{display:grid;grid-template-columns:minmax(260px,1fr) minmax(520px,auto) 38px;align-items:center;gap:12px;padding:13px 14px;background:#fff;border-bottom:1px solid #dce5ef}
      #portfolioDetailExpandModal .pdem-title{font-size:21px;font-weight:900;color:#0f172a}
      #portfolioDetailExpandModal .pdem-sub{font-size:12px;color:#64748b;margin-top:3px}
      #portfolioDetailExpandModal .pdem-contact{display:grid;grid-template-columns:minmax(150px,1.1fr) minmax(145px,.9fr) minmax(190px,1.15fr);gap:7px;min-width:0}
      #portfolioDetailExpandModal .pdem-contact-item{border:1px solid #dbe5f0;background:#f8fafc;border-radius:9px;padding:8px 10px;min-width:0}
      #portfolioDetailExpandModal .pdem-contact-label{font-size:10px;font-weight:900;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:.2px}
      #portfolioDetailExpandModal .pdem-contact-value{font-size:13px;font-weight:800;color:#0f172a;line-height:1.4;overflow-wrap:anywhere}
      #portfolioDetailExpandModal .pdem-contact-value a{color:#1769f6;text-decoration:none}
      #portfolioDetailExpandModal .pdem-close{width:38px;height:38px;border:0;border-radius:9px;background:#eef2f7;color:#334155;font-size:22px;cursor:pointer}
      #portfolioDetailExpandModal .pdem-quick-note{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 14px;background:#fff;border-bottom:1px solid #dce5ef}
      #portfolioDetailExpandModal .pdem-quick-note label{font-size:13px;font-weight:900;color:#0f172a;white-space:nowrap}
      #portfolioDetailExpandModal .pdem-quick-note textarea{width:100%;min-height:42px;max-height:110px;resize:vertical;border:1px solid #cbd8e8;border-radius:9px;padding:10px 11px;font-size:13px;line-height:1.4;background:#fff;color:#0f172a;outline:none}
      #portfolioDetailExpandModal .pdem-quick-note textarea:focus{border-color:#1769f6;box-shadow:0 0 0 3px rgba(23,105,246,.10)}
      #portfolioDetailExpandModal .pdem-quick-note button{height:42px;border:0;border-radius:9px;background:#1769f6;color:#fff;font-size:13px;font-weight:900;padding:0 16px;cursor:pointer}
      #portfolioDetailExpandModal .pdem-note-status{grid-column:2/-1;font-size:11px;font-weight:800;color:#16a34a;min-height:14px}
      #portfolioDetailExpandModal .pdem-note-status.error{color:#dc2626}
      #portfolioDetailExpandModal .pdem-body{padding:12px;overflow:auto}
      #portfolioDetailExpandModal .detail{position:static!important;top:auto!important;width:100%!important;max-height:none!important;min-height:0!important;overflow:visible!important;border-radius:12px!important;box-shadow:none!important}
      #portfolioDetailExpandModal .detail-actions{display:none!important}
      #portfolioDetailExpandModal .detail-title{font-size:20px!important}
      #portfolioDetailExpandModal .detail-body{padding:14px 16px 18px!important}
      #portfolioDetailExpandModal .tabs .tab{font-size:12px!important;padding:11px 6px!important}
      #portfolioDetailExpandModal .summary4{grid-template-columns:repeat(4,minmax(0,1fr))!important}
      #portfolioDetailExpandModal .mini-card .m-label{font-size:11px!important}
      #portfolioDetailExpandModal .mini-card .m-value{font-size:14px!important;line-height:1.35!important}
      #portfolioDetailExpandModal .two-col{grid-template-columns:1fr 1fr!important}
      #portfolioDetailExpandModal .portfolio-full-grid{grid-template-columns:1fr 1fr!important}
      #portfolioDetailExpandModal .portfolio-full-info{padding:14px!important}
      #portfolioDetailExpandModal .portfolio-full-title{font-size:16px!important}
      #portfolioDetailExpandModal .portfolio-section-title{font-size:13px!important;margin-top:13px!important}
      #portfolioDetailExpandModal .portfolio-full-label{font-size:11px!important}
      #portfolioDetailExpandModal .portfolio-full-value{font-size:13px!important}
      #portfolioDetailExpandModal .portfolio-history-row{font-size:13px!important;padding:11px 12px!important;line-height:1.5!important}
      #portfolioDetailExpandModal .portfolio-history-head{font-size:13px!important}
      #portfolioDetailExpandModal .analysis-box{font-size:12px!important;line-height:1.55!important}
      #portfolioDetailExpandModal .panel h3{font-size:14px!important}
      #portfolioDetailExpandModal .portfolio-contact-section{display:none!important}
      @media(max-width:1200px){.portfolio-full-grid{grid-template-columns:1fr}.portfolio-full-item.wide{grid-column:auto}}
      @media(max-width:980px){
        #portfolioDetailExpandModal .pdem-head{grid-template-columns:1fr 38px}
        #portfolioDetailExpandModal .pdem-contact{grid-column:1/-1;grid-row:2;grid-template-columns:repeat(3,minmax(0,1fr))}
      }
      @media(max-width:760px){
        #portfolioDetailExpandModal{padding:6px}
        #portfolioDetailExpandModal .pdem-box{max-height:98vh;width:99vw}
        #portfolioDetailExpandModal .summary4,#portfolioDetailExpandModal .two-col,#portfolioDetailExpandModal .portfolio-full-grid{grid-template-columns:1fr!important}
        #portfolioDetailExpandModal .pdem-contact{grid-template-columns:1fr}
        #portfolioDetailExpandModal .pdem-quick-note{grid-template-columns:1fr}
        #portfolioDetailExpandModal .pdem-note-status{grid-column:1}
      }
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
      <div class="portfolio-full-title"><span>📋 ${esc(c.company||'Müşteri')}</span><span style="font-size:11px;color:#64748b">Satış özeti</span></div>
      <div class="portfolio-contact-section">
        <div class="portfolio-section-title first">İletişim</div>
        <div class="portfolio-full-grid">${contactFields}</div>
      </div>
      <div class="portfolio-section-title">Potansiyel ve Takip</div>
      <div class="portfolio-full-grid">${salesFields}</div>
      <div class="portfolio-section-title">Görüşmeler ve Sonuçlar</div>
      <div class="portfolio-history">${meetingRows(h)}</div>
      <div class="portfolio-section-title">Teklifler</div>
      <div class="portfolio-history">${offerRows(h)}</div>
      <div class="portfolio-section-title">Siparişler</div>
      <div class="portfolio-history">${orderRow(c)}</div>`;
  }

  function renderExpandContact(){
    const host=document.getElementById('pdemContact');
    if(!host)return;
    const c=currentCustomer();
    if(!c){host.innerHTML='';return;}
    const contacts=allContacts(c);
    const people=contacts.map(x=>[x.name||'Yetkili',x.role].filter(Boolean).join(' — '));
    const phones=uniq([c.phone,...parseArray(c.phones_json),...contacts.map(x=>x.phone)]);
    const emails=uniq([c.email,...parseArray(c.emails_json),...contacts.map(x=>x.email)]);
    const peopleText=people.length?people.join(', '):'—';
    const phoneHtml=phones.length?phones.map(p=>`<a href="tel:${esc(p)}">${esc(p)}</a>`).join('<br>'):'—';
    const mailHtml=emails.length?emails.map(e=>`<a href="mailto:${esc(e)}">${esc(e)}</a>`).join('<br>'):'—';
    host.innerHTML=`
      <div class="pdem-contact-item"><div class="pdem-contact-label">Yetkili</div><div class="pdem-contact-value">${esc(peopleText)}</div></div>
      <div class="pdem-contact-item"><div class="pdem-contact-label">Telefon</div><div class="pdem-contact-value">${phoneHtml}</div></div>
      <div class="pdem-contact-item"><div class="pdem-contact-label">E-posta</div><div class="pdem-contact-value">${mailHtml}</div></div>`;
  }

  function setNoteStatus(text,isError=false){
    const el=document.getElementById('pdemQuickNoteStatus');
    if(!el)return;
    el.textContent=text||'';
    el.classList.toggle('error',!!isError);
  }

  async function saveExpandQuickNote(){
    const input=document.getElementById('pdemQuickNote');
    const text=clean(input?.value);
    if(!text){setNoteStatus('Önce bir not yazın.',true);input?.focus();return;}
    if(!currentCustomer()){setNoteStatus('Müşteri seçili değil.',true);return;}
    const original=document.getElementById('newNote');
    if(!original||typeof addNote!=='function'||typeof saveCustomer!=='function'){
      setNoteStatus('Not alanı yüklenemedi. Sayfayı yenileyin.',true);
      return;
    }
    const btn=document.getElementById('pdemQuickNoteSave');
    try{
      if(btn){btn.disabled=true;btn.textContent='Kaydediliyor...'}
      setNoteStatus('');
      original.value=text;
      addNote();
      await saveCustomer();
      if(input)input.value='';
      setNoteStatus('Not kaydedildi.');
      setTimeout(()=>{renderFullInfo();renderExpandContact()},120);
    }catch(err){
      console.error(err);
      setNoteStatus('Not kaydedilemedi. Tekrar deneyin.',true);
    }finally{
      if(btn){btn.disabled=false;btn.textContent='Notu Kaydet'}
    }
  }

  let detailMarker=null;
  let oldBodyOverflow='';

  function ensureExpandModal(){
    let modal=document.getElementById('portfolioDetailExpandModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='portfolioDetailExpandModal';
    modal.innerHTML=`
      <div class="pdem-box" role="dialog" aria-modal="true" aria-labelledby="pdemTitle">
        <div class="pdem-head">
          <div><div id="pdemTitle" class="pdem-title">Müşteri Kartı — Tam Görünüm</div><div class="pdem-sub">Sağdaki müşteri panosunun tamamı. Bilgileri burada inceleyebilir ve düzenleyebilirsiniz.</div></div>
          <div id="pdemContact" class="pdem-contact"></div>
          <button type="button" class="pdem-close" aria-label="Kapat">×</button>
        </div>
        <div class="pdem-quick-note">
          <label for="pdemQuickNote">Yeni Not</label>
          <textarea id="pdemQuickNote" placeholder="Bu müşteri için yeni not yazın..."></textarea>
          <button type="button" id="pdemQuickNoteSave">Notu Kaydet</button>
          <div id="pdemQuickNoteStatus" class="pdem-note-status"></div>
        </div>
        <div class="pdem-body"><div id="pdemMount"></div></div>
      </div>`;
    modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.pdem-close'))closeExpandedPanel()});
    modal.querySelector('#pdemQuickNoteSave')?.addEventListener('click',saveExpandQuickNote);
    modal.querySelector('#pdemQuickNote')?.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();saveExpandQuickNote()}
    });
    document.body.appendChild(modal);
    return modal;
  }

  function openExpandedPanel(){
    const detail=document.querySelector('.workspace > .detail')||document.querySelector('#portfolioDetailExpandModal .detail');
    if(!detail)return;
    addStyles();
    renderFullInfo();
    const modal=ensureExpandModal();
    if(!detailMarker){
      detailMarker=document.createComment('portfolio-detail-home');
      detail.parentNode.insertBefore(detailMarker,detail);
    }
    document.getElementById('pdemMount').appendChild(detail);
    try{if(typeof switchTab==='function')switchTab('general')}catch(_){}
    renderExpandContact();
    setNoteStatus('');
    oldBodyOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    modal.classList.add('show');
    setTimeout(()=>{renderFullInfo();renderExpandContact();document.getElementById('pdemQuickNote')?.focus()},60);
  }

  function closeExpandedPanel(){
    const modal=document.getElementById('portfolioDetailExpandModal');
    const detail=modal?.querySelector('.detail');
    if(detail&&detailMarker?.parentNode){
      detailMarker.parentNode.insertBefore(detail,detailMarker);
      detailMarker.remove();
      detailMarker=null;
    }
    modal?.classList.remove('show');
    document.body.style.overflow=oldBodyOverflow;
  }

  function interceptEditForExpand(e){
    const btn=e.target?.closest?.('button');
    if(!btn)return;
    if(!btn.closest('.detail-actions')||!btn.textContent.includes('Düzenle'))return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openExpandedPanel();
  }

  function onEscape(e){
    if(e.key==='Escape'&&document.getElementById('portfolioDetailExpandModal')?.classList.contains('show'))closeExpandedPanel();
  }

  let lastKey='';
  function sync(){
    const c=currentCustomer();
    if(!c)return;
    const h=history();
    const key=[c.id,c.updated_at,c.follow_date,Array.isArray(h.meetings)?h.meetings.length:0,Array.isArray(h.offers)?h.offers.length:0].join('|');
    if(key!==lastKey){lastKey=key;renderFullInfo();renderExpandContact()}
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
      setTimeout(()=>{renderFullInfo();renderExpandContact()},80);
    }catch(_){}
  }

  function startFullInfo(){
    addStyles();
    ensureExpandModal();
    window.addEventListener('click',interceptEditForExpand,true);
    window.addEventListener('click',interceptCompanyClick,true);
    document.addEventListener('keydown',onEscape);
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