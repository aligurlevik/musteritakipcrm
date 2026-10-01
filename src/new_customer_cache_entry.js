import worker from './customer_mail_ui_v2_entry.js';

const NEW_CUSTOMER_VERSION='20261001-1108';

const PORTFOLIO_SAFE_LAYOUT=String.raw`
(function(){
  if(window.__crmPortfolioSafeLayoutV2)return;
  window.__crmPortfolioSafeLayoutV2='20261001-safe-layout-v2';

  var style=document.createElement('style');
  style.id='crmPortfolioSafeLayoutStyle';
  style.textContent='\n.table-card table{min-width:0!important;table-layout:fixed!important}\n.table-card th,.table-card td{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}\n.table-card th:nth-child(1),.table-card td:nth-child(1){display:table-cell!important;width:20%!important}\n.table-card th:nth-child(2),.table-card td:nth-child(2){display:table-cell!important;width:15%!important}\n.table-card th:nth-child(3),.table-card td:nth-child(3){display:table-cell!important;width:10%!important}\n.table-card th:nth-child(4),.table-card td:nth-child(4){display:none!important}\n.table-card th:nth-child(5),.table-card td:nth-child(5){display:table-cell!important;width:17%!important}\n.table-card th:nth-child(6),.table-card td:nth-child(6){display:table-cell!important;width:11%!important}\n.table-card th:nth-child(7),.table-card td:nth-child(7){display:table-cell!important;width:11%!important}\n.table-card th:nth-child(8),.table-card td:nth-child(8){display:table-cell!important;width:12%!important}\n.table-card th:nth-child(9),.table-card td:nth-child(9),.table-card th:nth-child(10),.table-card td:nth-child(10){display:none!important}\n.table-card th:nth-child(11),.table-card td:nth-child(11){display:table-cell!important;width:7%!important;text-align:center!important}\n.detail-actions button.crm-customer-button{background:#dc2626!important;border-color:#dc2626!important;color:#fff!important;font-weight:950!important}\n#portfolioEditorModal .crm-meeting-notes-field textarea{min-height:130px!important;background:#f8fafc!important}\n';
  document.head.appendChild(style);

  function clean(v){return String(v==null?'':v).trim()}
  function visible(){try{return Array.isArray(visibleRows)?visibleRows:[]}catch(_){return []}}
  function selectedCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}

  function setHeaders(){
    var cells=document.querySelectorAll('.table-card thead th');
    if(cells.length<11)return;
    cells[0].textContent='Firma Adı';
    cells[1].textContent='Yetkili';
    cells[2].textContent='İl';
    cells[4].textContent='İş Alanı';
    cells[5].textContent='Potansiyel';
    cells[6].textContent='Durum';
    cells[7].textContent='Son Görüşme Tarihi';
    cells[10].textContent='Detay';
  }

  function adaptRows(){
    setHeaders();
    var rows=document.querySelectorAll('#rows > tr'),data=visible();
    rows.forEach(function(row,index){
      if(row.dataset.crmSafeLayout==='v2')return;
      var cells=row.children;if(cells.length<11)return;
      var customer=data[index]||null;
      var oldLast=cells[5].innerHTML,oldPotential=cells[6].innerHTML,oldStatus=cells[7].innerHTML;
      cells[2].textContent=clean(customer&&customer.region)||'—';
      cells[5].innerHTML=oldPotential;
      cells[6].innerHTML=oldStatus;
      cells[7].innerHTML=oldLast;
      row.dataset.crmSafeLayout='v2';
    });
  }

  function makeCustomerButton(){
    var btn=document.querySelector('#detailContent .detail-actions button');
    if(!btn)return;
    btn.textContent='Müşteri';
    btn.classList.add('crm-customer-button');
    btn.title='Müşteri bilgilerini aç';
  }

  function meetingNotesText(){
    var c=selectedCustomer(),items=[];
    if(!c)return '';
    try{if(typeof selectedHistory!=='undefined'&&selectedHistory&&Array.isArray(selectedHistory.meetings))items=selectedHistory.meetings.slice()}catch(_){ }
    if(!items.length){
      try{if(typeof meetings!=='undefined'&&Array.isArray(meetings))items=meetings.filter(function(m){return Number(m&&m.customer_id)===Number(c.id)})}catch(_){ }
    }
    items.sort(function(a,b){return clean(b&&b.meeting_date||b&&b.created_at).localeCompare(clean(a&&a.meeting_date||a&&a.created_at))});
    return items.map(function(m){
      var date=clean(m&&m.meeting_date||m&&m.created_at).slice(0,10)||'Tarih yok';
      var note=clean(m&&m.note)||clean(m&&m.result)||'Not yok';
      return date+' — '+note;
    }).join('\n\n');
  }

  function adaptEditor(){
    var modal=document.getElementById('portfolioEditorModal');if(!modal)return;
    var priority=document.getElementById('pemPriority');
    if(priority){var pf=priority.closest('.pem-field');if(pf)pf.style.display='none'}
    var grid=modal.querySelector('.pem-grid');if(!grid)return;
    var field=grid.querySelector('.crm-meeting-notes-field');
    if(!field){
      field=document.createElement('div');
      field.className='pem-field full crm-meeting-notes-field';
      field.innerHTML='<label>Görüşme Notları</label><textarea id="crmMeetingNotesView" readonly placeholder="Henüz görüşme notu yok."></textarea>';
      if(priority&&priority.closest('.pem-field'))priority.closest('.pem-field').insertAdjacentElement('afterend',field);else grid.appendChild(field);
    }
    var area=document.getElementById('crmMeetingNotesView');
    if(area)area.value=meetingNotesText();
  }

  function sync(){adaptRows();makeCustomerButton()}

  function install(){
    sync();
    var tbody=document.getElementById('rows');
    if(tbody)new MutationObserver(function(){setTimeout(adaptRows,0)}).observe(tbody,{childList:true});
    document.addEventListener('click',function(e){
      var detail=e.target&&e.target.closest?e.target.closest('#rows tr, #detailContent .detail-actions button'):null;
      if(detail){setTimeout(sync,0);setTimeout(sync,120)}
      var edit=e.target&&e.target.closest?e.target.closest('#detailContent .detail-actions button'):null;
      if(edit){setTimeout(adaptEditor,0);setTimeout(adaptEditor,120)}
    },true);
    setTimeout(sync,150);setTimeout(sync,700);
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
    const url=new URL(request.url);

    if(request.method==='GET'&&url.pathname==='/yeni-musteri.html'&&url.searchParams.get('v')!==NEW_CUSTOMER_VERSION){
      url.search='';
      url.searchParams.set('v',NEW_CUSTOMER_VERSION);
      return Response.redirect(url.toString(),302);
    }

    const response=await worker.fetch(request,env,ctx);
    if(request.method!=='GET'||!response.ok)return response;

    const type=response.headers.get('content-type')||'';
    if(url.pathname==='/yeni-musteri.html'){
      const headers=new Headers(response.headers);
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      headers.delete('etag');
      headers.delete('content-length');
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }

    if(type.includes('text/html')&&['/','/index.html','/musteri-portfoyu.html'].includes(url.pathname)){
      let html=await response.text();
      html=html.replace(/\/yeni-musteri\.html(?:\?v=[^"'\s<]*)?/g,'/yeni-musteri.html?v='+NEW_CUSTOMER_VERSION);
      if(url.pathname==='/musteri-portfoyu.html'){
        html=html.replace(/<script[^>]*data-portfolio-safe-layout[^>]*>[\s\S]*?<\/script>\s*/gi,'');
        html=html.replace(/<\/body>/i,`<script data-portfolio-safe-layout="v2">${PORTFOLIO_SAFE_LAYOUT}</script>\n</body>`);
      }
      return rebuild(response,html);
    }

    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
