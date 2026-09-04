import worker from './top_menu_wrapper.js';

function isPlannerPath(path){
  return ['/planlama','/planlama/','/planlama.html'].includes(path);
}
function assetRequest(request,path){
  const u=new URL(request.url);
  u.pathname=path;
  u.search='';
  return new Request(u.toString(),{method:'GET',headers:request.headers,redirect:'manual'});
}
async function fetchPlannerAsset(request,env){
  let r=await env.ASSETS.fetch(assetRequest(request,'/planlama.html'));
  for(let i=0;i<3&&r.status>=300&&r.status<400;i++){
    const location=r.headers.get('location');
    if(!location)break;
    const next=new URL(location,new URL(request.url).origin);
    r=await env.ASSETS.fetch(assetRequest(request,next.pathname));
  }
  return r;
}
function menuMarkup(){
  return `<details id="topQuickMenu"><summary aria-label="Menü">⋮</summary><div id="topQuickMenuBox"><a class="mNotes" href="/notlar-v2.html">📝 Notlar</a><a class="mPlanner" href="/planlama.html?v=20260904-3">📅 Planlama</a><button class="mLogout" onclick="window.topMenuLogout()">🚪 Çıkış</button></div></details>`;
}
async function servePlanner(request,env){
  const r=await fetchPlannerAsset(request,env);
  const h=new Headers(r.headers);
  h.set('cache-control','no-cache, no-store, must-revalidate');
  if(!r.ok)return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h});
  let html=await r.text();
  const css=`<style id="planlamaLiveMenuCss">
  #topQuickMenu{position:relative;display:inline-block;z-index:500}
  #topQuickMenu>summary{list-style:none;width:42px;height:38px;display:grid;place-items:center;border:0;border-radius:10px;background:#111;color:#fff;font-size:25px;font-weight:950;cursor:pointer;line-height:1}
  #topQuickMenu>summary::-webkit-details-marker{display:none}
  #topQuickMenuBox{position:absolute;right:0;top:44px;width:190px;background:#fff;border:2px solid #9eb8d0;border-radius:12px;padding:6px;box-shadow:0 12px 30px #0004;z-index:9999}
  #topQuickMenuBox a,#topQuickMenuBox button{display:block;width:100%;border:0;border-radius:9px;padding:11px 10px;margin:2px 0;text-align:left;text-decoration:none;font:inherit;font-weight:950;cursor:pointer}
  #topQuickMenuBox .mNotes{background:#e8f3ff;color:#14578f}
  #topQuickMenuBox .mPlanner{background:#fff3b8;color:#6c5300}
  #topQuickMenuBox .mLogout{background:#ffe1dd;color:#a3261c}
  @media(max-width:520px){#topQuickMenu>summary{width:38px;height:36px;font-size:23px}#topQuickMenuBox{width:176px}}
  </style>`;
  const menu=menuMarkup();
  const script=`<script id="planlamaLiveMenuScript">
  window.topMenuLogout=async function(){try{await fetch('/api/logout',{method:'GET',credentials:'same-origin',cache:'no-store'})}catch(_){}location.replace('/notlar-v2.html?logout=1&t='+Date.now())};
  document.addEventListener('click',function(e){const m=document.getElementById('topQuickMenu');if(m&&m.open&&!m.contains(e.target))m.open=false});
  </script>`;
  if(!html.includes('id="planlamaLiveMenuCss"'))html=html.replace('</head>',css+'</head>');
  html=html.replace(/<div class="actions">[\s\S]*?<\/div><\/div><\/header>/,
    '<div class="actions"><button class="addBtn" onclick="openNew()">＋ Ekle</button>'+menu+'</div></div></header>');
  if(!html.includes('id="planlamaLiveMenuScript"'))html=html.replace('</body>',script+'</body>');
  h.set('content-type','text/html; charset=utf-8');
  return new Response(html,{status:200,headers:h});
}
async function patchPlannerLink(response){
  if(!response||!response.ok)return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;
  let html=await response.text();
  html=html.replaceAll('href="/planlama.html"','href="/planlama.html?v=20260904-3"');
  const h=new Headers(response.headers);
  h.set('content-type','text/html; charset=utf-8');
  h.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==='GET'&&isPlannerPath(url.pathname))return servePlanner(request,env);
    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html'||url.pathname.startsWith('/notlar-v2'))){
      return patchPlannerLink(response);
    }
    return response;
  }
};
