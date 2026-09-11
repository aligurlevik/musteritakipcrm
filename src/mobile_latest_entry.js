import worker from './mobile_notes_latest_api.js';

function isMobileRequest(request){
  const hint=(request.headers.get('sec-ch-ua-mobile')||'').trim();
  if(hint==='?1')return true;
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(request.headers.get('user-agent')||'');
}

function assetRequest(request,pathname){
  const url=new URL(request.url);
  url.pathname=pathname;
  url.search='';
  return new Request(url.toString(),{method:'GET',headers:request.headers,redirect:'manual'});
}

function noCacheHtml(response,html){
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

async function mobileAgenda(request,env){
  let response=await env.ASSETS.fetch(assetRequest(request,'/notlar-v2.html'));
  if(response.status>=300&&response.status<400){
    const location=response.headers.get('location');
    if(location){
      const next=new URL(location,new URL(request.url).origin);
      response=await env.ASSETS.fetch(assetRequest(request,next.pathname));
    }
  }
  if(!response.ok)return response;

  let html=await response.text();
  const mobileFixes=`<style id="mobileMenuOpacityFix">
.card.done{opacity:1!important}
.card.done .body{opacity:.68}
.card.done .menu,.card.done .menuBox,.card.done .menuBox *{opacity:1!important}
.menu[open]{z-index:150!important}
.menu[open] .menuBox{z-index:200!important;background:#fff!important;opacity:1!important}
.mobileTopActions{display:flex;align-items:center;justify-content:flex-end;gap:5px;flex:1 1 auto}
.refreshbtn{border:0;border-radius:10px;padding:9px 9px;background:#fff;color:#123f68;font-size:13px;font-weight:950;white-space:nowrap;box-shadow:0 1px 4px #0002}
.logoutbtn{border:2px solid #c62828;border-radius:10px;padding:7px 10px;background:#fff4f2;color:#9b1c1c;font-size:13px;font-weight:950;white-space:nowrap;box-shadow:0 1px 4px #0002}
.noteTitleMobile{font-size:17px;font-weight:950;line-height:24px;color:#102f4d;padding:3px 4px 5px;border-bottom:2px solid #9db8d0;white-space:normal;word-break:break-word}
.card.hasMobileTitle .noteText{display:none!important}
#editTitleMobile{width:100%;border:2px solid #8db0cf;border-radius:9px;padding:9px 10px;font-size:17px;font-weight:900;color:#102f4d;background:#fff}
@media(max-width:560px){.toprow{display:flex;flex-wrap:wrap;gap:6px}.title{order:1;font-size:21px}.toprow>.newbtn{order:2;margin-left:auto;padding:9px 10px;font-size:13px}.mobileTopActions{order:3;flex:0 0 100%;display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,.8fr) minmax(0,1fr);gap:5px}.mobileTopActions>button{width:100%}.refreshbtn,.logoutbtn{padding:8px 6px;font-size:12px}.tabs{top:92px}.noteTitleMobile{font-size:18px;line-height:26px}}
</style>`;
  if(!html.includes('id="mobileMenuOpacityFix"'))html=html.replace('</head>',mobileFixes+'\n</head>');

  if(!html.includes('class="refreshbtn"')){
    html=html.replace(
      '<div class="title">📝 Notlarım</div><button class="newbtn" onclick="location.href=\'/yeni-not.html\'">＋ Yeni Not</button>',
      '<div class="title">📝 Notlarım</div><div class="mobileTopActions"><button class="refreshbtn" type="button" onclick="location.reload()">⟳ Yenile</button><button class="logoutbtn" type="button" aria-label="Oturumu kapat" onclick="logoutNotes(this)">↪ Çıkış</button></div><button class="newbtn" type="button" onclick="location.href=\'/yeni-not.html\'">＋ Yeni Not</button>'
    );
  }

  const titleListPatch=`<script id="mobileTitleListPatch">
(function(){
  let busy=false;
  const nativeFetch=window.fetch.bind(window);
  function escText(v){return String(v==null?'':v)}
  function sortItems(arr){return [...arr].sort((a,b)=>{const ad=a.entry_status==='Yapıldı'?1:0,bd=b.entry_status==='Yapıldı'?1:0;if(ad!==bd)return ad-bd;const ai=Number(a.is_important||0),bi=Number(b.is_important||0);if(ai!==bi)return bi-ai;return Number(b.id)-Number(a.id)})}
  async function getItems(){
    const archive=document.getElementById('tab-archive')?.classList.contains('on');
    const r=await nativeFetch('/api/notes-v3?scope='+(archive?'archive':'all'),{cache:'no-store'});
    if(!r.ok)return[];
    return sortItems(await r.json());
  }
  async function applyTitles(){
    if(busy)return;busy=true;
    try{
      const items=await getItems();
      const cards=[...document.querySelectorAll('#list .card')];
      cards.forEach((card,i)=>{
        const item=items[i];if(!item)return;
        const title=escText(item.title).trim();
        const body=card.querySelector('.body');if(!body)return;
        const old=body.querySelector('.noteTitleMobile');if(old)old.remove();
        card.classList.toggle('hasMobileTitle',!!title);
        if(title){const el=document.createElement('div');el.className='noteTitleMobile';el.textContent=title;body.prepend(el)}
      });
    }catch(_){ }finally{busy=false}
  }
  function ensureEditTitle(){
    const note=document.getElementById('editNote');if(!note||document.getElementById('editTitleMobile'))return;
    const wrap=document.createElement('div');wrap.className='field';wrap.innerHTML='<label>BAŞLIK</label><input id="editTitleMobile" maxlength="120" placeholder="Başlık">';
    note.closest('.field')?.before(wrap);
  }
  window.fetch=async function(input,init){
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      const method=String(init&&init.method||'GET').toUpperCase();
      if(/^\/api\/notes-v3\/\d+$/.test(url)&&method==='PUT'&&init&&typeof init.body==='string'){
        const data=JSON.parse(init.body||'{}');const t=document.getElementById('editTitleMobile');if(t)data.title=t.value.trim();
        init=Object.assign({},init,{body:JSON.stringify(data)});
      }
    }catch(_){ }
    return nativeFetch(input,init);
  };
  ensureEditTitle();
  const originalOpen=window.openEditor;
  if(typeof originalOpen==='function'&&!originalOpen.__mobileTitleWrapped){
    const wrapped=async function(id){
      const out=originalOpen.apply(this,arguments);ensureEditTitle();
      try{const rows=await getItems(),x=rows.find(n=>Number(n.id)===Number(id)),t=document.getElementById('editTitleMobile');if(t)t.value=x&&x.title?x.title:''}catch(_){ }
      return out;
    };wrapped.__mobileTitleWrapped=true;window.openEditor=wrapped;
  }
  const list=document.getElementById('list');
  if(list)new MutationObserver(()=>setTimeout(applyTitles,30)).observe(list,{childList:true});
  document.addEventListener('click',e=>{if(e.target.closest('#tab-all,#tab-archive'))setTimeout(applyTitles,120)});
  setTimeout(applyTitles,120);
})();
</script>`;
  if(!html.includes('id="mobileTitleListPatch"'))html=html.replace('</body>',titleListPatch+'\n</body>');

  const logoutScript=`<script id="mobileLogoutScript">
window.logoutNotes=async function(button){
  if(button)button.disabled=true;
  try{await fetch('/api/logout',{method:'POST',credentials:'same-origin',cache:'no-store'})}catch(_){}
  location.replace('/notlar-v2.html');
};
</script>`;
  if(!html.includes('id="mobileLogoutScript"'))html=html.replace('</body>',logoutScript+'\n</body>');

  return noCacheHtml(response,html);
}

async function mobileNewNote(request,env,ctx){
  let response=await worker.fetch(request,env,ctx);
  if(!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  const patch=`<style id="mobileNoteTitlePatchStyle">
.mobileTitleField{margin:4px 0 9px}
.mobileTitleField label{display:block;font-size:12px;font-weight:950;color:#21476b;margin:0 0 4px 2px}
.mobileTitleField input{width:100%;border:2px solid #8db0cf;border-radius:10px;padding:11px 12px;background:#fff;color:#111;font-size:18px;font-weight:950;outline:0}
.mobileTitleField input:focus{border-color:#596b7c;box-shadow:0 0 0 2px #1111}
</style>
<script id="mobileNoteTitlePatch">
(function(){
  function addNewTitle(){
    const form=document.querySelector('main.form');if(!form||document.getElementById('noteTitleMobile'))return;
    const note=document.getElementById('note');if(!note)return;
    const wrap=document.createElement('div');wrap.className='mobileTitleField';
    wrap.innerHTML='<label>BAŞLIK</label><input id="noteTitleMobile" maxlength="120" placeholder="Örn: Dantel kalıpları">';
    note.closest('.field')?.before(wrap);
  }
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    try{
      const url=typeof input==='string'?input:(input&&input.url)||'';
      const method=String(init&&init.method||'GET').toUpperCase();
      if(url==='/api/notes-v3'&&method==='POST'&&init&&typeof init.body==='string'){
        const data=JSON.parse(init.body||'{}');data.title=(document.getElementById('noteTitleMobile')?.value||'').trim();
        init=Object.assign({},init,{body:JSON.stringify(data)});
      }
    }catch(_){ }
    return nativeFetch(input,init);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addNewTitle,{once:true});else addNewTitle();
  setTimeout(addNewTitle,250);
})();
</script>`;
  if(!html.includes('id="mobileNoteTitlePatch"'))html=html.replace('</body>',patch+'\n</body>');
  return noCacheHtml(response,html);
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const isGet=request.method==='GET';
    const isHome=isGet&&(url.pathname==='/'||url.pathname==='/index.html');
    const explicitMobile=isGet&&['/mobil-ajanda','/mobil-ajanda.html','/notlar-v2','/notlar-v2/','/notlar-v2.html'].includes(url.pathname);
    const newNotePage=isGet&&['/yeni-not','/yeni-not/','/yeni-not.html'].includes(url.pathname);
    const forceMobile=url.searchParams.get('mobile')==='1';

    if(explicitMobile || (isHome&&(forceMobile||isMobileRequest(request)))){
      return mobileAgenda(request,env);
    }
    if(newNotePage&&isMobileRequest(request))return mobileNewNote(request,env,ctx);

    return worker.fetch(request,env,ctx);
  }
};
