import worker from './new_customer_cache_entry.js';

const PORTFOLIO_MAIN_PATCH=String.raw`
(function(){
  if(window.__crmPortfolioMainColumnsV1)return;
  window.__crmPortfolioMainColumnsV1='20261001-portfolio-main-v1';

  var VERSION='20261001-portfolio-main-v1';
  var style=document.createElement('style');
  style.id='crmPortfolioMainColumnsStyle';
  style.textContent='\n.table-card table{min-width:0!important;table-layout:fixed!important}\n.table-card table th,.table-card table td{display:table-cell!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}\n.table-card table th:nth-child(1),.table-card table td:nth-child(1){width:20%!important}\n.table-card table th:nth-child(2),.table-card table td:nth-child(2){width:15%!important}\n.table-card table th:nth-child(3),.table-card table td:nth-child(3){width:10%!important}\n.table-card table th:nth-child(4),.table-card table td:nth-child(4){width:16%!important}\n.table-card table th:nth-child(5),.table-card table td:nth-child(5){width:11%!important}\n.table-card table th:nth-child(6),.table-card table td:nth-child(6){width:12%!important}\n.table-card table th:nth-child(7),.table-card table td:nth-child(7){width:11%!important}\n.table-card table th:nth-child(8),.table-card table td:nth-child(8){width:5%!important;text-align:center!important}\n.detail-actions .crm-customer-button{background:#dc2626!important;border-color:#dc2626!important;color:#fff!important;font-weight:950!important}\n#portfolioEditorModal .crm-meeting-notes-field textarea{min-height:120px!important;background:#f8fafc!important}\n';
  document.head.appendChild(style);

  function clean(v){return String(v==null?'':v).trim()}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]||ch})}
  function parseArray(v){if(Array.isArray(v))return v;try{var a=JSON.parse(v||'[]');return Array.isArray(a)?a:[]}catch(_){return []}}
  function rowsData(){try{return Array.isArray(visibleRows)?visibleRows:[]}catch(_){return []}}
  function selectedCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}

  function contactName(c){
    var direct=parseArray(c&&c.contacts_json);
    if(direct.length&&clean(direct[0]&&direct[0].name))return clean(direct[0].name);
    var names=clean(c&&c.contact_name).split(/\r?\n/).map(clean).filter(Boolean);
    return names[0]||'—';
  }
  function priorityText(c){
    var p=clean(c&&c.priority).toLocaleUpperCase('tr-TR');
    if(p==='KRİTİK')return 'Yüksek';
    if(p==='YÜKSEK')return 'Orta';
    return 'Düşük';
  }
  function priorityClassSafe(c){
    var p=clean(c&&c.priority).toLocaleUpperCase('tr-TR');
    return p==='KRİTİK'?'high':p==='YÜKSEK'?'mid':'low';
  }
  function statusText(c){
    var stage=clean(c&&c.stage).toLocaleLowerCase('tr-TR');
    if(stage.indexOf('kazan')>=0)return 'Olumlu';
    if(stage.indexOf('kaybed')>=0||clean(c&&c.record_status)==='Pasif')return 'Olumsuz';
    if(stage.indexOf('bekle')>=0)return 'Beklemede';
    return 'Sonuçlanmamış';
  }
  function statusClass(c){
    var x=statusText(c);
    return x==='Olumlu'?'pos':x==='Olumsuz'?'neg':x==='Beklemede'?'wait':'open';
  }
  function meetingOf(c){
    try{if(typeof lastMeeting==='function')return lastMeeting(c)}catch(_){ }
    try{
      if(typeof meetings!=='undefined'&&Array.isArray(meetings)){
        return meetings.filter(function(m){return Number(m&&m.customer_id)===Number(c&&c.id)}).sort(function(a,b){return clean(b&&b.meeting_date||b&&b.created_at).localeCompare(clean(a&&a.meeting_date||a&&a.created_at))})[0]||null;
      }
    }catch(_){ }
    return null;
  }
  function meetingDate(c){var m=meetingOf(c);return clean(m&&m.meeting_date||m&&m.created_at).slice(0,10)||'—'}

  function rebuildTable(){
    var table=document.querySelector('.table-card table'),tbody=document.getElementById('rows');
    if(!table||!tbody)return;
    var thead=table.querySelector('thead');
    var data=rowsData();
    var already=thead&&thead.dataset.crmColumns===VERSION&&Array.prototype.every.call(tbody.children,function(tr){return tr.children.length===8});
    if(already)return;
    if(thead){thead.dataset.crmColumns=VERSION;thead.innerHTML='<tr><th>Firma Adı</th><th>Yetkili</th><th>İl</th><th>İş Alanı</th><th>Potansiyel</th><th>Durum</th><th>Son Görüşme Tarihi</th><th>Detay</th></tr>'}
    if(!data.length){tbody.innerHTML='';return}
    var sel=selectedCustomer(),selId=sel&&Number(sel.id);
    tbody.innerHTML=data.map(function(c){
      var id=Number(c&&c.id||0),selectedClass=selId===id?' selected':'',over='';
      try{if(typeof isOverdue==='function'&&isOverdue(c))over=' overdue'}catch(_){ }
      return '<tr class="'+(over+selectedClass).trim()+'" onclick="selectCustomer('+id+')">'
        +'<td><span class="dot"></span><span class="company">'+esc(c&&c.company||'—')+'</span></td>'
        +'<td>'+esc(contactName(c))+'</td>'
        +'<td>'+esc(c&&c.region||'—')+'</td>'
        +'<td>'+esc(c&&c.categories||c&&c.sector||'—')+'</td>'
        +'<td><span class="badge '+priorityClassSafe(c)+'">'+esc(priorityText(c))+'</span></td>'
        +'<td><span class="badge '+statusClass(c)+'">'+esc(statusText(c))+'</span></td>'
        +'<td>'+esc(meetingDate(c))+'</td>'
        +'<td><button class="btn small" onclick="event.stopPropagation();selectCustomer('+id+')">Detay</button></td>'
        +'</tr>';
    }).join('');
  }

  function meetingNotesText(){
    var c=selectedCustomer();if(!c)return '';
    var list=[];
    try{if(typeof selectedHistory!=='undefined'&&selectedHistory&&Array.isArray(selectedHistory.meetings))list=selectedHistory.meetings.slice()}catch(_){ }
    if(!list.length){
      try{if(typeof meetings!=='undefined'&&Array.isArray(meetings))list=meetings.filter(function(m){return Number(m&&m.customer_id)===Number(c.id)})}catch(_){ }
    }
    list.sort(function(a,b){return clean(b&&b.meeting_date||b&&b.created_at).localeCompare(clean(a&&a.meeting_date||a&&a.created_at))});
    return list.map(function(m){var d=clean(m&&m.meeting_date||m&&m.created_at).slice(0,10)||'Tarih yok',note=clean(m&&m.note)||clean(m&&m.result)||'Not yok';return d+' — '+note}).join('\n\n');
  }

  function adaptEditor(){
    var modal=document.getElementById('portfolioEditorModal');if(!modal)return;
    var priority=document.getElementById('pemPriority');
    if(priority){var old=priority.closest('.pem-field');if(old)old.style.display='none'}
    var grid=modal.querySelector('.pem-grid');if(!grid)return;
    var field=grid.querySelector('.crm-meeting-notes-field');
    if(!field){
      field=document.createElement('div');field.className='pem-field full crm-meeting-notes-field';
      field.innerHTML='<label>Görüşme Notları</label><textarea id="crmMeetingNotesView" readonly placeholder="Henüz görüşme notu yok."></textarea>';
      if(priority&&priority.closest('.pem-field'))priority.closest('.pem-field').insertAdjacentElement('afterend',field);else grid.appendChild(field);
    }
    var area=document.getElementById('crmMeetingNotesView');if(area)area.value=meetingNotesText();
  }

  function adaptDetail(){
    var btn=document.querySelector('#detailContent .detail-actions button');
    if(btn){btn.textContent='Müşteri';btn.classList.add('crm-customer-button');btn.title='Müşteri bilgilerini düzenle'}
  }

  function sync(){rebuildTable();adaptDetail();adaptEditor()}
  function install(){
    sync();
    var tbody=document.getElementById('rows');
    if(tbody){new MutationObserver(function(){setTimeout(rebuildTable,0)}).observe(tbody,{childList:true})}
    document.addEventListener('click',function(e){
      var edit=e.target&&e.target.closest?e.target.closest('#detailContent .detail-actions button'):null;
      if(edit){setTimeout(adaptEditor,0);setTimeout(adaptEditor,80)}
      var customerButton=e.target&&e.target.closest?e.target.closest('.crm-customer-button'):null;
      if(customerButton){setTimeout(adaptEditor,120)}
    },true);
    setTimeout(sync,100);setTimeout(sync,500);setTimeout(sync,1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
`;

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-portfolio-main-columns[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-portfolio-main-columns="20261001-portfolio-main-v1">${PORTFOLIO_MAIN_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
