(function(){
  'use strict';
  if(window.__crmCustomerGeneralStatus)return;
  window.__crmCustomerGeneralStatus='20261001-v1';

  var STATUS_OPTIONS=[
    {value:'Yeni Lead',label:'Yeni Müşteri'},
    {value:'Arandı',label:'Arandı'},
    {value:'Mail Atıldı',label:'Mail Atıldı'},
    {value:'Teklif Verildi',label:'Teklif Verildi'},
    {value:'Beklemede',label:'Beklemede'},
    {value:'Kazanıldı',label:'Olumlu'},
    {value:'Kaybedildi',label:'Olumsuz'}
  ];

  function currentCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function isoToday(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}catch(_){return new Date().toISOString().slice(0,10)}}
  function addDaysIso(days){var d=new Date(isoToday()+'T12:00:00+03:00');d.setDate(d.getDate()+Number(days||0));return d.toISOString().slice(0,10)}
  function trDate(iso){var p=String(iso||'').slice(0,10).split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:String(iso||'')}
  function parseArray(value,fallback){try{var a=JSON.parse(value||'');if(Array.isArray(a)&&a.length)return a}catch(_){ }return fallback?[fallback]:[]}
  function categories(c){return String(c.categories||c.sector||'').split(',').map(function(x){return x.trim()}).filter(Boolean)}
  function followMethod(stage){if(stage==='Mail Atıldı')return 'Mail dönüşünü kontrol et';if(stage==='Teklif Verildi')return 'Teklif sonucunu sor';if(stage==='Arandı')return 'Geri dönüşü takip et';if(stage==='Beklemede')return 'Bekleme sonucunu kontrol et';return 'Takip et'}

  function addStyle(){
    if(document.getElementById('crmGeneralStatusStyle'))return;
    var s=document.createElement('style');
    s.id='crmGeneralStatusStyle';
    s.textContent='\n#portfolioDetailExpandModal .crm-general-status-card{margin:0 0 12px;border:1px solid #cbd8e8;border-radius:10px;background:#f8fbff;padding:11px}\n#portfolioDetailExpandModal .crm-general-status-title{font-size:12px;font-weight:900;color:#0f172a;margin-bottom:9px}\n#portfolioDetailExpandModal .crm-general-status-grid{display:grid;grid-template-columns:1.05fr .8fr 1.45fr auto;gap:8px;align-items:end}\n#portfolioDetailExpandModal .crm-general-status-field label{display:block;font-size:10px;font-weight:900;color:#64748b;margin-bottom:4px}\n#portfolioDetailExpandModal .crm-general-status-field select,#portfolioDetailExpandModal .crm-general-status-field input{width:100%;height:36px;border:1px solid #cbd8e8;border-radius:8px;background:#fff;color:#0f172a;padding:0 9px;font-size:12px}\n#portfolioDetailExpandModal .crm-general-status-method{height:36px;display:flex;align-items:center;border:1px solid #dbe5f0;border-radius:8px;background:#fff;padding:0 10px;font-size:11px;font-weight:800;color:#475569}\n#portfolioDetailExpandModal .crm-general-status-save{height:36px;border:0;border-radius:8px;background:#1769f6;color:#fff;padding:0 13px;font-size:11px;font-weight:900;cursor:pointer}\n#portfolioDetailExpandModal .crm-general-status-msg{margin-top:7px;font-size:10px;font-weight:800;color:#64748b}\n#portfolioDetailExpandModal .crm-general-status-msg.ok{color:#15803d}\n#portfolioDetailExpandModal .crm-general-status-msg.err{color:#dc2626}\n@media(max-width:900px){#portfolioDetailExpandModal .crm-general-status-grid{grid-template-columns:1fr 1fr}#portfolioDetailExpandModal .crm-general-status-method{grid-column:1/-1}#portfolioDetailExpandModal .crm-general-status-save{grid-column:1/-1}}';
    document.head.appendChild(s);
  }

  function optionsHtml(stage){return STATUS_OPTIONS.map(function(x){return '<option value="'+esc(x.value)+'"'+(x.value===stage?' selected':'')+'>'+esc(x.label)+'</option>'}).join('')}

  function noteWithMailStamp(c){
    var today=trDate(isoToday());
    var stamp=today+' – ✉ Mail atıldı';
    var old=String(c.special_notes||'').trim();
    if(old.split('\n').some(function(line){return line.indexOf(stamp)>=0}))return old;
    return '[ ] '+stamp+(old?'\n'+old:'');
  }

  async function save(card){
    var c=currentCustomer();if(!c)return;
    var status=card.querySelector('[data-crm-general-status]').value;
    var follow=card.querySelector('[data-crm-general-follow]');
    var msg=card.querySelector('.crm-general-status-msg');
    if(status==='Mail Atıldı'&&!follow.value)follow.value=addDaysIso(10);
    var special=String(c.special_notes||'');
    if(status==='Mail Atıldı')special=noteWithMailStamp(c);
    var payload={
      company:c.company||'',
      contact_name:c.contact_name||'',
      phones:parseArray(c.phones_json,c.phone||''),
      emails:parseArray(c.emails_json,c.email||''),
      region:c.region||'',
      categories:categories(c),
      priority:c.priority||'NORMAL',
      stage:status,
      follow_date:follow.value||'',
      invoice_title:c.invoice_title||'',
      tax_office:c.tax_office||'',
      tax_number:c.tax_number||'',
      invoice_address:c.invoice_address||'',
      special_notes:special,
      machine_info:c.machine_info||''
    };
    msg.className='crm-general-status-msg';msg.textContent='Kaydediliyor...';
    try{
      if(typeof api!=='function')throw new Error('CRM API hazır değil');
      await api('/api/customers/'+c.id,{method:'PUT',body:JSON.stringify(payload)});
      c.stage=status;c.follow_date=follow.value||'';c.special_notes=special;
      var method=card.querySelector('.crm-general-status-method');if(method)method.textContent=followMethod(status);
      msg.className='crm-general-status-msg ok';
      msg.textContent='✓ Durum kaydedildi'+(c.follow_date?' · Takip: '+trDate(c.follow_date):'');
      try{if(typeof render==='function')render()}catch(_){ }
    }catch(error){
      msg.className='crm-general-status-msg err';
      msg.textContent='Kaydedilemedi: '+String(error&&error.message||error);
    }
  }

  function mount(){
    addStyle();
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var c=currentCustomer();if(!c)return;
    var editor=modal.querySelector('.pie-editor');if(!editor)return;
    var general=editor.querySelector('.pie-section .pie-section-body');if(!general)return;
    var existing=general.querySelector('.crm-general-status-card');
    var identity=String(c.id||'')+'|'+String(c.updated_at||'')+'|'+String(c.stage||'')+'|'+String(c.follow_date||'');
    if(existing&&existing.dataset.identity===identity)return;
    var card=existing||document.createElement('section');
    card.className='crm-general-status-card';card.dataset.identity=identity;
    card.innerHTML='<div class="crm-general-status-title">📌 Durum & Takip</div><div class="crm-general-status-grid">'+
      '<div class="crm-general-status-field"><label>Durum</label><select data-crm-general-status>'+optionsHtml(String(c.stage||'Yeni Lead'))+'</select></div>'+
      '<div class="crm-general-status-field"><label>Sonraki Takip</label><input type="date" data-crm-general-follow value="'+esc(String(c.follow_date||'').slice(0,10))+'"></div>'+
      '<div class="crm-general-status-field"><label>Nasıl Takip Edeceğim?</label><div class="crm-general-status-method">'+esc(followMethod(String(c.stage||'')))+'</div></div>'+
      '<button type="button" class="crm-general-status-save">Durumu Kaydet</button></div><div class="crm-general-status-msg">Mail Atıldı seçilirse, takip tarihi boşsa otomatik 10 gün sonrası atanır.</div>';
    var select=card.querySelector('[data-crm-general-status]');
    var follow=card.querySelector('[data-crm-general-follow]');
    select.addEventListener('change',function(){
      if(select.value==='Mail Atıldı'&&!follow.value)follow.value=addDaysIso(10);
      card.querySelector('.crm-general-status-method').textContent=followMethod(select.value);
    });
    card.querySelector('.crm-general-status-save').addEventListener('click',function(){save(card)});
    if(!existing)general.insertBefore(card,general.firstChild);
  }

  var queued=false;
  function schedule(){if(queued)return;queued=true;setTimeout(function(){queued=false;mount()},20)}
  var observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',function(){setTimeout(mount,50)},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
