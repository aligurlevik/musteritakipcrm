(function(){
  const path=location.pathname;
  const previousFetch=window.fetch.bind(window);

  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function fallbackTitle(note){
    const first=String(note||'').split(/\r?\n/).map(x=>x.trim()).find(Boolean)||'Başlıksız Not';
    return first.length>70?first.slice(0,67)+'…':first;
  }
  function style(){
    if(document.getElementById('noteTitlePatchStyle'))return;
    const s=document.createElement('style');s.id='noteTitlePatchStyle';
    s.textContent=`
      .noteTitleField{margin:0 0 9px}
      .noteTitleField label{display:block;font-size:12px;font-weight:950;color:#21476b;margin:0 0 4px 2px}
      .noteTitleField input{width:100%;height:44px;border:1px solid #aeb9c5;border-radius:10px;padding:8px 11px;background:#fff;color:#111;font-size:18px;font-weight:900;outline:0}
      .noteTitleField input:focus{border-color:#596b7c;box-shadow:0 0 0 2px #1111}
      .card .noteText{font-size:18px!important;font-weight:950!important;line-height:27px!important;min-height:27px!important;max-height:54px!important;-webkit-line-clamp:2!important;background:none!important}
      .card .body{background-image:none!important;padding-top:3px!important}
      .card .moreHint{display:none!important}
      .editorTitleField{margin:0 0 9px}
      .editorTitleField label{display:block;font-size:12px;font-weight:950;color:#21476b;margin:0 0 4px 2px}
      .editorTitleField input{width:100%;border:2px solid #8db0cf;border-radius:9px;padding:9px 10px;font-size:18px;font-weight:900}
    `;
    document.head.appendChild(s);
  }

  let titleCache=new Map();
  async function fetchRows(){
    const scope=document.getElementById('tab-archive')?.classList.contains('on')?'archive':'all';
    try{
      const r=await previousFetch('/api/notes-v3?scope='+scope,{headers:{'cache-control':'no-cache'}});
      if(!r.ok)return [];
      const rows=await r.json();
      if(Array.isArray(rows))titleCache=new Map(rows.map(x=>[Number(x.id),x]));
      return rows||[];
    }catch(_){return []}
  }

  window.fetch=async function(input,init){
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const method=String((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
      if(/\/api\/notes-v3(?:\?|$)/.test(raw)&&method==='POST'&&init&&typeof init.body==='string'){
        let b={};try{b=JSON.parse(init.body||'{}')}catch(_){}
        const title=document.getElementById('noteTitle')?.value?.trim();
        if(title)b.title=title;
        init=Object.assign({},init,{body:JSON.stringify(b)});
      }
    }catch(_){}
    return previousFetch(input,init);
  };

  function installNew(){
    style();
    const field=document.querySelector('.field');if(!field||document.getElementById('noteTitle'))return;
    const wrap=document.createElement('div');wrap.className='noteTitleField';
    wrap.innerHTML='<label>BAŞLIK</label><input id="noteTitle" maxlength="120" placeholder="Örn: Jet Lazer görüşmesi">';
    field.insertAdjacentElement('beforebegin',wrap);
    const save=document.getElementById('saveBtn');
    if(save){
      save.addEventListener('click',e=>{
        const title=document.getElementById('noteTitle')?.value.trim();
        if(!title){e.preventDefault();e.stopImmediatePropagation();const m=document.getElementById('msg');if(m){m.textContent='Önce başlık yazın.';m.style.display='block';setTimeout(()=>m.style.display='none',1900)}else alert('Önce başlık yazın.');document.getElementById('noteTitle')?.focus()}
      },true);
    }
  }

  let decorating=false;
  async function decorateList(){
    if(decorating)return;decorating=true;
    try{
      await fetchRows();
      document.querySelectorAll('#list .card').forEach(card=>{
        const cb=card.querySelector('input.check');const code=cb?.getAttribute('onchange')||'';const m=code.match(/setDone\((\d+)/);if(!m)return;
        const row=titleCache.get(Number(m[1]));if(!row)return;
        const text=card.querySelector('.noteText');if(text){text.textContent=String(row.title||'').trim()||fallbackTitle(row.note);text.title='Açmak için tıklayın'}
      });
    }finally{decorating=false}
  }

  function installEditor(){
    const sheet=document.querySelector('#editor .sheet');if(!sheet||document.getElementById('editTitle'))return;
    const noteField=document.getElementById('editNote')?.closest('.field');if(!noteField)return;
    const wrap=document.createElement('div');wrap.className='editorTitleField';wrap.innerHTML='<label>BAŞLIK</label><input id="editTitle" maxlength="120">';
    noteField.insertAdjacentElement('beforebegin',wrap);
    const oldOpen=window.openEditor;
    if(typeof oldOpen==='function')window.openEditor=function(id){
      const r=oldOpen(id);setTimeout(()=>{const row=(window.state&&window.state.items||[]).find?.(x=>Number(x.id)===Number(id))||titleCache.get(Number(id));const el=document.getElementById('editTitle');if(el&&row)el.value=String(row.title||'').trim()||fallbackTitle(row.note)},0);return r;
    };
    const oldSave=window.saveEdit;
    if(typeof oldSave==='function')window.saveEdit=async function(){
      const id=window.state?.editing;
      const title=document.getElementById('editTitle')?.value.trim();
      if(!title)return alert('Başlık boş olamaz.');
      if(id){
        try{await previousFetch('/api/notes-v3/'+id,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({title})})}catch(_){}
      }
      return oldSave();
    };
  }

  function installList(){
    style();installEditor();
    const list=document.getElementById('list');if(list)new MutationObserver(()=>setTimeout(decorateList,20)).observe(list,{childList:true,subtree:true});
    setTimeout(decorateList,150);
  }

  function install(){if(path.includes('yeni-not'))installNew();else if(path.includes('notlar-v2'))installList()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
