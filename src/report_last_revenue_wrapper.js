import worker from './planner_0900_wrapper.js';

function shouldPatch(path){
  return path==='/'||path==='/index.html';
}

const revenueFunction=`function renderRevenueTargetChart(s,range){let panel=$('revenueTargetChart');if(!panel){panel=document.createElement('div');panel.id='revenueTargetChart';panel.className='revenue-target-chart';document.querySelector('#reports .report-kpis')?.insertAdjacentElement('beforebegin',panel)}const selectedDay=$('reportDate').value||localDateKey(),monthlyTarget=2000000,dailyTarget=monthlyTarget/monthlyWorkWeight(selectedDay),requestKey=selectedDay+'-'+Date.now(),lastFrom=range&&range.from?range.from:selectedDay,lastTo=range&&range.to?range.to:selectedDay;panel.dataset.dailyRevenueRequest=requestKey;panel.innerHTML='<h3>Günlük Ciro Hedefi</h3><div class="revenue-compare"><div class="revenue-compare-card target"><span>HEDEF GÜNLÜK CİRO</span><b>'+Math.round(dailyTarget).toLocaleString('tr-TR')+' TL</b></div><div class="revenue-compare-card actual"><span>GÜNLÜK CİRO</span><b>Hesaplanıyor...</b></div><div class="revenue-compare-card last"><span>SON CİRO</span><b>Hesaplanıyor...</b><small class="last-revenue-date"></small></div></div><div class="revenue-progress"><div class="revenue-progress-fill" style="width:0%"></div></div>';Promise.all([req('/api/graphic-jobs?created_from='+encodeURIComponent(selectedDay)+'&created_to='+encodeURIComponent(selectedDay)),req('/api/graphic-jobs?created_from='+encodeURIComponent(lastFrom)+'&created_to='+encodeURIComponent(lastTo))]).then(results=>{if(panel.dataset.dailyRevenueRequest!==requestKey)return;const dayJobs=Array.isArray(results[0])?results[0]:[],rangeJobs=Array.isArray(results[1])?results[1]:[],actual=dayJobs.reduce((sum,job)=>sum+Number(job.price||0),0),percent=dailyTarget>0?Math.round(actual/dailyTarget*100):0,good=actual>=dailyTarget,totals=new Map();for(const job of rangeJobs){const key=String(job.created_date||job.created_at||'').slice(0,10);if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(key))continue;totals.set(key,(totals.get(key)||0)+Number(job.price||0))}const rows=[...totals.entries()].filter(row=>Number(row[1])!==0).sort((a,b)=>a[0].localeCompare(b[0])),last=rows.length?rows[rows.length-1]:null,lastValue=last?Number(last[1]||0):0,lastDate=last?new Date(last[0]+'T12:00:00').toLocaleDateString('tr-TR'):'Kayıt yok';panel.innerHTML='<h3>Günlük Ciro Hedefi</h3><div class="revenue-compare"><div class="revenue-compare-card target"><span>HEDEF GÜNLÜK CİRO</span><b>'+Math.round(dailyTarget).toLocaleString('tr-TR')+' TL</b></div><div class="revenue-compare-card actual '+(good?'good':'bad')+'"><span>GÜNLÜK CİRO</span><b>'+Math.round(actual).toLocaleString('tr-TR')+' TL</b></div><div class="revenue-compare-card last"><span>SON CİRO</span><b>'+Math.round(lastValue).toLocaleString('tr-TR')+' TL</b><small class="last-revenue-date">'+lastDate+'</small></div></div><div class="revenue-progress"><div class="revenue-progress-fill '+(good?'':'bad')+'" style="width:'+Math.min(100,Math.max(0,percent))+'%"></div></div>'}).catch(error=>{console.error('Ciro verisi yüklenemedi:',error);if(panel.dataset.dailyRevenueRequest===requestKey){const actualBox=panel.querySelector('.revenue-compare-card.actual b'),lastBox=panel.querySelector('.revenue-compare-card.last');if(actualBox)actualBox.textContent='Yüklenemedi';if(lastBox)lastBox.innerHTML='<span>SON CİRO</span><b>0 TL</b><small class="last-revenue-date">Veri alınamadı</small>'}})}`;

async function patchReport(response){
  if(!response||!response.ok)return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;
  let html=await response.text();
  const pattern=/function renderRevenueTargetChart\(s,range\)\{[\s\S]*?\}\s*async function loadMonthlyCiroGraph/;
  if(pattern.test(html))html=html.replace(pattern,revenueFunction+'\nasync function loadMonthlyCiroGraph');
  if(!html.includes('id="lastRevenueDirectCss"')){
    const css='<style id="lastRevenueDirectCss">.revenue-compare{grid-template-columns:repeat(3,minmax(0,1fr))!important}.revenue-compare-card.last{border-color:#7c3aed!important;background:#faf5ff!important;color:#6b21a8!important}.revenue-compare-card.last .last-revenue-date{display:block;margin-top:5px;font-size:11px;font-weight:900;color:#7e22ce}@media(max-width:760px){.revenue-compare{grid-template-columns:1fr!important}}</style>';
    html=html.replace('</head>',css+'</head>');
  }
  const h=new Headers(response.headers);
  h.delete('content-length');h.delete('content-encoding');h.delete('etag');
  h.set('content-type','text/html; charset=utf-8');
  h.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&shouldPatch(url.pathname))return patchReport(response);
    return response;
  }
};
