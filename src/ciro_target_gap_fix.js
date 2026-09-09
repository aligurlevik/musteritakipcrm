import worker from './ciro_consistency_fix.js';

const TARGET_GAP_PATCH = String.raw`
<script id="ciroTargetGapPatch">
(() => {
  const parseTL = text => {
    const value = Number(String(text || '').replace(/[^0-9-]/g, ''));
    return Number.isFinite(value) ? value : null;
  };

  function updateTargetGapCard(){
    const panel = document.getElementById('revenueTargetChart');
    if(!panel) return;

    const grid = panel.querySelector('.revenue-compare');
    if(!grid) return;

    const cards = Array.from(grid.querySelectorAll(':scope > .revenue-compare-card'));
    if(cards.length < 3) return;

    const targetValue = parseTL(cards[0].querySelector('b')?.textContent);
    const totalCard = cards.find(card => /TOPLAM CİRO/i.test(card.querySelector('span')?.textContent || '')) || cards[2];
    const totalValue = parseTL(totalCard.querySelector('b')?.textContent);
    if(targetValue === null || totalValue === null) return;

    const gap = totalValue - targetValue;
    const label = gap < 0 ? 'HEDEF CİRODA EKSİ' : 'HEDEF CİRODA ARTI';
    const formatted = (gap > 0 ? '+' : '') + Math.round(gap).toLocaleString('tr-TR') + ' TL';

    let gapCard = document.getElementById('revenueTargetGapCard');
    if(!gapCard){
      const legacyDuplicate = Array.from(panel.querySelectorAll('.revenue-compare-card')).find(card =>
        !grid.contains(card) && /TOPLAM CİRO/i.test(card.textContent || '')
      );
      if(legacyDuplicate){
        gapCard = legacyDuplicate;
        gapCard.id = 'revenueTargetGapCard';
      }else{
        gapCard = document.createElement('div');
        gapCard.id = 'revenueTargetGapCard';
        gapCard.className = 'revenue-compare-card';
        grid.insertAdjacentElement('afterend', gapCard);
      }
    }

    gapCard.style.marginTop = '10px';
    gapCard.style.width = 'calc((100% - 24px) / 3)';
    gapCard.style.minWidth = '280px';
    gapCard.style.borderColor = gap < 0 ? '#dc2626' : '#16a34a';
    gapCard.style.background = gap < 0 ? '#fef2f2' : '#f0fdf4';
    gapCard.style.color = gap < 0 ? '#991b1b' : '#166534';

    const signature = label + '|' + formatted;
    if(gapCard.dataset.signature !== signature){
      gapCard.dataset.signature = signature;
      gapCard.innerHTML = '<span>' + label + '</span><b>' + formatted + '</b><small>Dönem hedefi ile toplam ciro arasındaki fark</small>';
    }
  }

  let queued = false;
  const schedule = () => {
    if(queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      updateTargetGapCard();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {childList:true, subtree:true, characterData:true});
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
