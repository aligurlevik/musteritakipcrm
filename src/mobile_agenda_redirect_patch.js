import worker from './tracking_total_count_patch.js';

function isMobileRequest(request){
  const mobileHint=(request.headers.get('sec-ch-ua-mobile')||'').trim();
  if(mobileHint==='?1')return true;
  const ua=request.headers.get('user-agent')||'';
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(ua);
}

function mobileNotesRequest(request){
  const assetUrl=new URL(request.url);
  assetUrl.pathname='/mobil-ajanda';
  assetUrl.search='';
  return new Request(assetUrl.toString(),request);
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const isGet=request.method==='GET';
    const isHome=isGet&&(url.pathname==='/'||url.pathname==='/index.html');
    const isMobilePage=isGet&&(url.pathname==='/mobil-ajanda'||url.pathname==='/mobil-ajanda.html');
    const forceMobile=url.searchParams.get('mobile')==='1';

    if(isMobilePage){
      return env.ASSETS.fetch(mobileNotesRequest(request));
    }

    if(isHome&&(forceMobile||isMobileRequest(request))){
      return env.ASSETS.fetch(mobileNotesRequest(request));
    }

    return worker.fetch(request,env,ctx);
  }
};
