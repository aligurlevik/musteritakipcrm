import worker from './delivery_datetime_patch.js';

const oldMoveTurnovers = "function moveGraphicTurnoversToCalendar(){const calendar=document.querySelector('.graphic-calendar-panel'),controls=calendar?.querySelector('.graphic-month-controls');if(!calendar||!controls)return;let host=$('graphicTurnoverPanel');if(!host){host=document.createElement('div');host.id='graphicTurnoverPanel';host.className='graphic-turnover-panel';calendar.insertBefore(host,controls)}host.querySelectorAll('.graphic-daily-total').forEach(x=>x.remove());const daily=document.querySelector('.graphic-daily-panel .graphic-daily-total'),period=$('graphicPeriodTotals');if(daily)host.appendChild(daily);if(period)host.appendChild(period)}";

const newMoveTurnovers = "function moveGraphicTurnoversToCalendar(){const compact=$('graphicCompactDate'),calendar=document.querySelector('.graphic-calendar-panel'),controls=calendar?.querySelector('.graphic-month-controls');let host=$('graphicTurnoverPanel');if(!host){host=document.createElement('div');host.id='graphicTurnoverPanel';host.className='graphic-turnover-panel'}if(compact){let row=$('graphicCompactTurnoverRow');if(!row){row=document.createElement('div');row.id='graphicCompactTurnoverRow';const week=compact.querySelector('.graphic-compact-week');if(week)compact.insertBefore(row,week);else compact.appendChild(row)}if(host.parentNode!==row)row.appendChild(host)}else if(calendar&&controls){if(host.parentNode!==calendar)calendar.insertBefore(host,controls)}else{return}host.querySelectorAll('.graphic-daily-total').forEach(x=>x.remove());host.querySelectorAll('.graphic-period-totals').forEach(x=>x.remove());const daily=document.querySelector('.graphic-daily-panel .graphic-daily-total'),period=$('graphicPeriodTotals');if(daily)host.appendChild(daily);if(period)host.appendChild(period)}";

const turnoverRestorePatch = String.raw`
<style>
  #graphicCompactTurnoverRow{
    display:flex;justify-content:flex-end;gap:8px;align-items:stretch;flex-wrap:wrap;
    padding:7px 10px;background:#fff;border-bottom:1px solid #dbeafe
  }
  #graphicCompactTurnoverRow:empty{display:none}
  #graphicCompactTurnoverRow #graphicTurnoverPanel{
    display:flex!important;gap:8px!important;align-items:stretch!important;justify-content:flex-end!important;
    margin:0!important;width:100%!important
  }
  #graphicCompactTurnoverRow .graphic-daily-total,
  #graphicCompactTurnoverRow .graphic-period-total{
    display:flex!important;align-items:center!important;justify-content:center!important;
    flex:1 1 280px!important;min-width:250px!important;min-height:38px!important;
    margin:0!important;padding:8px 12px!important;border-radius:10px!important;
    font-size:12px!important;font-weight:900!important;text-align:center!important
  }
  #graphicCompactTurnoverRow .graphic-daily-total{
    background:#dcfce7!important;color:#166534!important;border:1px solid #86efac!important
  }
  #graphicCompactTurnoverRow .graphic-period-totals{
    display:flex!important;flex:1 1 280px!important;margin:0!important;width:auto!important
  }
  #graphicCompactTurnoverRow .graphic-period-total.cumulative{
    width:100%!important;background:#dcfce7!important;color:#166534!important;border:1px solid #22c55e!important
  }
  @media(max-width:760px){
    #graphicCompactTurnoverRow #graphicTurnoverPanel{flex-direction:column!important}
    #graphicCompactTurnoverRow .graphic-daily-total,
    #graphicCompactTurnoverRow .graphic-period-totals,
    #graphicCompactTurnoverRow .graphic-period-total{width:100%!important;min-width:0!important}
  }
</style>`;

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      html=html.split(oldMoveTurnovers).join(newMoveTurnovers);
      if(!html.includes('#graphicCompactTurnoverRow{'))html=html.replace('</body>',turnoverRestorePatch+'\n</body>');
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
