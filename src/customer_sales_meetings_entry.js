import worker from './portfolio_recovery_entry.js';

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

const SALES_MEETINGS_PATCH=String.raw`
(function(){
  if(window.__crmSalesMeetingsMerged)return;
  window.__crmSalesMeetingsMerged='20261001-merge-v1';

  var style=document.createElement('style');
  style.id='crmSalesMeetingsMergedStyle';
  style.textContent='\n#portfolioDetailExpandModal .pie-top-tabs.crm-sales-meetings-merged{grid-template-columns:repeat(6,minmax(0,1fr))!important}\n#portfolioDetailExpandModal .pie-top-tab[data-tab-index="2"]{display:none!important}';
  document.head.appendChild(style);

  function showCombined(editor,sections){
    sections.forEach(function(section,i){
      var active=i===1||i===2;
      section.classList.toggle('active-tab-panel',active);
      if(active)section.setAttribute('open','');
      else section.removeAttribute('open');
    });
    editor.querySelectorAll('.pie-top-tab').forEach(function(button){
      var idx=Number(button.getAttribute('data-tab-index'));
      var active=idx===1;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',active?'true':'false');
    });
  }

  function normalizeMeetingDates(editor){
    editor.querySelectorAll('.pie-meeting').forEach(function(item){
      var headSpans=item.querySelectorAll('.pie-meeting-head span');
      var date=headSpans.length?String(headSpans[headSpans.length-1].textContent||'').trim():'';
      var note=item.querySelector('.pie-meeting-note');
      if(!date||!note)return;
      var text=String(note.textContent||'').trim();
      if(text.indexOf(date)===0)return;
      var strong=document.createElement('strong');
      strong.textContent=date;
      note.insertBefore(document.createTextNode(' — '),note.firstChild);
      note.insertBefore(strong,note.firstChild);
    });
  }

  function merge(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var editor=modal.querySelector('.pie-editor');
    if(!editor)return;
    var tabs=editor.querySelector('.pie-top-tabs');
    if(!tabs)return;
    var sections=Array.prototype.slice.call(editor.querySelectorAll('.pie-section')).slice(0,5);
    if(sections.length<5)return;

    var sales=tabs.querySelector('.pie-top-tab[data-tab-index="1"]');
    var meetings=tabs.querySelector('.pie-top-tab[data-tab-index="2"]');
    if(!sales||!meetings)return;

    sales.textContent='Satış & Görüşmeler';
    meetings.style.display='none';
    meetings.setAttribute('aria-hidden','true');
    tabs.classList.add('crm-sales-meetings-merged');

    if(tabs.dataset.crmSalesMeetingsBound!=='1'){
      tabs.dataset.crmSalesMeetingsBound='1';
      tabs.addEventListener('click',function(event){
        var button=event.target&&event.target.closest?event.target.closest('.pie-top-tab'):null;
        if(!button)return;
        if(Number(button.getAttribute('data-tab-index'))===1){
          setTimeout(function(){
            showCombined(editor,sections);
            normalizeMeetingDates(editor);
          },0);
        }
      });
    }

    if(meetings.classList.contains('active'))showCombined(editor,sections);
    normalizeMeetingDates(editor);
  }

  var observer=new MutationObserver(function(){setTimeout(merge,0)});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',function(){setTimeout(merge,70)},true);
  merge();
})();
`;

