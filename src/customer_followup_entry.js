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

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url),path=url.pathname;
    const response=await worker.fetch(request,env,ctx);

    if(request.method==='GET'&&path==='/api/dashboard'&&response.ok){
      try{
        const data=await response.clone().json();
        const rows=(await env.DB.prepare("SELECT * FROM customers WHERE record_status='Aktif' AND COALESCE(follow_date,'')<>'' AND stage NOT IN ('Kazanıldı','Kaybedildi') ORDER BY follow_date ASC, company COLLATE NOCASE ASC LIMIT 50").all()).results||[];
        return jsonResponse(response,{...data,due:rows});
      }catch(_){return response}
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
