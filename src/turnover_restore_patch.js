import worker from './delivery_datetime_patch.js';

const turnoverRestorePatch = String.raw`
<style>
  #graphicCompactTurnoverRow{
    display:flex;justify-content:flex-end;gap:8px;align-items:stretch;flex-wrap:wrap;
    padding:7px 10px;background:#fff;border-bottom:1px solid #dbeafe
  }
  #graphicCompactTurnoverRow:empty{display:none}
  #graphicCompactTurnoverRow #graphicTurnoverPanel{
    display:flex!important;gap:8px!important;align-items:stretch!important;justify-content:flex-end!important;
    margin:0!important;width:auto!important
  }
  #graphicCompactTurnoverRow .graphic-daily-total,
  #graphicCompactTurnoverRow .graphic-period-total{
    display:flex!important;align-items:center!important;justify-content:center!important;
    min-width:250px!important;min-height:38px!important;margin:0!important;padding:8px 12px!important;
    border-radius:10px!important;font-size:12px!important;font-weight:900!important;text-align:center!important
  }
  #graphicCompactTurnoverRow .graphic-daily-total{
    background:#dcfce7!important;color:#166534!important;border:1px solid #86efac!important
  }
  #graphicCompactTurnoverRow .graphic-period-totals{display:block!important;margin:0!important;width:auto!important}
  #graphicCompactTurnoverRow .graphic-period-total.cumulative{
    background:#dcfce7!important;color:#166534!important;border:1px solid #22c55e!important
  }
  @media(max-width:760px){
    #graphicCompactTurnoverRow{justify-content:stretch}
    #graphicCompactTurnoverRow #graphicTurnoverPanel{width:100%!important;flex-direction:column}
    #graphicCompactTurnoverRow .graphic-daily-total,
    #graphicCompactTurnoverRow .graphic-period-total{width:100%!important;min-width:0!important}
  }
</style>
<script>
(function(){
  function restoreGraphicTurnovers(){
    const compact=document.getElementById('graphicCompactDate');
    const turnover=document.getElementById('graphicTurnoverPanel');
    if(!compact||!turnover)return false;
    let row=document.getElementById('graphicCompactTurnoverRow');
    if(!row){
      row=document.createElement('div');
      row.id='graphicCompactTurnoverRow';
      const week=compact.querySelector('.graphic-compact-week');
      if(week)compact.insertBefore(row,week);else compact.appendChild(row);
    }
    if(turnover.parentNode!==row)row.appendChild(turnover);
    turnover.style.display='flex';
    return true;
  }
  function start(){
    restoreGraphicTurnovers();
    const observer=new MutationObserver(()=>restoreGraphicTurnovers());
    observer.observe(document.body,{childList:true,subtree:true});
    let tries=0;
    const timer=setInterval(()=>{if(restoreGraphicTurnovers()||++tries>60)clearInterval(timer)},250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
</script>`;

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      if(!html.includes('id="graphicCompactTurnoverRow"'))html=html.replace('</body>',turnoverRestorePatch+'\n</body>');
      const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
