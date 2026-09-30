(function(){
  'use strict';

  const byId=id=>document.getElementById(id);
  const clean=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const parseArray=v=>{try{const x=Array.isArray(v)?v:JSON.parse(v||'[]');return Array.isArray(x)?x:[]}catch{return[]}};

  function timeout(promise,ms,label){
    return Promise.race([
      promise,
      new Promise((_,reject)=>setTimeout(()=>reject(new Error((label||'İstek')+' zaman aşımına uğradı')),ms))
    ]);
  }

  function contactsOf(customer){
    if(!customer)return [];
    const direct=parseArray(customer.contacts_json).map(x=>({name:clean(x?.name),role:clean(x?.role),phone:clean(x?.phone),email:clean(x?.email)})).filter(x=>x.name||x.role||x.phone||x.email);
    if(direct.length)return direct;
    const names=clean(customer.contact_name).split(/\r?\n/).map(clean).filter(Boolean);
    const phones=parseArray(customer.phones_json).map(clean);
    const emails=parseArray(customer.emails_json).map(clean);
    const count=Math.max(names.length,phones.length,emails.length,customer.phone?1:0,customer.email?1:0);
    const rows=[];
    for(let i=0;i<count;i++){
      const row={name:names[i]||'',role:'',phone:phones[i]||(!i?clean(customer.phone):''),email:emails[i]||(!i?clean(customer.email):'')};
      if(row.name||row.phone||row.email)rows.push(row);
    }
    return rows;
  }

  function addStyles(){
    if(byId('portfolioContactEnhancementStyle'))return;
    const style=document.createElement('style');
    style.id='portfolioContactEnhancementStyle';
    style.textContent=`
      .workspace{grid-template-columns:minmax(0,2.45fr) minmax(360px,.78fr)!important}
      .table-card table{width:100%!important;min-width:0!important;table-layout:fixed!important}
      .table-card th:nth-child(2),.table-card td:nth-child(2),.table-card th:nth-child(3),.table-card td:nth-child(3),.table-card th:nth-child(4),.table-card td:nth-child(4){display:none!important}
      .table-card th:nth-child(1),.table-card td:nth-child(1){width:23%!important}
      .table-card th:nth-child(5),.table-card td:nth-child(5){width:18%!important}
      .table-card th:nth-child(6),.table-card td:nth-child(6){width:12%!important}
      .table-card th:nth-child(7),.table-card td:nth-child(7){width:11%!important}
      .table-card th:nth-child(8),.table-card td:nth-child(8){width:11%!important}
      .table-card th:nth-child(9),.table-card td:nth-child(9){width:13%!important}
      .table-card th:nth-child(10),.table-card td:nth-child(10){width:5%!important;text-align:center}
      .table-card th:nth-child(11),.table-card td:nth-child(11){width:7%!important;text-align:center}
      .table-card th,.table-card td{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .company{color:#1769f6!important;text-decoration:underline;text-underline-offset:2px;cursor:pointer!important}
      .portfolio-contact-summary{display:grid;gap:7px;margin:7px 0 9px}
      .portfolio-contact-card{border:1px solid #dce5ef;border-radius:8px;padding:8px;background:#f8fafc}
      .portfolio-contact-name{font-weight:900;font-size:11px;color:#0f172a}
      .portfolio-contact-role{font-size:10px;color:#64748b;margin-top:2px}
      .portfolio-contact-meta{display:grid;gap:3px;margin-top:6px;font-size:10px}
      .portfolio-contact-meta a{color:#1769f6;text-decoration:none}
      #portfolioContactModal{position:fixed;inset:0;background:rgba(15,23,42,.48);z-index:99999;display:none;align-items:center;justify-content:center;padding:18px}
      #portfolioContactModal.show{display:flex}
      #portfolioContactModal .pcm-box{width:min(720px,96vw);max-height:84vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 24px 70px rgba(15,23,42,.28)}
      #portfolioContactModal .pcm-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #dce5ef}
      #portfolioContactModal .pcm-close{border:0;background:#eef2f7;border-radius:8px;width:34px;height:34px;cursor:pointer;font-size:20px}
      #portfolioContactModal .pcm-body{padding:14px 16px}
      #portfolioContactModal .pcm-grid{display:grid;gap:9px}
      #portfolioContactModal .pcm-row{display:grid;grid-template-columns:minmax(140px,1.15fr) minmax(120px,.9fr) minmax(135px,1fr) minmax(180px,1.25fr);gap:9px;padding:10px;border:1px solid #dce5ef;border-radius:9px;align-items:center}
      #portfolioContactModal .pcm-labels{font-size:10px;font-weight:900;color:#64748b;background:#f8fafc}
      #portfolioContactModal .pcm-empty{padding:20px;text-align:center;color:#64748b;background:#f8fafc;border-radius:9px}
      .portfolio-load-error{color:#b42335!important;font-weight:800!important}
      @media(max-width:1380px){.workspace{grid-template-columns:minmax(0,1.75fr) minmax(350px,.75fr)!important}}
      @media(max-width:1000px){.workspace{grid-template-columns:1fr!important}.table-card table{min-width:760px!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal(){
    let modal=byId('portfolioContactModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='portfolioContactModal';
    modal.innerHTML='<div class="pcm-box"><div class="pcm-head"><b id="pcmTitle">Yetkili Kişiler</b><button type="button" class="pcm-close" aria-label="Kapat">×</button></div><div class="pcm-body"><div id="pcmContent"></div></div></div>';
    modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.pcm-close'))modal.classList.remove('show')});
    document.body.appendChild(modal);
    return modal;
  }

  function contactCards(customer){
    const rows=contactsOf(customer);
    if(!rows.length)return '<div class="pcm-empty">Bu müşteri için henüz yetkili kişi bilgisi girilmemiş.</div>';
    return '<div class="pcm-grid"><div class="pcm-row pcm-labels"><span>Yetkili</span><span>Görevi</span><span>Telefon</span><span>Mail</span></div>'+rows.map(x=>`<div class="pcm-row"><div><b>${esc(x.name||'—')}</b></div><div>${esc(x.role||'—')}</div><div>${x.phone?`<a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>`:'—'}</div><div>${x.email?`<a href="mailto:${esc(x.email)}">${esc(x.email)}</a>`:'—'}</div></div>`).join('')+'</div>';
  }

  function openContacts(customer){
    if(!customer)return;
    const modal=ensureModal();
    byId('pcmTitle').textContent=(customer.company||'Müşteri')+' — Yetkili Kişiler';
    byId('pcmContent').innerHTML=contactCards(customer);
    modal.classList.add('show');
  }

  function renderRightPanel(customer){
    const panels=[...document.querySelectorAll('#tabGeneral .panel')];
    const panel=panels.find(p=>(p.querySelector('h3')?.textContent||'').includes('İletişim Bilgileri'));
    if(!panel||!customer)return;
    let summary=panel.querySelector('.portfolio-contact-summary');
    if(!summary){
      summary=document.createElement('div');summary.className='portfolio-contact-summary';
      const h=panel.querySelector('h3');if(h)h.insertAdjacentElement('afterend',summary);
      [...panel.querySelectorAll('.info-row')].slice(0,3).forEach(row=>row.style.display='none');
    }
    const rows=contactsOf(customer);
    summary.innerHTML=rows.length?rows.map(x=>`<div class="portfolio-contact-card"><div class="portfolio-contact-name">${esc(x.name||'Yetkili')}</div><div class="portfolio-contact-role">${esc(x.role||'Görev belirtilmemiş')}</div><div class="portfolio-contact-meta"><span>☎ ${x.phone?`<a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>`:'—'}</span><span>✉ ${x.email?`<a href="mailto:${esc(x.email)}">${esc(x.email)}</a>`:'—'}</span></div></div>`).join(''):'<div class="pcm-empty">Yetkili kişi bilgisi girilmemiş.</div>';
  }

  function customerForRow(row){
    const body=byId('rows');if(!body||!row)return null;
    const index=[...body.children].indexOf(row);
    try{return typeof visibleRows!=='undefined'&&visibleRows[index]?visibleRows[index]:null}catch{return null}
  }

  function handleCompanyClick(event){
    const company=event.target.closest('.company');if(!company)return;
    const customer=customerForRow(company.closest('tr'));if(!customer)return;
    event.preventDefault();event.stopPropagation();openContacts(customer);
  }

  function chooseCustomer(id){
    try{
      selected=customers.find(c=>Number(c.id)===Number(id))||null;
      if(!selected)return;
      selectedHistory={meetings:[],offers:[]};
      loadSelected();render();renderRightPanel(selected);
      const selectedId=selected.id;
      timeout(api('/api/customers/'+selectedId+'/history'),4500,'Müşteri geçmişi').then(data=>{
        if(selected&&Number(selected.id)===Number(selectedId)){
          selectedHistory=data||{meetings:[],offers:[]};loadSelected();render();renderRightPanel(selected);
        }
      }).catch(error=>console.warn('Müşteri geçmişi beklemede bırakıldı:',error.message));
    }catch(error){console.error('Müşteri seçimi başarısız',error)}
  }

  function loadMeetingsLater(){
    timeout(api('/api/meetings?status=T%C3%BCm%C3%BC'),4500,'Görüşmeler').then(rows=>{
      if(!Array.isArray(rows))return;
      meetings=rows;counts();render();if(selected)loadSelected();
    }).catch(error=>console.warn('Görüşmeler beklemede; müşteri listesi etkilenmeyecek:',error.message));
  }

  async function recoverPortfolioData(reselect){
    try{
      let customerRows;
      try{customerRows=await timeout(api('/api/customers?status=T%C3%BCm%C3%BC'),7000,'Müşteriler')}catch(first){customerRows=await timeout(api('/api/customers'),7000,'Müşteriler')}
      if(!Array.isArray(customerRows))throw new Error('Müşteri listesi alınamadı');

      customers=customerRows.filter(c=>c.record_status!=='Silindi');
      if(!Array.isArray(meetings))meetings=[];
      fillFilters();counts();render();

      const id=reselect||(selected&&selected.id)||(visibleRows[0]&&visibleRows[0].id);
      if(id)chooseCustomer(id);
      else{
        selected=null;
        const empty=byId('detailEmpty');if(empty)empty.textContent='Henüz kayıtlı müşteri yok.';
      }

      const count=byId('rowCount');if(count)count.classList.remove('portfolio-load-error');
      loadMeetingsLater();
    }catch(error){
      const count=byId('rowCount');if(count){count.textContent='Müşteri listesi yüklenemedi';count.classList.add('portfolio-load-error')}
      const reminder=byId('sideReminders');if(reminder){reminder.textContent='Müşteri bağlantısı kontrol ediliyor.';reminder.classList.add('portfolio-load-error')}
      console.error('Portfolio customer load failed',error);
    }
  }

  let lastSelected='';
  function sync(){
    addStyles();ensureModal();
    let current=null;try{current=typeof selected!=='undefined'?selected:null}catch(_){}
    if(current){const key=String(current.id||current.company||'');if(key!==lastSelected){lastSelected=key;renderRightPanel(current)}}
  }

  function installSafeLoaders(){
    try{loadAll=recoverPortfolioData}catch(_){}
    try{selectCustomer=async id=>chooseCustomer(id)}catch(_){}
    window.loadAll=recoverPortfolioData;
    window.selectCustomer=id=>chooseCustomer(id);
  }

  function start(){
    addStyles();ensureModal();installSafeLoaders();
    document.addEventListener('click',handleCompanyClick,true);
    sync();setInterval(sync,500);
    setTimeout(()=>recoverPortfolioData(),120);
  }

  installSafeLoaders();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
