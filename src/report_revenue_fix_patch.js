import worker from './compact_top_layout_patch.js';

const correctedRevenueFunction = String.raw`function renderRevenueTargetChart(s,range){let panel=$('revenueTargetChart');if(!panel){panel=document.createElement('div');panel.id='revenueTargetChart';panel.className='revenue-target-chart';document.querySelector('#reports .report-kpis')?.insertAdjacentElement('beforebegin',panel)}const selectedDay=$('reportDate').value||localDateKey(),monthlyTarget=2000000,dailyTarget=monthlyTarget/monthlyWorkWeight(selectedDay),requestKey=selectedDay+'-'+Date.now();panel.dataset.dailyRevenueRequest=requestKey;panel.innerHTML=\`<h3>Günlük Ciro Hedefi</h3><div class="revenue-compare"><div class="revenue-compare-card target"><span>HEDEF GÜNLÜK CİRO</span><b>\${Math.round(dailyTarget).toLocaleString('tr-TR')} TL</b></div><div class="revenue-compare-card actual"><span>GÜNLÜK CİRO</span><b>Hesaplanıyor...</b></div></div><div class="revenue-progress"><div class="revenue-progress-fill" style="width:0%"></div></div>\`;req('/api/graphic-jobs?created_from='+encodeURIComponent(selectedDay)+'&created_to='+encodeURIComponent(selectedDay)).then(jobs=>{if(panel.dataset.dailyRevenueRequest!==requestKey)return;const actual=(Array.isArray(jobs)?jobs:[]).reduce((sum,job)=>sum+Number(job.price||0),0),percent=dailyTarget>0?Math.round(actual/dailyTarget*100):0,good=actual>=dailyTarget;panel.innerHTML=\`<h3>Günlük Ciro Hedefi</h3><div class="revenue-compare"><div class="revenue-compare-card target"><span>HEDEF GÜNLÜK CİRO</span><b>\${Math.round(dailyTarget).toLocaleString('tr-TR')} TL</b></div><div class="revenue-compare-card actual \${good?'good':'bad'}"><span>GÜNLÜK CİRO</span><b>\${Math.round(actual).toLocaleString('tr-TR')} TL</b></div></div><div class="revenue-progress"><div class="revenue-progress-fill \${good?'':'bad'}" style="width:\${Math.min(100,Math.max(0,percent))}%"></div></div>\`}).catch(error=>{console.error('Günlük ciro yüklenemedi:',error);if(panel.dataset.dailyRevenueRequest===requestKey){const value=panel.querySelector('.revenue-compare-card.actual b');if(value)value.textContent='Yüklenemedi'}})}`;

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      const pattern=/function renderRevenueTargetChart\(s,range\)\{[\s\S]*?\}\s*async function loadMonthlyCiroGraph/;
      if(pattern.test(html))html=html.replace(pattern,correctedRevenueFunction+'\nasync function loadMonthlyCiroGraph');
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
