import worker from './report_revenue_fix_patch.js';

const trackingTotalCountPatch = `
<style>
  #tracking .tracking-summary-counts{
    display:flex;
    align-items:center;
    gap:7px;
    flex-wrap:wrap;
    margin-right:3px;
  }
  #tracking .tracking-summary-count{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    min-width:122px;
    padding:9px 12px;
    border:2px solid;
    border-radius:10px;
    font-size:14px;
    font-weight:1000;
    line-height:1;
    white-space:nowrap;
    box-shadow:0 2px 8px #0f172a18;
  }
  #tracking .tracking-summary-count.total{
    border-color:#2563eb;
    background:#0f172a;
    color:#fff;
  }
  #tracking .tracking-summary-count.ontime{
    border-color:#16a34a;
    background:#dcfce7;
    color:#166534;
  }
  #tracking .tracking-summary-count.late{
    border-color:#dc2626;
    background:#fee2e2;
    color:#991b1b;
  }
  #tracking .toolbar>div:last-child{flex-wrap:wrap;justify-content:flex-end}
</style>
<script>
(function(){
  let trackingSummaryRequest=0;

  function selectedTrackingDay(){
    try{return trackingViewDay==='tomorrow'?'tomorrow':'today'}catch(_){return 'today'}
  }

  async function updateTrackingSummaryCounts(){
    const totalEl=document.getElementById('trackingTotalCount');
    const ontimeEl=document.getElementById('trackingOnTimeCount');
    const lateEl=document.getElementById('trackingLateCount');
    if(!totalEl||!ontimeEl||!lateEl)return;

    const requestId=++trackingSummaryRequest;
    const fallbackTotal=(()=>{
      try{return typeof trackingJobs!=='undefined'&&Array.isArray(trackingJobs)?trackingJobs.length:document.querySelectorAll('#trackingRows .tracking-card').length}catch(_){return document.querySelectorAll('#trackingRows .tracking-card').length}
    })();
    totalEl.textContent='TOPLAM İŞ: '+fallbackTotal;

    try{
      const response=await fetch('/api/tracking-summary?day='+encodeURIComponent(selectedTrackingDay()),{credentials:'same-origin'});
      if(!response.ok)throw new Error('Özet yüklenemedi');
      const summary=await response.json();
      if(requestId!==trackingSummaryRequest)return;
      totalEl.textContent='TOPLAM İŞ: '+Number(summary.total||0);
      ontimeEl.textContent='YETİŞEN: '+Number(summary.on_time||0);
      lateEl.textContent='YETİŞMEYEN: '+Number(summary.late||0);
    }catch(_){
      if(requestId!==trackingSummaryRequest)return;
      let ontime=0;
      try{
        ontime=(typeof trackingJobs!=='undefined'&&Array.isArray(trackingJobs))?trackingJobs.filter(x=>String(x.status||'').includes('Bitti')).length:0;
      }catch(_e){}
      ontimeEl.textContent='YETİŞEN: '+ontime;
      lateEl.textContent='YETİŞMEYEN: 0';
    }
  }

  const originalRenderTrackingJobs=window.renderTrackingJobs;
  if(typeof originalRenderTrackingJobs==='function'&&!originalRenderTrackingJobs.__summaryCountsWrapped){
    const wrappedRenderTrackingJobs=function(){
      const result=originalRenderTrackingJobs.apply(this,arguments);
      updateTrackingSummaryCounts();
      return result;
    };
    wrappedRenderTrackingJobs.__summaryCountsWrapped=true;
    window.renderTrackingJobs=wrappedRenderTrackingJobs;
  }

  updateTrackingSummaryCounts();
  window.addEventListener('load',updateTrackingSummaryCounts);
})();
</script>`;

function istanbulDate(value){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
}

