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
    const planPage=isGet&&['/planlama','/planlama/','/planlama.html'].includes(url.pathname);
    const notificationPage=isGet&&[
      '/','/index.html',
      '/mobil-ajanda','/mobil-ajanda.html',
      '/notlar-v2','/notlar-v2/','/notlar-v2.html',
      '/yeni-not','/yeni-not/','/yeni-not.html',
      '/planlama','/planlama/','/planlama.html'
    ].includes(url.pathname);

    const type=response.headers.get('content-type')||'';
    if(!notificationPage||!response.ok||!type.includes('text/html'))return response;

    let html=await response.text();
    html=html.replace(/\/notes-title-patch\.js(?:\?v=[^"']+)?/g,'/notes-title-patch.js?v=20260918-2');

    if(!html.includes('/phone-reminders.js')){
      html=html.replace('</head>','<link rel="manifest" href="/agenda.webmanifest"><link rel="apple-touch-icon" href="/agenda-icon-192.png"><script src="/phone-reminders.js?v=20260925-ajanda1"></script>\n</head>');
    }else{
      html=html.replace(/\/phone-reminders\.js(?:\?v=[^"']+)?/g,'/phone-reminders.js?v=20260925-ajanda1');
    }

    if(notesPage||newNotePage){
      if(!html.includes('/notes-pages-patch.js')){
        html=html.replace('<script>','<script src="/notes-pages-patch.js?v=20260907-restore"></script>\n<script>');
      }
      if(!html.includes('/notes-image-patch.js')){
        html=html.replace('</body>','<script src="/notes-image-patch.js?v=20260917-1"></script>\n</body>');
      }else{
        html=html.replace(/\/notes-image-patch\.js\?v=[^"']+/g,'/notes-image-patch.js?v=20260917-1');
      }
      if(!html.includes('/note-color-palette.js')){
        html=html.replace('</body>','<script src="/note-color-palette.js?v=20260919-1"></script>\n</body>');
      }else{
        html=html.replace(/\/note-color-palette\.js(?:\?v=[^"']+)?/g,'/note-color-palette.js?v=20260919-1');
      }
    }

    if(notificationPage){
      if(!html.includes('/mobile-notification-permission.js')&&!html.includes('/phone-notification-controls.js')){
        html=html.replace('</body>','<script src="/phone-notification-controls.js?v=20260925-ajanda1"></script>\n</body>');
      }else{
        html=html.replace(/\/(?:mobile-notification-permission|phone-notification-controls)\.js(?:\?v=[^"']+)?/g,'/phone-notification-controls.js?v=20260925-ajanda1');
      }
    }

    if(planPage&&!html.includes('data-ajanda-push="1"'))html=html.replace('<div class="app" id="plannerApp"','<div class="app" id="plannerApp" data-ajanda-push="1"');

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
