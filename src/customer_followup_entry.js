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
  window.__portfolioModalCleanupLoaded='20260930-1835';

  var style=document.createElement('style');
  style.id='portfolioModalCleanupStyle';
  style.textContent='\n#portfolioDetailExpandModal .pie-top-tabs{grid-template-columns:1fr 1.25fr 1.55fr 1fr 1.15fr .78fr .82fr!important;overflow:visible!important}\n#portfolioDetailExpandModal .pie-top-tab{font-size:14px!important;font-weight:900!important;color:#dc2626!important;padding:14px 5px 12px!important}\n#portfolioDetailExpandModal .pie-top-tab:hover{color:#991b1b!important;background:#fff7f7!important}\n#portfolioDetailExpandModal .pie-top-tab.active{color:#991b1b!important;border-bottom-color:#dc2626!important;background:#fff1f2!important}\n#portfolioDetailExpandModal .pie-title{font-size:17px!important;font-weight:900!important;color:#b91c1c!important}\n#portfolioDetailExpandModal .pie-legacy-extra-host{padding:12px 14px;background:#fff}\n#portfolioDetailExpandModal .pie-legacy-extra-host .tabpane{display:none!important}\n#portfolioDetailExpandModal .pie-legacy-extra-host .tabpane.pie-extra-active{display:block!important}\n#portfolioDetailExpandModal [data-hidden-duplicate-customer-panel="1"]{display:none!important}\n@media(max-width:1050px){#portfolioDetailExpandModal .pie-top-tabs{grid-template-columns:repeat(7,minmax(125px,1fr))!important;overflow-x:auto!important}#portfolioDetailExpandModal .pie-top-tab{font-size:13px!important}}';
  document.head.appendChild(style);

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
    var labels=['Teklifler','Siparişler'];
    labels.forEach(function(label,i){
      var index=5+i;
      if(tabs.querySelector('[data-tab-index="'+index+'"]'))return;
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

    [['tabOffers','Teklifler'],['tabOrders','Siparişler']].forEach(function(pair){
      var id=pair[0];
      if(host.querySelector('[data-pie-extra="'+id+'"]'))return;
      var pane=modal.querySelector('#'+id);
      if(!pane)return;
      pane.classList.remove('hidden');
      pane.classList.remove('pie-extra-active');
      pane.setAttribute('data-pie-extra',id);
      host.appendChild(pane);
    });

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
      html=html.replace(/<\/body>/i,`<script data-portfolio-section-layout="20260930-1835" src="/portfolio-section-layout.js?v=20260930-1835"></script>\n<script data-portfolio-modal-cleanup="20260930-1835">\n${PORTFOLIO_MODAL_CLEANUP}\n</script>\n</body>`);
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
