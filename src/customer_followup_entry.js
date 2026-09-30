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
  window.__portfolioModalCleanupLoaded='20260930-1825';

  var style=document.createElement('style');
  style.id='portfolioModalCleanupStyle';
  style.textContent='\n#portfolioDetailExpandModal .pie-top-tab{font-size:15px!important;font-weight:900!important;color:#dc2626!important;padding:13px 8px 11px!important}\n#portfolioDetailExpandModal .pie-top-tab:hover{color:#b91c1c!important;background:#fff7f7!important}\n#portfolioDetailExpandModal .pie-top-tab.active{color:#b91c1c!important;border-bottom-color:#dc2626!important;background:#fff7f7!important}\n#portfolioDetailExpandModal .pie-title{font-size:17px!important;font-weight:900!important;color:#b91c1c!important}\n@media(max-width:900px){#portfolioDetailExpandModal .pie-top-tab{font-size:13px!important}}';
  document.head.appendChild(style);

  function hasLegacyTabs(el){
    if(!el)return false;
    var text=String(el.innerText||el.textContent||'');
    return text.indexOf('Genel')>=0&&text.indexOf('Görüşmeler & Notlar')>=0&&text.indexOf('Teklifler')>=0&&text.indexOf('Siparişler')>=0&&text.indexOf('Analiz')>=0;
  }

  function hideDuplicatePanel(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var body=modal.querySelector('.pdem-body');
    var editor=body&&body.querySelector('.pie-editor');
    if(!body||!editor)return;

    var nodes=Array.prototype.slice.call(body.querySelectorAll('div,section,article'));
    var matches=nodes.filter(function(el){
      return el!==editor&&!el.contains(editor)&&!editor.contains(el)&&hasLegacyTabs(el);
    });
    if(!matches.length)return;

    matches.sort(function(a,b){return (a.innerText||'').length-(b.innerText||'').length;});
    var target=matches[0];
    while(target.parentElement&&target.parentElement!==body&&!target.parentElement.contains(editor)&&hasLegacyTabs(target.parentElement)){
      target=target.parentElement;
    }
    target.style.display='none';
    target.setAttribute('data-hidden-duplicate-customer-panel','1');
  }

  var observer=new MutationObserver(function(){setTimeout(hideDuplicatePanel,0);});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',function(){setTimeout(hideDuplicatePanel,40);},true);
  setInterval(hideDuplicatePanel,700);
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
      html=html.replace(/<\/body>/i,`<script data-portfolio-section-layout="20260930-1825" src="/portfolio-section-layout.js?v=20260930-1825"></script>\n<script data-portfolio-modal-cleanup="20260930-1825">\n${PORTFOLIO_MODAL_CLEANUP}\n</script>\n</body>`);
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
