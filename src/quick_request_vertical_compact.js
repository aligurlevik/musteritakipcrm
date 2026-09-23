import worker from './private_notebook_guard.js';

const VERTICAL_COMPACT = String.raw`
<style id="quickRequestVerticalCompactStyle">
@media (min-width:761px){
  body.qr-page-open #quickRequestList{gap:3px!important}
  body.qr-page-open #quickRequestList .qr-card{
    min-height:0!important;
    padding:3px 8px!important;
    margin:0!important;
  }
  body.qr-page-open #quickRequestList .qr-card-top{
    min-height:30px!important;
    display:grid!important;
    grid-template-columns:minmax(0,1fr) auto!important;
    align-items:center!important;
    gap:6px!important;
  }
  body.qr-page-open #quickRequestList .qr-card-top>div:first-child{
    min-width:0!important;
    align-self:center!important;
  }
  body.qr-page-open #quickRequestList .qr-title{
    padding:1px 6px!important;
    font-size:13px!important;
    line-height:16px!important;
    vertical-align:middle!important;
  }
  body.qr-page-open #quickRequestList .qrc-right{
    display:flex!important;
    flex-wrap:nowrap!important;
    align-items:center!important;
    justify-content:flex-end!important;
    gap:4px!important;
    margin:0!important;
  }
  body.qr-page-open #quickRequestList .qrc-right .qrs-badge,
  body.qr-page-open #quickRequestList .qrc-right .qr-done,
  body.qr-page-open #quickRequestList .qrv2-edit,
  body.qr-page-open #quickRequestList .qrc-delete{
    padding:3px 6px!important;
    min-height:22px!important;
    margin:0!important;
    font-size:10px!important;
    line-height:16px!important;
  }
}
</style>`;

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

export default {
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx),backup=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      const html=await response.text();
      if(!html.includes('quickRequestPageCleanEditV2Script')||html.includes('quickRequestVerticalCompactStyle'))return rebuild(response,html);
      const next=html.includes('</body>')?html.replace('</body>',VERTICAL_COMPACT+'\n</body>'):html+VERTICAL_COMPACT;
      return rebuild(response,next);
    }catch(error){
      console.error('Not Defteri vertical compact patch failed',error);
      return backup;
    }
  }
};
