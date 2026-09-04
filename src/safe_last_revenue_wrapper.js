import worker from './planner_0900_wrapper.js';

function shouldPatch(path){
  return path==='/'||path==='/index.html';
}

async function patchHtml(response){
  if(!response||!response.ok)return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;
  let html=await response.text();
  if(html.includes('id="safeLastRevenueScript"'))return response;

  const css=`<style id="safeLastRevenueCss">
  #reports .revenue-compare{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  #reports .revenue-compare-card.safe-last-revenue{border-color:#7c3aed!important;background:#faf5ff!important;color:#6b21a8!important}
  #reports .revenue-compare-card.safe-last-revenue .safe-last-date{display:block;margin-top:5px;font-size:11px;font-weight:900;color:#7e22ce}
  @media(max-width:760px){#reports .revenue-compare{grid-template-columns:1fr!important}}
  </style>`;

  const script=`<script id="safeLastRevenueScript">
  (function(){
    var busy=false,lastKey='';
    function pad(n){return String(n).padStart(2,'0')}
    function dateKey(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
    function getRange(){
      var inp=document.getElementById('reportDate');
      var per=document.getElementById('reportPeriod');
      var value=inp&&inp.value?inp.value:dateKey(new Date());
      var p=value.split('-').map(Number),d=new Date(p[0],(p[1]||1)-1,p[2]||1,12);
      var mode=per&&per.value?per.value:'daily',from=new Date(d),to=new Date(d);
      if(mode==='monthly'){from=new Date(d.getFullYear(),d.getMonth(),1,12);to=new Date(d.getFullYear(),d.getMonth()+1,0,12)}
      else if(mode==='weekly'){var off=(d.getDay()+6)%7;from.setDate(d.getDate()-off);to=new Date(from);to.setDate(from.getDate()+6)}
      else if(mode==='custom'){var end=document.getElementById('reportEndDate');if(end&&end.value){var ep=end.value.split('-').map(Number);to=new Date(ep[0],(ep[1]||1)-1,ep[2]||1,12);if(to<from){var tmp=from;from=to;to=tmp}}}
      var today=new Date();today.setHours(12,0,0,0);if(to>today)to=today;
      return {from:dateKey(from),to:dateKey(to)};
    }
    function ensureCard(){
      var compare=document.querySelector('#reports #revenueTargetChart .revenue-compare');
      if(!compare)return null;
      var card=compare.querySelector('.safe-last-revenue');
      if(!card){card=document.createElement('div');card.className='revenue-compare-card safe-last-revenue';card.innerHTML='<span>SON CİRO</span><b>Hesaplanıyor...</b><small class="safe-last-date"></small>';compare.appendChild(card)}
      return card;
    }
    function load(){
      var card=ensureCard();if(!card||busy)return;
      var r=getRange(),key=r.from+'|'+r.to;
      if(key===lastKey&&card.dataset.loaded==='1')return;
      busy=true;lastKey=key;card.dataset.loaded='0';
      card.innerHTML='<span>SON CİRO</span><b>Hesaplanıyor...</b><small class="safe-last-date"></small>';
      fetch('/api/graphic-jobs?created_from='+encodeURIComponent(r.from)+'&created_to='+encodeURIComponent(r.to),{credentials:'same-origin',cache:'no-store'})
        .then(function(res){if(!res.ok)throw new Error('HTTP '+res.status);return res.json()})
        .then(function(data){
          var jobs=Array.isArray(data)?data:(data&&Array.isArray(data.jobs)?data.jobs:[]),totals={};
          jobs.forEach(function(job){var k=String(job.created_date||job.created_at||'').slice(0,10);if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(k))return;totals[k]=(totals[k]||0)+Number(job.price||0)});
          var days=Object.keys(totals).filter(function(k){return Number(totals[k])!==0}).sort();
          var last=days.length?days[days.length-1]:'';var value=last?Number(totals[last]||0):0;
          var dt=last?new Date(last+'T12:00:00').toLocaleDateString('tr-TR'):'Kayıt yok';
          card.innerHTML='<span>SON CİRO</span><b>'+Math.round(value).toLocaleString('tr-TR')+' TL</b><small class="safe-last-date">'+dt+'</small>';card.dataset.loaded='1';
        })
        .catch(function(){card.innerHTML='<span>SON CİRO</span><b>0 TL</b><small class="safe-last-date">Veri alınamadı</small>';card.dataset.loaded='1'})
        .finally(function(){busy=false});
    }
    function schedule(){setTimeout(load,60)}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
    document.addEventListener('change',function(e){if(e.target&&['reportDate','reportPeriod','reportEndDate'].indexOf(e.target.id)>=0){lastKey='';schedule()}});
    var obs=new MutationObserver(function(){schedule()});
    function startObs(){var r=document.getElementById('reports');if(r)obs.observe(r,{childList:true,subtree:true})}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObs,{once:true});else startObs();
  })();
  </script>`;

  html=html.replace('</head>',css+'</head>');
  html=html.replace('</body>',script+'</body>');
  const h=new Headers(response.headers);
  h.set('content-type','text/html; charset=utf-8');
  h.set('cache-control','no-cache, no-store, must-revalidate');
  h.delete('content-length');h.delete('content-encoding');h.delete('etag');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&shouldPatch(url.pathname))return patchHtml(response);
    return response;
  }
};
