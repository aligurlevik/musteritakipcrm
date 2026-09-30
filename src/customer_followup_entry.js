import worker from './portfolio_district_entry.js';

function rebuildHtml(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

function jsonResponse(response,data){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
}

const DASHBOARD_FOLLOWUP_PATCH=String.raw`
(function(){
  if(window.__crmFollowupDashboardPatch)return;
  window.__crmFollowupDashboardPatch='20260930-1745';
  var style=document.createElement('style');
  style.textContent='\n#due .card.follow-soon{background:#fff7d6;border-color:#f59e0b}#due .card.follow-future{background:#ecfdf5;border-color:#86efac}#due .card.due{background:#fef3c7;border-color:#f59e0b}#due .card.overdue{background:#fee2e2;border-color:#ef4444}';
  document.head.appendChild(style);
  try{
    cls=function(d){
      if(!d)return '';
      var t=typeof today==='function'?today():new Date().toISOString().slice(0,10);
      if(d<t)return 'overdue';
      if(d===t)return 'due';
      var a=new Date(t+'T12:00:00'),b=new Date(d+'T12:00:00'),days=Math.round((b-a)/86400000);
      return days<=2?'follow-soon':'follow-future';
    };
  }catch(_){ }
  setTimeout(function(){try{if(typeof loadDashboard==='function')loadDashboard();}catch(_){}},80);
})();
`;

const PORTFOLIO_MODAL_CLEANUP=String.raw`
(function(){
  if(window.__portfolioModalCleanupLoaded)return;
  window.__portfolioModalCleanupLoaded='20260930-mail-stable-v1';

  var style=document.createElement('style');
  style.id='portfolioModalCleanupStyle';
  style.textContent='\n#portfolioDetailExpandModal .pie-top-tabs{grid-template-columns:1fr 1.25fr 1.55fr 1fr 1.15fr .78fr .82fr!important;overflow:visible!important}\n#portfolioDetailExpandModal .pie-top-tab{font-size:14px!important;font-weight:900!important;color:#dc2626!important;padding:14px 5px 12px!important}\n#portfolioDetailExpandModal .pie-top-tab:hover{color:#991b1b!important;background:#fff7f7!important}\n#portfolioDetailExpandModal .pie-top-tab.active{color:#991b1b!important;border-bottom-color:#dc2626!important;background:#fff1f2!important}\n#portfolioDetailExpandModal .pie-title{font-size:17px!important;font-weight:900!important;color:#b91c1c!important}\n#portfolioDetailExpandModal .pie-legacy-extra-host{padding:12px 14px;background:#fff}\n#portfolioDetailExpandModal .pie-legacy-extra-host .tabpane{display:none!important}\n#portfolioDetailExpandModal .pie-legacy-extra-host .tabpane.pie-extra-active{display:block!important}\n#portfolioDetailExpandModal [data-hidden-duplicate-customer-panel="1"]{display:none!important}\n#portfolioDetailExpandModal .crm-mail-box{border:1px solid #dbe5f0;border-radius:12px;background:#f8fafc;padding:12px}\n#portfolioDetailExpandModal .crm-mail-title{font-size:16px;font-weight:950;color:#b91c1c;margin-bottom:10px}\n#portfolioDetailExpandModal .crm-mail-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}\n#portfolioDetailExpandModal .crm-mail-field.wide{grid-column:1/-1}\n#portfolioDetailExpandModal .crm-mail-field label{display:block;font-size:10px;font-weight:900;color:#64748b;margin-bottom:3px}\n#portfolioDetailExpandModal .crm-mail-field input,#portfolioDetailExpandModal .crm-mail-field select,#portfolioDetailExpandModal .crm-mail-field textarea{width:100%;border:1px solid #cbd8e8;border-radius:8px;background:#fff;padding:8px 9px;font:inherit;font-size:12px;color:#0f172a}\n#portfolioDetailExpandModal .crm-mail-field textarea{min-height:90px;resize:vertical}\n#portfolioDetailExpandModal .crm-mail-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:9px;flex-wrap:wrap}\n#portfolioDetailExpandModal .crm-mail-status{margin-right:auto;font-size:10px;font-weight:900;color:#15803d}\n#portfolioDetailExpandModal .crm-mail-status.err{color:#dc2626}\n#portfolioDetailExpandModal .crm-mail-btn{border:0;border-radius:8px;padding:9px 12px;font-weight:900;cursor:pointer}\n#portfolioDetailExpandModal .crm-mail-send{background:#16a34a;color:#fff}\n#portfolioDetailExpandModal .crm-mail-save{background:#2563eb;color:#fff}\n#portfolioDetailExpandModal .crm-mail-refresh{background:#fff;border:1px solid #fecaca;color:#b91c1c}\n#portfolioDetailExpandModal .crm-mail-history{display:grid;gap:7px;margin-top:12px;max-height:300px;overflow:auto}\n#portfolioDetailExpandModal .crm-mail-item{border:1px solid #dbe5f0;border-left:5px solid #2563eb;border-radius:9px;background:#fff;padding:9px}\n#portfolioDetailExpandModal .crm-mail-item.out{border-left-color:#16a34a}\n#portfolioDetailExpandModal .crm-mail-meta{font-size:9px;color:#64748b}\n#portfolioDetailExpandModal .crm-mail-subject{font-size:12px;font-weight:900;color:#0f172a;margin-top:4px}\n#portfolioDetailExpandModal .crm-mail-body{font-size:11px;white-space:pre-wrap;color:#334155;margin-top:4px}\n@media(max-width:1050px){#portfolioDetailExpandModal .pie-top-tabs{grid-template-columns:repeat(7,minmax(125px,1fr))!important;overflow-x:auto!important}#portfolioDetailExpandModal .pie-top-tab{font-size:13px!important}}\n@media(max-width:760px){#portfolioDetailExpandModal .crm-mail-grid{grid-template-columns:1fr}#portfolioDetailExpandModal .crm-mail-field.wide{grid-column:auto}}';
  document.head.appendChild(style);

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function currentCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}
  function parseArray(v){if(Array.isArray(v))return v;try{var a=JSON.parse(v||'[]');return Array.isArray(a)?a:[]}catch(_){return []}}
  function customerEmails(c){var out=[];function add(v){v=String(v||'').trim();if(v&&!out.some(function(x){return x.toLowerCase()===v.toLowerCase()}))out.push(v)}add(c&&c.email);parseArray(c&&c.emails_json).forEach(add);parseArray(c&&c.contacts_json).forEach(function(x){add(x&&x.email)});return out}
  function localDateTime(){var d=new Date(),off=d.getTimezoneOffset()*60000;return new Date(d.getTime()-off).toISOString().slice(0,16)}
  function prettyDate(v){try{return new Date(v).toLocaleString('tr-TR')}catch(_){return String(v||'')}}
  async function mailApi(path,opts){var o=Object.assign({credentials:'same-origin',cache:'no-store'},opts||{});o.headers=Object.assign({'cache-control':'no-cache'},o.headers||{});if(o.body&&!o.headers['content-type'])o.headers['content-type']='application/json';var r=await fetch(path,o),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'Mail işlemi yapılamadı.');return d}

  function findLegacyTabs(modal){
    return Array.prototype.slice.call(modal.querySelectorAll('.tabs')).find(function(el){
      var text=String(el.innerText||el.textContent||'');
      return text.indexOf('Genel')>=0&&text.indexOf('Teklifler')>=0&&text.indexOf('Siparişler')>=0;
    })||null;
  }

  function findLegacyRoot(body,editor,tabs){
    if(!tabs)return null;
    var root=tabs.closest('.detail')||tabs.closest('#detailContent')||tabs.parentElement;
    while(root&&root.parentElement&&root.parentElement!==body&&!root.parentElement.contains(editor)){
      var p=root.parentElement;
      if(p.querySelector&&p.querySelector('.tabs')===tabs)root=p;else break;
    }
    return root;
  }

  async function loadMailHistory(pane,c){
    var box=pane.querySelector('[data-mail-history]');
    if(!box)return;
    box.innerHTML='<div class="crm-mail-meta">Mailler yükleniyor...</div>';
    try{
      var rows=await mailApi('/api/mails'),emails=customerEmails(c).map(function(x){return x.toLowerCase()}),id=Number(c.id);
      var items=(Array.isArray(rows)?rows:[]).filter(function(x){return Number(x.customer_id)===id||emails.indexOf(String(x.email||'').trim().toLowerCase())>=0}).sort(function(a,b){return String(b.mail_date||b.created_at||'').localeCompare(String(a.mail_date||a.created_at||''))});
      if(!items.length){box.innerHTML='<div class="crm-mail-meta">Bu firmaya ait henüz mail kaydı yok.</div>';return}
      box.innerHTML=items.map(function(x){var out=String(x.direction||'').toLocaleLowerCase('tr-TR')==='giden';return '<div class="crm-mail-item '+(out?'out':'')+'"><div class="crm-mail-meta">'+(out?'📤 Giden':'📥 Gelen')+' • '+esc(prettyDate(x.mail_date||x.created_at||''))+' • '+esc(x.email||'')+'</div><div class="crm-mail-subject">'+esc(x.subject||'Konu yok')+'</div><div class="crm-mail-body">'+esc(x.summary||'')+'</div></div>'}).join('');
    }catch(e){box.innerHTML='<div class="crm-mail-meta" style="color:#dc2626">'+esc(e.message||'Mailler yüklenemedi.')+'</div>'}
  }

  function setupMailPane(pane){
    var c=currentCustomer();if(!c||!c.id)return;
    var identity=String(c.id||'')+'|'+String(c.updated_at||'');
    if(pane.dataset.mailIdentity===identity)return;
    pane.dataset.mailIdentity=identity;
    var emails=customerEmails(c),options=emails.length?emails.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>'}).join(''):'<option value="">Mail adresi kayıtlı değil</option>';
    pane.innerHTML='<div class="crm-mail-box"><div class="crm-mail-title">✉️ Müşteri Mail Yazışmaları</div><div class="crm-mail-grid"><div class="crm-mail-field"><label>Müşterinin Mail Adresi</label><select data-mail-to>'+options+'</select></div><div class="crm-mail-field"><label>Gönderen</label><input value="ali@jetlazer.com" readonly></div><div class="crm-mail-field wide"><label>Konu</label><input data-mail-subject placeholder="Mail konusu"></div><div class="crm-mail-field wide"><label>Mesaj</label><textarea data-mail-body placeholder="Müşteriye yazacağınız mesaj"></textarea></div></div><div class="crm-mail-actions"><span class="crm-mail-status" data-mail-status></span><button type="button" class="crm-mail-btn crm-mail-refresh" data-mail-refresh>↻ Yenile</button><button type="button" class="crm-mail-btn crm-mail-send" data-mail-send>✉️ Outlook’ta Aç ve CRM’ye Kopyala</button></div><details style="margin-top:10px"><summary style="cursor:pointer;font-weight:900;color:#1d4ed8">📥 Gelen müşteri cevabını kaydet</summary><div class="crm-mail-grid" style="margin-top:8px"><div class="crm-mail-field"><label>Tarih / Saat</label><input type="datetime-local" data-mail-in-date value="'+localDateTime()+'"></div><div class="crm-mail-field"><label>Müşteri Maili</label><select data-mail-in-from>'+options+'</select></div><div class="crm-mail-field wide"><label>Konu</label><input data-mail-in-subject placeholder="Gelen mail konusu"></div><div class="crm-mail-field wide"><label>Cevap</label><textarea data-mail-in-body placeholder="Müşterinin cevabını buraya yapıştırın"></textarea></div></div><div class="crm-mail-actions"><span class="crm-mail-status" data-mail-in-status></span><button type="button" class="crm-mail-btn crm-mail-save" data-mail-in-save>📥 Gelen Cevabı Kaydet</button></div></details><div class="crm-mail-history" data-mail-history></div></div>';
    pane.querySelector('[data-mail-refresh]').onclick=function(){loadMailHistory(pane,c)};
    pane.querySelector('[data-mail-send]').onclick=async function(){var to=String(pane.querySelector('[data-mail-to]').value||'').trim(),subject=String(pane.querySelector('[data-mail-subject]').value||'').trim(),body=String(pane.querySelector('[data-mail-body]').value||'').trim(),s=pane.querySelector('[data-mail-status]');if(!to||!subject||!body){s.textContent=!to?'Müşteri maili yok.':!subject?'Konu boş olamaz.':'Mesaj boş olamaz.';s.className='crm-mail-status err';return}this.disabled=true;s.textContent='CRM kopyası kaydediliyor...';s.className='crm-mail-status';try{await mailApi('/api/mails',{method:'POST',body:JSON.stringify({customer_id:Number(c.id),direction:'Giden',mail_date:localDateTime(),email:to,subject:subject,summary:body,follow_date:''})});await loadMailHistory(pane,c);s.textContent='Kopya kaydedildi. Outlook açılıyor...';setTimeout(function(){window.location.href='mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)},80)}catch(e){s.textContent=e.message;s.className='crm-mail-status err'}finally{this.disabled=false}};
    pane.querySelector('[data-mail-in-save]').onclick=async function(){var from=String(pane.querySelector('[data-mail-in-from]').value||'').trim(),subject=String(pane.querySelector('[data-mail-in-subject]').value||'').trim(),body=String(pane.querySelector('[data-mail-in-body]').value||'').trim(),date=String(pane.querySelector('[data-mail-in-date]').value||localDateTime()),s=pane.querySelector('[data-mail-in-status]');if(!from||!body){s.textContent=!from?'Müşteri maili yok.':'Cevap boş olamaz.';s.className='crm-mail-status err';return}this.disabled=true;s.textContent='Kaydediliyor...';s.className='crm-mail-status';try{await mailApi('/api/mails',{method:'POST',body:JSON.stringify({customer_id:Number(c.id),direction:'Gelen',mail_date:date,email:from,subject:subject||'Konu yok',summary:body,follow_date:''})});pane.querySelector('[data-mail-in-subject]').value='';pane.querySelector('[data-mail-in-body]').value='';s.textContent='Gelen cevap kaydedildi.';await loadMailHistory(pane,c)}catch(e){s.textContent=e.message;s.className='crm-mail-status err'}finally{this.disabled=false}};
    loadMailHistory(pane,c);
  }

  function setExtraVisible(editor,index){
    var host=editor.querySelector('.pie-legacy-extra-host');
    if(!host)return;
    var ids=['tabOffers','tabOrders'];
    ids.forEach(function(id,i){
      var pane=host.querySelector('[data-pie-extra="'+id+'"]');
      if(pane)pane.classList.toggle('pie-extra-active',index===5+i);
    });
    var extra=index>=5;
    var note=editor.querySelector('.pie-readonly-note');
    var actions=editor.querySelector('.pie-actions');
    if(note)note.style.display=extra?'none':'';
    if(actions)actions.style.display=extra?'none':'';
  }

  function addTopTabs(editor,tabs){
    if(!tabs)return;
    var labels=['Teklifler','Mail'];
    labels.forEach(function(label,i){
      var index=5+i;
      var existing=tabs.querySelector('[data-tab-index="'+index+'"]');
      if(existing){existing.textContent=label;return}
      var button=document.createElement('button');
      button.type='button';
      button.className='pie-top-tab';
      button.setAttribute('role','tab');
      button.setAttribute('aria-selected','false');
      button.setAttribute('data-tab-index',String(index));
      button.textContent=label;
      tabs.appendChild(button);
    });
    var stale=tabs.querySelector('[data-tab-index="7"]');
    if(stale)stale.remove();
    if(tabs.dataset.extraWired==='1')return;
    tabs.dataset.extraWired='1';
    tabs.addEventListener('click',function(event){
      var button=event.target.closest('.pie-top-tab');
      if(!button)return;
      var index=Number(button.getAttribute('data-tab-index')||0);
      setTimeout(function(){setExtraVisible(editor,index);},0);
    });
  }

  function moveLegacyPanels(modal,body,editor){
    var topTabs=editor.querySelector('.pie-top-tabs');
    if(!topTabs)return;
    addTopTabs(editor,topTabs);

    var legacyTabs=findLegacyTabs(modal);
    if(!legacyTabs)return;
    var legacyRoot=findLegacyRoot(body,editor,legacyTabs);

    var host=editor.querySelector('.pie-legacy-extra-host');
    if(!host){
      host=document.createElement('div');
      host.className='pie-legacy-extra-host';
      var readOnly=editor.querySelector('.pie-readonly-note');
      if(readOnly)readOnly.parentNode.insertBefore(host,readOnly);else editor.appendChild(host);
    }

    [['tabOffers','Teklifler'],['tabOrders','Mail']].forEach(function(pair){
      var id=pair[0];
      if(host.querySelector('[data-pie-extra="'+id+'"]'))return;
      var pane=modal.querySelector('#'+id);
      if(!pane)return;
      pane.classList.remove('hidden');
      pane.classList.remove('pie-extra-active');
      pane.setAttribute('data-pie-extra',id);
      host.appendChild(pane);
    });

    var mailPane=host.querySelector('[data-pie-extra="tabOrders"]');
    if(mailPane)setupMailPane(mailPane);

    var analysis=modal.querySelector('#tabAnalysis');
    if(analysis){analysis.classList.remove('pie-extra-active');analysis.style.display='none';}

    if(legacyRoot&&legacyRoot!==editor&&!legacyRoot.contains(editor)){
      legacyRoot.setAttribute('data-hidden-duplicate-customer-panel','1');
      legacyRoot.style.display='none';
    }else{
      legacyTabs.style.display='none';
      var general=modal.querySelector('#tabGeneral');if(general&&!editor.contains(general))general.style.display='none';
      var notes=modal.querySelector('#tabNotes');if(notes&&!editor.contains(notes))notes.style.display='none';
    }
    setExtraVisible(editor,0);
  }

  function cleanup(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var body=modal.querySelector('.pdem-body');
    var editor=body&&body.querySelector('.pie-editor');
    if(!body||!editor)return;
    moveLegacyPanels(modal,body,editor);
  }

  var observer=new MutationObserver(function(){setTimeout(cleanup,0);});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',function(){setTimeout(cleanup,35);},true);
  setInterval(cleanup,600);
})();
`;

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),path=url.pathname;

    if(request.method==='GET'&&path==='/portfolio-section-layout.js'){
      const asset=await env.ASSETS.fetch(request),headers=new Headers(asset.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
    }

    const response=await worker.fetch(request,env,ctx);

    if(request.method==='GET'&&path==='/api/dashboard'&&response.ok){
      try{
        const data=await response.clone().json();
        const rows=(await env.DB.prepare("SELECT * FROM customers WHERE record_status='Aktif' AND COALESCE(follow_date,'')<>'' AND stage NOT IN ('Kazanıldı','Kaybedildi') ORDER BY follow_date ASC, company COLLATE NOCASE ASC LIMIT 50").all()).results||[];
        return jsonResponse(response,{...data,due:rows});
      }catch(_){return response}
    }

    if(request.method==='GET'&&path==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-portfolio-section-layout[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<script\s+src=["']\/portfolio-section-layout\.js[^>]*><\/script>\s*/gi,'');
      html=html.replace(/<script[^>]*data-portfolio-modal-cleanup[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-portfolio-section-layout="20260930-mail-stable-v1" src="/portfolio-section-layout.js?v=20260930-mail-stable-v1"></script>\n<script data-portfolio-modal-cleanup="20260930-mail-stable-v1">\n${PORTFOLIO_MODAL_CLEANUP}\n</script>\n</body>`);
      return rebuildHtml(response,html);
    }

    if(request.method==='GET'&&['/','/index.html'].includes(path)&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-customer-followup-dashboard[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-customer-followup-dashboard="20260930-1745">\n${DASHBOARD_FOLLOWUP_PATCH}\n</script>\n</body>`);
      return rebuildHtml(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
