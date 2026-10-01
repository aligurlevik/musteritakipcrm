import worker from './main_menu_cleanup_entry.js';

const SALES_CARE_PATCH=String.raw`
(function(){
  if(window.__crmSalesCareCenter)return;
  window.__crmSalesCareCenter='20261001-sales-care-v1';

  var style=document.createElement('style');
  style.id='crmSalesCareCenterStyle';
  style.textContent='\n.crm-care-dashboard{margin:10px 0 12px;border:1px solid #dbe5f0;border-radius:12px;background:#fff;padding:11px}\n.crm-care-dash-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.crm-care-dash-title{font-size:13px;font-weight:950;color:#0f172a}.crm-care-refresh{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:6px 9px;font-weight:900;cursor:pointer}\n.crm-care-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px}.crm-care-kpi{border:1px solid #e2e8f0;border-radius:9px;padding:8px;background:#f8fafc}.crm-care-kpi strong{display:block;font-size:18px}.crm-care-kpi span{font-size:9px;font-weight:900;color:#64748b}.crm-care-kpi.warn{background:#fff7ed;border-color:#fed7aa}.crm-care-kpi.bad{background:#fff1f2;border-color:#fecdd3}.crm-care-kpi.good{background:#f0fdf4;border-color:#bbf7d0}\n.crm-care-task-list{display:grid;gap:6px;margin-top:9px}.crm-care-task{display:grid;grid-template-columns:1.2fr .8fr .7fr 1.4fr;gap:8px;align-items:center;border:1px solid #e2e8f0;border-radius:8px;padding:7px 8px;font-size:10px}.crm-care-task.overdue{background:#fff1f2;border-color:#fecaca}.crm-care-task.today{background:#fff7ed;border-color:#fed7aa}.crm-care-task-company{font-weight:950}.crm-care-empty{font-size:10px;color:#64748b;padding:5px 0}\n.crm-care-card{margin-top:12px;border:1px solid #dbe5f0;border-radius:11px;background:#f8fafc;padding:11px}.crm-care-card-title{font-size:12px;font-weight:950;color:#0f172a;margin-bottom:9px}.crm-care-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.crm-care-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.crm-care-field.wide{grid-column:1/-1}.crm-care-field label{display:block;font-size:9px;font-weight:900;color:#64748b;margin-bottom:3px}.crm-care-field input,.crm-care-field select,.crm-care-field textarea{width:100%;border:1px solid #cbd8e8;border-radius:8px;background:#fff;padding:8px 9px;font:inherit;font-size:11px;color:#0f172a}.crm-care-field textarea{min-height:64px;resize:vertical}.crm-care-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:9px;flex-wrap:wrap}.crm-care-status{margin-right:auto;font-size:9px;font-weight:900;color:#15803d}.crm-care-status.err{color:#dc2626}.crm-care-btn{border:0;border-radius:8px;padding:8px 11px;font-weight:900;cursor:pointer}.crm-care-save{background:#1769f6;color:#fff}.crm-care-event{border-left:4px solid #1769f6;border-radius:8px;background:#fff;padding:8px 9px;margin-top:6px}.crm-care-event-meta{font-size:9px;color:#64748b}.crm-care-event-note{font-size:10px;font-weight:700;color:#334155;margin-top:3px;white-space:pre-wrap}.crm-care-badge{display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;font-size:9px;font-weight:950;background:#e2e8f0;color:#334155}.crm-care-badge.bad{background:#fee2e2;color:#b91c1c}.crm-care-badge.good{background:#dcfce7;color:#15803d}.crm-care-note{font-size:9px;color:#64748b;margin-top:7px}\n@media(max-width:1100px){.crm-care-kpis{grid-template-columns:repeat(3,1fr)}.crm-care-task{grid-template-columns:1fr 1fr}.crm-care-grid.three{grid-template-columns:1fr 1fr}}\n@media(max-width:760px){.crm-care-kpis,.crm-care-grid,.crm-care-grid.three{grid-template-columns:1fr}.crm-care-field.wide{grid-column:auto}.crm-care-task{grid-template-columns:1fr}}';
  document.head.appendChild(style);

  function clean(v){return String(v==null?'':v).trim()}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function currentCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}
  function parseArray(v){if(Array.isArray(v))return v;try{var a=JSON.parse(v||'[]');return Array.isArray(a)?a:[]}catch(_){return []}}
  function localDate(){var d=new Date(),o=d.getTimezoneOffset()*60000;return new Date(d.getTime()-o).toISOString().slice(0,10)}
  function localDateTime(){var d=new Date(),o=d.getTimezoneOffset()*60000;return new Date(d.getTime()-o).toISOString().slice(0,16)}
  function pretty(v){if(!v)return '—';try{return new Date(v.length===10?v+'T12:00:00':v).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:v.length===10?undefined:'short'})}catch(_){return v}}
  async function api(path,opts){var o=Object.assign({credentials:'same-origin',cache:'no-store'},opts||{});o.headers=Object.assign({'cache-control':'no-cache'},o.headers||{});if(o.body&&!o.headers['content-type'])o.headers['content-type']='application/json';var r=await fetch(path,o),d={};try{d=await r.json()}catch(_){}if(!r.ok)throw new Error(d.error||'İşlem yapılamadı.');return d}
  function baselineContact(c){return clean(c&&c.last_contact_at)||clean(c&&c.last_meeting_at)||clean(c&&c.last_meeting_date)||clean(c&&c.last_meeting)||''}
  function customerPeople(c){var out=[];function add(v){v=clean(v);if(v&&out.indexOf(v)<0)out.push(v)}parseArray(c&&c.contacts_json).forEach(function(x){add(x&&x.name)});clean(c&&c.contact_name).split(/\r?\n/).forEach(add);return out}
  function stateClass(date){var t=localDate();if(!date)return '';if(date<t)return 'overdue';if(date===t)return 'today';return ''}

  var initialized={};
  async function initCustomer(c){if(!c||!c.id||initialized[c.id])return;initialized[c.id]=1;try{await api('/api/sales-care',{method:'POST',body:JSON.stringify({action:'init',customer_id:Number(c.id),customer_name:clean(c.company),last_contact_at:baselineContact(c)})})}catch(_){initialized[c.id]=0}}

  function fillSelect(select,items,value){if(!select)return;select.innerHTML=items.map(function(x){return '<option value="'+esc(x)+'">'+esc(x||'Seçin')+'</option>'}).join('');select.value=value||''}

  function renderEvents(box,events){if(!box)return;if(!events||!events.length){box.innerHTML='<div class="crm-care-empty">Henüz takip/görüşme kaydı yok.</div>';return}box.innerHTML=events.slice(0,8).map(function(x){return '<div class="crm-care-event"><div class="crm-care-event-meta">'+esc(pretty(x.event_at))+' • '+esc(x.contact_person||'Yetkili')+' • '+esc(x.result||x.event_type||'Görüşme')+'</div><div class="crm-care-event-note">'+esc(x.note||'—')+'</div><div class="crm-care-event-meta" style="margin-top:4px">Sonraki: '+esc(x.next_action_type||'—')+' • '+esc(pretty(x.next_action_date||''))+'</div></div>'}).join('')}

  async function loadCustomerCare(c,root){
    if(!c||!c.id||!root)return;
    try{
      var data=await api('/api/sales-care?customer_id='+encodeURIComponent(c.id));
      var s=data.state||{};
      var next=root.querySelector('.crm-care-next-card');
      if(next){
        next.querySelector('[data-next-type]').value=s.next_action_type||'';
        next.querySelector('[data-next-date]').value=s.next_action_date||'';
        next.querySelector('[data-next-note]').value=s.next_action_note||'';
        var badge=next.querySelector('[data-next-badge]');
        if(badge){var cl=stateClass(s.next_action_date);badge.textContent=!s.next_action_date?'Takip planı yok':cl==='overdue'?'Süresi geçti':cl==='today'?'Bugün':'Planlandı';badge.className='crm-care-badge '+(cl==='overdue'?'bad':s.next_action_date?'good':'')}
        renderEvents(next.querySelector('[data-care-events]'),data.events||[]);
      }
      var sat=root.querySelector('.crm-care-satisfaction-card');
      if(sat){
        sat.querySelector('[data-satisfaction]').value=s.satisfaction||'';
        sat.querySelector('[data-complaint-status]').value=s.complaint_status||'';
        sat.querySelector('[data-complaint-note]').value=s.complaint_note||'';
        sat.querySelector('[data-loss-reason]').value=s.loss_reason||'';
      }
    }catch(e){var statuses=root.querySelectorAll('.crm-care-status');for(var i=0;i<statuses.length;i++){statuses[i].textContent=e.message;statuses[i].className='crm-care-status err'}}
  }

  function mountMeetingCard(body,c,root){
    var card=body.querySelector('.crm-care-meeting-card');
    if(!card){card=document.createElement('section');card.className='crm-care-card crm-care-meeting-card';body.appendChild(card)}
    if(card.dataset.customerId===String(c.id))return;
    card.dataset.customerId=String(c.id);
    var people=customerPeople(c),personOptions='<option value="">Yetkili seçin</option>'+people.map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>'}).join('');
    card.innerHTML='<div class="crm-care-card-title">📞 Görüşme Sonucu & Otomatik Takip</div><div class="crm-care-grid three"><div class="crm-care-field"><label>Görüşülen Kişi</label><select data-event-person>'+personOptions+'</select></div><div class="crm-care-field"><label>Görüşme Sonucu</label><select data-event-result><option value="">Seçin</option><option>Olumlu</option><option>Beklemede</option><option>Teklif İstedi</option><option>Numune İstedi</option><option>Sipariş Alındı</option><option>Olumsuz</option><option>Cevap Vermedi</option></select></div><div class="crm-care-field"><label>Tarih / Saat</label><input type="datetime-local" data-event-date value="'+localDateTime()+'"></div><div class="crm-care-field wide"><label>Görüşme Notu</label><textarea data-event-note placeholder="Müşteriyle ne konuşuldu, talebi neydi?"></textarea></div><div class="crm-care-field"><label>Sonraki İşlem *</label><select data-event-next-type><option value="">Seçin</option><option>Arama</option><option>Teklif Takibi</option><option>Numune Takibi</option><option>Tekrar Görüşme</option><option>Sipariş Sonrası Memnuniyet</option><option>Ödeme Takibi</option><option>Diğer</option></select></div><div class="crm-care-field"><label>Sonraki İşlem Tarihi *</label><input type="date" data-event-next-date></div><div class="crm-care-field"><label>Takip Notu</label><input data-event-next-note placeholder="Örn. fiyat cevabı sorulacak"></div></div><div class="crm-care-actions"><span class="crm-care-status" data-event-status></span><button type="button" class="crm-care-btn crm-care-save" data-event-save>Görüşmeyi Kaydet + Takip Oluştur</button></div><div class="crm-care-note">Görüşme kaydında sonraki işlem zorunludur; böylece müşteri takibi unutulmaz.</div>';
    card.querySelector('[data-event-save]').onclick=async function(){var result=clean(card.querySelector('[data-event-result]').value),note=clean(card.querySelector('[data-event-note]').value),nt=clean(card.querySelector('[data-event-next-type]').value),nd=clean(card.querySelector('[data-event-next-date]').value),status=card.querySelector('[data-event-status]');if(!result||!note||!nt||!nd){status.textContent='Sonuç, görüşme notu, sonraki işlem ve tarih zorunlu.';status.className='crm-care-status err';return}this.disabled=true;status.textContent='Kaydediliyor...';status.className='crm-care-status';try{await api('/api/sales-care',{method:'POST',body:JSON.stringify({action:'add_event',customer_id:Number(c.id),customer_name:clean(c.company),contact_person:clean(card.querySelector('[data-event-person]').value),result:result,note:note,event_at:clean(card.querySelector('[data-event-date]').value)||localDateTime(),next_action_type:nt,next_action_date:nd,next_action_note:clean(card.querySelector('[data-event-next-note]').value)})});card.querySelector('[data-event-note]').value='';card.querySelector('[data-event-result]').value='';card.querySelector('[data-event-next-type]').value='';card.querySelector('[data-event-next-date]').value='';card.querySelector('[data-event-next-note]').value='';card.querySelector('[data-event-date]').value=localDateTime();status.textContent='Görüşme ve sonraki takip kaydedildi.';await loadCustomerCare(c,root);loadDashboard()}catch(e){status.textContent=e.message;status.className='crm-care-status err'}finally{this.disabled=false}};
  }

  function mountNextCard(body,c,root){
    var card=body.querySelector('.crm-care-next-card');
    if(!card){card=document.createElement('section');card.className='crm-care-card crm-care-next-card';body.insertBefore(card,body.firstChild)}
    if(card.dataset.customerId===String(c.id))return;
    card.dataset.customerId=String(c.id);
    card.innerHTML='<div class="crm-care-card-title">⏰ Sonraki İşlem <span class="crm-care-badge" data-next-badge style="float:right">Takip planı yok</span></div><div class="crm-care-grid three"><div class="crm-care-field"><label>İşlem</label><select data-next-type><option value="">Seçin</option><option>Arama</option><option>Teklif Takibi</option><option>Numune Takibi</option><option>Tekrar Görüşme</option><option>Sipariş Sonrası Memnuniyet</option><option>Ödeme Takibi</option><option>Diğer</option></select></div><div class="crm-care-field"><label>Tarih</label><input type="date" data-next-date></div><div class="crm-care-field"><label>Not</label><input data-next-note placeholder="Ne yapılacak?"></div></div><div class="crm-care-actions"><span class="crm-care-status" data-next-status></span><button type="button" class="crm-care-btn crm-care-save" data-next-save>Takibi Kaydet</button></div><div style="margin-top:10px;font-size:10px;font-weight:950;color:#334155">Son Hareketler</div><div data-care-events></div>';
    card.querySelector('[data-next-save]').onclick=async function(){var nt=clean(card.querySelector('[data-next-type]').value),nd=clean(card.querySelector('[data-next-date]').value),status=card.querySelector('[data-next-status]');if((nt&&!nd)||(!nt&&nd)){status.textContent='İşlem ve tarih birlikte seçilmeli.';status.className='crm-care-status err';return}this.disabled=true;status.textContent='Kaydediliyor...';status.className='crm-care-status';try{await api('/api/sales-care',{method:'POST',body:JSON.stringify({action:'save_state',customer_id:Number(c.id),customer_name:clean(c.company),next_action_type:nt,next_action_date:nd,next_action_note:clean(card.querySelector('[data-next-note]').value)})});status.textContent=nt?'Takip planlandı.':'Takip planı temizlendi.';await loadCustomerCare(c,root);loadDashboard()}catch(e){status.textContent=e.message;status.className='crm-care-status err'}finally{this.disabled=false}};
  }

  function mountSatisfactionCard(body,c,root){
    var card=body.querySelector('.crm-care-satisfaction-card');
    if(!card){card=document.createElement('section');card.className='crm-care-card crm-care-satisfaction-card';body.appendChild(card)}
    if(card.dataset.customerId===String(c.id))return;
    card.dataset.customerId=String(c.id);
    card.innerHTML='<div class="crm-care-card-title">🙂 Müşteri Memnuniyeti & Risk Takibi</div><div class="crm-care-grid"><div class="crm-care-field"><label>Memnuniyet</label><select data-satisfaction><option value="">Bilinmiyor</option><option>Memnun</option><option>Kararsız</option><option>Şikayet Var</option></select></div><div class="crm-care-field"><label>Şikayet Durumu</label><select data-complaint-status><option value="">Yok</option><option>Açık</option><option>Çözüldü</option></select></div><div class="crm-care-field wide"><label>Şikayet / Çözüm Notu</label><textarea data-complaint-note placeholder="Sorun nedir, kim ilgileniyor, nasıl çözüldü?"></textarea></div><div class="crm-care-field wide"><label>Kaybedilen İş Sebebi</label><select data-loss-reason><option value="">Seçim yok</option><option>Fiyat</option><option>Termin</option><option>Rakip</option><option>Cevap Vermedi</option><option>Kalite / Teknik</option><option>Diğer</option></select></div></div><div class="crm-care-actions"><span class="crm-care-status" data-sat-status></span><button type="button" class="crm-care-btn crm-care-save" data-sat-save>Memnuniyet Bilgisini Kaydet</button></div>';
    card.querySelector('[data-sat-save]').onclick=async function(){var status=card.querySelector('[data-sat-status]');this.disabled=true;status.textContent='Kaydediliyor...';status.className='crm-care-status';try{await api('/api/sales-care',{method:'POST',body:JSON.stringify({action:'save_state',customer_id:Number(c.id),customer_name:clean(c.company),satisfaction:clean(card.querySelector('[data-satisfaction]').value),complaint_status:clean(card.querySelector('[data-complaint-status]').value),complaint_note:clean(card.querySelector('[data-complaint-note]').value),loss_reason:clean(card.querySelector('[data-loss-reason]').value)})});status.textContent='Memnuniyet bilgisi kaydedildi.';loadDashboard()}catch(e){status.textContent=e.message;status.className='crm-care-status err'}finally{this.disabled=false}};
  }

  function mountCustomerCare(){
    var modal=document.getElementById('portfolioDetailExpandModal');if(!modal||!modal.classList.contains('show'))return;
    var editor=modal.querySelector('.pie-editor');if(!editor)return;
    var sections=Array.prototype.slice.call(editor.querySelectorAll('.pie-section')).slice(0,5);if(sections.length<5)return;
    var c=currentCustomer();if(!c||!c.id)return;
    var general=sections[0].querySelector('.pie-section-body'),meetings=sections[2].querySelector('.pie-section-body'),todos=sections[3].querySelector('.pie-section-body');if(!general||!meetings||!todos)return;
    initCustomer(c);
    mountSatisfactionCard(general,c,editor);
    mountMeetingCard(meetings,c,editor);
    mountNextCard(todos,c,editor);
    loadCustomerCare(c,editor);
  }

  var dashboardLoading=false;
  async function loadDashboard(){
    var box=document.querySelector('.crm-care-dashboard');if(!box||dashboardLoading)return;dashboardLoading=true;
    var tasks=box.querySelector('[data-care-task-list]');if(tasks)tasks.innerHTML='<div class="crm-care-empty">Takipler yükleniyor...</div>';
    try{
      var d=await api('/api/sales-care-dashboard');
      var set=function(name,val){var el=box.querySelector('[data-kpi="'+name+'"] strong');if(el)el.textContent=String(val||0)};
      set('today',d.today_count);set('overdue',d.overdue_count);set('complaints',d.complaint_count);set('inactive',d.inactive_count);set('meetings',d.month_events);set('orders',d.month_orders);
      var list=(d.tasks||[]).slice(0,12);if(!list.length){tasks.innerHTML='<div class="crm-care-empty">Bugün veya gecikmiş takip yok. 👍</div>'}else{tasks.innerHTML=list.map(function(x){var cl=stateClass(x.next_action_date);return '<div class="crm-care-task '+cl+'"><div class="crm-care-task-company">'+esc(x.customer_name||('Müşteri #'+x.customer_id))+'</div><div>'+esc(x.next_action_type||'Takip')+'</div><div>'+esc(pretty(x.next_action_date||''))+'</div><div>'+esc(x.next_action_note||'—')+'</div></div>'}).join('')}
    }catch(e){if(tasks)tasks.innerHTML='<div class="crm-care-empty" style="color:#b91c1c">'+esc(e.message)+'</div>'}finally{dashboardLoading=false}
  }

  function mountDashboard(){
    if(location.pathname!='/musteri-portfoyu.html')return;
    if(document.querySelector('.crm-care-dashboard'))return loadDashboard();
    var table=document.querySelector('.table-card');if(!table||!table.parentNode)return;
    var box=document.createElement('section');box.className='crm-care-dashboard';box.innerHTML='<div class="crm-care-dash-head"><div class="crm-care-dash-title">🎯 Satış Takip Merkezi — Bugün Ne Yapmalıyız?</div><button type="button" class="crm-care-refresh" data-care-refresh>↻ Yenile</button></div><div class="crm-care-kpis"><div class="crm-care-kpi warn" data-kpi="today"><strong>0</strong><span>BUGÜN YAPILACAK</span></div><div class="crm-care-kpi bad" data-kpi="overdue"><strong>0</strong><span>GECİKEN TAKİP</span></div><div class="crm-care-kpi bad" data-kpi="complaints"><strong>0</strong><span>AÇIK ŞİKAYET</span></div><div class="crm-care-kpi warn" data-kpi="inactive"><strong>0</strong><span>30+ GÜN SESSİZ</span></div><div class="crm-care-kpi good" data-kpi="meetings"><strong>0</strong><span>BU AY GÖRÜŞME</span></div><div class="crm-care-kpi good" data-kpi="orders"><strong>0</strong><span>BU AY SİPARİŞ SONUCU</span></div></div><div class="crm-care-task-list" data-care-task-list></div>';
    table.parentNode.insertBefore(box,table);box.querySelector('[data-care-refresh]').onclick=loadDashboard;loadDashboard();
  }

  var queued=false;
  function schedule(){if(queued)return;queued=true;setTimeout(function(){queued=false;mountDashboard();mountCustomerCare()},50)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',function(){setTimeout(mountCustomerCare,80)},true);
})();
`;