const CUSTOMER_MAIL_TAB_PATCH=String.raw`
(function(){
  if(window.__crmCustomerMailTabFix)return;
  window.__crmCustomerMailTabFix='20261001-mail-tab-v1';

  var style=document.createElement('style');
  style.id='crmCustomerMailTabFixStyle';
  style.textContent='\n#portfolioDetailExpandModal .crm-mail-fixed-pane{display:none;padding:14px;background:#fff}\n#portfolioDetailExpandModal .crm-mail-fixed-pane.active{display:block}\n#portfolioDetailExpandModal .crm-mail-fixed-box{border:1px solid #dbe5f0;border-radius:12px;background:#f8fafc;padding:13px}\n#portfolioDetailExpandModal .crm-mail-fixed-title{font-size:16px;font-weight:950;color:#b91c1c;margin-bottom:10px}\n#portfolioDetailExpandModal .crm-mail-fixed-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}\n#portfolioDetailExpandModal .crm-mail-fixed-field.wide{grid-column:1/-1}\n#portfolioDetailExpandModal .crm-mail-fixed-field label{display:block;font-size:10px;font-weight:900;color:#64748b;margin-bottom:4px}\n#portfolioDetailExpandModal .crm-mail-fixed-field input,#portfolioDetailExpandModal .crm-mail-fixed-field textarea{width:100%;border:1px solid #cbd8e8;border-radius:8px;background:#fff;padding:8px 9px;font:inherit;font-size:12px;color:#0f172a}\n#portfolioDetailExpandModal .crm-mail-fixed-field textarea{min-height:95px;resize:vertical}\n#portfolioDetailExpandModal .crm-mail-fixed-actions{display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap;margin-top:10px}\n#portfolioDetailExpandModal .crm-mail-fixed-status{margin-right:auto;font-size:10px;font-weight:900;color:#15803d}\n#portfolioDetailExpandModal .crm-mail-fixed-status.err{color:#dc2626}\n#portfolioDetailExpandModal .crm-mail-fixed-btn{border:0;border-radius:8px;padding:9px 12px;font-weight:900;cursor:pointer}\n#portfolioDetailExpandModal .crm-mail-fixed-send{background:#16a34a;color:#fff}\n#portfolioDetailExpandModal .crm-mail-fixed-save{background:#2563eb;color:#fff}\n#portfolioDetailExpandModal .crm-mail-fixed-refresh{background:#fff;color:#b91c1c;border:1px solid #fecaca}\n#portfolioDetailExpandModal .crm-mail-fixed-note{margin:10px 0;padding:9px 10px;border:1px solid #bfdbfe;border-radius:9px;background:#eff6ff;color:#1e3a8a;font-size:10px;font-weight:800}\n#portfolioDetailExpandModal .crm-mail-fixed-history{display:grid;gap:7px;margin-top:12px;max-height:300px;overflow:auto}\n#portfolioDetailExpandModal .crm-mail-fixed-item{border:1px solid #dbe5f0;border-left:5px solid #2563eb;border-radius:9px;background:#fff;padding:9px}\n#portfolioDetailExpandModal .crm-mail-fixed-item.out{border-left-color:#16a34a}\n#portfolioDetailExpandModal .crm-mail-fixed-meta{font-size:9px;color:#64748b}\n#portfolioDetailExpandModal .crm-mail-fixed-subject{font-size:12px;font-weight:900;color:#0f172a;margin-top:4px}\n#portfolioDetailExpandModal .crm-mail-fixed-body{font-size:11px;white-space:pre-wrap;color:#334155;margin-top:4px}\n@media(max-width:760px){#portfolioDetailExpandModal .crm-mail-fixed-grid{grid-template-columns:1fr}#portfolioDetailExpandModal .crm-mail-fixed-field.wide{grid-column:auto}}';
  document.head.appendChild(style);

  function clean(v){return String(v==null?'':v).trim()}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function parseArray(v){if(Array.isArray(v))return v;try{var a=JSON.parse(v||'[]');return Array.isArray(a)?a:[]}catch(_){return []}}
  function currentCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}
  function customerEmails(c){var out=[];function add(v){v=clean(v);if(v&&!out.some(function(x){return x.toLowerCase()===v.toLowerCase()}))out.push(v)}add(c&&c.email);parseArray(c&&c.emails_json).forEach(add);parseArray(c&&c.contacts_json).forEach(function(x){add(x&&x.email)});return out}
  function localDateTime(){var d=new Date(),off=d.getTimezoneOffset()*60000;return new Date(d.getTime()-off).toISOString().slice(0,16)}
  function prettyDate(v){try{return new Date(v).toLocaleString('tr-TR')}catch(_){return String(v||'')}}
  async function api(path,opts){var o=Object.assign({credentials:'same-origin',cache:'no-store'},opts||{});o.headers=Object.assign({'cache-control':'no-cache'},o.headers||{});if(o.body&&!o.headers['content-type'])o.headers['content-type']='application/json';var r=await fetch(path,o),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'Mail işlemi yapılamadı.');return d}

  async function loadHistory(pane,c){
    var box=pane.querySelector('[data-fixed-mail-history]');
    if(!box)return;
    box.innerHTML='<div class="crm-mail-fixed-meta">Mailler yükleniyor...</div>';
    try{
      var rows=await api('/api/mails'),emails=customerEmails(c).map(function(x){return x.toLowerCase()}),id=Number(c.id);
      var items=(Array.isArray(rows)?rows:[]).filter(function(x){return Number(x.customer_id)===id||emails.indexOf(clean(x.email).toLowerCase())>=0}).sort(function(a,b){return String(b.mail_date||b.created_at||'').localeCompare(String(a.mail_date||a.created_at||''))});
      if(!items.length){box.innerHTML='<div class="crm-mail-fixed-meta">Bu firmaya ait henüz mail kaydı yok.</div>';return}
      box.innerHTML=items.map(function(x){var out=String(x.direction||'').toLocaleLowerCase('tr-TR')==='giden';return '<div class="crm-mail-fixed-item '+(out?'out':'')+'"><div class="crm-mail-fixed-meta">'+(out?'📤 Giden':'📥 Gelen')+' • '+esc(prettyDate(x.mail_date||x.created_at||''))+' • '+esc(x.email||'')+'</div><div class="crm-mail-fixed-subject">'+esc(x.subject||'Konu yok')+'</div><div class="crm-mail-fixed-body">'+esc(x.summary||'')+'</div></div>'}).join('');
    }catch(e){box.innerHTML='<div class="crm-mail-fixed-meta" style="color:#dc2626">'+esc(e.message||'Mailler yüklenemedi.')+'</div>'}
  }

  function ensurePane(editor,c){
    var pane=editor.querySelector('.crm-mail-fixed-pane');
    if(!pane){pane=document.createElement('div');pane.className='crm-mail-fixed-pane';var note=editor.querySelector('.pie-readonly-note');if(note&&note.parentNode)note.parentNode.insertBefore(pane,note);else editor.appendChild(pane)}
    var identity=String(c.id||'')+'|'+String(c.updated_at||'');
    if(pane.dataset.customerIdentity===identity)return pane;
    pane.dataset.customerIdentity=identity;
    var firstMail=customerEmails(c)[0]||'';
    pane.innerHTML='<div class="crm-mail-fixed-box"><div class="crm-mail-fixed-title">✉️ Müşteri Mail Yazışmaları</div><div class="crm-mail-fixed-grid"><div class="crm-mail-fixed-field"><label>Müşterinin Mail Adresi</label><input data-fixed-mail-to value="'+esc(firstMail)+'" placeholder="musteri@firma.com"></div><div class="crm-mail-fixed-field"><label>Gönderen</label><input value="ali@jetlazer.com" readonly></div><div class="crm-mail-fixed-field wide"><label>Konu</label><input data-fixed-mail-subject placeholder="Mail konusu"></div><div class="crm-mail-fixed-field wide"><label>Mesaj</label><textarea data-fixed-mail-body placeholder="Müşteriye yazacağınız mesaj"></textarea></div></div><div class="crm-mail-fixed-actions"><span class="crm-mail-fixed-status" data-fixed-mail-status></span><button type="button" class="crm-mail-fixed-btn crm-mail-fixed-refresh" data-fixed-mail-refresh>↻ Yenile</button><button type="button" class="crm-mail-fixed-btn crm-mail-fixed-send" data-fixed-mail-send>✉️ Outlook’ta Aç ve CRM’ye Kopyala</button></div><div class="crm-mail-fixed-note">CRM’den başlattığınız giden mailler kayda alınır. Outlook’tan gelen cevapların otomatik aktarımı henüz bağlı değildir.</div><details><summary style="cursor:pointer;font-weight:900;color:#1d4ed8">📥 Gelen müşteri cevabını kaydet</summary><div class="crm-mail-fixed-grid" style="margin-top:8px"><div class="crm-mail-fixed-field"><label>Tarih / Saat</label><input type="datetime-local" data-fixed-mail-in-date value="'+localDateTime()+'"></div><div class="crm-mail-fixed-field"><label>Müşteri Maili</label><input data-fixed-mail-in-from value="'+esc(firstMail)+'" placeholder="musteri@firma.com"></div><div class="crm-mail-fixed-field wide"><label>Konu</label><input data-fixed-mail-in-subject placeholder="Gelen mail konusu"></div><div class="crm-mail-fixed-field wide"><label>Cevap</label><textarea data-fixed-mail-in-body placeholder="Müşterinin cevabını buraya yapıştırın"></textarea></div></div><div class="crm-mail-fixed-actions"><span class="crm-mail-fixed-status" data-fixed-mail-in-status></span><button type="button" class="crm-mail-fixed-btn crm-mail-fixed-save" data-fixed-mail-in-save>📥 Gelen Cevabı Kaydet</button></div></details><div class="crm-mail-fixed-history" data-fixed-mail-history></div></div>';
    pane.querySelector('[data-fixed-mail-refresh]').onclick=function(){loadHistory(pane,c)};
    pane.querySelector('[data-fixed-mail-send]').onclick=async function(){var to=clean(pane.querySelector('[data-fixed-mail-to]').value),subject=clean(pane.querySelector('[data-fixed-mail-subject]').value),body=clean(pane.querySelector('[data-fixed-mail-body]').value),status=pane.querySelector('[data-fixed-mail-status]');if(!to||!subject||!body){status.textContent=!to?'Müşteri maili yok.':!subject?'Konu boş olamaz.':'Mesaj boş olamaz.';status.className='crm-mail-fixed-status err';return}this.disabled=true;status.textContent='CRM kopyası kaydediliyor...';status.className='crm-mail-fixed-status';try{await api('/api/mails',{method:'POST',body:JSON.stringify({customer_id:Number(c.id),direction:'Giden',mail_date:localDateTime(),email:to,subject:subject,summary:body,follow_date:''})});await loadHistory(pane,c);status.textContent='Kopya kaydedildi. Outlook açılıyor...';setTimeout(function(){window.location.href='mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)},80)}catch(e){status.textContent=e.message;status.className='crm-mail-fixed-status err'}finally{this.disabled=false}};
    pane.querySelector('[data-fixed-mail-in-save]').onclick=async function(){var from=clean(pane.querySelector('[data-fixed-mail-in-from]').value),subject=clean(pane.querySelector('[data-fixed-mail-in-subject]').value),body=clean(pane.querySelector('[data-fixed-mail-in-body]').value),date=clean(pane.querySelector('[data-fixed-mail-in-date]').value)||localDateTime(),status=pane.querySelector('[data-fixed-mail-in-status]');if(!from||!body){status.textContent=!from?'Müşteri maili yok.':'Cevap boş olamaz.';status.className='crm-mail-fixed-status err';return}this.disabled=true;status.textContent='Kaydediliyor...';status.className='crm-mail-fixed-status';try{await api('/api/mails',{method:'POST',body:JSON.stringify({customer_id:Number(c.id),direction:'Gelen',mail_date:date,email:from,subject:subject||'Konu yok',summary:body,follow_date:''})});pane.querySelector('[data-fixed-mail-in-subject]').value='';pane.querySelector('[data-fixed-mail-in-body]').value='';status.textContent='Gelen cevap kaydedildi.';await loadHistory(pane,c)}catch(e){status.textContent=e.message;status.className='crm-mail-fixed-status err'}finally{this.disabled=false}};
    loadHistory(pane,c);
    return pane;
  }

  function showMail(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var editor=modal.querySelector('.pie-editor');if(!editor)return;
    var c=currentCustomer();if(!c||!c.id)return;
    var pane=ensurePane(editor,c);
    editor.querySelectorAll('.pie-section').forEach(function(section){section.classList.remove('active-tab-panel');section.removeAttribute('open')});
    var oldHost=editor.querySelector('.pie-legacy-extra-host');if(oldHost)oldHost.style.display='none';
    var note=editor.querySelector('.pie-readonly-note');if(note)note.style.display='none';
    var actions=editor.querySelector('.pie-actions');if(actions)actions.style.display='none';
    pane.classList.add('active');
    editor.querySelectorAll('.pie-top-tab').forEach(function(button){var active=Number(button.getAttribute('data-tab-index'))===6;button.classList.toggle('active',active);button.setAttribute('aria-selected',active?'true':'false')});
  }

  function leaveMail(index){
    var modal=document.getElementById('portfolioDetailExpandModal');var editor=modal&&modal.querySelector('.pie-editor');if(!editor)return;
    var pane=editor.querySelector('.crm-mail-fixed-pane');if(pane)pane.classList.remove('active');
    var oldHost=editor.querySelector('.pie-legacy-extra-host');if(oldHost)oldHost.style.display='';
    if(index<5){var note=editor.querySelector('.pie-readonly-note');if(note)note.style.display='';var actions=editor.querySelector('.pie-actions');if(actions)actions.style.display=''}
  }

  document.addEventListener('click',function(event){var button=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal .pie-top-tab'):null;if(!button)return;var index=Number(button.getAttribute('data-tab-index'));if(index===6)setTimeout(showMail,90);else setTimeout(function(){leaveMail(index)},90)},true);
  var observer=new MutationObserver(function(){var modal=document.getElementById('portfolioDetailExpandModal');if(!modal||!modal.classList.contains('show'))return;var active=modal.querySelector('.pie-top-tab[data-tab-index="6"].active');if(active)setTimeout(showMail,0)});
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();
`;

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-sales-meetings-merge[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<script[^>]*data-customer-mail-tab-fix[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-sales-meetings-merge="20261001-merge-v1">${SALES_MEETINGS_PATCH}</script>\n<script data-customer-mail-tab-fix="20261001-mail-tab-v1">${CUSTOMER_MAIL_TAB_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
