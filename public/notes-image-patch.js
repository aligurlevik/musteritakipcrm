(function(){
  const nativeFetch=window.fetch.bind(window);
  const rowsById=new Map();
  let newImage='',editImage,editId=0,editEpoch=0,editReady=true;
  let newControls=null,editControls=null,viewerFocus=null;

  function flashLocal(text){
    const m=document.getElementById('msg');
    if(!m)return alert(text);
    m.textContent=text;m.style.display='block';
    clearTimeout(window.__imgMsgTimer);
    window.__imgMsgTimer=setTimeout(()=>m.style.display='none',2500);
  }

  function compressImage(file){
    return new Promise((resolve,reject)=>{
      if(!file||!file.type.startsWith('image/'))return reject(new Error('Resim seçin.'));
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('Resim okunamadı.'));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error('Resim açılamadı.'));
        img.onload=()=>{
          try{
            const scale=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));
            const canvas=document.createElement('canvas');
            canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
            canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
            const ctx=canvas.getContext('2d');
            if(!ctx)throw new Error('Resim hazırlanamadı.');
            ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.drawImage(img,0,0,canvas.width,canvas.height);
            let out=canvas.toDataURL('image/jpeg',0.78);
            if(out.length>900000)out=canvas.toDataURL('image/jpeg',0.58);
            if(out.length>900000)throw new Error('Resim çok büyük. Daha küçük bir resim seçin.');
            resolve(out);
          }catch(e){reject(e)}
        };
        img.src=String(reader.result||'');
      };
      reader.readAsDataURL(file);
    });
  }

  function closeViewer(){
    const viewer=document.getElementById('noteImageViewer');
    if(!viewer)return;
    viewer.hidden=true;
    viewer.querySelector('img').removeAttribute('src');
    if(viewerFocus?.isConnected)viewerFocus.focus();
  }
  function openViewer(src){
    const viewer=document.getElementById('noteImageViewer');
    if(!viewer||!src)return;
    viewerFocus=document.activeElement;
    viewer.querySelector('img').src=src;
    viewer.hidden=false;
    viewer.querySelector('button').focus();
  }
  function installStyleAndViewer(){
    const style=document.createElement('style');style.id='noteImagesStyle';
    style.textContent=`
      .noteImageControls{margin:10px 0}
      .noteImageControls>button{width:100%;min-height:44px;border:2px solid #8db0cf;border-radius:10px;background:#eaf4ff;color:#174d7c;padding:10px;font-weight:950;cursor:pointer}
      .noteImageControls>button:disabled{opacity:.65}
      .noteImagePreview{margin-top:8px}
      .noteImagePreview[hidden]{display:none}
      .noteImagePreview img{display:block;width:100%;max-height:260px;object-fit:contain;border:1px solid #ccd5dd;border-radius:10px;background:#f8fafc;cursor:zoom-in}
      .noteImagePreview button{display:block;margin:7px 0 0 auto;min-height:44px;border:0;border-radius:9px;background:#ffe4e1;color:#9b1c1c;padding:9px 12px;font-weight:900;cursor:pointer}
      .noteImageView{min-height:32px;border:1px solid #8db0cf;border-radius:8px;background:#dceeff;color:#174d7c;padding:5px 8px;font-size:12px;font-weight:950;cursor:pointer}
      .menuBox .mImage{background:#dceeff;color:#174d7c}
      #noteImageViewer{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px;background:#000d}
      #noteImageViewer[hidden]{display:none}
      #noteImageViewer img{display:block;max-width:94vw;max-height:86vh;object-fit:contain;border-radius:12px;background:#fff}
      #noteImageViewerClose{position:absolute;right:12px;top:12px;min-width:44px;min-height:44px;border:2px solid #fff;border-radius:50%;background:#111;color:#fff;font-size:26px;cursor:pointer}
    `;
    document.head.appendChild(style);
    const viewer=document.createElement('div');viewer.id='noteImageViewer';viewer.hidden=true;
    viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');viewer.setAttribute('aria-label','Not resmi');
    viewer.innerHTML='<img id="noteImageViewerImg" alt="Not resmi"><button id="noteImageViewerClose" type="button" aria-label="Resmi kapat">×</button>';
    viewer.onclick=e=>{if(e.target===viewer)closeViewer()};
    viewer.querySelector('button').onclick=closeViewer;
    viewer.onkeydown=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeViewer()}
      if(e.key==='Tab'){e.preventDefault();viewer.querySelector('button').focus()}
    };
    document.body.appendChild(viewer);
  }

  function imageControls(prefix,onChange,context){
    const box=document.createElement('div');box.className='noteImageControls';
    box.innerHTML='<input id="'+prefix+'ImageInput" type="file" accept="image/*" hidden><button id="'+prefix+'ImageBtn" type="button">📷 Resim Ekle</button><div id="'+prefix+'ImagePreview" class="noteImagePreview" hidden><img alt="Not resmi" role="button" tabindex="0" aria-label="Resmi büyüt"><button id="'+prefix+'ImageRemove" type="button">Resmi Kaldır</button></div>';
    const input=box.querySelector('input'),button=box.querySelector('button'),preview=box.querySelector('.noteImagePreview'),img=preview.querySelector('img');
    const controls={box,input,preparing:false};
    let selection=0;
    controls.show=function(data){
      if(data)img.src=data;else img.removeAttribute('src');
      preview.hidden=!data;
      button.textContent=data?'📷 Resmi Değiştir':'📷 Resim Ekle';
    };
    controls.reset=function(){selection++;controls.preparing=false;button.disabled=false;input.value='';controls.show('')};
    button.onclick=()=>input.click();
    input.onchange=async()=>{
      const file=input.files?.[0];if(!file)return;
      const current=++selection,epoch=context();
      controls.preparing=true;button.disabled=true;button.textContent='Resim hazırlanıyor...';
      try{
        const data=await compressImage(file);
        if(current!==selection||epoch!==context())return;
        onChange(data);controls.show(data);
      }catch(e){
        if(current===selection&&epoch===context()){
          flashLocal(e.message||'Resim eklenemedi.');
          button.textContent=preview.hidden?'📷 Resim Ekle':'📷 Resmi Değiştir';
        }
      }finally{
        if(current===selection&&epoch===context()){controls.preparing=false;button.disabled=false;input.value=''}
      }
    };
    preview.querySelector('button').onclick=()=>{controls.reset();onChange('')};
    img.onclick=()=>openViewer(img.getAttribute('src'));
    img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openViewer(img.getAttribute('src'))}};
    return controls;
  }

  window.fetch=async function(input,init){
    const raw=typeof input==='string'?input:(input?.url||'');
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    const url=new URL(raw,location.href);
    if(url.origin===location.origin&&init&&typeof init.body==='string'){
      if(url.pathname==='/api/notes-v3'&&method==='POST'&&newImage){
        const data=JSON.parse(init.body);data.image_data=newImage;
        init=Object.assign({},init,{body:JSON.stringify(data)});
      }
      const item=url.pathname.match(/^\/api\/notes-v3\/(\d+)$/);
      if(item&&method==='PUT'&&Number(item[1])===editId&&editImage!==undefined){
        const data=JSON.parse(init.body);
        if(data.note!==undefined){data.image_data=editImage;init=Object.assign({},init,{body:JSON.stringify(data)})}
      }
    }
    return nativeFetch(input,init);
  };

  function installNew(){
    const tools=document.querySelector('.tools');if(!tools)return;
    newControls=imageControls('note',data=>{newImage=data},()=>0);
    tools.after(newControls.box);
    const originalSave=window.saveNote;
    if(typeof originalSave==='function')window.saveNote=function(){
      if(newControls.preparing)return flashLocal('Resim hazırlanıyor, lütfen bekleyin.');
      const note=document.getElementById('note');
      if(newImage&&note&&!note.value.trim())note.value='📷 Resimli not';
      return originalSave.apply(this,arguments);
    };
    document.getElementById('saveBtn')?.addEventListener('click',e=>{
      if(newControls.preparing){e.preventDefault();e.stopImmediatePropagation();flashLocal('Resim hazırlanıyor, lütfen bekleyin.')}
    },true);
  }

  function scope(){return document.getElementById('tab-archive')?.classList.contains('on')?'archive':'all'}
  async function fetchRows(){
    const selectedScope=scope();
    const r=await nativeFetch('/api/notes-v3?scope='+selectedScope,{cache:'no-store'});
    if(!r.ok)throw new Error('Resimler yüklenemedi. Sayfayı yenileyin.');
    const rows=await r.json();
    if(!Array.isArray(rows))throw new Error('Notlar okunamadı.');
    if(scope()!==selectedScope)return;
    rowsById.clear();rows.forEach(row=>rowsById.set(Number(row.id),row));
  }
  function cardId(card){
    const code=card.querySelector('input.check')?.getAttribute('onchange')||'';
    const match=code.match(/setDone\((\d+)/);
    return match?Number(match[1]):0;
  }
  function decorateCards(){
    document.querySelectorAll('#list .card').forEach(card=>{
      const id=cardId(card);if(!id)return;
      const row=rowsById.get(id),menu=card.querySelector('.menuBox');
      if(menu&&!menu.querySelector('.mImage')){
        const button=document.createElement('button');button.type='button';button.className='mImage';
        button.textContent='📷 Resim Ekle';
        button.onclick=e=>{
          e.stopPropagation();card.querySelector('details')?.removeAttribute('open');
          window.openEditor(id);
          if(editId===id&&document.getElementById('editor')?.classList.contains('show'))editControls.input.click();
        };
        const edit=menu.querySelector('.mEdit');if(edit)edit.after(button);else menu.prepend(button);
      }
      const menuButton=menu?.querySelector('.mImage');
      if(menuButton&&row)menuButton.textContent=row.image_data?'📷 Resmi Değiştir':'📷 Resim Ekle';
      const existing=card.querySelector('.noteImageView');
      if(!row?.image_data){existing?.remove();return}
      let button=existing;
      if(!button){
        const body=card.querySelector('.body');if(!body)return;
        let meta=body.querySelector('.meta');
        if(!meta){meta=document.createElement('div');meta.className='meta';body.appendChild(meta)}
        button=document.createElement('button');button.type='button';button.className='noteImageView';button.textContent='📷 Resmi Gör';
        meta.appendChild(button);
      }
      button.onclick=e=>{e.stopPropagation();openViewer(row.image_data)};
    });
  }

  function installEditor(){
    const editor=document.getElementById('editor'),field=document.getElementById('editNote')?.closest('.field');
    if(!editor||!field)return;
    editControls=imageControls('edit',data=>{editImage=data;editReady=true},()=>editEpoch);
    field.after(editControls.box);
    const originalOpen=window.openEditor;
    window.openEditor=function(id){
      const result=originalOpen.apply(this,arguments);
      if(!editor.classList.contains('show'))return result;
      const epoch=++editEpoch;editId=Number(id);editImage=undefined;editReady=false;editControls.reset();
      const showRow=()=>{
        if(epoch!==editEpoch||editId!==Number(id))return;
        const row=rowsById.get(Number(id));
        if(editImage===undefined)editControls.show(row?.image_data||'');
        editReady=true;
      };
      if(rowsById.has(Number(id)))showRow();
      else fetchRows().then(showRow).catch(e=>{if(epoch===editEpoch){editReady=true;flashLocal(e.message)}});
      return result;
    };
    const originalClose=window.closeEditor;
    window.closeEditor=function(){editEpoch++;editId=0;editImage=undefined;editReady=true;editControls.reset();return originalClose.apply(this,arguments)};
    const originalSave=window.saveEdit;
    window.saveEdit=function(){
      if(!editReady||editControls.preparing)return flashLocal('Resim hazırlanıyor, lütfen bekleyin.');
      return originalSave.apply(this,arguments);
    };
    editor.querySelector('.save')?.addEventListener('click',e=>{
      if(!editReady||editControls.preparing){e.preventDefault();e.stopImmediatePropagation();flashLocal('Resim hazırlanıyor, lütfen bekleyin.')}
    },true);
  }

  function installList(){
    installEditor();
    const list=document.getElementById('list');
    let timer,busy=false,again=false;
    async function refresh(){
      decorateCards();
      if(busy){again=true;return}busy=true;
      try{await fetchRows();decorateCards()}catch(_){}
      finally{busy=false;if(again){again=false;schedule()}}
    }
    function schedule(){clearTimeout(timer);timer=setTimeout(refresh,40)}
    if(list)new MutationObserver(schedule).observe(list,{childList:true});
    schedule();
  }

  function install(){
    if(document.getElementById('noteImagesStyle'))return;
    installStyleAndViewer();
    if(document.getElementById('note'))installNew();
    if(document.getElementById('list')&&document.getElementById('editNote'))installList();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
