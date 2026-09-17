import worker from './quick_request_compact_safe.js';

const TITLE_COLOR_PATCH = String.raw`
<style id="quickRequestTitleColorSafeStyle">
#quickRequestList .qr-title{
  display:inline-block!important;
  color:#1d4ed8!important;
  background:#dbeafe!important;
  border:1px solid #bfdbfe!important;
  border-radius:7px!important;
  padding:2px 7px!important;
  font-weight:950!important;
}
#quickRequestCompletedV2 .qr2-title{
  display:inline-block!important;
  color:#7e22ce!important;
  background:#f3e8ff!important;
  border:1px solid #e9d5ff!important;
  border-radius:7px!important;
  padding:2px 7px!important;
  font-weight:950!important;
}
</style>`;

function rebuild(response,html){
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('cache-control','no-cache, no-store, must-revalidate');headers.set('pragma','no-cache');headers.set('expires','0');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx),backup=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(!html.includes('quickRequestWhatsAppSafeScript')||html.includes('quickRequestTitleColorSafeStyle'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',TITLE_COLOR_PATCH+'\n</body>'):html+TITLE_COLOR_PATCH;
      return rebuild(response,next);
    }catch(error){console.error('Quick request title color patch failed',error);return backup}
  }
};
