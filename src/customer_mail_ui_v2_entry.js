import worker from './customer_sales_meetings_entry.js';

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

const MAIL_UI_V2_PATCH=String.raw`
(function(){
  if(window.__crmMailUiV2)return;
  window.__crmMailUiV2='20261001-mail-ui-v2';

  var style=document.createElement('style');
  style.id='crmMailUiV2Style';
  style.textContent='\n#portfolioDetailExpandModal .crm-mail-v2-pane{display:none!important;padding:14px;background:#fff}\n#portfolioDetailExpandModal .pie-editor:has(.pie-top-tab[data-tab-index="6"].active) .crm-mail-v2-pane{display:block!important}\n#portfolioDetailExpandModal .pie-editor:has(.pie-top-tab[data-tab-index="6"].active) .pie-section{display:none!important}\n#portfolioDetailExpandModal .pie-editor:has(.pie-top-tab[data-tab-index="6"].active) .pie-readonly-note{display:none!important}\n#portfolioDetailExpandModal .pie-editor:has(.pie-top-tab[data-tab-index="6"].active) .pie-actions{display:none!important}\n#portfolioDetailExpandModal .pie-editor:has(.pie-top-tab[data-tab-index="6"].active) .pie-legacy-extra-host{display:none!important}\n#portfolioDetailExpandModal .pie-editor:has(.pie-top-tab[data-tab-index="6"].active) .crm-mail-fixed-pane{display:none!important}\n#portfolioDetailExpandModal .crm-mail-v2-box{border:1px solid #dbe5f0;border-radius:12px;background:#f8fafc;padding:14px}\n#portfolioDetailExpandModal .crm-mail-v2-title{font-size:16px;font-weight:950;color:#b91c1c;margin-bottom:11px}\n#portfolioDetailExpandModal .crm-mail-v2-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}\n#portfolioDetailExpandModal .crm-mail-v2-field.wide{grid-column:1/-1}\n#portfolioDetailExpandModal .crm-mail-v2-field label{display:block;font-size:10px;font-weight:900;color:#64748b;margin-bottom:4px}\n#portfolioDetailExpandModal .crm-mail-v2-field input,#portfolioDetailExpandModal .crm-mail-v2-field textarea{width:100%;border:1px solid #cbd8e8;border-radius:8px;background:#fff;padding:8px 9px;font:inherit;font-size:12px;color:#0f172a}\n#portfolioDetailExpandModal .crm-mail-v2-field textarea{min-height:95px;resize:vertical}\n#portfolioDetailExpandModal .crm-mail-v2-actions{display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap;margin-top:10px}\n#portfolioDetailExpandModal .crm-mail-v2-status{margin-right:auto;font-size:10px;font-weight:900;color:#15803d}\n#portfolioDetailExpandModal .crm-mail-v2-status.err{color:#dc2626}\n#portfolioDetailExpandModal .crm-mail-v2-btn{border:0;border-radius:8px;padding:9px 12px;font-weight:900;cursor:pointer}\n#portfolioDetailExpandModal .crm-mail-v2-send{background:#16a34a;color:#fff}\n#portfolioDetailExpandModal .crm-mail-v2-save{background:#2563eb;color:#fff}\n#portfolioDetailExpandModal .crm-mail-v2-refresh{background:#fff;color:#b91c1c;border:1px solid #fecaca}\n#portfolioDetailExpandModal .crm-mail-v2-info{margin:10px 0;padding:9px 10px;border:1px solid #bfdbfe;border-radius:9px;background:#eff6ff;color:#1e3a8a;font-size:10px;font-weight:800}\n#portfolioDetailExpandModal .crm-mail-v2-history{display:grid;gap:7px;margin-top:12px;max-height:300px;overflow:auto}\n#portfolioDetailExpandModal .crm-mail-v2-item{border:1px solid #dbe5f0;border-left:5px solid #2563eb;border-radius:9px;background:#fff;padding:9px}\n#portfolioDetailExpandModal .crm-mail-v2-item.out{border-left-color:#16a34a}\n#portfolioDetailExpandModal .crm-mail-v2-meta{font-size:9px;color:#64748b}\n#portfolioDetailExpandModal .crm-mail-v2-subject{font-size:12px;font-weight:900;color:#0f172a;margin-top:4px}\n#portfolioDetailExpandModal .crm-mail-v2-body{font-size:11px;white-space:pre-wrap;color:#334155;margin-top:4px}\n#portfolioDetailExpandModal .crm-mail-v2-warning{padding:12px;border:1px solid #fecaca;border-radius:9px;background:#fff1f2;color:#b91c1c;font-size:11px;font-weight:900}\n@media(max-width:760px){#portfolioDetailExpandModal .crm-mail-v2-grid{grid-template-columns:1fr}#portfolioDetailExpandModal .crm-mail-v2-field.wide{grid-column:auto}}';
  document.head.appendChild(style);

  function clean(v){return String(v==null?'':v).trim()}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function parseArray(v){if(Array.isArray(v))return v;try{var a=JSON.parse(v||'[]');return Array.isArray(a)?a:[]}catch(_){return []}}
  function localDateTime(){var d=new Date(),off=d.getTimezoneOffset()*60000;return new Date(d.getTime()-off).toISOString().slice(0,16)}
  function prettyDate(v){try{return new Date(v).toLocaleString('tr-TR')}catch(_){return String(v||'')}}

  function currentCustomer(){
    try{if(typeof selected!=='undefined'&&selected&&selected.id)return selected}catch(_){ }
    try{
      var modal=document.getElementById('portfolioDetailExpandModal');
      var title=modal&&modal.querySelector('.pdem-title,.modal-title,h2,h3');
      var text=clean(title&&title.textContent).replace(/^Müşteri Kartı\s*[—-]\s*/i,'');
      if(text&&typeof customers!=='undefined'&&Array.isArray(customers)){
        var found=customers.find(function(x){return clean(x&&x.company)===text});
        if(found)return found;
      }
    }catch(_){ }
    return null;
  }

  function customerEmails(c){
    var out=[];
    function add(v){v=clean(v);if(v&&!out.some(function(x){return x.toLowerCase()===v.toLowerCase()}))out.push(v)}
    add(c&&c.email);
    parseArray(c&&c.emails_json).forEach(add);
    parseArray(c&&c.contacts_json).forEach(function(x){if(x&&typeof x==='object')add(x.email)});
    return out;
  }

  async function mailApi(path,opts){
    var o=Object.assign({credentials:'same-origin',cache:'no-store'},opts||{});
    o.headers=Object.assign({'cache-control':'no-cache'},o.headers||{});
    if(o.body&&!o.headers['content-type'])o.headers['content-type']='application/json';
    var r=await fetch(path,o),d={};
    try{d=await r.json()}catch(_){ }
    if(!r.ok)throw new Error(d.error||'Mail işlemi yapılamadı.');
    return d;
  }

  async function loadHistory(pane,c){
    var box=pane.querySelector('[data-v2-mail-history]');
    if(!box)return;
    box.innerHTML='<div class="crm-mail-v2-meta">Mailler yükleniyor...</div>';
    try{
      var rows=await mailApi('/api/mails');
      var emails=customerEmails(c).map(function(x){return x.toLowerCase()});
      var id=Number(c&&c.id||0);
      var items=(Array.isArray(rows)?rows:[]).filter(function(x){return Number(x.customer_id)===id||emails.indexOf(clean(x.email).toLowerCase())>=0}).sort(function(a,b){return String(b.mail_date||b.created_at||'').localeCompare(String(a.mail_date||a.created_at||''))});
      if(!items.length){box.innerHTML='<div class="crm-mail-v2-meta">Bu firmaya ait henüz mail kaydı yok.</div>';return}
      box.innerHTML=items.map(function(x){var out=String(x.direction||'').toLocaleLowerCase('tr-TR')==='giden';return '<div class="crm-mail-v2-item '+(out?'out':'')+'"><div class="crm-mail-v2-meta">'+(out?'📤 Giden':'📥 Gelen')+' • '+esc(prettyDate(x.mail_date||x.created_at||''))+' • '+esc(x.email||'')+'</div><div class="crm-mail-v2-subject">'+esc(x.subject||'Konu yok')+'</div><div class="crm-mail-v2-body">'+esc(x.summary||'')+'</div></div>'}).join('');
    }catch(e){box.innerHTML='<div class="crm-mail-v2-meta" style="color:#dc2626">'+esc(e&&e.message?e.message:'Mailler yüklenemedi.')+'</div>'}
  }

  function buildPane(pane,c){
    var emails=customerEmails(c),firstMail=emails[0]||'';
    pane.dataset.customerId=String(c&&c.id||'');
    pane.innerHTML='<div class="crm-mail-v2-box"><div class="crm-mail-v2-title">✉️ Müşteri Mail Yazışmaları</div><div class="crm-mail-v2-grid"><div class="crm-mail-v2-field"><label>Müşterinin Mail Adresi</label><input data-v2-mail-to value="'+esc(firstMail)+'" placeholder="musteri@firma.com"></div><div class="crm-mail-v2-field"><label>Gönderen</label><input value="ali@jetlazer.com" readonly></div><div class="crm-mail-v2-field wide"><label>Konu</label><input data-v2-mail-subject placeholder="Mail konusu"></div><div class="crm-mail-v2-field wide"><label>Mesaj</label><textarea data-v2-mail-body placeholder="Müşteriye yazacağınız mesaj"></textarea></div></div><div class="crm-mail-v2-actions"><span class="crm-mail-v2-status" data-v2-mail-status></span><button type="button" class="crm-mail-v2-btn crm-mail-v2-refresh" data-v2-mail-refresh>↻ Yenile</button><button type="button" class="crm-mail-v2-btn crm-mail-v2-send" data-v2-mail-send>✉️ Outlook’ta Aç ve CRM’ye Kopyala</button></div><div class="crm-mail-v2-info">CRM’den başlattığınız giden mailler bu müşteri kartında saklanır. Outlook’tan gelen cevapların otomatik aktarımı henüz bağlı değildir.</div><details><summary style="cursor:pointer;font-weight:900;color:#1d4ed8">📥 Gelen müşteri cevabını kaydet</summary><div class="crm-mail-v2-grid" style="margin-top:8px"><div class="crm-mail-v2-field"><label>Tarih / Saat</label><input type="datetime-local" data-v2-mail-in-date value="'+localDateTime()+'"></div><div class="crm-mail-v2-field"><label>Müşteri Maili</label><input data-v2-mail-in-from value="'+esc(firstMail)+'" placeholder="musteri@firma.com"></div><div class="crm-mail-v2-field wide"><label>Konu</label><input data-v2-mail-in-subject placeholder="Gelen mail konusu"></div><div class="crm-mail-v2-field wide"><label>Cevap</label><textarea data-v2-mail-in-body placeholder="Müşterinin cevabını buraya yapıştırın"></textarea></div></div><div class="crm-mail-v2-actions"><span class="crm-mail-v2-status" data-v2-mail-in-status></span><button type="button" class="crm-mail-v2-btn crm-mail-v2-save" data-v2-mail-in-save>📥 Gelen Cevabı Kaydet</button></div></details><div class="crm-mail-v2-history" data-v2-mail-history></div></div>';

    pane.querySelector('[data-v2-mail-refresh]').onclick=function(){loadHistory(pane,c)};
    pane.querySelector('[data-v2-mail-send]').onclick=async function(){
      var to=clean(pane.querySelector('[data-v2-mail-to]').value),subject=clean(pane.querySelector('[data-v2-mail-subject]').value),body=clean(pane.querySelector('[data-v2-mail-body]').value),status=pane.querySelector('[data-v2-mail-status]');
      if(!to||!subject||!body){status.textContent=!to?'Müşteri maili yok.':!subject?'Konu boş olamaz.':'Mesaj boş olamaz.';status.className='crm-mail-v2-status err';return}
      this.disabled=true;status.textContent='CRM kopyası kaydediliyor...';status.className='crm-mail-v2-status';
      try{
        await mailApi('/api/mails',{method:'POST',body:JSON.stringify({customer_id:Number(c.id),direction:'Giden',mail_date:localDateTime(),email:to,subject:subject,summary:body,follow_date:''})});
        await loadHistory(pane,c);
        status.textContent='Kopya kaydedildi. Outlook açılıyor...';
        setTimeout(function(){window.location.href='mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)},80);
      }catch(e){status.textContent=e.message;status.className='crm-mail-v2-status err'}finally{this.disabled=false}
    };

    pane.querySelector('[data-v2-mail-in-save]').onclick=async function(){
      var from=clean(pane.querySelector('[data-v2-mail-in-from]').value),subject=clean(pane.querySelector('[data-v2-mail-in-subject]').value),body=clean(pane.querySelector('[data-v2-mail-in-body]').value),date=clean(pane.querySelector('[data-v2-mail-in-date]').value)||localDateTime(),status=pane.querySelector('[data-v2-mail-in-status]');
      if(!from||!body){status.textContent=!from?'Müşteri maili yok.':'Cevap boş olamaz.';status.className='crm-mail-v2-status err';return}
      this.disabled=true;status.textContent='Kaydediliyor...';status.className='crm-mail-v2-status';
      try{
        await mailApi('/api/mails',{method:'POST',body:JSON.stringify({customer_id:Number(c.id),direction:'Gelen',mail_date:date,email:from,subject:subject||'Konu yok',summary:body,follow_date:''})});
        pane.querySelector('[data-v2-mail-in-subject]').value='';pane.querySelector('[data-v2-mail-in-body]').value='';
        status.textContent='Gelen cevap kaydedildi.';
        await loadHistory(pane,c);
      }catch(e){status.textContent=e.message;status.className='crm-mail-v2-status err'}finally{this.disabled=false}
    };

    loadHistory(pane,c);
  }

  function prepare(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var editor=modal.querySelector('.pie-editor');
    if(!editor)return;
    var pane=editor.querySelector('.crm-mail-v2-pane');
    if(!pane){pane=document.createElement('div');pane.className='crm-mail-v2-pane';editor.appendChild(pane)}
    var c=currentCustomer();
    if(!c||!c.id){
      if(pane.dataset.customerId!=='missing'){pane.dataset.customerId='missing';pane.innerHTML='<div class="crm-mail-v2-warning">Müşteri bilgisi hazırlanıyor. Mail sekmesini bir kez daha açın.</div>'}
      return;
    }
    if(pane.dataset.customerId!==String(c.id))buildPane(pane,c);
  }

  function activateFromButton(button){
    if(!button)return;
    var isMail=Number(button.getAttribute('data-tab-index'))===6||clean(button.textContent).toLocaleLowerCase('tr-TR')==='mail';
    if(!isMail)return;
    setTimeout(prepare,0);
    setTimeout(prepare,80);
  }

  document.addEventListener('pointerdown',function(e){activateFromButton(e.target&&e.target.closest?e.target.closest('#portfolioDetailExpandModal .pie-top-tab'):null)},true);
  document.addEventListener('click',function(e){activateFromButton(e.target&&e.target.closest?e.target.closest('#portfolioDetailExpandModal .pie-top-tab'):null)},true);

  var observer=new MutationObserver(function(){setTimeout(prepare,0)});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(prepare,0);
})();
`;

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-mail-ui-v2[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-mail-ui-v2="20261001-mail-ui-v2">${MAIL_UI_V2_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
