import worker from './turnover_css_patch.js';

const compactTopPatch = String.raw`
<style>
  /* Grafik ekranı üst bölümünü sıkılaştır: listeyi daha yukarı taşır. */
  #graphicJobs .toolbar{
    margin-bottom:4px!important;
    min-height:0!important;
  }
  #graphicJobs .toolbar h3{font-size:18px!important;line-height:1.1!important}
  #graphicJobs .toolbar .small{font-size:10px!important;line-height:1.15!important}
  #graphicJobs .filterbar{gap:5px!important}
  #graphicJobs .filterbar input,#graphicJobs .filterbar select,#graphicJobs .filterbar .btn{
    min-height:30px!important;height:30px!important;padding-top:4px!important;padding-bottom:4px!important;
  }

  #graphicJobs .graphic-compact-date{
    margin:6px 0 6px!important;
    border-radius:10px!important;
  }
  #graphicJobs .graphic-compact-date-top{
    padding:5px 8px!important;
    gap:5px!important;
  }
  #graphicJobs .graphic-compact-date-title b{
    font-size:14px!important;
    line-height:1.05!important;
  }
  #graphicJobs .graphic-compact-date-title span{
    font-size:9px!important;
    margin-top:0!important;
    line-height:1!important;
  }
  #graphicJobs .graphic-compact-date-top button{
    height:28px!important;
    min-height:28px!important;
    padding:0 9px!important;
    border-radius:7px!important;
    font-size:11px!important;
  }
  #graphicJobs .graphic-compact-arrow{width:32px!important}
  #graphicJobs .graphic-compact-picker{
    width:116px!important;
    height:28px!important;
    min-height:28px!important;
    padding:3px 6px!important;
    font-size:11px!important;
  }
  #graphicJobs .graphic-compact-day{
    padding:4px 2px!important;
    min-height:42px!important;
  }
  #graphicJobs .graphic-compact-day .dow{font-size:9px!important;line-height:1!important}
  #graphicJobs .graphic-compact-day .num{font-size:14px!important;margin-top:1px!important;line-height:1!important}
  #graphicJobs .graphic-compact-day .mini{font-size:8px!important;margin-top:1px!important;line-height:1!important}

  #graphicJobs .graphic-calendar-panel{
    margin:0 0 5px!important;
  }
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel{
    gap:5px!important;
  }
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-daily-total,
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-period-total{
    min-height:30px!important;
    padding:4px 8px!important;
    border-radius:8px!important;
    font-size:10.5px!important;
    line-height:1.1!important;
  }
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-period-total strong{
    font-size:13px!important;
  }

  #graphicJobs .graphic-daily-panel{
    padding:10px 12px!important;
    min-height:0!important;
  }
  #graphicJobs .graphic-simple-add{
    margin-top:5px!important;
    padding-top:6px!important;
    gap:5px!important;
  }
  #graphicJobs .graphic-simple-add>input{
    min-height:31px!important;
    height:31px!important;
    padding-top:4px!important;
    padding-bottom:4px!important;
  }
  #graphicJobs .graphic-simple-actions{
    gap:5px!important;
  }
  #graphicJobs .graphic-simple-actions .btn,
  #graphicJobs .graphic-simple-actions select,
  #graphicJobs .graphic-simple-actions input{
    min-height:30px!important;
    height:30px!important;
  }
  #graphicJobs #g_delivery_quick_box{
    gap:3px!important;
    padding:4px 6px!important;
    min-width:360px!important;
    border-radius:8px!important;
  }
  #graphicJobs #g_delivery_quick_box .delivery-quick-line{gap:3px!important}
  #graphicJobs #g_delivery_quick_box .delivery-quick-label{width:43px!important;font-size:9.5px!important}
  #graphicJobs #g_delivery_quick_box .delivery-quick-btn{
    height:26px!important;
    padding:0 7px!important;
    font-size:9.5px!important;
  }
  #graphicJobs #g_delivery_quick_box .delivery-quick-summary{
    padding:3px 6px!important;
    font-size:9.5px!important;
  }
  #graphicJobs #g_delivery_quick_box #g_delivery_time{
    width:95px!important;
    min-width:95px!important;
    height:26px!important;
    min-height:26px!important;
    padding:3px 6px!important;
  }
  #graphicJobs .graphic-daily-panel>h3{
    margin:6px 0 6px!important;
    font-size:16px!important;
    line-height:1.1!important;
  }

  @media(max-width:900px){
    #graphicJobs #g_delivery_quick_box{min-width:0!important;width:100%!important}
  }
</style>`;

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      if(!html.includes('/* Grafik ekranı üst bölümünü sıkılaştır: listeyi daha yukarı taşır. */')){
        html=html.replace('</body>',compactTopPatch+'\n</body>');
      }
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
