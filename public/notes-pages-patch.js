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
    s.textContent='.notePagesBar{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:7px 9px;background:#f7fbff;border-bottom:1px solid #c7d5e2}.notePageBtn{border:1px solid #aabfd2;border-radius:8px;background:#edf5fc;color:#21476b;padding:8px 5px;font-weight:950}.notePageBtn.on{background:#111;color:#fff;border-color:#111}.notePageLabel{font-size:12px;font-weight:900;color:#526b80;text-align:center;padding:5px 0 0}.newPageBox{padding:7px 12px;background:#fff;border-bottom:1px solid #dde4ea}.newPageBox .notePagesBar{padding:0;border:0;background:#fff}';
    document.head.appendChild(s);
  }
  function buttons(onChange){
    const bar=document.createElement('div');bar.className='notePagesBar';
    for(let i=1;i<=3;i++){
      const b=document.createElement('button');b.type='button';b.className='notePageBtn'+(i===page?' on':'');b.textContent='Sayfa '+i;
      b.onclick=()=>onChange(i);
      bar.appendChild(b);
    }
    return bar;
  }
  function setPage(n,reload){
    page=clamp(n);localStorage.setItem('crm_notes_page',String(page));
    if(reload){const u=new URL(location.href);u.searchParams.set('page',String(page));location.href=u.pathname+u.search;}
    else document.querySelectorAll('.notePageBtn').forEach((b,i)=>b.classList.toggle('on',i+1===page));
  }
  function install(){
    style();
    const isNew=location.pathname.includes('yeni-not');
    if(isNew){
      const header=document.querySelector('.top');if(!header)return;
      const box=document.createElement('div');box.className='newPageBox';
      const label=document.createElement('div');label.className='notePageLabel';label.textContent='Bu not hangi sayfaya kaydedilsin?';
      box.appendChild(label);box.appendChild(buttons(n=>setPage(n,false)));
      header.insertAdjacentElement('afterend',box);
    }else if(location.pathname.includes('notlar-v2')){
      const tabs=document.querySelector('.tabs');if(!tabs)return;
      tabs.insertAdjacentElement('afterend',buttons(n=>setPage(n,true)));
      const newBtn=document.querySelector('.newbtn');
      if(newBtn)newBtn.onclick=()=>{location.href='/yeni-not.html?page='+page};
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
