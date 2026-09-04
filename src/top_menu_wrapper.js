import worker from './planner_wrapper.js';

function wantsMenu(path){
  return ['/notlar-v2','/notlar-v2/','/notlar-v2.html','/planlama','/planlama/','/planlama.html'].includes(path);
}

async function injectTopMenu(response,path){
  if(!response.ok)return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;
  let html=await response.text();
  if(html.includes('id="topQuickMenu"'))return response;

  const css=`<style id="topQuickMenuCss">
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

  const menu=`<details id="topQuickMenu"><summary aria-label="Menü">⋮</summary><div id="topQuickMenuBox"><a class="mNotes" href="/notlar-v2.html">📝 Notlar</a><a class="mPlanner" href="/planlama.html">📅 Planlama</a><button class="mLogout" onclick="window.topMenuLogout()">🚪 Çıkış</button></div></details>`;
  const script=`<script id="topQuickMenuScript">window.topMenuLogout=async function(){try{await fetch('/api/logout',{method:'GET',credentials:'same-origin',cache:'no-store'})}catch(_){}location.replace('/notlar-v2.html?logout=1&t='+Date.now())};document.addEventListener('click',function(e){const m=document.getElementById('topQuickMenu');if(m&&m.open&&!m.contains(e.target))m.open=false});</script>`;

  html=html.replace('</head>',css+'</head>');

  if(path.startsWith('/planlama')){
    html=html.replace(/<div class="actions">[\s\S]*?<\/div><\/div><\/header>/,
      '<div class="actions"><button class="addBtn" onclick="openNew()">＋ Ekle</button>'+menu+'</div></div></header>');
  }else{
    if(html.includes('<button class="newbtn"')){
      html=html.replace(/<div><a id="plannerNavBtn"[\s\S]*?<button class="newbtn"([^>]*)>＋ Yeni Not<\/button><\/div>/,
        '<div><button class="newbtn"$1>＋ Yeni Not</button>'+menu+'</div>');
      if(!html.includes('id="topQuickMenu"')){
        html=html.replace(/<button class="newbtn"([^>]*)>＋ Yeni Not<\/button>/,
          '<div style="display:flex;gap:7px;align-items:center"><button class="newbtn"$1>＋ Yeni Not</button>'+menu+'</div>');
      }
    }
  }

  html=html.replace('</body>',script+'</body>');
  const h=new Headers(response.headers);h.set('content-type','text/html; charset=utf-8');h.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&wantsMenu(url.pathname))return injectTopMenu(response,url.pathname);
    return response;
  }
};
