import worker from './portfolio_api_recovery_entry.js';
import {CLEAN_PORTFOLIO_HTML} from './portfolio_clean_page.js';

function cleanResponse(){
  return new Response(CLEAN_PORTFOLIO_HTML,{
    status:200,
    headers:{
      'content-type':'text/html; charset=utf-8',
      'cache-control':'no-cache, no-store, must-revalidate',
      'x-crm-portfolio-screen':'clean-v3-inline'
    }
  });
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);

    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'){
      return cleanResponse();
    }

    return worker.fetch(request,env,ctx);
  },

  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function'){
      return worker.scheduled(controller,env,ctx);
    }
  }
};
