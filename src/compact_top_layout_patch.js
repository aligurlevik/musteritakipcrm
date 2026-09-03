import worker from './turnover_css_patch.js';

const compactTopPatch = String.raw`
<style>
  /* Grafik ekranı üst bölümünü çok daha kompakt yap: iş listesi yukarı gelsin. */
  .main:has(#graphicJobs.section.active){padding:10px 18px 16px!important}
  .main:has(#graphicJobs.section.active)>.top{min-height:34px!important;margin:0 0 2px!important;align-items:center!important}
  .main:has(#graphicJobs.section.active)>.top h1{margin:0!important;font-size:24px!important;line-height:1!important}
  .main:has(#graphicJobs.section.active)>.top #date{display:none!important}
  .main:has(#graphicJobs.section.active)>.top .btn{min-height:28px!important;height:28px!important;padding:4px 9px!important;font-size:11px!important}

  #graphicJobs .toolbar{
    margin:2px 0 3px!important;
    min-height:28px!important;
  }
  #graphicJobs .toolbar h3{font-size:15px!important;line-height:1!important;margin:0!important}
  #graphicJobs .toolbar .small{display:none!important}
  #graphicJobs .filterbar{gap:4px!important;align-items:center!important}
  #graphicJobs .filterbar input,#graphicJobs .filterbar select,#graphicJobs .filterbar .btn{
    min-height:27px!important;height:27px!important;padding:3px 7px!important;font-size:11px!important;
  }
  #graphicJobs .filterbar input{max-width:240px!important}

  #graphicJobs .graphic-compact-date{
    margin:3px 0 4px!important;
    border-radius:8px!important;
  }
  #graphicJobs .graphic-compact-date-top{
    padding:3px 6px!important;
    gap:4px!important;
    min-height:31px!important;
  }
  #graphicJobs .graphic-compact-date-title b{
    font-size:13px!important;
    line-height:1!important;
  }
  #graphicJobs .graphic-compact-date-title span{
    display:none!important;
  }
  #graphicJobs .graphic-compact-date-top button{
    height:25px!important;
    min-height:25px!important;
    padding:0 7px!important;
    border-radius:6px!important;
    font-size:10px!important;
  }
  #graphicJobs .graphic-compact-arrow{width:29px!important}
  #graphicJobs .graphic-compact-picker{
    width:108px!important;
    height:25px!important;
    min-height:25px!important;
    padding:2px 5px!important;
    font-size:10px!important;
  }
  #graphicJobs .graphic-compact-day{
    padding:2px 2px!important;
    min-height:34px!important;
  }
  #graphicJobs .graphic-compact-day .dow{font-size:8px!important;line-height:1!important}
  #graphicJobs .graphic-compact-day .num{font-size:13px!important;margin-top:1px!important;line-height:1!important}
  #graphicJobs .graphic-compact-day .mini{font-size:7px!important;margin-top:1px!important;line-height:1!important}

  #graphicJobs .graphic-calendar-panel{
    margin:0 0 3px!important;
  }
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel{
    gap:4px!important;
  }
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-daily-total,
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-period-total{
    min-height:25px!important;
    padding:3px 7px!important;
    border-radius:7px!important;
    font-size:9.5px!important;
    line-height:1!important;
  }
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-period-total strong{
    font-size:11px!important;
  }

  #graphicJobs .graphic-daily-panel{
    padding:7px 10px!important;
    min-height:0!important;
  }
  #graphicJobs .graphic-simple-add{
    margin-top:2px!important;
    padding-top:4px!important;
    gap:4px!important;
  }
  #graphicJobs .graphic-simple-add>input{
    min-height:28px!important;
    height:28px!important;
    padding:3px 7px!important;
    font-size:11px!important;
  }
  #graphicJobs .graphic-simple-actions{
    gap:4px!important;
    align-items:center!important;
  }
  #graphicJobs .graphic-simple-actions .btn,
  #graphicJobs .graphic-simple-actions select,
  #graphicJobs .graphic-simple-actions input{
    min-height:27px!important;
    height:27px!important;
    padding-top:2px!important;
    padding-bottom:2px!important;
    font-size:10px!important;
  }

  /* Teslim gün + saat alanı tek ince satırda. */
  #graphicJobs #g_delivery_quick_box{
    display:flex!important;
    align-items:center!important;
    gap:4px!important;
    padding:3px 5px!important;
    min-width:0!important;
    width:auto!important;
    border-radius:7px!important;
  }
  #graphicJobs #g_delivery_quick_box .delivery-quick-line{
    display:flex!important;
    align-items:center!important;
    gap:2px!important;
    flex-wrap:nowrap!important;
  }
  #graphicJobs #g_delivery_quick_box .delivery-quick-label{
    width:auto!important;
    margin-right:2px!important;
    font-size:8.5px!important;
  }
  #graphicJobs #g_delivery_quick_box .delivery-quick-btn{
    height:23px!important;
    min-height:23px!important;
    padding:0 6px!important;
    font-size:8.5px!important;
    border-radius:5px!important;
  }
  #graphicJobs #g_delivery_quick_box .delivery-quick-summary{
    padding:2px 5px!important;
    font-size:8.5px!important;
    margin-left:2px!important;
  }
  #graphicJobs #g_delivery_quick_box #g_delivery_time{
    width:84px!important;
    min-width:84px!important;
    height:23px!important;
    min-height:23px!important;
    padding:2px 5px!important;
    font-size:10px!important;
  }
  #graphicJobs .graphic-daily-panel>h3{
    margin:3px 0 4px!important;
    font-size:14px!important;
    line-height:1!important;
  }

  @media(max-width:1000px){
    #graphicJobs #g_delivery_quick_box{width:100%!important;flex-wrap:wrap!important}
  }
  @media(max-width:760px){
    .main:has(#graphicJobs.section.active){padding:8px!important}
    #graphicJobs #g_delivery_quick_box{min-width:0!important;width:100%!important}
  }
</style>
<script>
(function(){
  function ensureGraphicTotalTurnover(){
    try{
      if(typeof currentAccessRole==='undefined'||currentAccessRole!=='admin')return;
      const section=document.getElementById('graphicJobs');
      if(!section||!section.classList.contains('active'))return;
      const turnover=document.getElementById('graphicTurnoverPanel');
      if(!turnover)return;
      const jobs=(typeof graphicCumulativeJobs!=='undefined'&&Array.isArray(graphicCumulativeJobs))?graphicCumulativeJobs:[];
      const total=jobs.reduce(function(sum,job){return sum+Number(job&&job.price||0)},0);
      let period=document.getElementById('graphicPeriodTotals');
      if(!period){
        period=document.createElement('div');
        period.id='graphicPeriodTotals';
        period.className='graphic-period-totals';
      }
      if(period.parentNode!==turnover)turnover.appendChild(period);
      period.innerHTML='<div class="graphic-period-total cumulative">TOPLAM CİRO: <strong>'+total.toLocaleString('tr-TR')+' TL</strong> • '+jobs.length+' iş</div>';
    }catch(e){console.error('Toplam ciro gösterilemedi:',e)}
  }
  function startTotalTurnoverRestore(){
    ensureGraphicTotalTurnover();
    const rows=document.getElementById('graphicJobRows');
    if(rows)new MutationObserver(function(){setTimeout(ensureGraphicTotalTurnover,0)}).observe(rows,{childList:true,subtree:true});
    setTimeout(ensureGraphicTotalTurnover,400);
    setTimeout(ensureGraphicTotalTurnover,1200);
    setInterval(ensureGraphicTotalTurnover,3000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startTotalTurnoverRestore);else startTotalTurnoverRestore();
})();
</script>`;

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      if(!html.includes('/* Grafik ekranı üst bölümünü çok daha kompakt yap: iş listesi yukarı gelsin. */')){
        html=html.replace('</body>',compactTopPatch+'\n</body>');
      }
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
