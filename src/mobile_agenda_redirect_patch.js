import worker from './tracking_total_count_patch.js';

function isMobileRequest(request){
  const mobileHint=(request.headers.get('sec-ch-ua-mobile')||'').trim();
  if(mobileHint==='?1')return true;
  const ua=request.headers.get('user-agent')||'';
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua);
}

const mobileGraphicAgendaPatch=`
<style id="mobileGraphicAgendaPatch">
@media(max-width:900px){
  body{overflow-x:hidden!important}
  .app{display:block!important;min-height:100vh!important}
  .side{display:none!important}
  .main{padding:7px!important;width:100%!important;max-width:100vw!important;overflow-x:hidden!important}
  .top{display:none!important}
  #graphicJobs{display:block!important;width:100%!important;max-width:100%!important;overflow:hidden!important}
  #graphicJobs>.toolbar{margin:3px 0 7px!important}
  #graphicJobs>.toolbar .filterbar{display:none!important}
  #graphicJobs>.toolbar h3{font-size:19px!important}
  .graphic-day-head{margin:5px 0 8px!important;padding:9px!important;border-radius:11px!important}
  .graphic-day-head h2{font-size:17px!important}
  .graphic-day-controls{width:100%!important;display:grid!important;grid-template-columns:38px minmax(0,1fr) 38px 64px!important;gap:5px!important}
  .graphic-day-controls input{width:100%!important;min-width:0!important;padding:8px 4px!important}
  .graphic-day-controls .btn{padding:8px 5px!important}
  .graphic-agenda-layout{display:block!important;width:100%!important}
  .graphic-calendar-panel{display:none!important}
  .graphic-daily-panel{width:100%!important;min-height:0!important;padding:8px!important;border-radius:11px!important}
  .graphic-simple-add{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important;margin-top:0!important;padding-top:5px!important}
  .graphic-simple-add>input{min-width:0!important}
  #g_description{grid-column:1/-1!important}
  .graphic-simple-add>span{min-width:0!important}
  .graphic-simple-actions{grid-column:1/-1!important;display:flex!important;flex-wrap:wrap!important;gap:5px!important}
  .graphic-simple-actions .clipboard{flex:1 1 130px!important}
  .graphic-simple-actions .delivery{width:125px!important;flex:1 1 120px!important}
  #g_delivery_time_wrap{flex:1 1 150px!important;min-width:145px!important}
  #g_delivery_time{width:90px!important;min-width:0!important}
  #g_delivery_place{width:105px!important;min-width:0!important}
  .graphic-critical-control{flex:1 1 135px!important;justify-content:center!important}
  .graphic-simple-actions>.green{flex:1 1 90px!important}
  .graphic-daily-panel>h3{font-size:15px!important;line-height:1.25!important}
  .graphic-daily-total{float:none!important;display:block!important;width:100%!important;margin-top:6px!important;white-space:normal!important;text-align:center!important}
  .graphic-daily-list{gap:6px!important}
  .graphic-job-card{width:100%!important;grid-template-columns:72px 22px minmax(0,1fr)!important;gap:5px!important;padding:7px 5px!important;align-items:start!important}
  .graphic-job-entry-time{grid-column:1!important;grid-row:1/3!important;width:72px!important;padding:4px 2px!important}
  .graphic-job-entry-time small{font-size:7px!important;text-align:center!important}
  .graphic-job-entry-time b{font-size:11px!important}
  .graphic-job-entry-time em{font-size:10px!important}
  .graphic-job-check{grid-column:2!important;grid-row:1!important;width:20px!important;height:20px!important}
  .graphic-job-main{grid-column:3!important;grid-row:1!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:5px!important;width:100%!important;min-width:0!important;overflow:visible!important}
  .graphic-job-title{grid-column:1!important;grid-row:1!important;display:grid!important;grid-template-columns:minmax(70px,1fr) 82px 58px!important;gap:3px!important;min-width:0!important}
  .graphic-customer-name{font-size:11px!important}
  .graphic-job-code{width:82px!important;font-size:10px!important;padding:2px 3px!important}
  .graphic-person{font-size:9px!important}
  .graphic-job-main>span:last-child{grid-column:2!important;grid-row:1!important;min-width:58px!important;justify-self:end!important}
  .graphic-price,.graphic-price.passive-price{font-size:10px!important;min-width:58px!important;padding:4px!important}
  .graphic-job-note{grid-column:1/-1!important;grid-row:2!important;width:100%!important;padding:5px 0 0!important;border-left:0!important;border-top:1px solid #cbd5e1!important;font-size:11px!important}
  .graphic-original-note,.graphic-tracking-note{font-size:10px!important;padding:4px 5px!important}
  .graphic-job-actions{grid-column:3!important;grid-row:2!important;display:flex!important;flex-wrap:wrap!important;justify-content:flex-start!important;gap:4px!important;width:100%!important;margin-top:2px!important}
  .graphic-job-actions>*{width:auto!important;max-width:100%!important;min-width:0!important}
  .graphic-job-actions .graphic-status-select{width:96px!important;min-width:96px!important;font-size:10px!important}
  .graphic-job-actions .graphic-plan-badge{width:auto!important;font-size:10px!important;padding:4px 6px!important}
  .graphic-job-actions .graphic-delivery-place{width:auto!important;min-width:38px!important}
  .graphic-job-actions .graphic-alarm-button{width:32px!important}
  .graphic-job-actions .graphic-edit-button{width:auto!important}
  .graphic-job-actions .red{width:auto!important;min-width:30px!important;padding:5px!important}
}
</style>
<script>
(function(){
  function openRealGraphicAgenda(){
    try{
      if(typeof currentAccessRole!=='undefined'&&currentAccessRole==='tracking')return;
      document.querySelectorAll('.section').forEach(function(section){section.classList.remove('active')});
      var graphic=document.getElementById('graphicJobs');
      if(graphic)graphic.classList.add('active');
      document.querySelectorAll('.menu button').forEach(function(button){button.classList.remove('active')});
      var graphicButton=document.querySelector('.menu button[data-page="graphicJobs"]');
      if(graphicButton)graphicButton.classList.add('active');
      var title=document.getElementById('title');
      if(title)title.textContent='Grafik İşleri';
      if(typeof loadGraphicJobs==='function')loadGraphicJobs();
    }catch(error){console.error('Mobil Grafik Ajanda açılamadı:',error)}
  }
  window.addEventListener('load',function(){setTimeout(openRealGraphicAgenda,250)});
  document.addEventListener('DOMContentLoaded',function(){setTimeout(openRealGraphicAgenda,50)});
  setTimeout(openRealGraphicAgenda,700);
  try{window.openReportsPage=function(){}}catch(_){ }
})();
</script>`;

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const isGet=request.method==='GET';
    const isHome=isGet&&(url.pathname==='/'||url.pathname==='/index.html');
    const isOldMobilePage=isGet&&(url.pathname==='/mobil-ajanda'||url.pathname==='/mobil-ajanda.html');
    const forceMobile=url.searchParams.get('mobile')==='1';
    const mobile=forceMobile||isMobileRequest(request);

    if(isOldMobilePage){
      const target=new URL('/',url.origin);
      target.searchParams.set('mobile','1');
      return Response.redirect(target.toString(),302);
    }

    const response=await worker.fetch(request,env,ctx);
    if(!isHome||!mobile||response.status!==200)return response;

    const contentType=response.headers.get('content-type')||'';
    if(!contentType.includes('text/html'))return response;

    let html=await response.text();
    if(!html.includes('id="mobileGraphicAgendaPatch"')){
      html=html.replace('</body>',mobileGraphicAgendaPatch+'\n</body>');
    }

    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('etag');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
};
