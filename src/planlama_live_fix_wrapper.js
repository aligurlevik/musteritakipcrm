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
  return `<details id="topQuickMenu"><summary aria-label="Menü">⋮</summary><div id="topQuickMenuBox"><a class="mNotes" href="/notlar-v2.html">📝 Notlar</a><a class="mPlanner" href="/planlama.html?v=20260904-5">📅 Planlama</a><button class="mLogout" onclick="window.topMenuLogout()">🚪 Çıkış</button></div></details>`;
}
async function servePlanner(request,env){
  const r=await fetchPlannerAsset(request,env);
  const h=new Headers(r.headers);
  h.set('cache-control','no-cache, no-store, must-revalidate');
  if(!r.ok)return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h});
  let html=await r.text();

  // Takvim hücrelerine tarih/saat bilgisi ekle; boş hücreye dokununca hızlı not açılabilsin.
  html=html.replace("html+='<div class=\"allcell\">'+arr.map", "html+='<div class=\"allcell\" data-date=\"'+key+'\">'+arr.map");
  html=html.replace("html+='<div class=\"slot half\">';", "html+='<div class=\"slot half\" data-date=\"'+key+'\" data-hour=\"'+h+'\">';");

  const css=`<style id="planlamaLiveMenuCss">
  #topQuickMenu{position:relative;display:inline-block;z-index:500}
  #topQuickMenu>summary{list-style:none;width:42px;height:38px;display:grid;place-items:center;border:0;border-radius:10px;background:#111;color:#fff;font-size:25px;font-weight:950;cursor:pointer;line-height:1}
  #topQuickMenu>summary::-webkit-details-marker{display:none}
  #topQuickMenuBox{position:absolute;right:0;top:44px;width:190px;background:#fff;border:2px solid #9eb8d0;border-radius:12px;padding:6px;box-shadow:0 12px 30px #0004;z-index:9999}
  #topQuickMenuBox a,#topQuickMenuBox button{display:block;width:100%;border:0;border-radius:9px;padding:11px 10px;margin:2px 0;text-align:left;text-decoration:none;font:inherit;font-weight:950;cursor:pointer}
  #topQuickMenuBox .mNotes{background:#e8f3ff;color:#14578f}
  #topQuickMenuBox .mPlanner{background:#fff3b8;color:#6c5300}
  #topQuickMenuBox .mLogout{background:#ffe1dd;color:#a3261c}
  #plannerAlarmHelp{margin-top:4px;font-size:11px;font-weight:850;color:#8a5200;background:#fff3c8;border-radius:7px;padding:5px 7px}
  .slot,.allcell,.day{cursor:pointer}
  @media(max-width:650px){
    .top{padding:5px 7px!important}
    .title{font-size:17px!important}
    .actions{gap:4px!important}
    .actions .addBtn{padding:6px 7px!important;font-size:10.5px!important;border-radius:7px!important}
    #topQuickMenu>summary{width:32px;height:30px;font-size:20px;border-radius:7px}
    #topQuickMenuBox{top:35px;width:168px;padding:5px}
    #topQuickMenuBox a,#topQuickMenuBox button{padding:9px 8px;font-size:12px}
    .nav{padding:6px 7px!important;gap:5px!important}
    .nav button{padding:5px 7px!important;font-size:10.5px!important}
    .range{font-size:12px!important}
    .legend{padding:5px 7px!important;gap:4px!important}
    .chip{padding:3px 6px!important;font-size:9.5px!important}
    .legend button{padding:4px 7px!important;font-size:10px!important}
    .calendar{min-width:760px!important}
    .day{padding:5px 2px!important;font-size:11px!important}
    .day small{font-size:9.5px!important;margin-top:1px!important}
    .allrow{min-height:48px!important}
    .alllabel{font-size:9px!important;padding:5px 3px!important}
    .allcell{padding:2px!important;gap:2px!important}
    .allitem{font-size:9.5px!important;padding:3px 4px!important}
    .hourlabel{font-size:9px!important;padding:3px 4px!important}
    .event{font-size:9.5px!important;padding:3px 4px!important;min-height:25px!important}
    .time{font-size:8.5px!important;margin-bottom:1px!important}
    .wrap{max-height:calc(100vh - 118px)!important}
    #plannerAlarmHelp{font-size:10px;padding:4px 6px}
  }
  </style>`;
  const menu=menuMarkup();
  const script=`<script id="planlamaLiveMenuScript">
  window.topMenuLogout=async function(){try{await fetch('/api/logout',{method:'GET',credentials:'same-origin',cache:'no-store'})}catch(_){}location.replace('/notlar-v2.html?logout=1&t='+Date.now())};
  document.addEventListener('click',function(e){
    const menu=document.getElementById('topQuickMenu');
    if(menu&&menu.open&&!menu.contains(e.target))menu.open=false;

    if(e.target.closest('.event,.allitem,.modal,#topQuickMenu,.nav,.legend,.actions'))return;
    let cell=e.target.closest('.slot,.allcell');
    if(!cell){
      const day=e.target.closest('.day');
      if(day){
        const days=[...document.querySelectorAll('.day')];
        const i=days.indexOf(day);
        if(i>=0)cell=document.querySelectorAll('.allcell')[i]||null;
      }
    }
    if(!cell||!cell.dataset.date||typeof window.openNew!=='function')return;
    window.openNew();
    setTimeout(function(){
      const type=document.getElementById('type'),date=document.getElementById('date'),time=document.getElementById('time'),title=document.getElementById('modalTitle');
      if(type)type.value='Genel Not';
      if(date)date.value=cell.dataset.date;
      if(time)time.value=cell.dataset.hour?String(cell.dataset.hour).padStart(2,'0')+':00':'';
      if(title)title.textContent='Yeni Not / Hatırlatma';
    },0);
  });
  function labelAlarmField(){
    const time=document.getElementById('time');
    if(!time)return;
    const field=time.closest('.field');
    const label=field&&field.querySelector('label');
    if(label)label.textContent='ALARM SAATİ (isteğe bağlı)';
    if(field&&!document.getElementById('plannerAlarmHelp')){
      const help=document.createElement('div');help.id='plannerAlarmHelp';help.textContent='🔔 Saat seçersen alarm o saatte çalar.';field.appendChild(help);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',labelAlarmField,{once:true});else labelAlarmField();
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
  html=html.replaceAll('href="/planlama.html"','href="/planlama.html?v=20260904-5"');
  html=html.replaceAll('href="/planlama.html?v=20260904-3"','href="/planlama.html?v=20260904-5"');
  html=html.replaceAll('href="/planlama.html?v=20260904-4"','href="/planlama.html?v=20260904-5"');
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
