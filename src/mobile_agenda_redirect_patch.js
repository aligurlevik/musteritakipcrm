import worker from './tracking_total_count_patch.js';

function isMobileRequest(request){
  const mobileHint=(request.headers.get('sec-ch-ua-mobile')||'').trim();
  if(mobileHint==='?1')return true;
  const ua=request.headers.get('user-agent')||'';
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua);
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const isHome=request.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html');
    const forceMobile=url.searchParams.get('mobile')==='1';

    if(isHome&&(forceMobile||isMobileRequest(request))){
      const assetUrl=new URL(request.url);
      assetUrl.pathname='/mobil-ajanda.html';
      assetUrl.search='';
      return env.ASSETS.fetch(new Request(assetUrl.toString(),request));
    }

    return worker.fetch(request,env,ctx);
  }
};
