import worker from './delivery_datetime_patch.js';

const turnoverCssPatch = String.raw`
<style>
  /* Sade haftalık takvim kalır; eski aylık takvimin yalnızca ciro kutuları görünür. */
  #graphicJobs .graphic-agenda-layout{
    grid-template-columns:minmax(0,1fr)!important;
  }
  #graphicJobs .graphic-calendar-panel{
    display:block!important;
    grid-row:1!important;
    position:static!important;
    min-width:0!important;
    width:100%!important;
    box-sizing:border-box!important;
    margin:0 0 10px!important;
    padding:0!important;
    background:transparent!important;
    border:0!important;
    border-radius:0!important;
    box-shadow:none!important;
  }
  #graphicJobs .graphic-daily-panel{
    grid-row:2!important;
  }
  #graphicJobs .graphic-calendar-panel .graphic-month-controls,
  #graphicJobs .graphic-calendar-panel .month-calendar{
    display:none!important;
  }
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:8px!important;
    width:100%!important;
    margin:0!important;
  }
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-daily-total,
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-period-totals,
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-period-total{
    box-sizing:border-box!important;
    width:100%!important;
    min-width:0!important;
    margin:0!important;
  }
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-daily-total,
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-period-total{
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    min-height:42px!important;
    padding:9px 12px!important;
    border-radius:10px!important;
    text-align:center!important;
    font-size:12px!important;
    font-weight:900!important;
  }
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-daily-total{
    background:#dcfce7!important;
    color:#166534!important;
    border:1px solid #86efac!important;
  }
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-period-totals{
    display:block!important;
  }
  #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel .graphic-period-total.cumulative{
    background:#dcfce7!important;
    color:#166534!important;
    border:1px solid #22c55e!important;
  }
  @media(max-width:760px){
    #graphicJobs .graphic-calendar-panel #graphicTurnoverPanel{
      grid-template-columns:1fr!important;
    }
  }
</style>`;

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';

    if (
      request.method === 'GET' &&
      response.status === 200 &&
      (url.pathname === '/' || url.pathname === '/index.html') &&
      contentType.includes('text/html')
    ) {
      let html = await response.text();
      if (!html.includes('/* Sade haftalık takvim kalır; eski aylık takvimin yalnızca ciro kutuları görünür. */')) {
        html = html.replace('</body>', turnoverCssPatch + '\n</body>');
      }
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.delete('etag');
      return new Response(html, {status: response.status, statusText: response.statusText, headers});
    }

    return response;
  }
};
