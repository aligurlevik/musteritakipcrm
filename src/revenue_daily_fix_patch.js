import worker from './compact_top_layout_patch.js';

const dailyRevenueFixPatch = String.raw`
<script>
(function(){
  window.renderRevenueTargetChart = async function(s, range){
    let panel=document.getElementById('revenueTargetChart');
    if(!panel){
      panel=document.createElement('div');
      panel.id='revenueTargetChart';
      panel.className='revenue-target-chart';
      document.querySelector('#reports .report-kpis')?.insertAdjacentElement('beforebegin',panel);
    }

    const selectedDay=document.getElementById('reportDate')?.value || (typeof localDateKey==='function'?localDateKey():range?.from||'');
    const monthlyTarget=2000000;
    const dailyTarget=monthlyTarget/(typeof monthlyWorkWeight==='function'?monthlyWorkWeight(selectedDay):24);
    panel.dataset.dailyRevenueDay=selectedDay;
    panel.innerHTML=`<h3>Günlük Ciro Hedefi</h3><div class="revenue-compare"><div class="revenue-compare-card target"><span>HEDEF GÜNLÜK CİRO</span><b>${Math.round(dailyTarget).toLocaleString('tr-TR')} TL</b></div><div class="revenue-compare-card actual"><span>GÜNLÜK CİRO</span><b>Hesaplanıyor...</b></div></div><div class="revenue-progress"><div class="revenue-progress-fill" style="width:0%"></div></div>`;

    try{
      const jobs=await req('/api/graphic-jobs?created_from='+encodeURIComponent(selectedDay)+'&created_to='+encodeURIComponent(selectedDay));
      if(panel.dataset.dailyRevenueDay!==selectedDay)return;
      const actual=(Array.isArray(jobs)?jobs:[]).reduce((sum,job)=>sum+Number(job.price||0),0);
      const percent=dailyTarget>0?Math.round(actual/dailyTarget*100):0;
      const good=actual>=dailyTarget;
      panel.innerHTML=`<h3>Günlük Ciro Hedefi</h3><div class="revenue-compare"><div class="revenue-compare-card target"><span>HEDEF GÜNLÜK CİRO</span><b>${Math.round(dailyTarget).toLocaleString('tr-TR')} TL</b></div><div class="revenue-compare-card actual ${good?'good':'bad'}"><span>GÜNLÜK CİRO</span><b>${Math.round(actual).toLocaleString('tr-TR')} TL</b></div></div><div class="revenue-progress"><div class="revenue-progress-fill ${good?'':'bad'}" style="width:${Math.min(100,Math.max(0,percent))}%"></div></div>`;
    }catch(error){
      console.error('Günlük ciro yüklenemedi:',error);
      if(panel.dataset.dailyRevenueDay!==selectedDay)return;
      panel.querySelector('.revenue-compare-card.actual b').textContent='Yüklenemedi';
    }
  };
})();
</script>`;

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
      if (!html.includes('panel.dataset.dailyRevenueDay=selectedDay')) {
        html = html.replace('</body>', dailyRevenueFixPatch + '\n</body>');
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
