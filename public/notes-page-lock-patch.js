(function(){
  const clamp=n=>Math.max(1,Math.min(3,Number(n)||1));
  const qs=new URLSearchParams(location.search);
  const currentPage=clamp(qs.get('page')||localStorage.getItem('crm_notes_page')||1);
  let modal=null,resolveModal=null;

  async function api(path,opts){
    const r=await fetch(path,Object.assign({headers:{'content-type':'application/json'}},opts||{}));
    let d={};try{d=await r.json()}catch(_){}
    if(!r.ok)throw new Error(d.error||'İşlem başarısız');
    return d;
  }
  function style(){
    if(document.getElementById('pageLockStyle'))return;
    const s=document.createElement('style');s.id='pageLockStyle';s.textContent=`
      .notePageBtn[data-lock-page="2"],.notePageBtn[data-lock-page="3"]{position:relative}
      .pageLockOverlay{position:fixed;inset:0;z-index:99999;background:#07192bcc;display:flex;align-items:center;justify-content:center;padding:18px}
      .pageLockCard{width:min(390px,100%);background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 18px 50px #0005}
      .pageLockHead{background:#ffd338;padding:15px 16px;font-size:21px;font-weight:950;color:#111}
      .pageLockBody{padding:15px}
      .pageLockInfo{font-size:13px;font-weight:800;color:#52606d;margin-bottom:10px}
      .pageLockBody input{width:100%;height:44px;border:2px solid #a8b8c7;border-radius:10px;padding:8px 11px;margin:5px 0;font-size:18px;font-weight:850}
      .pageLockErr{min-height:18px;color:#b42318;font-size:12px;font-weight:900;margin-top:5px}
      .pageLockActions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
      .pageLockActions button{border:0;border-radius:10px;padding:11px 8px;font-weight:950}
      .pageLockOk{background:#111;color:#fff}.pageLockCancel{background:#e8eef4;color:#234}
    `;document.head.appendChild(s);
  }
  function closeModal(result){if(modal){modal.remove();modal=null}if(resolveModal){resolveModal(result);resolveModal=null}}
  function showModal(n,configured){
    style();
    return new Promise(resolve=>{
      resolveModal=resolve;
      modal=document.createElement('div');modal.className='pageLockOverlay';
      modal.innerHTML='<div class="pageLockCard"><div class="pageLockHead">🔒 Sayfa '+n+'</div><div class="pageLockBody"><div class="pageLockInfo">'+(configured?'Bu sayfa için ikinci şifreyi girin.':'Bu sayfa için ikinci şifre oluşturun.')+'</div><input id="plPass1" type="password" inputmode="text" autocomplete="off" placeholder="'+(configured?'İkinci şifre':'Yeni şifre')+'">'+(configured?'':'<input id="plPass2" type="password" inputmode="text" autocomplete="off" placeholder="Şifreyi tekrar yazın">')+'<div id="plErr" class="pageLockErr"></div><div class="pageLockActions"><button class="pageLockCancel" type="button">Vazgeç</button><button class="pageLockOk" type="button">'+(configured?'Giriş Yap':'Şifreyi Oluştur')+'</button></div></div></div>';
      document.body.appendChild(modal);
      const p1=modal.querySelector('#plPass1'),p2=modal.querySelector('#plPass2'),err=modal.querySelector('#plErr'),ok=modal.querySelector('.pageLockOk');
      modal.querySelector('.pageLockCancel').onclick=()=>closeModal(false);
      async function submit(){
        err.textContent='';const pass=p1.value;
        if(pass.length<4){err.textContent='Şifre en az 4 karakter olmalı.';return}
        if(!configured&&p2.value!==pass){err.textContent='İki şifre aynı değil.';return}
        ok.disabled=true;ok.textContent='Kontrol ediliyor...';
        try{
          if(configured)await api('/api/notes-v3/page-lock/verify',{method:'POST',body:JSON.stringify({notebook:n,password:pass})});
          else await api('/api/notes-v3/page-lock/set',{method:'POST',body:JSON.stringify({notebook:n,password:pass})});
          closeModal(true);
        }catch(e){err.textContent=e.message||'Şifre kabul edilmedi.';ok.disabled=false;ok.textContent=configured?'Giriş Yap':'Şifreyi Oluştur'}
      }
      ok.onclick=submit;p1.onkeydown=e=>{if(e.key==='Enter')submit()};if(p2)p2.onkeydown=e=>{if(e.key==='Enter')submit()};setTimeout(()=>p1.focus(),60);
    });
  }
  async function ensurePage(n){
    n=clamp(n);if(n===1)return true;
    try{
      const s=await api('/api/notes-v3/page-lock/status?notebook='+n);
      if(s.unlocked)return true;
      return await showModal(n,!!s.configured);
    }catch(e){alert(e.message||'Sayfa şifresi kontrol edilemedi.');return false}
  }
  function decorateButtons(){
    document.querySelectorAll('.notePageBtn').forEach((b,i)=>{
      const n=i%3+1;if(n===1)return;
      b.dataset.lockPage=String(n);
      if(!b.textContent.includes('🔒'))b.textContent='🔒 Sayfa '+n;
      if(b.dataset.lockGuarded==='1')return;
      b.dataset.lockGuarded='1';const original=b.onclick;
      b.onclick=async function(ev){
        ev?.preventDefault?.();
        const ok=await ensurePage(n);if(ok&&typeof original==='function')return original.call(this,ev);
      };
    });
  }
  async function initialCheck(){
    decorateButtons();
    if(currentPage>1){const ok=await ensurePage(currentPage);if(!ok){localStorage.setItem('crm_notes_page','1');location.href=location.pathname+'?page=1'}}
  }
  function install(){style();decorateButtons();setTimeout(decorateButtons,120);initialCheck()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
