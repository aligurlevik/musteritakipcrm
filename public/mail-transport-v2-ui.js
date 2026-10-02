(function(){
  'use strict';
  if(window.__crmMailTransportV2Ui)return;
  window.__crmMailTransportV2Ui='20261002-v4';

  var KEY='crm_mail_session_password';
  function clean(v){return String(v==null?'':v).trim()}
  function localDateTime(){var d=new Date(),off=d.getTimezoneOffset()*60000;return new Date(d.getTime()-off).toISOString().slice(0,16)}
  async function post(path,data){
    var r=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','cache-control':'no-cache'},body:JSON.stringify(data)}),d={};
    try{d=await r.json()}catch(_){ }
    if(!r.ok)throw new Error(d.error||'Mail işlemi başarısız.');
    return d;
  }
  function notifyLast(id,at){
    if(!id||!at)return;
    window.dispatchEvent(new CustomEvent('crm-last-contact-updated',{detail:{customer_id:id,last_contact_at:at}}));
  }
  async function touch(id,at){
    if(!id)return null;
    var d=await post('/api/sales-care-touch',{customer_id:id,last_contact_at:at||new Date().toISOString()});
    notifyLast(id,d.last_contact_at);
    return d;
  }
  function password(box,status){
    var input=box.querySelector('[data-mail-transport-pass]');
    var p=clean(input&&input.value)||clean(sessionStorage.getItem(KEY));
    if(!p){
      box.open=true;
      status.textContent='Mail parolasını bir kez girin.';
      status.className='crm-mail-v2-status err';
      if(input)input.focus();
      return '';
    }
    sessionStorage.setItem(KEY,p);
    return p;
  }
  function currentId(pane){return Number(pane&&pane.dataset.customerId||0)}
  function refresh(pane){var b=pane.querySelector('[data-v2-mail-refresh]');if(b)b.click()}
  function draftKey(pane){return 'crm_mail_draft_customer_'+String(currentId(pane)||'0')}
  function fields(pane){return {to:pane.querySelector('[data-v2-mail-to]'),subject:pane.querySelector('[data-v2-mail-subject]'),body:pane.querySelector('[data-v2-mail-body]')}}
  function readDraft(pane){try{return JSON.parse(localStorage.getItem(draftKey(pane))||'null')}catch(_){return null}}
  function writeDraft(pane){
    try{
      var f=fields(pane);if(!f.to||!f.subject||!f.body)return;
      localStorage.setItem(draftKey(pane),JSON.stringify({to:f.to.value||'',subject:f.subject.value||'',body:f.body.value||'',updated_at:Date.now()}));
    }catch(_){ }
  }
  function clearDraft(pane){try{localStorage.removeItem(draftKey(pane))}catch(_){ }}
  function restoreDraft(pane){
    var d=readDraft(pane);if(!d)return false;
    var f=fields(pane),restored=false;
    if(f.to&&!clean(f.to.value)&&clean(d.to)){f.to.value=d.to;restored=true}
    if(f.subject&&!clean(f.subject.value)&&clean(d.subject)){f.subject.value=d.subject;restored=true}
    if(f.body&&!clean(f.body.value)&&clean(d.body)){f.body.value=d.body;restored=true}
    return restored;
  }
  function bindDraft(pane){
    var f=fields(pane);[f.to,f.subject,f.body].forEach(function(el){if(!el||el.dataset.mailDraftBound==='1')return;el.dataset.mailDraftBound='1';el.addEventListener('input',function(){writeDraft(pane)});el.addEventListener('change',function(){writeDraft(pane)})});
  }
  async function clipboardText(){
    if(!navigator.clipboard||!navigator.clipboard.readText)throw new Error('Tarayıcı panoyu otomatik okuyamadı. Mesaj alanına Ctrl+V yapın.');
    var text=await navigator.clipboard.readText();
    if(!clean(text))throw new Error('Panoda metin bulunamadı.');
    return text;
  }

  function style(){
    if(document.getElementById('crmMailTransportV2Style'))return;
    var s=document.createElement('style');s.id='crmMailTransportV2Style';
    s.textContent='\n#portfolioDetailExpandModal .crm-mail-transport-v2{border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;margin-bottom:10px;padding:9px 10px}\n#portfolioDetailExpandModal .crm-mail-transport-v2 summary{cursor:pointer;font-size:11px;font-weight:950;color:#1d4ed8}\n#portfolioDetailExpandModal .crm-mail-transport-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}\n#portfolioDetailExpandModal .crm-mail-transport-grid label{font-size:9px;font-weight:900;color:#64748b}\n#portfolioDetailExpandModal .crm-mail-transport-grid input{width:100%;margin-top:3px;border:1px solid #cbd8e8;border-radius:7px;padding:7px 8px;background:#fff}\n#portfolioDetailExpandModal .crm-mail-transport-tools{display:flex;gap:7px;align-items:center;justify-content:flex-end;flex-wrap:wrap;margin-top:8px}\n#portfolioDetailExpandModal .crm-mail-transport-tools button{border:0;border-radius:8px;padding:8px 10px;font-size:10px;font-weight:900;cursor:pointer}\n#portfolioDetailExpandModal .crm-mail-test-v2{background:#e0e7ff;color:#3730a3}\n#portfolioDetailExpandModal .crm-mail-sync-v2{background:#dbeafe;color:#1d4ed8}\n#portfolioDetailExpandModal .crm-mail-save-old{background:#f59e0b!important;color:#fff!important}\n#portfolioDetailExpandModal .crm-mail-paste-old{background:#e0f2fe!important;color:#075985!important;border:1px solid #bae6fd!important}\n#portfolioDetailExpandModal .crm-mail-direct-send{background:#16a34a!important;color:#fff!important}\n#portfolioDetailExpandModal .crm-mail-transport-msg{margin-right:auto;font-size:9px;font-weight:900;color:#15803d}\n#portfolioDetailExpandModal .crm-mail-transport-msg.err{color:#dc2626}\n#portfolioDetailExpandModal .crm-mail-draft-note{font-size:9px;color:#64748b;margin:5px 0 0;text-align:right}\n@media(max-width:760px){#portfolioDetailExpandModal .crm-mail-transport-grid{grid-template-columns:1fr}}';
    document.head.appendChild(s);
  }

  function decorate(pane){
    if(!pane||pane.dataset.transportV2Ready==='1')return;
    var send=pane.querySelector('[data-v2-mail-send]');
    var actions=send&&send.closest('.crm-mail-v2-actions');
    var boxRoot=pane.querySelector('.crm-mail-v2-box');
    if(!send||!actions||!boxRoot)return;
    pane.dataset.transportV2Ready='1';

    var details=document.createElement('details');
    details.className='crm-mail-transport-v2';
    details.innerHTML='<summary>⚙️ Mail hesabı bağlantısı — bir kez aç</summary><div class="crm-mail-transport-grid"><label>Hesap<input value="ali@jetlazer.com" readonly></label><label>Sunucu<input value="mail.trweb.net" readonly></label><label>Mail Parolası<input type="password" data-mail-transport-pass autocomplete="current-password" placeholder="Parola yalnız bu oturumda tutulur"></label><label>Bağlantı<input value="SMTP 587 / POP3 995 TLS" readonly></label></div><div class="crm-mail-transport-tools"><span class="crm-mail-transport-msg" data-mail-transport-msg></span><button type="button" class="crm-mail-test-v2">Bağlantıyı Test Et</button><button type="button" class="crm-mail-sync-v2">📥 Gelenleri Otomatik Getir</button></div>';
    boxRoot.insertBefore(details,boxRoot.firstChild);
    var passInput=details.querySelector('[data-mail-transport-pass]');passInput.value=sessionStorage.getItem(KEY)||'';passInput.oninput=function(){sessionStorage.setItem(KEY,this.value)};
    var msg=details.querySelector('[data-mail-transport-msg]');

    var restored=restoreDraft(pane);bindDraft(pane);
    var draftNote=document.createElement('div');draftNote.className='crm-mail-draft-note';draftNote.textContent=restored?'↩ Önceki yazdığınız mail taslağı otomatik geri getirildi.':'Yazdığınız mail otomatik taslak olarak saklanır; sayfa yenilense de kaybolmaz.';
    var messageArea=pane.querySelector('[data-v2-mail-body]');if(messageArea&&messageArea.parentNode)messageArea.parentNode.appendChild(draftNote);

    details.querySelector('.crm-mail-test-v2').onclick=async function(){var p=password(details,msg);if(!p)return;this.disabled=true;msg.textContent='Bağlantı deneniyor...';msg.className='crm-mail-transport-msg';try{await post('/api/customer-mail/test',{password:p});msg.textContent='✅ Mail bağlantısı hazır.'}catch(e){msg.textContent=e.message;msg.className='crm-mail-transport-msg err'}finally{this.disabled=false}};
    details.querySelector('.crm-mail-sync-v2').onclick=async function(){var p=password(details,msg),id=currentId(pane);if(!p||!id)return;this.disabled=true;msg.textContent='Gelen kutusu kontrol ediliyor...';msg.className='crm-mail-transport-msg';try{var d=await post('/api/customer-mail/sync',{password:p,customer_id:id});notifyLast(id,d.last_contact_at);msg.textContent='✅ '+d.added+' yeni gelen mail CRM’ye alındı.';refresh(pane)}catch(e){msg.textContent=e.message;msg.className='crm-mail-transport-msg err'}finally{this.disabled=false}};

    var oldSend=send;
    var direct=oldSend.cloneNode(true);oldSend.replaceWith(direct);
    direct.classList.add('crm-mail-direct-send');direct.textContent='✉️ Şimdi Gönder + CRM’ye Kaydet';
    direct.onclick=async function(){
      var status=pane.querySelector('[data-v2-mail-status]'),p=password(details,status);if(!p)return;
      var f=fields(pane),to=clean(f.to&&f.to.value),subject=clean(f.subject&&f.subject.value),body=clean(f.body&&f.body.value),id=currentId(pane);
      if(!to||!subject||!body){status.textContent=!to?'Müşteri maili yok.':!subject?'Konu boş olamaz.':'Mesaj boş olamaz.';status.className='crm-mail-v2-status err';return}
      this.disabled=true;status.textContent='Mail gönderiliyor...';status.className='crm-mail-v2-status';
      try{var d=await post('/api/customer-mail/send',{password:p,customer_id:id,to:to,subject:subject,body:body});notifyLast(id,d.last_contact_at);status.textContent='✅ Mail gönderildi, CRM’ye kaydedildi ve Son Görüşme güncellendi.';f.subject.value='';f.body.value='';clearDraft(pane);refresh(pane)}catch(e){status.textContent=e.message;status.className='crm-mail-v2-status err'}finally{this.disabled=false}
    };

    var pasteOld=document.createElement('button');pasteOld.type='button';pasteOld.className='crm-mail-v2-btn crm-mail-paste-old';pasteOld.textContent='📋 Panodan Al';actions.insertBefore(pasteOld,direct);
    pasteOld.onclick=async function(){
      var status=pane.querySelector('[data-v2-mail-status]'),f=fields(pane);this.disabled=true;
      try{f.body.value=await clipboardText();writeDraft(pane);status.textContent='✅ Panodaki metin mesaj alanına alındı.';status.className='crm-mail-v2-status'}catch(e){status.textContent=e.message;status.className='crm-mail-v2-status err'}finally{this.disabled=false}
    };

    var saveOld=document.createElement('button');saveOld.type='button';saveOld.className='crm-mail-v2-btn crm-mail-save-old';saveOld.textContent='💾 Önceden Gönderileni Kaydet';
    actions.insertBefore(saveOld,direct);
    saveOld.onclick=async function(){
      var status=pane.querySelector('[data-v2-mail-status]'),f=fields(pane),to=clean(f.to&&f.to.value),subject=clean(f.subject&&f.subject.value),body=clean(f.body&&f.body.value),id=currentId(pane);
      if(!body){
        try{body=await clipboardText();if(f.body)f.body.value=body;writeDraft(pane);status.textContent='Panodaki metin alındı, kaydediliyor...';status.className='crm-mail-v2-status'}catch(e){status.textContent='Mesaj boş. '+e.message;status.className='crm-mail-v2-status err';return}
      }
      if(!subject)subject='Önceden gönderilmiş mail';
      this.disabled=true;status.textContent='CRM’ye kaydediliyor...';status.className='crm-mail-v2-status';
      try{
        var savedAt=localDateTime();
        await post('/api/mails',{customer_id:id,direction:'Giden',mail_date:savedAt,email:to,subject:subject,summary:body,follow_date:''});
        await touch(id,new Date().toISOString());
        status.textContent='✅ Önceden gönderilmiş mail CRM’ye kaydedildi ve Son Görüşme güncellendi.';
        if(f.subject)f.subject.value='';if(f.body)f.body.value='';clearDraft(pane);refresh(pane);
      }catch(e){status.textContent=e.message;status.className='crm-mail-v2-status err'}finally{this.disabled=false}
    };

    var info=pane.querySelector('.crm-mail-v2-info');
    if(info)info.textContent='Mail gönderildiğinde veya gelen mail CRM’ye alındığında Son Görüşme tarihi otomatik güncellenir. Yazdığınız mail ayrıca otomatik taslak olarak saklanır.';
  }

  function scan(){style();document.querySelectorAll('#portfolioDetailExpandModal .crm-mail-v2-pane').forEach(decorate)}
  new MutationObserver(function(){setTimeout(scan,0)}).observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',function(){setTimeout(scan,60)},true);
  setInterval(scan,900);scan();
})();
