(function(){
  const clamp=n=>Math.max(1,Math.min(3,Number(n)||1));
  const params=new URLSearchParams(location.search);
  let page=clamp(params.get('page')||localStorage.getItem('crm_notes_page')||1);
  localStorage.setItem('crm_notes_page',String(page));

  const originalFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const method=String((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
      if(raw&&raw.includes('/api/notes-v3')){
        const u=new URL(raw,location.origin);
        if(u.pathname==='/api/notes-v3'&&method==='GET'){
          u.searchParams.set('notebook',String(page));
          input=typeof input==='string'?(u.pathname+u.search):new Request(u.toString(),input);
        }else if(u.pathname==='/api/notes-v3'&&method==='POST'&&init&&typeof init.body==='string'){
          let b={};try{b=JSON.parse(init.body||'{}')}catch(_){}
          b.notebook_no=page;
          init=Object.assign({},init,{body:JSON.stringify(b)});
        }
      }
    }catch(_){}
    return originalFetch(input,init);
  };

  function style(){
    if(document.getElementById('notesPagesStyle'))return;
    const s=document.createElement('style');s.id='notesPagesStyle';
    s.textContent='.notePagesBar{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:7px 9px;background:#f7fbff;border-bottom:1px solid #c7d5e2}.notePageBtn{border:1px solid #aabfd2;border-radius:8px;background:#edf5fc;color:#21476b;padding:8px 4px;font-size:12px;font-weight:950}.notePageBtn.on{background:#111;color:#fff;border-color:#111}.plannerPageBtn{background:#fff2ad!important;color:#5d4900!important;border-color:#e5bd19!important}.notePageLabel{font-size:12px;font-weight:900;color:#526b80;text-align:center;padding:5px 0 0}.newPageBox{padding:7px 12px;background:#fff;border-bottom:1px solid #dde4ea}.newPageBox .notePagesBar{grid-template-columns:repeat(3,1fr);padding:0;border:0;background:#fff}@media(max-width:430px){.notePageBtn{font-size:11px;padding:8px 2px}.notePagesBar{gap:4px;padding:6px}}';
    document.head.appendChild(s);
  }
  function buttons(onChange,withPlanner){
    const bar=document.createElement('div');bar.className='notePagesBar';
    for(let i=1;i<=3;i++){
      const b=document.createElement('button');b.type='button';b.className='notePageBtn'+(i===page?' on':'');b.textContent='Not '+i;
      b.onclick=()=>onChange(i);
      bar.appendChild(b);
    }
    if(withPlanner){
      const p=document.createElement('button');p.type='button';p.className='notePageBtn plannerPageBtn';p.textContent='📅 Planlama';p.onclick=()=>{location.href='/planlama.html'};bar.appendChild(p);
    }
    return bar;
  }
  function setPage(n,reload){
    page=clamp(n);localStorage.setItem('crm_notes_page',String(page));
    if(reload){const u=new URL(location.href);u.searchParams.set('page',String(page));location.href=u.pathname+u.search;}
    else document.querySelectorAll('.notePageBtn:not(.plannerPageBtn)').forEach((b,i)=>b.classList.toggle('on',i+1===page));
  }
  function install(){
    style();
    const isNew=location.pathname.includes('yeni-not');
    const isNotes=location.pathname.includes('notlar-v2')||location.pathname==='/'||location.pathname==='/index.html'||location.pathname.includes('mobil-ajanda');
    if(isNew){
      const header=document.querySelector('.top');if(!header||document.querySelector('.newPageBox'))return;
      const box=document.createElement('div');box.className='newPageBox';
      const label=document.createElement('div');label.className='notePageLabel';label.textContent='Bu not hangi sayfaya kaydedilsin?';
      box.appendChild(label);box.appendChild(buttons(n=>setPage(n,false),false));
      header.insertAdjacentElement('afterend',box);
    }else if(isNotes){
      const tabs=document.querySelector('.tabs');if(!tabs||document.querySelector('.notePagesBar'))return;
      tabs.insertAdjacentElement('afterend',buttons(n=>setPage(n,true),true));
      const newBtn=document.querySelector('.newbtn');
      if(newBtn)newBtn.onclick=()=>{location.href='/yeni-not.html?page='+page};
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();

(function(){
  function compactDoneLabels(){
    document.querySelectorAll('#list .card.done *').forEach(el=>{
      if(el.children.length===0&&String(el.textContent||'').trim().replace(/\s+/g,' ')==='✓ Tamamlandı')el.classList.add('compactDoneLabel');
    });
  }
  function installCompactDesktopNotes(){
    if(document.getElementById('compactDesktopNotesStyle'))return;
    const s=document.createElement('style');
    s.id='compactDesktopNotesStyle';
    s.textContent=`
      @media (min-width:700px){
        #list.list{gap:2px!important;padding:2px 8px 60px!important}
        #list .noteDayHeading{margin:3px 0 1px!important;padding:3px 7px!important;font-size:12px!important;line-height:1.1!important}
        #list .card{min-height:0!important;height:auto!important;padding:1px 5px!important;border-radius:7px!important;box-shadow:none!important}
        #list .card .row{min-height:30px!important;grid-template-columns:20px minmax(0,1fr) 28px!important;gap:4px!important;align-items:center!important}
        #list .card .check{width:15px!important;height:15px!important;margin:0!important}
        #list .card .body{min-height:0!important;padding:0 2px!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:5px!important;align-items:center!important}
        #list .card .noteText{font-size:13px!important;line-height:18px!important;min-height:18px!important;max-height:18px!important;-webkit-line-clamp:1!important;white-space:nowrap!important;text-overflow:ellipsis!important}
        #list .card .meta{margin:0!important;gap:2px!important;flex-wrap:nowrap!important;justify-content:flex-end!important;white-space:nowrap!important}
        #list .card .alarm,#list .card .voice,#list .card .badge,#list .card .archiveDate{font-size:9px!important;line-height:14px!important;padding:1px 4px!important;border-radius:5px!important;white-space:nowrap!important}
        #list .card .menu summary{width:26px!important;height:23px!important;font-size:17px!important;border-radius:6px!important}
        #list .card .importantMark{top:2px!important;right:34px!important;width:16px!important;height:16px!important;font-size:15px!important}
        #list .card .compactDoneLabel{min-height:15px!important;height:15px!important;padding:0 4px!important;margin:0!important;line-height:15px!important;font-size:9px!important;border-radius:4px!important}
      }
    `;
    document.head.appendChild(s);
    compactDoneLabels();
    const list=document.getElementById('list');
    if(list)new MutationObserver(compactDoneLabels).observe(list,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installCompactDesktopNotes,{once:true});else installCompactDesktopNotes();
})();
