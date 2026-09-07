import worker from './mobile_latest_entry.js';

function isMobileRequest(request){
  const hint=(request.headers.get('sec-ch-ua-mobile')||'').trim();
  if(hint==='?1')return true;
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(request.headers.get('user-agent')||'');
}

export default {
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    const isGet=request.method==='GET';
    const notesPage=isGet&&(
      url.pathname==='/'||url.pathname==='/index.html'||
      ['/mobil-ajanda','/mobil-ajanda.html','/notlar-v2','/notlar-v2/','/notlar-v2.html'].includes(url.pathname)
    )&&(isMobileRequest(request)||url.searchParams.get('mobile')==='1'||url.pathname!=='/');
    const newNotePage=isGet&&['/yeni-not','/yeni-not/','/yeni-not.html'].includes(url.pathname)
      &&(isMobileRequest(request)||url.searchParams.get('mobile')==='1'||url.pathname!=='/');

    const type=response.headers.get('content-type')||'';
    if((!notesPage&&!newNotePage)||!response.ok||!type.includes('text/html'))return response;

    let html=await response.text();

    if(!html.includes('/notes-pages-patch.js')){
      html=html.replace('<script>','<script src="/notes-pages-patch.js?v=20260907-restore"></script>\n<script>');
    }

    if(notesPage){
      if(!html.includes('/mobile-notification-permission.js')){
        html=html.replace('</body>','<script src="/mobile-notification-permission.js?v=20260907-3"></script>\n</body>');
      }else{
        html=html.replace(/\/mobile-notification-permission\.js\?v=[^"']+/g,'/mobile-notification-permission.js?v=20260907-3');
      }
    }

    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('etag');
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','no-cache, no-store, must-revalidate');
    headers.set('pragma','no-cache');
    headers.set('expires','0');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
};
