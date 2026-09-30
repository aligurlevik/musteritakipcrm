(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').trim();
  const parseArr=v=>{try{const x=Array.isArray(v)?v:JSON.parse(v||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
  const getSelected=()=>{try{return typeof selected!=='undefined'?selected:null}catch{return null}};
  const getResult=c=>{try{return resultOf(c)}catch{if(c?.stage==='Kazanıldı')return'positive';if(c?.stage==='Kaybedildi'||c?.record_status==='Pasif')return'negative';if(c?.stage==='Beklemede')return'waiting';return'open'}};

  function ensure(){
    if($('portfolioEditModalV2'))return $('portfolioEditModalV2');
    const style=document.createElement('style');
    style.textContent=`
      #portfolioEditModalV2{position:fixed;inset:0;z-index:2147483646;background:rgba(15,23,42,.56);display:none;align-items:center;justify-content:center;padding:18px}
      #portfolioEditModalV2.show{display:flex}
      #portfolioEditModalV2 .pem-box{width:min(980px,96vw);max-height:92vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 30px 90px rgba(15,23,42,.35)}
      #portfolioEditModalV2 .pem-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #dce5ef;background:#fff}
      #portfolioEditModalV2 .pem-title{font-size:18px;font-weight:900}.pem-sub{font-size:11px;color:#64748b;margin-top:3px}
      #portfolioEditModalV2 .pem-close{width:36px;height:36px;border:0;border-radius:9px;background:#eef2f7;font-size:22px;cursor:pointer}
      #portfolioEditModalV2 .pem-body{padding:16px 18px}.pem-section{border:1px solid #dce5ef;border-radius:12px;padding:13px;margin-bottom:12px}.pem-section h3{font-size:12px;margin:0 0 10px}
      #portfolioEditModalV2 .pem-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.pem-field{display:grid;gap:5px}.pem-field.full{grid-column:1/-1}
      #portfolioEditModalV2 label{font-size:10px;font-weight:900;color:#475569}#portfolioEditModalV2 input,#portfolioEditModalV2 select,#portfolioEditModalV2 textarea{width:100%;border:1px solid #cfd9e6;border-radius:8px;padding:9px 10px;background:#fff;color:#0f172a}
      #portfolioEditModalV2 input,#portfolioEditModalV2 select{height:40px}#portfolioEditModalV2 textarea{min-height:92px;resize:vertical}
      #portfolioEditModalV2 .pem-actions{position:sticky;bottom:0;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid #dce5ef;background:#fff}.pem-status{margin-right:auto;font-size:11px;font-weight:800;color:#64748b}.pem-status.err{color:#b42335}
      #portfolioEditModalV2 .pem-btn{border:1px solid #dce5ef;border-radius:8px;padding:9px 15px;font-weight:900;cursor:pointer;background:#fff}.pem-btn.primary{background:#1769f6;color:#fff;border-color:#1769f6}.pem-btn:disabled{opacity:.55}
      @media(max-width:700px){#portfolioEditModalV2{padding:8px}#portfolioEditModalV2 .pem-grid{grid-template-columns:1fr}.pem-field.full{grid-column:auto}}
    `;
    document.head.appendChild(style);
    const m=document.createElement('div');
    m.id='portfolioEditModalV2';
    m.innerHTML=`<div class="pem-box"><div class="pem-head"><div><div id="pemTitle" class="pem-title">Müşteri Düzenle</div><div class="pem-sub">Müşteri bilgilerini geniş ekranda düzenleyin.</div></div><button type="button" class="pem-close">×</button></div><form id="pemForm"><div class="pem-body">
      <div class="pem-section"><h3>Firma ve iletişim</h3><div class="pem-grid">
        <div class="pem-field full"><label>Firma adı</label><input id="pemCompany" required></div>
        <div class="pem-field"><label>Yetkili / görüşülen kişi</label><input id="pemContact"></div><div class="pem-field"><label>Telefon</label><input id="pemPhone"></div>
        <div class="pem-field"><label>E-posta</label><input id="pemEmail" type="email"></div><div class="pem-field"><label>İl / Bölge</label><input id="pemRegion"></div>
        <div class="pem-field full"><label>İş alanı</label><input id="pemCategories"></div>
      </div></div>
      <div class="pem-section"><h3>Satış ve takip</h3><div class="pem-grid">
        <div class="pem-field"><label>Potansiyel</label><select id="pemPriority"><option>KRİTİK</option><option>YÜKSEK</option><option>NORMAL</option></select></div>
        <div class="pem-field"><label>Sonuç</label><select id="pemResult"><option value="open">Sonuçlanmamış</option><option value="waiting">Beklemede</option><option value="positive">Olumlu</option><option value="negative">Olumsuz</option></select></div>
        <div class="pem-field"><label>Sonraki işlem tarihi</label><input id="pemFollow" type="date"></div><div class="pem-field"><label>Makine / teknik bilgi</label><input id="pemMachine"></div>
        <div class="pem-field full"><label>Notlar</label><textarea id="pemNotes"></textarea></div>
      </div></div>
      <div class="pem-section"><h3>Fatura bilgileri</h3><div class="pem-grid">
        <div class="pem-field"><label>Fatura unvanı</label><input id="pemInvoiceTitle"></div><div class="pem-field"><label>Vergi dairesi</label><input id="pemTaxOffice"></div>
        <div class="pem-field"><label>Vergi numarası</label><input id="pemTaxNumber"></div><div class="pem-field full"><label>Fatura adresi</label><textarea id="pemInvoiceAddress" style="min-height:70px"></textarea></div>
      </div></div>
    </div><div class="pem-actions"><span id="pemStatus" class="pem-status"></span><button type="button" class="pem-btn pem-cancel">İptal</button><button id="pemSave" type="submit" class="pem-btn primary">Kaydet</button></div></form></div>`;
    const close=()=>m.classList.remove('show');
    m.addEventListener('click',e=>{if(e.target===m||e.target.closest('.pem-close')||e.target.closest('.pem-cancel'))close()});
    m.querySelector('#pemForm').addEventListener('submit',save);
    document.body.appendChild(m);
    return m;
  }

  function open(){
    const c=getSelected();if(!c)return;
    const m=ensure();
    $('pemTitle').textContent=(c.company||'Müşteri')+' — Düzenle';
    $('pemCompany').value=c.company||'';$('pemContact').value=c.contact_name||'';$('pemPhone').value=c.phone||parseArr(c.phones_json)[0]||'';$('pemEmail').value=c.email||parseArr(c.emails_json)[0]||'';$('pemRegion').value=c.region||'';$('pemCategories').value=c.categories||c.sector||'';$('pemPriority').value=c.priority||'NORMAL';$('pemResult').value=getResult(c);$('pemFollow').value=c.follow_date||'';$('pemMachine').value=c.machine_info||'';$('pemNotes').value=c.special_notes||'';$('pemInvoiceTitle').value=c.invoice_title||'';$('pemTaxOffice').value=c.tax_office||'';$('pemTaxNumber').value=c.tax_number||'';$('pemInvoiceAddress').value=c.invoice_address||'';
    $('pemStatus').textContent='';$('pemStatus').classList.remove('err');m.classList.add('show');
  }

  async function save(e){
    e.preventDefault();const c=getSelected();if(!c)return;
    const status=$('pemStatus'),btn=$('pemSave'),desired=$('pemResult').value;
    let stage=c.stage||'Yeni Lead';if(desired==='waiting')stage='Beklemede';else if(desired==='open'&&['Kazanıldı','Kaybedildi','Beklemede'].includes(stage))stage='İlk Görüşme';
    const phones=parseArr(c.phones_json),emails=parseArr(c.emails_json);if(clean($('pemPhone').value))phones[0]=clean($('pemPhone').value);if(clean($('pemEmail').value))emails[0]=clean($('pemEmail').value);
    const payload={company:clean($('pemCompany').value),contact_name:clean($('pemContact').value),phones,emails,region:clean($('pemRegion').value),categories:clean($('pemCategories').value).split(',').map(x=>x.trim()).filter(Boolean),priority:$('pemPriority').value,stage,follow_date:$('pemFollow').value,invoice_title:clean($('pemInvoiceTitle').value),tax_office:clean($('pemTaxOffice').value),tax_number:clean($('pemTaxNumber').value),invoice_address:clean($('pemInvoiceAddress').value),special_notes:$('pemNotes').value,machine_info:clean($('pemMachine').value)};
    if(!payload.company){status.textContent='Firma adı zorunlu.';status.classList.add('err');return}
    try{
      btn.disabled=true;status.textContent='Kaydediliyor...';status.classList.remove('err');
      await api('/api/customers/'+c.id,{method:'PUT',body:JSON.stringify(payload)});
      if(desired==='positive'||desired==='negative')await api('/api/customers/'+c.id+'/result',{method:'PUT',body:JSON.stringify({result:desired==='positive'?'Olumlu':'Olumsuz'})});
      status.textContent='Kaydedildi.';
      try{await loadAll(c.id)}catch{}
      setTimeout(()=>$('portfolioEditModalV2')?.classList.remove('show'),120);
    }catch(err){status.textContent=err?.message||'Kaydedilemedi.';status.classList.add('err')}
    finally{btn.disabled=false}
  }

  function bind(){
    ensure();
    window.openPortfolioEditModal=open;
    document.addEventListener('click',e=>{
      const btn=e.target.closest('#detail .detail-actions button');
      if(!btn)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open();
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();