const trackingSummaryHolidays=new Set([
  '2026-01-01','2026-03-20','2026-03-21','2026-03-22','2026-04-23','2026-05-01','2026-05-19','2026-05-27','2026-05-28','2026-05-29','2026-05-30','2026-07-15','2026-08-30','2026-10-29',
  '2027-01-01','2027-03-09','2027-03-10','2027-03-11','2027-04-23','2027-05-01','2027-05-16','2027-05-17','2027-05-18','2027-05-19','2027-05-20','2027-07-15','2027-08-30','2027-10-29'
]);
function nextTrackingSummaryWorkDate(fromDateKey){
  const d=new Date(fromDateKey+'T12:00:00+03:00');
  do{d.setDate(d.getDate()+1)}while(d.getDay()===0||trackingSummaryHolidays.has(istanbulDate(d)));
  return istanbulDate(d);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if(url.pathname==='/api/tracking-summary'&&request.method==='GET'){
      const day=url.searchParams.get('day')==='tomorrow'?'tomorrow':'today';
      const authUrl=new URL(request.url);
      authUrl.pathname='/api/tracking';
      authUrl.search='?day='+day;
      const authResponse=await worker.fetch(new Request(authUrl.toString(),request),env,ctx);
      if(!authResponse.ok)return authResponse;

      const today=istanbulDate(new Date());
      const selectedDate=day==='tomorrow'?nextTrackingSummaryWorkDate(today):today;
      const totalRow=await env.DB.prepare(`SELECT COUNT(DISTINCT id) total FROM (
        SELECT id FROM graphic_jobs WHERE work_date=? AND status LIKE 'İmalat%'
        UNION
        SELECT graphic_job_id id FROM graphic_job_delays WHERE delayed_from=?
      )`).bind(selectedDate,selectedDate).first();
      const lateRow=await env.DB.prepare('SELECT COUNT(DISTINCT graphic_job_id) late FROM graphic_job_delays WHERE delayed_from=?').bind(selectedDate).first();
      const onTimeRow=await env.DB.prepare(`SELECT COUNT(DISTINCT g.id) on_time FROM graphic_jobs g
        WHERE g.status LIKE 'İmalat%' AND g.status LIKE '%Bitti%'
        AND (g.work_date=? OR EXISTS(SELECT 1 FROM graphic_job_delays d0 WHERE d0.graphic_job_id=g.id AND d0.delayed_from=?))
        AND NOT EXISTS(SELECT 1 FROM graphic_job_delays d WHERE d.graphic_job_id=g.id AND d.delayed_from=?)`).bind(selectedDate,selectedDate,selectedDate).first();

      return new Response(JSON.stringify({
        total:Number(totalRow?.total||0),
        on_time:Number(onTimeRow?.on_time||0),
        late:Number(lateRow?.late||0),
        date:selectedDate
      }),{status:200,headers:{'content-type':'application/json; charset=utf-8'}});
    }

    const response = await worker.fetch(request, env, ctx);
    const contentType = response.headers.get('content-type') || '';

    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();

      if(!html.includes('id="trackingSummaryCounts"')){
        html=html.replace(
          '<div style="display:flex;gap:7px;align-items:center"><span id="trackingTotalCount" class="tracking-total-count">TOPLAM İŞ: 0</span><button id="trackingTodayButton"',
          '<div style="display:flex;gap:7px;align-items:center"><div id="trackingSummaryCounts" class="tracking-summary-counts"><span id="trackingTotalCount" class="tracking-summary-count total">TOPLAM İŞ: 0</span><span id="trackingOnTimeCount" class="tracking-summary-count ontime">YETİŞEN: 0</span><span id="trackingLateCount" class="tracking-summary-count late">YETİŞMEYEN: 0</span></div><button id="trackingTodayButton"'
        );
        html=html.replace(
          '<div style="display:flex;gap:7px;align-items:center"><button id="trackingTodayButton"',
          '<div style="display:flex;gap:7px;align-items:center"><div id="trackingSummaryCounts" class="tracking-summary-counts"><span id="trackingTotalCount" class="tracking-summary-count total">TOPLAM İŞ: 0</span><span id="trackingOnTimeCount" class="tracking-summary-count ontime">YETİŞEN: 0</span><span id="trackingLateCount" class="tracking-summary-count late">YETİŞMEYEN: 0</span></div><button id="trackingTodayButton"'
        );
      }

      if(!html.includes('function updateTrackingSummaryCounts()')){
        html=html.replace('</body>',trackingTotalCountPatch+'\n</body>');
      }

      const headers=new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }

    return response;
  }
};
