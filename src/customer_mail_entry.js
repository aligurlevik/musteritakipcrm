import worker from './customer_followup_entry.js';

function rebuildHtml(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

const CUSTOMER_MAIL_PATCH=String.raw`
(function(){
  'use strict';
  if(window.__portfolioCustomerMailTab)return;
  window.__portfolioCustomerMailTab='20260930-mail-v1';

  var SENDER='ali@jetlazer.com';
  var style=document.createElement('style');
  style.id='portfolioCustomerMailTabStyle';
  style.textContent='\n#portfolioDetailExpandModal #tabOrders,#portfolioDetailExpandModal #tabAnalysis{display:none!important}\n#portfolioDetailExpandModal .pie-mail-panel{display:none!important;padding:12px 14px;background:#fff}\n#portfolioDetailExpandModal .pie-mail-panel.pie-extra-active{display:block!important}\n#portfolioDetailExpandModal .pie-mail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}\n#portfolioDetailExpandModal .pie-mail-title{font-size:17px;font-weight:950;color:#b91c1c}\n#portfolioDetailExpandModal .pie-mail-from{font-size:11px;color:#475569;margin-top:4px}\n#portfolioDetailExpandModal .pie-mail-refresh{border:1px solid #fecaca;background:#fff;color:#b91c1c;border-radius:8px;padding:7px 10px;font-weight:900;cursor:pointer}\n#portfolioDetailExpandModal .pie-mail-compose,#portfolioDetailExpandModal .pie-mail-incoming{border:1px solid #dbe5f0;border-radius:11px;background:#f8fafc;padding:11px;margin-bottom:11px}\n#portfolioDetailExpandModal .pie-mail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}\n#portfolioDetailExpandModal .pie-mail-field{min-width:0}\n#portfolioDetailExpandModal .pie-mail-field.wide{grid-column:1/-1}\n#portfolioDetailExpandModal .pie-mail-field label{display:block;font-size:10px;font-weight:900;color:#64748b;margin-bottom:3px}\n#portfolioDetailExpandModal .pie-mail-field input,#portfolioDetailExpandModal .pie-mail-field select,#portfolioDetailExpandModal .pie-mail-field textarea{width:100%;border:1px solid #cbd8e8;border-radius:8px;background:#fff;padding:8px 9px;font:inherit;font-size:12px;color:#0f172a}\n#portfolioDetailExpandModal .pie-mail-field textarea{min-height:92px;resize:vertical;line-height:1.4}\n#portfolioDetailExpandModal .pie-mail-actions{display:flex;align-items:center;gap:8px;justify-content:flex-end;margin-top:9px;flex-wrap:wrap}\n#portfolioDetailExpandModal .pie-mail-send{border:0;border-radius:9px;background:#16a34a;color:#fff;padding:9px 13px;font-weight:950;cursor:pointer}\n#portfolioDetailExpandModal .pie-mail-save-in{border:0;border-radius:9px;background:#2563eb;color:#fff;padding:8px 12px;font-weight:900;cursor:pointer}\n#portfolioDetailExpandModal .pie-mail-send:disabled,#portfolioDetailExpandModal .pie-mail-save-in:disabled{opacity:.55;cursor:wait}\n#portfolioDetailExpandModal .pie-mail-note{font-size:10px;color:#64748b;margin-top:7px}\n#portfolioDetailExpandModal .pie-mail-status{font-size:11px;font-weight:900;color:#15803d;margin-right:auto}\n#portfolioDetailExpandModal .pie-mail-status.err{color:#dc2626}\n#portfolioDetailExpandModal .pie-mail-incoming summary{cursor:pointer;font-size:12px;font-weight:900;color:#1e3a8a}\n#portfolioDetailExpandModal .pie-mail-history-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin:12px 0 8px}\n#portfolioDetailExpandModal .pie-mail-history-title{font-size:13px;font-weight:950;color:#0f172a}\n#portfolioDetailExpandModal .pie-mail-counts{font-size:10px;color:#64748b}\n#portfolioDetailExpandModal .pie-mail-history{display:grid;gap:7px;max-height:360px;overflow:auto}\n#portfolioDetailExpandModal .pie-mail-item{border:1px solid #dbe5f0;border-left:5px solid #2563eb;border-radius:9px;background:#fff;padding:9px 10px}\n#portfolioDetailExpandModal .pie-mail-item.outgoing{border-left-color:#16a34a}\n#portfolioDetailExpandModal .pie-mail-item-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}\n#portfolioDetailExpandModal .pie-mail-dir{display:inline-flex;padding:3px 7px;border-radius:999px;font-size:9px;font-weight:950;background:#dbeafe;color:#1d4ed8}\n#portfolioDetailExpandModal .pie-mail-item.outgoing .pie-mail-dir{background:#dcfce7;color:#047857}\n#portfolioDetailExpandModal .pie-mail-subject{font-size:12px;font-weight:950;color:#0f172a;margin-top:6px}\n#portfolioDetailExpandModal .pie-mail-body{font-size:11px;line-height:1.45;white-space:pre-wrap;color:#334155;margin-top:5px}\n#portfolioDetailExpandModal .pie-mail-meta{font-size:9px;color:#64748b;white-space:nowrap}\n#portfolioDetailExpandModal .pie-mail-empty{padding:14px;border:1px dashed #cbd8e8;border-radius:9px;color:#64748b;font-size:11px;background:#fff}\n@media(max-width:850px){#portfolioDetailExpandModal .pie-mail-grid{grid-template-columns:1fr}#portfolioDetailExpandModal .pie-mail-field.wide{grid-column:auto}}';
  document.head.appendChild(style);

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function currentCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}
  function parseArray(value){
    if(Array.isArray(value))return value;
    try{var x=JSON.parse(value||'[]');return Array.isArray(x)?x:[]}catch(_){return []}
  }
  function customerEmails(c){
    var out=[];
    function add(v){v=String(v||'').trim();if(!v||out.some(function(x){return x.toLowerCase()===v.toLowerCase()}))return;out.push(v)}
    add(c&&c.email);
    parseArray(c&&c.emails_json).forEach(add);
    parseArray(c&&c.contacts_json).forEach(function(x){add(x&&x.email)});
    return out;
  }
  function localDateTime(){
    var d=new Date(),off=d.getTimezoneOffset()*60000;
    return new Date(d.getTime()-off).toISOString().slice(0,16);
  }
  function prettyDate(v){
    if(!v)return '';
    try{return new Date(v).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(_){return String(v)}
  }
  async function api(path,opts){
    var options=Object.assign({credentials:'same-origin',cache:'no-store'},opts||{});
    options.headers=Object.assign({'cache-control':'no-cache'},options.headers||{});
    if(options.body&&typeof options.body==='string'&&!options.headers['content-type'])options.headers['content-type']='application/json';
    var r=await fetch(path,options),data={};
    try{data=await r.json()}catch(_){}
    if(!r.ok)throw new Error(data.error||'Mail işlemi yapılamadı.');
    return data;
  }
  function ensureHost(editor){
    var host=editor.querySelector('.pie-legacy-extra-host');
    if(host)return host;
    host=document.createElement('div');
    host.className='pie-legacy-extra-host';
    var readOnly=editor.querySelector('.pie-readonly-note');
    if(readOnly)readOnly.parentNode.insertBefore(host,readOnly);else editor.appendChild(host);
    return host;
  }
  function mailPanelHtml(c){
    var emails=customerEmails(c),options=emails.length?emails.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>'}).join(''):'<option value="">Mail adresi kayıtlı değil</option>';
    return '<div class="pie-mail-head"><div><div class="pie-mail-title">✉️ Müşteri Mail Yazışmaları</div><div class="pie-mail-from">Gönderen hesap: <b>'+esc(SENDER)+'</b></div></div><button type="button" class="pie-mail-refresh" data-mail-refresh>↻ Yenile</button></div>'+
      '<section class="pie-mail-compose"><div class="pie-mail-grid">'+
        '<div class="pie-mail-field"><label>Müşterinin Mail Adresi</label><select data-mail-to>'+options+'</select></div>'+
        '<div class="pie-mail-field"><label>Gönderen</label><input value="'+esc(SENDER)+'" readonly></div>'+
        '<div class="pie-mail-field wide"><label>Konu</label><input data-mail-subject placeholder="Mail konusu"></div>'+
        '<div class="pie-mail-field wide"><label>Mesaj</label><textarea data-mail-body placeholder="Müşteriye göndereceğiniz mesajı yazın"></textarea></div>'+
      '</div><div class="pie-mail-actions"><span class="pie-mail-status" data-mail-status></span><button type="button" class="pie-mail-send" data-mail-send>✉️ Outlook\'ta Aç ve CRM\'ye Kopyala</button></div>'+
      '<div class="pie-mail-note">Mail Outlook\'ta hazır açılır. Gönderici olarak <b>'+esc(SENDER)+'</b> hesabının seçili olması gerekir. Gönderilecek metnin bir kopyası önce bu müşteri kartına kaydedilir.</div></section>'+
      '<details class="pie-mail-incoming"><summary>📥 Gelen müşteri cevabını kaydet</summary><div class="pie-mail-grid" style="margin-top:9px">'+
        '<div class="pie-mail-field"><label>Tarih / Saat</label><input type="datetime-local" data-mail-in-date value="'+esc(localDateTime())+'"></div>'+
        '<div class="pie-mail-field"><label>Müşteri Maili</label><select data-mail-in-from>'+options+'</select></div>'+
        '<div class="pie-mail-field wide"><label>Konu</label><input data-mail-in-subject placeholder="Gelen mail konusu"></div>'+
        '<div class="pie-mail-field wide"><label>Müşterinin Cevabı</label><textarea data-mail-in-body placeholder="Gelen cevabı buraya yapıştırın"></textarea></div>'+
      '</div><div class="pie-mail-actions"><span class="pie-mail-status" data-mail-in-status></span><button type="button" class="pie-mail-save-in" data-mail-in-save>📥 Gelen Cevabı Kaydet</button></div></details>'+
      '<div class="pie-mail-history-head"><div class="pie-mail-history-title">📁 Bu Firmaya Ait Gelen ve Giden Mailler</div><div class="pie-mail-counts" data-mail-counts></div></div>'+
      '<div class="pie-mail-history" data-mail-history><div class="pie-mail-empty">Mailler yükleniyor...</div></div>';
  }
  function ensureMailPanel(editor){
    var host=ensureHost(editor),panel=host.querySelector('[data-pie-extra="mail"]'),c=currentCustomer();
    if(!c||!c.id)return null;
    if(!panel){
      panel=document.createElement('div');
      panel.className='tabpane pie-mail-panel';
      panel.setAttribute('data-pie-extra','mail');
      host.appendChild(panel);
    }
    if(panel.getAttribute('data-customer-id')!==String(c.id)){
      panel.setAttribute('data-customer-id',String(c.id));
      panel.innerHTML=mailPanelHtml(c);
      wirePanel(panel,c);
      loadHistory(panel,c);
    }
    return panel;
  }
  async function loadHistory(panel,c){
    var box=panel.querySelector('[data-mail-history]'),counts=panel.querySelector('[data-mail-counts]');
    if(!box)return;
    box.innerHTML='<div class="pie-mail-empty">Mailler yükleniyor...</div>';
    try{
      var rows=await api('/api/mails'),emails=customerEmails(c).map(function(x){return x.toLowerCase()}),id=Number(c.id);
      var items=(Array.isArray(rows)?rows:[]).filter(function(x){
        return Number(x.customer_id)===id||emails.indexOf(String(x.email||'').trim().toLowerCase())>=0;
      }).sort(function(a,b){return String(b.mail_date||b.created_at||'').localeCompare(String(a.mail_date||a.created_at||''))});
      var incoming=items.filter(function(x){return String(x.direction||'').toLocaleLowerCase('tr-TR')!=='giden'}).length,outgoing=items.length-incoming;
      if(counts)counts.textContent=incoming+' gelen • '+outgoing+' giden • toplam '+items.length;
      if(!items.length){box.innerHTML='<div class="pie-mail-empty">Bu firmaya ait henüz mail kaydı yok.</div>';return}
      box.innerHTML=items.map(function(x){
        var isOut=String(x.direction||'').toLocaleLowerCase('tr-TR')==='giden';
        return '<div class="pie-mail-item '+(isOut?'outgoing':'incoming')+'"><div class="pie-mail-item-head"><span class="pie-mail-dir">'+(isOut?'📤 Giden':'📥 Gelen')+'</span><span class="pie-mail-meta">'+esc(prettyDate(x.mail_date||x.created_at||''))+'</span></div><div class="pie-mail-subject">'+esc(x.subject||'Konu yok')+'</div><div class="pie-mail-body">'+esc(x.summary||'İçerik kaydedilmemiş.')+'</div><div class="pie-mail-meta" style="margin-top:6px">'+esc(x.email||'')+'</div></div>';
      }).join('');
    }catch(error){
      if(counts)counts.textContent='';
      box.innerHTML='<div class="pie-mail-empty" style="color:#b91c1c">'+esc(error.message||'Mailler yüklenemedi.')+'</div>';
    }
  }
  async function saveOutgoing(panel,c){
    var to=String(panel.querySelector('[data-mail-to]')&&panel.querySelector('[data-mail-to]').value||'').trim(),subject=String(panel.querySelector('[data-mail-subject]')&&panel.querySelector('[data-mail-subject]').value||'').trim(),body=String(panel.querySelector('[data-mail-body]')&&panel.querySelector('[data-mail-body]').value||'').trim(),status=panel.querySelector('[data-mail-status]'),btn=panel.querySelector('[data-mail-send]');
    if(!to){status.textContent='Müşterinin mail adresi kayıtlı değil.';status.className='pie-mail-status err';return}
    if(!subject){status.textContent='Mail konusu boş olamaz.';status.className='pie-mail-status err';return}
    if(!body){status.textContent='Mesaj boş olamaz.';status.className='pie-mail-status err';return}
    btn.disabled=true;status.textContent='CRM kopyası kaydediliyor...';status.className='pie-mail-status';
    try{
      await api('/api/mails',{method:'POST',body:JSON.stringify({customer_id:Number(c.id),direction:'Giden',mail_date:localDateTime(),email:to,subject:subject,summary:body,follow_date:''})});
      await loadHistory(panel,c);
      status.textContent='Kopya kaydedildi. Outlook açılıyor...';
      var link='mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
      setTimeout(function(){window.location.href=link},80);
    }catch(error){status.textContent=error.message||'Mail kopyası kaydedilemedi.';status.className='pie-mail-status err'}finally{btn.disabled=false}
  }
  async function saveIncoming(panel,c){
    var from=String(panel.querySelector('[data-mail-in-from]')&&panel.querySelector('[data-mail-in-from]').value||'').trim(),subject=String(panel.querySelector('[data-mail-in-subject]')&&panel.querySelector('[data-mail-in-subject]').value||'').trim(),body=String(panel.querySelector('[data-mail-in-body]')&&panel.querySelector('[data-mail-in-body]').value||'').trim(),date=String(panel.querySelector('[data-mail-in-date]')&&panel.querySelector('[data-mail-in-date]').value||localDateTime()),status=panel.querySelector('[data-mail-in-status]'),btn=panel.querySelector('[data-mail-in-save]');
    if(!from){status.textContent='Müşterinin mail adresi kayıtlı değil.';status.className='pie-mail-status err';return}
    if(!body){status.textContent='Gelen cevap boş olamaz.';status.className='pie-mail-status err';return}
    btn.disabled=true;status.textContent='Kaydediliyor...';status.className='pie-mail-status';
    try{
      await api('/api/mails',{method:'POST',body:JSON.stringify({customer_id:Number(c.id),direction:'Gelen',mail_date:date,email:from,subject:subject||'Konu yok',summary:body,follow_date:''})});
      panel.querySelector('[data-mail-in-subject]').value='';panel.querySelector('[data-mail-in-body]').value='';panel.querySelector('[data-mail-in-date]').value=localDateTime();
      status.textContent='Gelen cevap kaydedildi.';await loadHistory(panel,c);
    }catch(error){status.textContent=error.message||'Gelen cevap kaydedilemedi.';status.className='pie-mail-status err'}finally{btn.disabled=false}
  }
  function wirePanel(panel,c){
    panel.querySelector('[data-mail-refresh]').addEventListener('click',function(){loadHistory(panel,c)});
    panel.querySelector('[data-mail-send]').addEventListener('click',function(){saveOutgoing(panel,c)});
    panel.querySelector('[data-mail-in-save]').addEventListener('click',function(){saveIncoming(panel,c)});
  }
  function activeIndex(tabs){
    var active=tabs&&tabs.querySelector('.pie-top-tab.active');
    return active?Number(active.getAttribute('data-tab-index')||0):0;
  }
  function syncExtra(editor,index){
    var host=ensureHost(editor),offer=host.querySelector('[data-pie-extra="tabOffers"]'),mail=ensureMailPanel(editor);
    if(offer)offer.classList.toggle('pie-extra-active',index===5);
    if(mail)mail.classList.toggle('pie-extra-active',index===6);
    var orders=document.getElementById('tabOrders');if(orders)orders.style.display='none';
    var analysis=document.getElementById('tabAnalysis');if(analysis)analysis.style.display='none';
    var note=editor.querySelector('.pie-readonly-note'),actions=editor.querySelector('.pie-actions'),extra=index>=5;
    if(note)note.style.display=extra?'none':'';
    if(actions)actions.style.display=extra?'none':'';
    if(index===6&&mail)loadHistory(mail,currentCustomer());
  }
  function prepare(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var editor=modal.querySelector('.pdem-body .pie-editor');if(!editor)return;
    var tabs=editor.querySelector('.pie-top-tabs');if(!tabs)return;
    var offer=tabs.querySelector('[data-tab-index="5"]');if(offer)offer.textContent='Teklifler';
    var mail=tabs.querySelector('[data-tab-index="6"]');
    if(!mail){mail=document.createElement('button');mail.type='button';mail.className='pie-top-tab';mail.setAttribute('role','tab');mail.setAttribute('aria-selected','false');mail.setAttribute('data-tab-index','6');tabs.appendChild(mail)}
    mail.textContent='Mail';
    Array.prototype.slice.call(tabs.querySelectorAll('.pie-top-tab')).forEach(function(btn){if(Number(btn.getAttribute('data-tab-index'))>6)btn.remove()});
    var orders=modal.querySelector('#tabOrders');if(orders)orders.style.display='none';
    var analysis=modal.querySelector('#tabAnalysis');if(analysis)analysis.style.display='none';
    ensureMailPanel(editor);
    syncExtra(editor,activeIndex(tabs));
  }

  document.addEventListener('click',function(event){
    var btn=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal .pie-top-tab'):null;
    if(!btn)return;
    setTimeout(function(){var editor=btn.closest('.pie-editor');if(editor)syncExtra(editor,Number(btn.getAttribute('data-tab-index')||0))},30);
  },true);
  var observer=new MutationObserver(function(){setTimeout(prepare,0)});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  setInterval(prepare,500);
})();
`;

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-customer-mail-tab[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-customer-mail-tab="20260930-mail-v1">\n${CUSTOMER_MAIL_PATCH}\n</script>\n</body>`);
      return rebuildHtml(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
