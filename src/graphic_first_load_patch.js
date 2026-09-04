import worker from './compact_top_layout_patch.js';

const oldLoadAll = "async function loadAll(){try{const session=await req('/api/session');applyAccess(session.role);$('login').classList.remove('show');if(session.role==='graphic'){await loadGraphicJobs();return}if(session.role==='tracking'){await loadTrackingJobs();return}const baseResults=await Promise.allSettled([loadDashboard(),loadCustomers(),loadMeetings(),loadOffers(),loadMails(),loadAgenda()]);const baseFailures=baseResults.filter(x=>x.status==='rejected');if(baseFailures.length)console.error('Bazı CRM bölümleri yüklenemedi:',baseFailures.map(x=>x.reason));if($('graphicJobs').classList.contains('active'))await loadGraphicJobs();if($('tracking').classList.contains('active'))await loadTrackingJobs()}catch(e){console.error(e);$('login').classList.add('show');if(e.message!=='Oturum süresi doldu.'){$('loginErr').textContent='Bağlantı kurulamadı. Sayfayı yenileyip tekrar deneyin.';showMsg(e.message,'err')}}}";

const newLoadAll = "async function loadAll(){try{const session=await req('/api/session');applyAccess(session.role);$('login').classList.remove('show');if(session.role==='graphic'){await loadGraphicJobs();return}if(session.role==='tracking'){await loadTrackingJobs();return}if($('graphicJobs').classList.contains('active')){try{await loadGraphicJobs()}catch(e){console.error('Grafik işleri ilk yükleme hatası:',e);showMsg(e.message,'err')}}if($('tracking').classList.contains('active')){try{await loadTrackingJobs()}catch(e){console.error('Takip ilk yükleme hatası:',e)}}Promise.allSettled([loadDashboard(),loadCustomers(),loadMeetings(),loadOffers(),loadMails(),loadAgenda()]).then(baseResults=>{const baseFailures=baseResults.filter(x=>x.status==='rejected');if(baseFailures.length)console.error('Bazı CRM bölümleri yüklenemedi:',baseFailures.map(x=>x.reason))})}catch(e){console.error(e);$('login').classList.add('show');if(e.message!=='Oturum süresi doldu.'){$('loginErr').textContent='Bağlantı kurulamadı. Sayfayı yenileyip tekrar deneyin.';showMsg(e.message,'err')}}}";

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const ct = response.headers.get('content-type') || '';
    if(request.method==='GET' && response.status===200 && (url.pathname==='/' || url.pathname==='/index.html') && ct.includes('text/html')){
      let html = await response.text();
      if(html.includes(oldLoadAll)) html = html.replace(oldLoadAll, newLoadAll);
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.delete('etag');
      headers.set('cache-control','no-cache, no-store, must-revalidate');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
