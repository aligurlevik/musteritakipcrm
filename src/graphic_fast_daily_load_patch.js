import worker from './compact_top_layout_patch.js';

const fastLoadGraphicJobs = String.raw`async function loadGraphicJobs(){
  ensureGraphicAlarmControls();
  if(!$('g_date').value)$('g_date').value=localDateKey();
  const selected=new Date($('g_date').value+'T12:00:00');
  graphicMonthDate=new Date(selected.getFullYear(),selected.getMonth(),1);
  const monthFrom=localDateKey(graphicMonthDate),monthTo=localDateKey(new Date(selected.getFullYear(),selected.getMonth()+1,0));
  const search=$('graphicSearch').value.trim(),until=new Date();until.setDate(until.getDate()+30);
  $('graphicWorkingDay').textContent=selected.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  /* Önce sadece günlük listeyi getir. Ağır aylık/ciro sorguları bu ekranı bekletmesin. */
  try{
    allGraphicJobs=await req('/api/graphic-jobs?'+(search?'search='+encodeURIComponent(search):'visible_date='+encodeURIComponent($('g_date').value)));
    if(!Array.isArray(allGraphicJobs))allGraphicJobs=[];
    graphicMonthJobs=allGraphicJobs;
    try{renderGraphicJobs()}catch(error){
      console.error('Grafik ekranı çizilemedi:',error);
      const rows=$('graphicJobRows');
      if(rows)rows.innerHTML='<div class="graphic-empty" style="color:#b91c1c;font-weight:900">Grafik işleri gösterilirken hata oluştu: '+esc(error.message)+'</div>';
    }
  }catch(error){
    console.error('Günlük grafik işleri yüklenemedi:',error);
    allGraphicJobs=[];
    const rows=$('graphicJobRows');
    if(rows)rows.innerHTML='<div class="graphic-empty" style="color:#b91c1c;font-weight:900">Günlük işler sunucudan yüklenemedi: '+esc(error.message)+'</div>';
    return;
  }

  /* Aşağıdaki yardımcı veriler arkadan ve birbirinden bağımsız yüklenir. */
  req('/api/graphic-jobs?work_from='+encodeURIComponent(monthFrom)+'&work_to='+encodeURIComponent(monthTo))
    .then(items=>{if(Array.isArray(items)){graphicMonthJobs=items;try{renderGraphicMonth()}catch(e){console.error(e)}}})
    .catch(e=>console.error('Aylık grafik verisi yüklenemedi:',e));

  req('/api/graphic-jobs?upcoming_from=2000-01-01&upcoming_to='+encodeURIComponent(localDateKey(until)))
    .then(items=>{if(Array.isArray(items)){upcomingGraphicJobs=items;try{renderUpcomingGraphicJobs()}catch(e){console.error(e)}}})
    .catch(e=>console.error('Yaklaşan teslimler yüklenemedi:',e));

  req('/api/graphic-jobs?created_from=2000-01-01&created_to='+encodeURIComponent(localDateKey()))
    .then(items=>{if(Array.isArray(items)){graphicCumulativeJobs=items;try{renderGraphicPeriodTotals();moveGraphicTurnoversToCalendar()}catch(e){console.error(e)}}})
    .catch(e=>console.error('Toplam ciro verisi yüklenemedi:',e));
}`;

async function patchHtml(response){
  if(!response||!response.ok)return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;
  let html=await response.text();
  const pattern=/async function loadGraphicJobs\(\)\{[\s\S]*?\n\}\nasync function changeGraphicMonth/;
  if(pattern.test(html)){
    html=html.replace(pattern,fastLoadGraphicJobs+'\nasync function changeGraphicMonth');
  }
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html'))return patchHtml(response);
    return response;
  }
};
