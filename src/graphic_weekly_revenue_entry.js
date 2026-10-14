import worker from './graphic_calendar_security_entry.js';

const weeklyRevenuePatch=String.raw`
<style data-graphic-monthly-revenue-v3>
#graphicJobs #graphicTurnoverPanel{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;width:100%!important}
#graphicJobs #graphicTurnoverPanel>.graphic-daily-total{grid-column:1!important;grid-row:1!important;width:100%!important;min-width:0!important;margin:0!important}
#graphicJobs #graphicTurnoverPanel>#graphicMonthlyRevenue{display:flex!important;grid-column:2!important;grid-row:1!important;width:100%!important;min-width:0!important;margin:0!important}
#graphicJobs #graphicTurnoverPanel>#graphicPeriodTotals{display:none!important}
body:not(.crm-role-admin) #graphicJobs .graphic-daily-total,
body:not(.crm-role-admin) #graphicJobs #graphicPeriodTotals,
body:not(.crm-role-admin) #graphicJobs #graphicMonthlyRevenue{display:none!important}
</style>`;

function rebuild(response,html){
 const headers=new Headers(response.headers);
 for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
 headers.set('content-type','text/html; charset=utf-8');
 headers.set('cache-control','no-cache, no-store, must-revalidate');
 return new Response(html.replace('</body>',weeklyRevenuePatch+'</body>'),{status:response.status,statusText:response.statusText,headers});
}

export default {
 async fetch(request,env,ctx){
  const response=await worker.fetch(request,env,ctx);
  if(request.method==='GET'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html'))return rebuild(response,await response.text());
  return response;
 },
 async scheduled(controller,env,ctx){if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx)}
};
