import worker from './d1_like_global_fix.js';

function shouldPatch(path){
  return path==='/'||path==='/index.html';
}

async function patchHtml(response){
  if(!response||!response.ok)return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;
  let html=await response.text();
  if(html.includes('id="safeTotalRevenueScript"'))return response;

  const css=`<style id="safeTotalRevenueCss">
  #reports .revenue-compare{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  #reports .revenue-compare-card.safe-total-revenue{border-color:#0f766e!important;background:#f0fdfa!important;color:#115e59!important}
  #reports .revenue-compare-card.safe-total-revenue small{display:block;margin-top:5px;font-size:11px;font-weight:900;color:#0f766e}
  @media(max-width:760px){#reports .revenue-compare{grid-template-columns:1fr!important}}
  </style>`;

  const script=`<script id="safeTotalRevenueScript">
  (function(){
    var timer=null,busy=false,lastKey='';
    function range(){
      try{if(typeof reportDateRange==='function')return reportDateRange()}catch(e){}
      var d=document.getElementById('reportDate');
      var value=d&&d.value?d.value:new Date().toISOString().slice(0,10);
      return {from:value,to:value,period:'daily'};
    }
    function ensureCard(){
      var compare=document.querySelector('#reports #revenueTargetChart .revenue-compare');
      if(!compare)return null;
      var card=compare.querySelector('.safe-total-revenue');
      if(!card){
        card=document.createElement('div');
        card.className='revenue-compare-card safe-total-revenue';
        card.innerHTML='<span>TOPLAM CİRO</span><b>Hesaplanıyor...</b><small>Seçilen dönem</small>';
        compare.appendChild(card);
      }
      return card;
    }
    function load(){
      var card=ensureCard();
      if(!card||busy)return;
      var r=range(),key=String(r.from||'')+'|'+String(r.to||'');
      if(key===lastKey&&card.dataset.loaded==='1')return;
      busy=true;lastKey=key;card.dataset.loaded='0';
      card.innerHTML='<span>TOPLAM CİRO</span><b>Hesaplanıyor...</b><small>Seçilen dönem</small>';
      fetch('/api/graphic-jobs?created_from='+encodeURIComponent(r.from)+'&created_to='+encodeURIComponent(r.to),{credentials:'same-origin',cache:'no-store'})
        .then(function(res){if(!res.ok)throw new Error('HTTP '+res.status);return res.json()})
        .then(function(data){
          var jobs=Array.isArray(data)?data:[];
          var total=jobs.reduce(function(sum,job){return sum+Number(job&&job.price||0)},0);
          var label=(r.from===r.to)?r.from:(r.from+' — '+r.to);
          card.innerHTML='<span>TOPLAM CİRO</span><b>'+Math.round(total).toLocaleString('tr-TR')+' TL</b><small>'+label+'</small>';
          card.dataset.loaded='1';
        })
        .catch(function(){
          card.innerHTML='<span>TOPLAM CİRO</span><b>Yüklenemedi</b><small>Diğer ekranlar etkilenmez</small>';
          card.dataset.loaded='1';
        })
        .finally(function(){busy=false});
    }
    function schedule(){clearTimeout(timer);timer=setTimeout(load,120)}
    document.addEventListener('change',function(e){
      if(e.target&&['reportDate','reportPeriod','reportEndDate'].indexOf(e.target.id)>=0){lastKey='';schedule()}
    });
    document.addEventListener('click',function(e){
      if(e.target&&((e.target.closest&&e.target.closest('#reportFolderButtons'))||String(e.target.textContent||'').trim()==='Raporu Göster')){lastKey='';schedule()}
    });
    var obs=new MutationObserver(function(){schedule()});
    function start(){var reports=document.getElementById('reports');if(reports)obs.observe(reports,{childList:true,subtree:true});schedule()}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  })();
  </script>`;

  html=html.replace('</head>',css+'</head>');
  html=html.replace('</body>',script+'</body>');
  const h=new Headers(response.headers);
  h.delete('content-length');h.delete('content-encoding');h.delete('etag');
  h.set('content-type','text/html; charset=utf-8');
  h.set('cache-control','no-cache, no-store, must-revalidate');
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
