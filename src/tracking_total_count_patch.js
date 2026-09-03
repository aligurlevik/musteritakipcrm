import worker from './report_revenue_fix_patch.js';

const trackingTotalCountPatch = `
<style>
  #tracking .tracking-total-count{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    min-width:145px;
    padding:9px 14px;
    border:2px solid #2563eb;
    border-radius:10px;
    background:#0f172a;
    color:#fff;
    font-size:15px;
    font-weight:1000;
    line-height:1;
    white-space:nowrap;
    box-shadow:0 2px 8px #0f172a22;
  }
  #tracking .toolbar>div:last-child{flex-wrap:wrap;justify-content:flex-end}
</style>
<script>
(function(){
  function updateTrackingTotalCount(){
    const el=document.getElementById('trackingTotalCount');
    if(!el)return;
    let count=0;
    try{
      count=(typeof trackingJobs!=='undefined'&&Array.isArray(trackingJobs))
        ? trackingJobs.length
        : document.querySelectorAll('#trackingRows .tracking-card').length;
    }catch(_){
      count=document.querySelectorAll('#trackingRows .tracking-card').length;
    }
    el.textContent='TOPLAM İŞ: '+count;
  }

  const originalRenderTrackingJobs=window.renderTrackingJobs;
  if(typeof originalRenderTrackingJobs==='function'&&!originalRenderTrackingJobs.__totalCountWrapped){
    const wrappedRenderTrackingJobs=function(){
      const result=originalRenderTrackingJobs.apply(this,arguments);
      updateTrackingTotalCount();
      return result;
    };
    wrappedRenderTrackingJobs.__totalCountWrapped=true;
    window.renderTrackingJobs=wrappedRenderTrackingJobs;
  }

  updateTrackingTotalCount();
  window.addEventListener('load',updateTrackingTotalCount);
})();
</script>`;

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';

    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();

      if(!html.includes('id="trackingTotalCount"')){
        html=html.replace(
          '<div style="display:flex;gap:7px;align-items:center"><button id="trackingTodayButton"',
          '<div style="display:flex;gap:7px;align-items:center"><span id="trackingTotalCount" class="tracking-total-count">TOPLAM İŞ: 0</span><button id="trackingTodayButton"'
        );
      }

      if(!html.includes('function updateTrackingTotalCount()')){
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
