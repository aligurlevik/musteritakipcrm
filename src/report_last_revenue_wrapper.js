import worker from './planner_0900_wrapper.js';

function shouldPatch(path){
  return path==='/'||path==='/index.html';
}

async function patchReport(response){
  if(!response||!response.ok)return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('function renderRevenueTargetChart')||html.includes('id="lastRevenuePatchScript"')){
    const h=new Headers(response.headers);
    h.set('cache-control','no-cache, no-store, must-revalidate');
    return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
  }

  const css=`<style id="lastRevenuePatchCss">
  .revenue-compare{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  .revenue-compare-card.last{border-color:#7c3aed!important;background:#faf5ff!important;color:#6b21a8!important}
  .revenue-compare-card.last .last-revenue-date{display:block;margin-top:4px;font-size:11px;font-weight:800;color:#7e22ce}
  @media(max-width:760px){.revenue-compare{grid-template-columns:1fr!important}}
  </style>`;

  const script=`<script id="lastRevenuePatchScript">
  (function(){
    const original=window.renderRevenueTargetChart;
    if(typeof original!=='function')return;
    let requestNo=0;
    window.renderRevenueTargetChart=function(s,range){
      original(s,range);
      const panel=document.getElementById('revenueTargetChart');
      const compare=panel&&panel.querySelector('.revenue-compare');
      if(!compare)return;
      let card=compare.querySelector('.revenue-compare-card.last');
      if(!card){
        card=document.createElement('div');
        card.className='revenue-compare-card last';
        compare.appendChild(card);
      }
      card.innerHTML='<span>SON CİRO</span><b>Hesaplanıyor...</b><small class="last-revenue-date"></small>';
      const n=++requestNo;
      const from=encodeURIComponent(range&&range.from||'');
      const to=encodeURIComponent(range&&range.to||'');
      fetch('/api/graphic-jobs?created_from='+from+'&created_to='+to,{credentials:'same-origin',cache:'no-store'})
        .then(r=>{if(!r.ok)throw new Error('Ciro verisi alınamadı');return r.json()})
        .then(data=>{
          if(n!==requestNo)return;
          const jobs=Array.isArray(data)?data:(Array.isArray(data&&data.jobs)?data.jobs:(Array.isArray(data&&data.results)?data.results:[]));
          const totals=new Map();
          for(const job of jobs){
            const key=String(job.created_date||job.created_at||'').slice(0,10);
            if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(key))continue;
            totals.set(key,(totals.get(key)||0)+Number(job.price||0));
          }
          const rows=[...totals.entries()].filter(x=>Number(x[1])!==0).sort((a,b)=>a[0].localeCompare(b[0]));
          const last=rows.length?rows[rows.length-1]:null;
          const value=last?Number(last[1]||0):0;
          const dateText=last?new Date(last[0]+'T12:00:00').toLocaleDateString('tr-TR'):'Kayıt yok';
          card.innerHTML='<span>SON CİRO</span><b>'+Math.round(value).toLocaleString('tr-TR')+' TL</b><small class="last-revenue-date">'+dateText+'</small>';
        })
        .catch(()=>{
          if(n!==requestNo)return;
          card.innerHTML='<span>SON CİRO</span><b>—</b><small class="last-revenue-date">Veri alınamadı</small>';
        });
    };
  })();
  </script>`;

  html=html.replace('</head>',css+'</head>');
  html=html.replace('</body>',script+'</body>');
  const h=new Headers(response.headers);
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
