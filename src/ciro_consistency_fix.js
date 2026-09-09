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
  const period=range.period||'daily';
  const selectedKey=$('reportDate').value||localDateKey();
  const todayKey=localDateKey();

  const isBusinessDay=date=>{
    const day=date.getDay();
    const key=localDateKey(date);
    return day!==0&&day!==6&&!trackingHolidays.has(key);
  };
  const businessDaysInMonth=dateKey=>{
    const base=new Date(dateKey+'T12:00:00');
    const d=new Date(base.getFullYear(),base.getMonth(),1,12);
    const end=new Date(base.getFullYear(),base.getMonth()+1,0,12);
    let count=0;
    while(d<=end){if(isBusinessDay(d))count++;d.setDate(d.getDate()+1)}
    return Math.max(count,1);
  };
  const countBusinessDays=(fromKey,toKey,stopAtToday=false)=>{
    const d=new Date(fromKey+'T12:00:00');
    const end=new Date(toKey+'T12:00:00');
    let count=0;
    while(d<=end){
      const key=localDateKey(d);
      if(stopAtToday&&key>todayKey)break;
      if(isBusinessDay(d))count++;
      d.setDate(d.getDate()+1);
    }
    return count;
  };

  const dailyTarget=monthlyTarget/businessDaysInMonth(selectedKey);
  const totalBusinessDays=Math.max(countBusinessDays(range.from,range.to,false),1);
  const elapsedBusinessDays=Math.max(countBusinessDays(range.from,range.to,true),1);

  let jobs=[];
  try{
    const result=await req('/api/graphic-jobs?created_from='+encodeURIComponent(range.from)+'&created_to='+encodeURIComponent(range.to));
    jobs=Array.isArray(result)?result:[];
  }catch(error){
    console.error('Ciro verisi yüklenemedi:',error);
  }

  const total=jobs.length?jobs.reduce((sum,job)=>sum+Number(job.price||0),0):Number(s.revenue_total||0);
  const average=total/elapsedBusinessDays;

  let targetLabel='HEDEF GÜNLÜK CİRO';
  let targetValue=dailyTarget;
  let averageLabel='GÜNLÜK CİRO';
  let averageValue=total;
  let heading='Günlük Ciro Hedefi';

  if(period==='weekly'){
    heading='Haftalık Ciro Durumu';
    targetLabel='HAFTALIK HEDEF';
    targetValue=dailyTarget*totalBusinessDays;
    averageLabel='HAFTALIK GÜNLÜK ORTALAMA';
    averageValue=average;
  }else if(period==='monthly'){
    heading='Aylık Ciro Durumu';
    targetLabel='AYLIK HEDEF';
    targetValue=monthlyTarget;
    averageLabel='AYLIK GÜNLÜK ORTALAMA';
    averageValue=average;
  }else if(period==='custom'){
    heading='Seçilen Dönem Ciro Durumu';
    targetLabel='DÖNEM HEDEFİ';
    targetValue=dailyTarget*totalBusinessDays;
    averageLabel='DÖNEM GÜNLÜK ORTALAMA';
    averageValue=average;
  }

  const expectedToDate=dailyTarget*elapsedBusinessDays;
  const performancePercent=Math.round(total/Math.max(expectedToDate,1)*100);
  const fullTargetPercent=Math.round(total/Math.max(targetValue,1)*100);
  const good=total>=expectedToDate;
  const difference=total-expectedToDate;
  const differenceText=(difference>=0?'+':'')+Math.round(difference).toLocaleString('tr-TR')+' TL';
  const statusText=good
    ? 'Hedef temposunun '+performancePercent+'% seviyesindesiniz • '+differenceText+' öndesiniz'
    : 'Hedef temposunun '+performancePercent+'% seviyesindesiniz • '+Math.abs(Math.round(difference)).toLocaleString('tr-TR')+' TL geridesiniz';

  const dateText=period==='daily'
    ? new Date(range.from+'T12:00:00').toLocaleDateString('tr-TR')
    : new Date(range.from+'T12:00:00').toLocaleDateString('tr-TR')+' — '+new Date(range.to+'T12:00:00').toLocaleDateString('tr-TR');

  panel.innerHTML='<h3>'+heading+'</h3>'+
    '<div class="revenue-compare" style="grid-template-columns:repeat(3,minmax(0,1fr))">'+
      '<div class="revenue-compare-card target"><span>'+targetLabel+'</span><b>'+Math.round(targetValue).toLocaleString('tr-TR')+' TL</b><small>'+totalBusinessDays+' iş günü</small></div>'+
      '<div class="revenue-compare-card actual '+(good?'good':'bad')+'"><span>'+averageLabel+'</span><b>'+Math.round(averageValue).toLocaleString('tr-TR')+' TL</b><small>'+elapsedBusinessDays+' iş gününün ortalaması</small></div>'+
      '<div class="revenue-compare-card" style="border-color:#059669;background:#ecfdf5;color:#065f46"><span>TOPLAM CİRO</span><b>'+Math.round(total).toLocaleString('tr-TR')+' TL</b><small>'+dateText+' • '+jobs.length+' iş</small></div>'+
    '</div>'+
    '<div style="margin-top:10px;padding:8px 10px;border-radius:9px;font-weight:900;text-align:center;background:'+(good?'#dcfce7':'#fee2e2')+';color:'+(good?'#166534':'#991b1b')+'">'+statusText+'</div>'+
    '<div class="revenue-progress" title="Dönem hedefinin %'+fullTargetPercent+' kadarı tamamlandı"><div class="revenue-progress-fill '+(good?'':'bad')+'" style="width:'+Math.min(100,performancePercent)+'%"></div></div>';
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