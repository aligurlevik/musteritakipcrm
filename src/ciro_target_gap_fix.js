import worker from './ciro_consistency_fix.js';

const TARGET_GAP_PATCH = String.raw`
<script id="ciroTargetGapPatch">
(() => {
  const parseTL = text => {
    const value = Number(String(text || '').replace(/[^0-9-]/g, ''));
    return Number.isFinite(value) ? value : null;
  };
  const dateKey = d => {
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+day;
  };
  const isHoliday = d => {
    try{return typeof trackingHolidays!=='undefined' && trackingHolidays.has(dateKey(d))}catch{return false}
  };
  const isBusinessDay = d => d.getDay()!==0 && d.getDay()!==6 && !isHoliday(d);
  const countBusinessDays = (from,to) => {
    const d=new Date(from.getFullYear(),from.getMonth(),from.getDate(),12),end=new Date(to.getFullYear(),to.getMonth(),to.getDate(),12);
    let count=0;
    while(d<=end){if(isBusinessDay(d))count++;d.setDate(d.getDate()+1)}
    return count;
  };

  function updateCiroCards(){
    const panel=document.getElementById('revenueTargetChart');
    if(!panel)return;
    const grid=panel.querySelector('.revenue-compare');
    if(!grid)return;
    const cards=Array.from(grid.querySelectorAll(':scope > .revenue-compare-card'));
    if(cards.length<3)return;

    const period=document.getElementById('reportPeriod')?.value || 'daily';
    const selectedKey=document.getElementById('reportDate')?.value || dateKey(new Date());
    const selected=new Date(selectedKey+'T12:00:00');
    const now=new Date();

    let rangeFrom=new Date(selected),rangeTo=new Date(selected),periodLabel='BUGÜNE KADAR YAPILAN CİRO';
    if(period==='weekly'){
      const offset=(selected.getDay()+6)%7;
      rangeFrom=new Date(selected);rangeFrom.setDate(selected.getDate()-offset);
      rangeTo=new Date(rangeFrom);rangeTo.setDate(rangeFrom.getDate()+6);
      periodLabel='BU HAFTA YAPILAN CİRO';
    }else if(period==='monthly'){
      rangeFrom=new Date(selected.getFullYear(),selected.getMonth(),1,12);
      rangeTo=new Date(selected.getFullYear(),selected.getMonth()+1,0,12);
      periodLabel='BU AY YAPILAN CİRO';
    }else if(period==='custom'){
      const endKey=document.getElementById('reportEndDate')?.value || selectedKey;
      rangeTo=new Date(endKey+'T12:00:00');
      if(rangeTo<rangeFrom){const tmp=rangeFrom;rangeFrom=rangeTo;rangeTo=tmp}
      periodLabel='DÖNEMDE YAPILAN CİRO';
    }

    const fullTarget=parseTL(cards[0].querySelector('b')?.textContent);
    const totalCard=cards.find(card => /TOPLAM CİRO|YAPILAN CİRO/i.test(card.querySelector('span')?.textContent || '')) || cards[2];
    const actual=parseTL(totalCard.querySelector('b')?.textContent);
    if(fullTarget===null || actual===null)return;

    const totalBusinessDays=Math.max(countBusinessDays(rangeFrom,rangeTo),1);
    let cutoff=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
    if(cutoff>rangeTo)cutoff=new Date(rangeTo);
    if(cutoff<rangeFrom)cutoff=new Date(rangeFrom);
    const elapsedBusinessDays=Math.max(countBusinessDays(rangeFrom,cutoff),1);
    const expected=Math.round(fullTarget/totalBusinessDays*elapsedBusinessDays);
    const diff=actual-expected;
    const shownDate=cutoff.toLocaleDateString('tr-TR',{day:'numeric',month:'long'});

    cards[1].className='revenue-compare-card actual '+(diff>=0?'good':'bad');
    cards[1].innerHTML='<span>BUGÜNE KADAR OLMASI GEREKEN</span><b>'+expected.toLocaleString('tr-TR')+' TL</b><small>'+shownDate+' itibarıyla • '+elapsedBusinessDays+' iş günü</small>';

    cards[2].style.borderColor='#059669';
    cards[2].style.background='#ecfdf5';
    cards[2].style.color='#065f46';
    cards[2].innerHTML='<span>'+periodLabel+'</span><b>'+Math.round(actual).toLocaleString('tr-TR')+' TL</b><small>Fark: '+(diff>=0?'+':'')+Math.round(diff).toLocaleString('tr-TR')+' TL</small>';

    document.getElementById('revenueTargetGapCard')?.remove();
    Array.from(panel.querySelectorAll('.revenue-compare-card')).forEach(card=>{
      if(!grid.contains(card) && /TOPLAM CİRO|HEDEF CİRODA/i.test(card.textContent||''))card.remove();
    });
  }

  let queued=false;
  const schedule=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;updateCiroCards()});
  };
  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  schedule();
})();
</script>`;

function shouldPatch(path){
  return path === '/' || path === '/index.html';
}

export default {
  async fetch(request, env, ctx){
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const type = response.headers.get('content-type') || '';
    if(request.method !== 'GET' || !shouldPatch(url.pathname) || !response.ok || !type.includes('text/html')) return response;

    let html = await response.text();
    if(!html.includes('ciroTargetGapPatch')) html = html.replace('</body>', TARGET_GAP_PATCH + '\n</body>');

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('etag');
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.set('cache-control', 'no-cache, no-store, must-revalidate');
    headers.set('pragma', 'no-cache');
    headers.set('expires', '0');
    return new Response(html, {status:response.status, statusText:response.statusText, headers});
  }
};
