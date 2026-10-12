import worker from './graphic_calendar_security_entry.js';

const weeklyRevenuePatch=String.raw`
<style data-graphic-weekly-revenue-v1>
#graphicWeeklyRevenue{display:flex!important;align-items:center!important;justify-content:center!important;flex:1 1 280px!important;min-width:250px!important;min-height:38px!important;margin:0!important;padding:8px 12px!important;border:1px solid #16a34a!important;border-radius:10px!important;background:#dcfce7!important;color:#166534!important;font-size:12px!important;font-weight:900!important;text-align:center!important}
body:not(.crm-role-admin) #graphicWeeklyRevenue{display:none!important}
#graphicJobs #graphicTurnoverPanel{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;width:100%!important}
#graphicJobs #graphicTurnoverPanel>.graphic-daily-total{grid-column:1!important;grid-row:1!important;width:100%!important;min-width:0!important;margin:0!important}
#graphicJobs #graphicTurnoverPanel>#graphicWeeklyRevenue{grid-column:2!important;grid-row:1!important;width:100%!important;min-width:0!important;margin:0!important}
#graphicMonthlyRevenue{display:none!important}
</style>
<script data-graphic-weekly-revenue-v1>
(function(){
 const pad=n=>String(n).padStart(2,'0');
 const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
 async function renderWeeklyRevenue(){
  if(!document.body.classList.contains('crm-role-admin'))return;
  const selected=document.getElementById('g_date')?.value||new Date().toISOString().slice(0,10);
  const start=new Date(selected+'T12:00:00');
  if(Number.isNaN(start.getTime()))return;
  const end=new Date(start);end.setDate(end.getDate()+6);
  const from=key(start),to=key(end);
  try{
   const response=await fetch('/api/graphic-jobs?created_from='+encodeURIComponent(from)+'&created_to='+encodeURIComponent(to),{cache:'no-store'});
   if(!response.ok)return;
   const jobs=await response.json(),items=Array.isArray(jobs)?jobs:[],total=items.reduce((sum,job)=>sum+Number(job.price||0),0);
   let box=document.getElementById('graphicWeeklyRevenue');
   if(!box){box=document.createElement('div');box.id='graphicWeeklyRevenue'}
   box.textContent='7 GÜNLÜK CİRO • '+from.split('-').reverse().join('.')+' - '+to.split('-').reverse().join('.')+': '+total.toLocaleString('tr-TR')+' TL • '+items.length+' iş';
   const host=document.getElementById('graphicTurnoverPanel')||document.getElementById('graphicCompactTurnoverRow');
   if(host&&!box.isConnected)host.appendChild(box);
  }catch(error){console.error('7 günlük ciro yüklenemedi:',error)}
 }
 function start(){
  renderWeeklyRevenue();
  document.getElementById('g_date')?.addEventListener('change',()=>setTimeout(renderWeeklyRevenue,120));
  let tries=0;const timer=setInterval(()=>{renderWeeklyRevenue();if(++tries>12)clearInterval(timer)},250);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
</script>`;

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
