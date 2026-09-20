(function(){
  'use strict';
  if(window.crmPrivateNotes)return;
  const baseFetch=window.fetch.bind(window),params=new URLSearchParams(location.search);
  const isNotes=document.currentScript?.dataset.privateNotes==='true';
  const isNew=location.pathname.includes('yeni-not');
  const clamp=n=>Math.max(1,Math.min(3,Math.trunc(Number(n))||1));
  let currentPage=clamp(params.get('page')||localStorage.getItem('crm_notes_page')||1);
  let authorized=new Set(),pending=null,modal=null,epoch=0,privateSeen=false,needsResume=false;
  let locking=Promise.resolve();
  const ready=document.readyState==='loading'?new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true})):Promise.resolve();
  const css=document.createElement('style');css.id='pageLockStyle';css.textContent=`
    html.privateNotebookLocked body>:not(.pageLockOverlay):not(.pagePrivacyShield):not(#login):not(script){visibility:hidden!important;pointer-events:none!important}
    .pagePrivacyShield{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:#edf4fa;color:#173f63;font:800 21px system-ui;text-align:center;padding:20px}
    .pagePrivacyShield button{display:block;margin:18px auto;border:0;border-radius:12px;padding:12px 22px;background:#173f63;color:#fff;font:700 16px system-ui}
    .pageLockOverlay{position:fixed;inset:0;z-index:2147483001;background:#112b45cc;display:flex;align-items:center;justify-content:center;padding:18px;font-family:system-ui;color:#142e47}
    .pageLockCard{box-sizing:border-box;width:min(390px,100%);max-height:90dvh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 18px 50px #0005;padding:22px}
    .pageLockCard h2{font-size:23px;margin:0 0 12px}.pageLockCard p{font-size:15px;line-height:1.45}.pageLockCard label{display:block;font-size:14px;font-weight:700;margin-top:12px}
    .pageLockCard input{box-sizing:border-box;width:100%;height:48px;border:2px solid #a8bdcf;border-radius:10px;padding:8px 11px;margin-top:5px;font:18px system-ui}
    .pageLockErr{min-height:20px;color:#b42318;font-size:14px;margin-top:10px}.pageLockActions{display:flex;gap:8px;margin-top:10px}
    .pageLockActions button{flex:1;border:0;border-radius:10px;padding:13px 8px;font:800 15px system-ui}.pageLockOk{background:#173f63;color:white}.pageLockCancel{background:#e8eef4;color:#234}
    #lockNotebookNow{border:1px solid #aabfd2;border-radius:10px;background:#fff2bd;color:#493b00;padding:10px 16px;font-weight:800;margin:8px auto;display:block}
    html.privateNotebookLocked #login.show{visibility:visible!important;z-index:2147483002!important}
  `;document.head.appendChild(css);
  function notesDocument(){return isNotes&&Boolean(document.getElementById('list')||document.querySelector('main.form'))}
  function shield(){
    document.documentElement.classList.add('privateNotebookLocked');
    if(!document.body)return;
    if(document.getElementById('pagePrivacyShield'))return;
    const el=document.createElement('div');el.id='pagePrivacyShield';el.className='pagePrivacyShield';
    el.innerHTML='<div>🔒 Özel alan kilitli<button type="button">Şifreyle aç</button><button type="button" data-back>Not 1’e dön</button></div>';
    el.querySelector('button').onclick=()=>resume();el.querySelector('[data-back]').onclick=goPublic;document.body.appendChild(el);
  }
  function unshield(){document.documentElement.classList.remove('privateNotebookLocked');document.getElementById('pagePrivacyShield')?.remove()}
  function goPublic(){localStorage.setItem('crm_notes_page','1');location.replace('/notlar-v2.html?page=1')}
  function lockedResponse(n){return new Response(JSON.stringify({error:'Not '+n+' kilitli. Özel şifreyi girin.',code:'PAGE_LOCKED',notebook:n}),{status:423,headers:{'content-type':'application/json'}})}
  async function api(path,options){
    const response=await baseFetch(path,Object.assign({credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'}},options||{}));
    const data=await response.json();if(!response.ok){const error=new Error(data.error||'Bağlantı kurulamadı.');error.status=response.status;throw error}return data;
  }
  function passwordModal(n,configured){
    return new Promise(resolve=>{
      const el=document.createElement('div');el.className='pageLockOverlay';
      el.innerHTML='<form class="pageLockCard" role="dialog" aria-modal="true" aria-labelledby="privateNoteHeading"><h2 id="privateNoteHeading">🔒 Not '+n+' — Özel alan</h2><p>'+(configured?'İçeriği görmek için özel şifreni gir.':'Bu alan için ayrı bir şifre oluştur. Şifren en az 6 karakter olmalı.')+'</p><label>Özel şifre<input name="private-password" type="password" autocomplete="off" maxlength="100" required aria-label="Özel şifre"></label>'+(configured?'':'<label>Şifreyi tekrar yaz<input name="repeat-password" type="password" autocomplete="off" maxlength="100" required aria-label="Şifreyi tekrar yaz"></label>')+'<div class="pageLockErr" role="alert"></div><div class="pageLockActions"><button class="pageLockCancel" type="button">Vazgeç</button><button class="pageLockOk" type="submit">'+(configured?'Kilidi aç':'Şifreyi oluştur')+'</button></div></form>';
      const form=el.querySelector('form'),first=form.elements['private-password'],repeat=form.elements['repeat-password'],error=el.querySelector('.pageLockErr'),submit=el.querySelector('.pageLockOk');
      const close=result=>{form.reset();el.remove();if(modal?.element===el)modal=null;resolve(result)};
      modal={element:el,close};document.body.appendChild(el);first.focus();
      el.querySelector('.pageLockCancel').onclick=()=>close(false);
      form.onsubmit=async event=>{
        event.preventDefault();if(submit.disabled)return;error.textContent='';
        if(!configured&&first.value.length<6){error.textContent='Şifre en az 6 karakter olmalı.';return}
        if(repeat&&repeat.value!==first.value){error.textContent='İki şifre aynı değil.';return}
        submit.disabled=true;const generation=epoch;
        try{
          await api('/api/notes-v3/page-lock/'+(configured?'verify':'set'),{method:'POST',body:JSON.stringify({notebook:n,password:first.value})});
          if(generation!==epoch||document.hidden){await revoke(n);close(false);return}
          authorized.add(n);close(true);
        }catch(e){error.textContent=e.message;submit.disabled=false;first.value='';first.focus()}
      };
      el.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();close(false)}if(event.key==='Tab'){const controls=[...form.querySelectorAll('input,button')].filter(x=>!x.disabled),a=controls[0],b=controls[controls.length-1];if(event.shiftKey&&document.activeElement===a){event.preventDefault();b.focus()}else if(!event.shiftKey&&document.activeElement===b){event.preventDefault();a.focus()}}};
    });
  }
  async function ensure(n){
    if(n===1)return true;
    if(document.hidden)return false;
    if(authorized.has(n))return true;
    if(pending){await pending;return authorized.has(n)}
    pending=(async()=>{
      await ready;await locking;if(notesDocument()&&currentPage>1)shield();
      let status;try{status=await api('/api/notes-v3/page-lock/status?notebook='+n)}catch(error){if(error.status!==401){shield();document.querySelector('#pagePrivacyShield div').firstChild.textContent=error.message}return false}
      if(document.hidden)return false;
      // A fresh document always asks for the password, even after browser restore.
      const ok=await passwordModal(n,status.configured);
      if(ok){privateSeen=true;unshield();window.dispatchEvent(new CustomEvent('private-notebook-unlocked',{detail:{notebook:n}}))}
      else if(!document.hidden&&notesDocument()&&currentPage>1)goPublic();
      return ok;
    })();
    try{return await pending}finally{pending=null}
  }
  async function revoke(n){try{await api('/api/notes-v3/page-lock/lock',{method:'POST',keepalive:true,body:JSON.stringify({notebook:n})})}catch(_){}}
  function lockPrivatePages(broadcast=true){
    epoch++;authorized.clear();modal?.close(false);
    if((notesDocument()&&currentPage>1)||privateSeen){shield();needsResume=true;window.dispatchEvent(new Event('private-notebook-locked'));window.crmReminders?.clearPrivate?.()}
    locking=Promise.all([2,3].map(revoke));
    if(broadcast)try{localStorage.setItem('crm_private_lock_event',String(Date.now())+Math.random())}catch(_){}
    return locking;
  }
  async function resume(){
    if(document.hidden)return;
    if(notesDocument()&&currentPage>1){shield();if(await ensure(currentPage)){needsResume=false;window.dispatchEvent(new Event('private-notebook-refresh'))}}
    else if(needsResume){await locking;location.reload()}
  }
  window.crmPrivateNotes={ensure,lock:lockPrivatePages,isUnlocked:n=>authorized.has(Number(n))};
  window.fetch=async function(input,init){
    const url=new URL(typeof input==='string'?input:input.url,location.href),method=String(init?.method||input?.method||'GET').toUpperCase();
    if(url.origin!==location.origin)return baseFetch(input,init);
    let book=1;
    if(url.pathname==='/api/notes-v3'){
      book=clamp(url.searchParams.get('notebook')||(isNotes?currentPage:1));
      if(method==='POST'&&typeof init?.body==='string')try{book=clamp(JSON.parse(init.body).notebook_no||currentPage)}catch(_){}
      if(isNotes&&book>1&&!await ensure(book))return lockedResponse(book);
    }
    const generation=epoch,response=await baseFetch(input,init);
    if(url.pathname==='/api/login'&&response.ok){authorized.clear();if(notesDocument()&&currentPage>1)setTimeout(resume,0)}
    if(!url.pathname.startsWith('/api/')||url.pathname.includes('/page-lock/'))return response;
    if(response.status===423){
      const data=await response.clone().json();book=clamp(data.notebook);
      authorized.delete(book);
      if(isNotes&&!document.hidden&&await ensure(book))return baseFetch(input,init);
      return response;
    }
    if(response.ok&&method==='GET'&&/\/api\/(notes-v3|agenda|quick-request-files)/.test(url.pathname)){
      if(generation!==epoch||document.hidden)return lockedResponse(book);
      const data=await response.clone().json().catch(()=>null);
      if(Array.isArray(data)&&data.some(row=>Number(row.notebook_no)>1))privateSeen=true;
    }
    return response;
  };
  function decorate(){
    document.querySelectorAll('.notePageBtn:not(.plannerPageBtn)').forEach((button,i)=>{
      const n=i%3+1;button.dataset.notebook=String(n);if(n>1)button.textContent='🔒 Not '+n;
      if(button.dataset.privateGuarded)return;button.dataset.privateGuarded='1';const original=button.onclick;
      button.onclick=async event=>{
        if(n===currentPage&&n>1&&!authorized.has(n)){event.preventDefault();return resume()}
        if(isNew){if(n>1&&!await ensure(n))return;if(currentPage>1&&currentPage!==n){authorized.delete(currentPage);revoke(currentPage)}currentPage=n;original?.call(button,event);syncLockButton()}
        else original?.call(button,event);
      };
    });
    syncLockButton();
  }
  function syncLockButton(){
    let button=document.getElementById('lockNotebookNow');
    if(!notesDocument()||currentPage===1){button?.remove();return}
    if(!button){button=document.createElement('button');button.id='lockNotebookNow';button.type='button';button.textContent='🔒 Özel alanı kilitle';button.onclick=()=>{lockPrivatePages();resume()};const bar=document.querySelector('.notePagesBar');bar?.insertAdjacentElement('afterend',button)}
  }
  ready.then(async()=>{
    decorate();if(notesDocument()&&currentPage>1){shield();await revoke(currentPage);resume()}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)lockPrivatePages();else resume()});
  window.addEventListener('pagehide',()=>lockPrivatePages());
  window.addEventListener('pageshow',event=>{if(event.persisted){lockPrivatePages();resume()}});
  window.addEventListener('storage',event=>{if(event.key==='crm_private_lock_event'){lockPrivatePages(false);if(!document.hidden)resume()}});
})();
