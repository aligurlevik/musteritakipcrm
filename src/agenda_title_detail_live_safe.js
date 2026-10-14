import worker from './mobile_day_colors_safe.js';

import {AGENDA_TITLE_DETAIL_LIVE} from './agenda_title_detail_ui.js';

function rebuild(response,html){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  headers.set('pragma','no-cache');
  headers.set('expires','0');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const backup=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(!html.includes('id="agendaDays"')||html.includes('agendaTitleDetailLiveSafeScript'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',AGENDA_TITLE_DETAIL_LIVE+'\n</body>'):html+AGENDA_TITLE_DETAIL_LIVE;
      return rebuild(response,next);
    }catch(error){
      console.error('Agenda title/detail live patch failed',error);
      return backup;
    }
  }
};
