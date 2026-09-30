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
      .portfolio-full-title{font-size:12px;font-weight:900;color:#0f172a;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:8px}
      .portfolio-full-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
      .portfolio-full-item{border:1px solid #e1e8f0;border-radius:8px;padding:8px;background:#f8fafc;min-width:0}
      .portfolio-full-item.wide{grid-column:1/-1}
      .portfolio-full-label{font-size:9px;font-weight:900;color:#64748b;margin-bottom:3px}
      .portfolio-full-value{font-size:10px;font-weight:700;color:#172033;line-height:1.4;overflow-wrap:anywhere;white-space:pre-wrap}
      .portfolio-full-value a{color:#1769f6;text-decoration:none}
      .portfolio-full-empty{color:#94a3b8;font-weight:600}
      @media(max-width:1200px){.portfolio-full-grid{grid-template-columns:1fr}.portfolio-full-item.wide{grid-column:auto}}
    `;
    document.head.appendChild(st);
  }

  function item(label,value,wide=false,html=false){
    const shown=clean(value);
    return `<div class="portfolio-full-item${wide?' wide':''}"><div class="portfolio-full-label">${esc(label)}</div><div class="portfolio-full-value${shown?'':' portfolio-full-empty'}">${shown?(html?value:esc(value)):'—'}</div></div>`;
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
    let lastMeeting='';
    try{
      const rows=Array.isArray(h.meetings)?h.meetings:[];
      if(rows.length){const m=rows.slice().sort((a,b)=>String(b.meeting_date||b.created_at||'').localeCompare(String(a.meeting_date||a.created_at||'')))[0];lastMeeting=clean(m?.meeting_date||m?.created_at).slice(0,10)}
    }catch(_){}

    const phoneHtml=phones.map(p=>`<a href="tel:${esc(p)}">${esc(p)}</a>`).join('<br>');
    const mailHtml=emails.map(e=>`<a href="mailto:${esc(e)}">${esc(e)}</a>`).join('<br>');
    const fields=[
      item('Firma',c.company,true),
      item('Yetkili Kişiler',people.join('\n'),true),
      item('Telefonlar',phoneHtml,false,true),
      item('E-postalar',mailHtml,false,true),
      item('İl / Bölge',c.region),
      item('İlçe',c.district),
      item('İş Alanı',c.categories||c.sector),
      item('Potansiyel',priorityLabel(c)),
      item('Sonuç',resultLabelSafe(c)),
      item('Aşama',c.stage),
      item('Sonraki İşlem',c.follow_date),
      item('Son Görüşme',lastMeeting),
      item('Görüşme Sayısı',String(Array.isArray(h.meetings)?h.meetings.length:0)),
      item('Teklif Sayısı',String(Array.isArray(h.offers)?h.offers.length:0)),
      item('Fatura Ünvanı',c.invoice_title,true),
      item('Vergi Dairesi',c.tax_office),
      item('Vergi No',c.tax_number),
      item('Fatura Adresi',c.invoice_address,true),
      item('Makine / Teknik Bilgi',c.machine_info,true),
      item('Müşteri Talepleri',c.customer_requests,true),
      item('Özel Notlar',c.special_notes,true),
      item('Kayıt Durumu',c.record_status),
      item('Kayıt Tarihi',clean(c.created_at).replace('T',' ').slice(0,16)),
      item('Son Güncelleme',clean(c.updated_at).replace('T',' ').slice(0,16),true)
    ].join('');

    box.innerHTML=`<div class="portfolio-full-title"><span>📋 Tüm Müşteri Bilgileri</span><span style="font-size:9px;color:#64748b">Seçili müşteri</span></div><div class="portfolio-full-grid">${fields}</div>`;
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