async function authOk(request,env,ctx){
  try{
    const u=new URL(request.url);
    const probe=new Request(new URL('/api/customers',u.origin),{method:'GET',headers:request.headers});
    const response=await worker.fetch(probe,env,ctx);
    return response.ok;
  }catch(_){return false}
}

async function ensureTables(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sales_care (
    customer_id INTEGER PRIMARY KEY,
    customer_name TEXT DEFAULT '',
    next_action_type TEXT DEFAULT '',
    next_action_date TEXT DEFAULT '',
    next_action_note TEXT DEFAULT '',
    satisfaction TEXT DEFAULT '',
    complaint_status TEXT DEFAULT '',
    complaint_note TEXT DEFAULT '',
    loss_reason TEXT DEFAULT '',
    last_contact_at TEXT DEFAULT '',
    created_at TEXT DEFAULT '',
    updated_at TEXT DEFAULT ''
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sales_care_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    customer_name TEXT DEFAULT '',
    event_type TEXT DEFAULT 'Görüşme',
    contact_person TEXT DEFAULT '',
    result TEXT DEFAULT '',
    note TEXT DEFAULT '',
    event_at TEXT DEFAULT '',
    next_action_type TEXT DEFAULT '',
    next_action_date TEXT DEFAULT '',
    next_action_note TEXT DEFAULT '',
    created_at TEXT DEFAULT ''
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sales_care_next ON sales_care(next_action_date)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sales_care_events_customer ON sales_care_events(customer_id,event_at)').run();
}

function clean(v){return String(v==null?'':v).trim()}
function j(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-cache, no-store, must-revalidate'}})}
async function bodyJson(request){try{return await request.json()}catch(_){return {}}}
async function seedCustomer(env,id,name,lastContact=''){
  const now=new Date().toISOString();
  await env.DB.prepare(`INSERT INTO sales_care(customer_id,customer_name,last_contact_at,created_at,updated_at)
    VALUES(?,?,?,?,?) ON CONFLICT(customer_id) DO UPDATE SET customer_name=excluded.customer_name,
    last_contact_at=CASE WHEN sales_care.last_contact_at='' THEN excluded.last_contact_at ELSE sales_care.last_contact_at END,
    updated_at=excluded.updated_at`).bind(id,name,lastContact,now,now).run();
}

async function handleCare(request,env){
  await ensureTables(env);
  const url=new URL(request.url);
  if(request.method==='GET'){
    const id=Number(url.searchParams.get('customer_id')||0);if(!id)return j({error:'Müşteri seçilmedi.'},400);
    const state=(await env.DB.prepare('SELECT * FROM sales_care WHERE customer_id=?').bind(id).first())||{customer_id:id};
    const ev=await env.DB.prepare('SELECT * FROM sales_care_events WHERE customer_id=? ORDER BY event_at DESC,id DESC LIMIT 50').bind(id).all();
    return j({state,events:ev.results||[]});
  }
  if(request.method!=='POST')return j({error:'Yöntem desteklenmiyor.'},405);
  const b=await bodyJson(request),action=clean(b.action),id=Number(b.customer_id||0),name=clean(b.customer_name);if(!id)return j({error:'Müşteri seçilmedi.'},400);
  if(action==='init'){
    await seedCustomer(env,id,name,clean(b.last_contact_at));
    return j({ok:true});
  }
  await seedCustomer(env,id,name,'');
  if(action==='add_event'){
    const result=clean(b.result),note=clean(b.note),nextType=clean(b.next_action_type),nextDate=clean(b.next_action_date),eventAt=clean(b.event_at)||new Date().toISOString();
    if(!result||!note||!nextType||!nextDate)return j({error:'Görüşme sonucu, not, sonraki işlem ve tarih zorunlu.'},400);
    const now=new Date().toISOString();
    await env.DB.prepare(`INSERT INTO sales_care_events(customer_id,customer_name,event_type,contact_person,result,note,event_at,next_action_type,next_action_date,next_action_note,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(id,name,'Görüşme',clean(b.contact_person),result,note,eventAt,nextType,nextDate,clean(b.next_action_note),now).run();
    await env.DB.prepare(`UPDATE sales_care SET customer_name=?,last_contact_at=?,next_action_type=?,next_action_date=?,next_action_note=?,updated_at=? WHERE customer_id=?`).bind(name,eventAt,nextType,nextDate,clean(b.next_action_note),now,id).run();
    return j({ok:true});
  }
  if(action==='save_state'){
    const current=(await env.DB.prepare('SELECT * FROM sales_care WHERE customer_id=?').bind(id).first())||{};
    const pick=(key)=>Object.prototype.hasOwnProperty.call(b,key)?clean(b[key]):clean(current[key]);
    await env.DB.prepare(`UPDATE sales_care SET customer_name=?,next_action_type=?,next_action_date=?,next_action_note=?,satisfaction=?,complaint_status=?,complaint_note=?,loss_reason=?,updated_at=? WHERE customer_id=?`).bind(name||clean(current.customer_name),pick('next_action_type'),pick('next_action_date'),pick('next_action_note'),pick('satisfaction'),pick('complaint_status'),pick('complaint_note'),pick('loss_reason'),new Date().toISOString(),id).run();
    return j({ok:true});
  }
  return j({error:'Bilinmeyen işlem.'},400);
}

async function handleDashboard(env){
  await ensureTables(env);
  const today=new Date().toISOString().slice(0,10),month=today.slice(0,7);
  const rows=(await env.DB.prepare('SELECT * FROM sales_care ORDER BY next_action_date ASC, customer_name ASC').all()).results||[];
  const tasks=rows.filter(x=>clean(x.next_action_date)&&clean(x.next_action_date)<=today).sort((a,b)=>String(a.next_action_date).localeCompare(String(b.next_action_date)));
  const complaint=rows.filter(x=>clean(x.complaint_status)==='Açık'||clean(x.satisfaction)==='Şikayet Var');
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);const cutoffKey=cutoff.toISOString().slice(0,10);
  const inactive=rows.filter(x=>clean(x.last_contact_at)&&clean(x.last_contact_at).slice(0,10)<cutoffKey);
  const stats=(await env.DB.prepare(`SELECT COUNT(*) AS total,
    SUM(CASE WHEN result='Sipariş Alındı' THEN 1 ELSE 0 END) AS orders,
    SUM(CASE WHEN result='Olumsuz' THEN 1 ELSE 0 END) AS lost
    FROM sales_care_events WHERE substr(event_at,1,7)=?`).bind(month).first())||{};
  return j({today_count:tasks.filter(x=>clean(x.next_action_date)===today).length,overdue_count:tasks.filter(x=>clean(x.next_action_date)<today).length,complaint_count:complaint.length,inactive_count:inactive.length,month_events:Number(stats.total||0),month_orders:Number(stats.orders||0),month_lost:Number(stats.lost||0),tasks});
}

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/api/sales-care'||url.pathname==='/api/sales-care-dashboard'){
      if(!(await authOk(request,env,ctx)))return j({error:'Oturum gerekli.'},401);
      try{return url.pathname==='/api/sales-care'?await handleCare(request,env):await handleDashboard(env)}catch(e){console.error('sales-care',e);return j({error:'Satış takip verisi işlenemedi.'},500)}
    }
    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-sales-care-center[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-sales-care-center="20261001-v1">${SALES_CARE_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx)}
};
