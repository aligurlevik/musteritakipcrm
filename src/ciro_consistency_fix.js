import worker from './agenda_today_date_fix.js';

const REPORT_REVENUE_FIX = `async function renderRevenueTargetChart(s,range){
  let panel=$('revenueTargetChart');
  if(!panel){
    panel=document.createElement('div');
    panel.id='revenueTargetChart';
    panel.className='revenue-target-chart';
    document.querySelector('#reports .report-kpis')?.insertAdjacentElement('beforebegin',panel);
  }
  const monthlyTarget=2000000;
  const dayKey=$('reportDate').value||localDateKey();
  const targetDate=new Date(dayKey+'T12:00:00');
  let businessDays=0;
  const cursor=new Date(targetDate.getFullYear(),targetDate.getMonth(),1,12);
  const monthEnd=new Date(targetDate.getFullYear(),targetDate.getMonth()+1,0,12);
  while(cursor<=monthEnd){
    const weekDay=cursor.getDay();
    const key=localDateKey(cursor);
    if(weekDay!==0&&weekDay!==6&&!trackingHolidays.has(key))businessDays++;
    cursor.setDate(cursor.getDate()+1);
  }
  const dailyTarget=monthlyTarget/Math.max(businessDays,1);
  let actual=0;
  let dayJobs=[];
  try{
    const result=await req('/api/graphic-jobs?created_from='+encodeURIComponent(dayKey)+'&created_to='+encodeURIComponent(dayKey));
    dayJobs=Array.isArray(result)?result:[];
    actual=dayJobs.reduce((sum,job)=>sum+Number(job.price||0),0);
  }catch(error){
    console.error('Günlük ciro yüklenemedi:',error);
    if(range.period==='daily')actual=Number(s.revenue_total||0);
  }
  const percent=Math.round(actual/dailyTarget*100);
  const good=actual>=dailyTarget;
  const shownDate=new Date(dayKey+'T12:00:00').toLocaleDateString('tr-TR');
  panel.innerHTML='<h3>Günlük Ciro Hedefi</h3><div class="revenue-compare"><div class="revenue-compare-card target"><span>HEDEF GÜNLÜK CİRO</span><b>'+Math.round(dailyTarget).toLocaleString('tr-TR')+' TL</b></div><div class="revenue-compare-card actual '+(good?'good':'bad')+'"><span>GÜNLÜK CİRO • '+shownDate+'</span><b>'+Math.round(actual).toLocaleString('tr-TR')+' TL</b><small>'+dayJobs.length+' iş</small></div></div><div class="revenue-progress"><div class="revenue-progress-fill '+(good?'':'bad')+'" style="width:'+Math.min(100,percent)+'%"></div></div>';
}`;

const GRAPHIC_DAILY_FIX = `function moveGraphicTurnoversToCalendar(){
  const calendar=document.querySelector('.graphic-calendar-panel'),controls=calendar?.querySelector('.graphic-month-controls');
  if(!calendar||!controls)return;
  let host=$('graphicTurnoverPanel');
  if(!host){
    host=document.createElement('div');
    host.id='graphicTurnoverPanel';
    host.className='graphic-turnover-panel';
    calendar.insertBefore(host,controls);
  }
  document.querySelectorAll('.graphic-daily-panel .graphic-daily-total').forEach(x=>x.remove());
  if(currentAccessRole!=='admin'){
    $('graphicDailyTurnoverStable')?.remove();
    return;
  }
  let daily=$('graphicDailyTurnoverStable');
  if(!daily){
    daily=document.createElement('div');
    daily.id='graphicDailyTurnoverStable';
    daily.className='graphic-daily-total';
    host.prepend(daily);
  }
  const selectedDate=$('g_date')?.value||localDateKey();
  const source=(graphicCumulativeJobs&&graphicCumulativeJobs.length)?graphicCumulativeJobs:allGraphicJobs;
  const dayJobs=(source||[]).filter(job=>String(job.created_date||job.created_at||'').slice(0,10)===selectedDate);
  const total=dayJobs.reduce((sum,job)=>sum+Number(job.price||0),0);
  const shownDate=new Date(selectedDate+'T12:00:00').toLocaleDateString('tr-TR');
  daily.innerHTML='GÜNLÜK CİRO • '+shownDate+': <strong>'+total.toLocaleString('tr-TR')+' TL</strong> • '+dayJobs.length+' iş';
  const period=$('graphicPeriodTotals');
  if(period)host.appendChild(period);
}`;

function replaceBetween(html,startMarker,endMarker,replacement){
  const start=html.indexOf(startMarker);
  if(start<0)return html;
  const end=html.indexOf(endMarker,start);
  if(end<0)return html;
  return html.slice(0,start)+replacement+'\n'+html.slice(end);
}

function shouldPatch(path){
  return path==='/'||path==='/index.html';
}

export default {
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    const type=response.headers.get('content-type')||'';
    if(request.method!=='GET'||!shouldPatch(url.pathname)||!response.ok||!type.includes('text/html'))return response;

    let html=await response.text();
    html=replaceBetween(html,'function renderRevenueTargetChart','async function loadMonthlyCiroGraph',REPORT_REVENUE_FIX);
    html=replaceBetween(html,'function moveGraphicTurnoversToCalendar','renderGraphicJobs=function()',GRAPHIC_DAILY_FIX);

    const headers=new Headers(response.headers);
    headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','no-cache, no-store, must-revalidate');
    headers.set('pragma','no-cache');headers.set('expires','0');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
};
