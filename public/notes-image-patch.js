(function(){
  const path=location.pathname;
  const nativeFetch=window.fetch.bind(window);

  function flashLocal(text){
    const m=document.getElementById('msg');
    if(!m)return alert(text);
    m.textContent=text;m.style.display='block';
    clearTimeout(window.__imgMsgTimer);
    window.__imgMsgTimer=setTimeout(()=>m.style.display='none',1900);
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
          const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height));
          const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
          const c=document.createElement('canvas');c.width=w;c.height=h;
          const ctx=c.getContext('2d');ctx.drawImage(img,0,0,w,h);
          let out=c.toDataURL('image/jpeg',0.78);
          if(out.length>900000)out=c.toDataURL('image/jpeg',0.58);
          if(out.length>900000)return reject(new Error('Resim çok büyük. Daha küçük bir resim seçin.'));
          resolve(out);
        };
        img.src=String(reader.result||'');
      };
      reader.readAsDataURL(file);
    });
  }

  function installViewer(){
    if(document.getElementById('noteImageViewer'))return;
    const wrap=document.createElement('div');
    wrap.id='noteImageViewer';
    wrap.style.cssText='position:fixed;inset:0;z-index:9999;background:#000c;display:none;align-items:center;justify-content:center;padding:18px';
    wrap.innerHTML='<div style="position:relative;max-width:96vw;max-height:92vh"><img id="noteImageViewerImg" style="display:block;max-width:96vw;max-height:88vh;border-radius:12px;background:#fff"><button id="noteImageViewerClose" style="position:absolute;right:8px;top:8px;border:0;border-radius:999px;width:38px;height:38px;background:#111;color:#fff;font-size:22px;font-weight:900">×</button></div>';
    wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.style.display='none'});
    wrap.querySelector('#noteImageViewerClose').onclick=()=>wrap.style.display='none';
    document.body.appendChild(wrap);
  }

  function openViewer(src){
    installViewer();
    document.getElementById('noteImageViewerImg').src=src;
    document.getElementById('noteImageViewer').style.display='flex';
  }

  if(path.includes('yeni-not')){
    let imageData='';
    const tools=document.querySelector('.tools');
    if(tools){
      const box=document.createElement('div');
      box.style.cssText='margin-top:8px';
      box.innerHTML='<input id="noteImageInput" type="file" accept="image/*" style="display:none"><button id="noteImageBtn" type="button" class="tool" style="width:100%">📷 Resim Ekle</button><div id="noteImagePreview" style="display:none;margin-top:7px;position:relative"><img style="display:block;width:100%;max-height:220px;object-fit:contain;border:1px solid #ccd5dd;border-radius:10px;background:#f8fafc"><button id="noteImageRemove" type="button" style="position:absolute;right:8px;top:8px;border:0;border-radius:8px;background:#111;color:#fff;padding:7px 9px;font-weight:900">Resmi Kaldır</button></div>';
      tools.insertAdjacentElement('afterend',box);
      const input=box.querySelector('#noteImageInput'),btn=box.querySelector('#noteImageBtn'),preview=box.querySelector('#noteImagePreview'),img=preview.querySelector('img');
      btn.onclick=()=>input.click();
      input.onchange=async()=>{
        const f=input.files&&input.files[0];if(!f)return;
        btn.disabled=true;btn.textContent='Resim hazırlanıyor...';
        try{imageData=await compressImage(f);img.src=imageData;preview.style.display='block';btn.textContent='📷 Resmi Değiştir'}
        catch(e){imageData='';input.value='';flashLocal(e.message||'Resim eklenemedi.');btn.textContent='📷 Resim Ekle'}
        finally{btn.disabled=false}
      };
      box.querySelector('#noteImageRemove').onclick=()=>{imageData='';input.value='';img.src='';preview.style.display='none';btn.textContent='📷 Resim Ekle'};
      img.onclick=()=>imageData&&openViewer(imageData);
    }

    window.fetch=async function(input,init){
      try{
        const url=typeof input==='string'?input:(input&&input.url)||'';
        const method=String((init&&init.method)||'GET').toUpperCase();
        if(imageData&&method==='POST'&&/\/api\/notes-v3(?:\?|$)/.test(url)){
          const next=Object.assign({},init||{});
          let b={};try{b=JSON.parse(next.body||'{}')}catch(_){}
          b.image_data=imageData;next.body=JSON.stringify(b);
          return nativeFetch(input,next);
        }
      }catch(_){}
      return nativeFetch(input,init);
    };
  }

  if(path.includes('notlar-v2')){
    installViewer();
    let busy=false,lastScope='';
    async function decorate(){
      if(busy)return;busy=true;
      try{
        const scope=document.getElementById('tab-archive')?.classList.contains('on')?'archive':'all';
        lastScope=scope;
        const r=await nativeFetch('/api/notes-v3?scope='+scope,{headers:{'cache-control':'no-cache'}});
        if(!r.ok)return;
        const rows=await r.json(),map=new Map(rows.map(x=>[Number(x.id),x]));
        document.querySelectorAll('#list .card').forEach(card=>{
          const cb=card.querySelector('input.check');
          const code=cb?.getAttribute('onchange')||'';
          const m=code.match(/setDone\((\d+)/);if(!m)return;
          const x=map.get(Number(m[1]));
          const old=card.querySelector('.noteImageThumb');
          if(!x||!x.image_data){if(old)old.remove();return}
          if(old)return;
          const body=card.querySelector('.body');if(!body)return;
          const img=document.createElement('img');
          img.className='noteImageThumb';img.src=x.image_data;img.alt='Not resmi';
          img.style.cssText='display:block;width:78px;height:58px;object-fit:cover;border-radius:8px;border:1px solid #8ca6bb;margin:5px 0 2px;cursor:pointer;background:#fff';
          img.onclick=e=>{e.stopPropagation();openViewer(x.image_data)};
          body.appendChild(img);
        });
      }catch(_){}finally{busy=false}
    }
    const list=document.getElementById('list');
    if(list)new MutationObserver(()=>setTimeout(decorate,30)).observe(list,{childList:true,subtree:true});
    document.addEventListener('click',e=>{if(e.target&&e.target.classList?.contains('tab'))setTimeout(decorate,80)});
    setTimeout(decorate,250);
  }
})();
