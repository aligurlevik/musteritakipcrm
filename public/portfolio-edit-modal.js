(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').trim();
  const arr=v=>{try{const x=Array.isArray(v)?v:JSON.parse(v||'[]');return Array.isArray(x)?x:[]}catch{return[]}};

  function css(){
    if($('portfolioEditModalStyle'))return;
    const s=document.createElement('style');s.id='portfolioEditModalStyle';s.textContent=`
      #portfolioEditModal{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.55);display:none;align-items:center;justify-content:center;padding:18px}
      #portfolioEditModal.show{display:flex}
      #portfolioEditModal .pe-box{width:min(940px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 28px 80px rgba(15,23,42,.32)}
      #portfolioEditModal .pe-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 18px;background:#fff;border-bottom:1px solid #dce5ef}
      #portfolioEditModal .pe-title{font-size:18px;font-weight:900}.pe-sub{font-size:11px;color:#64748b;margin-top:3px}
      #portfolioEditModal .pe-close{width:36px;height:36px;border:0;border-radius:9px;background:#eef2f7;font-size:22px;cursor:pointer}
      #portfolioEditModal .pe-body{padding:16px 18px}.pe-section{border:1px solid #dce5ef;border-radius:12px;padding:13px;margin-bottom:12px}.pe-section h3{font-size:12px;margin:0 0 10px}
      #portfolioEditModal .pe-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.pe-field{display:grid;gap:5px}.pe-field.full{grid-column:1/-1}
      #portfolioEditModal label{font-size:10px;font-weight:900;color:#475569}#portfolioEditModal input,#portfolioEditModal select,#portfolioEditModal textarea{width:100%;border:1px solid #cfd9e6;border-radius:8px;padding:9px 10px;background:#fff;color:#0f172a;outline:none}
      #portfolioEditModal input,#portfolioEditModal select{height:40px}#portfolioEditModal textarea{min-height:96px;resize:vertical;line-height:1.4}
      #portfolioEditModal input:focus,#portfolioEditModal select:focus,#portfolioEditModal textarea:focus{border-color:#1769f6;box-shadow:0 0 0 3px rgba(23,105,246,.10)}
      #portfolioEditModal .pe-actions{position:sticky;bottom:0;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 18px;background:#fff;border-top:1px solid #dce5ef}.pe-status{margin-right:auto;font-size:11px;font-weight:800;color:#64748b}.pe-status.err{color:#b42335}
      #portfolioEditModal .pe-btn{border:1px solid #dce5ef;border-radius:8px;padding:9px 15px;font-weight:900;cursor:pointer;background:#fff;color:#334155}.pe-btn.primary{background:#1769f6;border-color:#1769f6;color:#fff}.pe-btn:disabled{opacity:.55;cursor:wait}
      @media(max-width:700px){#portfolioEditModal{padding:8px}#portfolioEditModal .pe-grid{grid-template-columns:1fr}.pe-field.full{grid-column:auto}}
    `;document.head.appendChild(s);
  }

  function modal(){
    let m=$('portfolioEditModal');if(m)return m;css();
    m=document.createElement('div');m.id='portfolioEditModal';m.innerHTML=`
      <div class="pe-box"><div class="pe-head"><div><div id="peTitle" class="pe-title">Müşteri Düzenle</div><div class="pe-sub">Sağdaki özet aynı kalır; düzenlemeyi burada rahatça yapabilirsiniz.</div></div><button type="button" class="pe-close">×</button></div>
      <form id="peForm"><div class="pe-body">
        <div class="pe-section"><h3>Firma ve iletişim</h3><div class="pe-grid">
          <div class="pe-field full"><label>Firma adı</label><input id="peCompany" required></div>
          <div class="pe-field"><label>Yetkili / görüşülen kişi</label><input id="peContact"></div><div class="pe-field"><label>Telefon</label><input id="pePhone"></div>
          <div class="pe-field"><label>E-posta</label><input id="peEmail" type="email"></div><div class="pe-field"><label>İl / Bölge</label><input id="peRegion"></div>
          <div class="pe-field full"><label>İş alanı</label><input id="peCategories" placeholder="Ambalaj, Matbaa"></div>
        </div></div>
        <div class="pe-section"><h3>Satış ve takip</h3><div class="pe-grid">
          <div class="pe-field"><label>Potansiyel</label><select id="pePriority"><option>KRİTİK</option><option>YÜKSEK</option><option>NORMAL</option></select></div>
          <div class="pe-field"><label>Sonuç</label><select id="peResult"><option value="open">Sonuçlanmamış</option><option value="waiting">Beklemede</option><option value="positive">Olumlu</option><option value="negative">Olumsuz</option></select></div>
          <div class="pe-field"><label>Sonraki işlem tarihi</label><input id="peFollow" type="date"></div><div class="pe-field"><label>Makine / teknik bilgi</label><input id="peMachine"></div>
          <div class="pe-field full"><label>Notlar</label><textarea id="peNotes"></textarea></div>
        </div></div>
        <div class="pe-section"><h3>Fatura bilgileri</h3><div class="pe-grid">
          <div class="pe-field"><label>Fatura unvanı</label><input id="peInvoiceTitle"></div><div class="pe-field"><label>Vergi dairesi</label><input id="peTaxOffice"></div>
          <div class="pe-field"><label>Vergi numarası</label><input id="peTaxNumber"></div><div class="pe-field full"><label>Fatura adresi</label><textarea id="peInvoiceAddress" style="min-height:70px"></textarea></div>
        </div></div>
      </div><div class="pe-actions"><span id="peStatus" class="pe-status"></span><button type="button" class="pe-btn pe-cancel">İptal</button><button id="peSave" type="submit" class="pe-btn primary">Kaydet</button></div></form></div>`;
    const close=()=>m.classList.remove('show');m.addEventListener('click',e=>{if(e.target===m||e.target.closest('.pe-close')||e.target.closest('.pe-cancel'))close()});
    m.querySelector('#peForm').addEventListener('submit',save);document.body.appendChild(m);return m;
  }

  function current(){try{return typeof selected!=='undefined'?selected:null}catch{return null}}
  function open(){
    const c=current();if(!c)return;const m=modal();$('peTitle').textContent=(c.company||'Müşteri')+' — Düzenle';
    $('peCompany').value=c.company||'';$('peContact').value=c.contact_name||'';$('pePhone').value=c.phone||arr(c.phones_json)[0]||'';$('peEmail').value=c.email||arr(c.emails_json)[0]||'';
    $('peRegion').value=c.region||'';$('peCategories').value=c.categories||c.sector||'';$('pePriority').value=c.priority||'NORMAL';
    try{$('peResult').value=resultOf(c)}catch{$('peResult').value='open'}
    $('peFollow').value=c.follow_date||'';$('peMachine').value=c.machine_info||'';$('peNotes').value=c.special_notes||'';$('peInvoiceTitle').value=c.invoice_title||'';$('peTaxOffice').value=c.tax_office||'';$('peTaxNumber').value=c.tax_number||'';$('peInvoiceAddress').value=c.invoice_address||'';
    $('peStatus').textContent='';$('peStatus').classList.remove('err');m.classList.add('show');setTimeout(()=>$('peCompany')?.focus(),0);
  }

  async function save(e){
    e?.preventDefault();const c=current();if(!c)return;const status=$('peStatus'),btn=$('peSave'),name=clean($('peCompany').value);if(!name){status.textContent='Firma adı zorunlu.';status.classList.add('err');return}
    const old={company:c.company,invoice_title:c.invoice_title,tax_office:c.tax_office,tax_number:c.tax_number,invoice_address:c.invoice_address};let oldNotes=null;try{oldNotes=notes.map(x=>({...x}))}catch{}
    try{
      btn.disabled=true;status.textContent='Kaydediliyor...';status.classList.remove('err');c.company=name;c.invoice_title=clean($('peInvoiceTitle').value);c.tax_office=clean($('peTaxOffice').value);c.tax_number=clean($('peTaxNumber').value);c.invoice_address=clean($('peInvoiceAddress').value);
      $('dContact').value=clean($('peContact').value);$('dPhone').value=clean($('pePhone').value);$('dEmail').value=clean($('peEmail').value);$('dRegion').value=clean($('peRegion').value);$('dCategories').value=clean($('peCategories').value);$('dPriority').value=$('pePriority').value;$('dResultSelect').value=$('peResult').value;$('dFollow').value=$('peFollow').value;$('dMachine').value=clean($('peMachine').value);
      try{notes=parseNotes($('peNotes').value);renderNotes()}catch{}
      await saveCustomer();status.textContent='Kaydedildi.';setTimeout(()=>$('portfolioEditModal')?.classList.remove('show'),150);
    }catch(err){Object.assign(c,old);try{if(oldNotes)notes=oldNotes;loadSelected()}catch{}status.textContent=err?.message||'Kaydedilemedi.';status.classList.add('err')}
    finally{btn.disabled=false}
  }

  function install(){css();modal();try{focusEdit=open}catch{}window.focusEdit=open}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();