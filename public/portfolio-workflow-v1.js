(function(){
'use strict';
if(window.__portfolioWorkflowLayerV1)return;
window.__portfolioWorkflowLayerV1='20261007-v1';

const byId=id=>document.getElementById(id);
let activeContactIndex=0;

function contactsList(){
  try{return Array.isArray(contacts)?contacts:[]}catch(_){return []}
}
function selectedCustomer(){
  try{return selected||null}catch(_){return null}
}
function visibleCustomerRows(){
  try{return Array.isArray(visibleRows)?visibleRows:[]}catch(_){return []}
}
function primaryEmail(customer){
  if(!customer)return '';
  const direct=String(customer.email||'').trim();
  if(direct)return direct;
  try{
    const list=JSON.parse(customer.emails_json||'[]');
    if(Array.isArray(list)&&list[0])return String(list[0]).trim();
  }catch(_){}
  try{
    const list=JSON.parse(customer.contacts_json||'[]');
    if(Array.isArray(list)&&list[0]&&list[0].email)return String(list[0].email).trim();
  }catch(_){}
  return '';
}
function currentContact(){
  const list=contactsList();
  return list[activeContactIndex]||list[0]||{name:'',role:'',phone:'',email:''};
}

function ensureMeetingResult(){
  const select=byId('meetingNoteResult');
  if(!select)return;
  if(!Array.from(select.options).some(o=>o.value==='Sonuçlanmamış')){
    const option=document.createElement('option');
    option.value='Sonuçlanmamış';
    option.textContent='Sonuçlanmamış';
    select.insertBefore(option,select.firstChild);
  }
  const hidden=byId('dResultSelect');
  if(hidden){
    const map={open:'Sonuçlanmamış',waiting:'Beklemede',positive:'Olumlu',negative:'Olumsuz'};
    const wanted=map[hidden.value]||'Sonuçlanmamış';
    if(Array.from(select.options).some(o=>o.value===wanted))select.value=wanted;
  }
}

function hideGeneralResultAndNotes(){
  const result=byId('dResultSelect');
  if(result){
    const row=result.closest('.info-row');
    if(row)row.style.display='none';
  }
  const notes=document.querySelector('#tabGeneral .notes-panel')||document.querySelector('.notes-panel');
  if(notes)notes.style.display='none';
}

function applyContact(index){
  const list=contactsList();
  if(!list.length){
    activeContactIndex=0;
  }else{
    activeContactIndex=Math.max(0,Math.min(Number(index)||0,list.length-1));
  }
  const c=currentContact();
  const name=byId('dContact'),phone=byId('dPhone'),mail=byId('dEmail');
  if(name)name.value=c.name||'';
  if(phone)phone.value=c.phone||'';
  if(mail)mail.value=c.email||'';
  const picker=byId('workflowContactPicker');
  if(picker)picker.value=String(activeContactIndex);
  const to=byId('workflowMailTo');
  if(to)to.value=c.email||'';
  updatePrimaryButton();
}
function refreshContactPicker(preferred){
  const picker=byId('workflowContactPicker');
  if(!picker)return;
  const list=contactsList();
  picker.replaceChildren();
  if(!list.length){
    const option=document.createElement('option');
    option.value='0';option.textContent='Yetkili kişi yok';picker.appendChild(option);
    activeContactIndex=0;applyContact(0);return;
  }
  list.forEach((c,i)=>{
    const option=document.createElement('option');
    option.value=String(i);
    option.textContent=(i===0?'★ ASIL — ':'')+(c.name||'İsimsiz Yetkili')+(c.role?' — '+c.role:'');
    picker.appendChild(option);
  });
  const target=preferred===undefined?activeContactIndex:preferred;
  applyContact(target);
}
function updatePrimaryButton(){
  const btn=byId('workflowPrimaryContact');
  if(!btn)return;
  const list=contactsList();
  const primary=list.length&&activeContactIndex===0;
  btn.disabled=!list.length||primary;
  btn.textContent=primary?'★ Asıl Yetkili':'★ Asıl Yetkili Yap';
}
async function makePrimaryContact(){
  const list=contactsList();
  if(!list.length||activeContactIndex===0)return;
  const btn=byId('workflowPrimaryContact');
  const status=byId('workflowContactStatus');
  const chosen=list.splice(activeContactIndex,1)[0];
  list.unshift(chosen);
  activeContactIndex=0;
  try{
    if(typeof renderContacts==='function')renderContacts();
    refreshContactPicker(0);
    if(btn){btn.disabled=true;btn.textContent='Kaydediliyor...'}
    if(typeof saveCustomer==='function')await saveCustomer();
    if(status)status.textContent='Asıl yetkili kaydedildi.';
  }catch(error){
    console.error('Asıl yetkili kaydedilemedi',error);
    if(status)status.textContent='Asıl yetkili kaydedilemedi.';
  }finally{
    refreshContactPicker(0);
  }
}

function ensureContactControls(){
  const name=byId('dContact'),phone=byId('dPhone'),mail=byId('dEmail');
  if(!name||!phone||!mail)return;

  const nameRow=name.closest('.info-row');
  if(nameRow&&!byId('workflowContactPicker')){
    name.style.display='none';
    const wrap=document.createElement('div');
    wrap.className='workflow-contact-picker-wrap';
    const picker=document.createElement('select');
    picker.id='workflowContactPicker';
    picker.addEventListener('change',()=>applyContact(picker.value));
    const primary=document.createElement('button');
    primary.id='workflowPrimaryContact';
    primary.type='button';
    primary.className='btn small workflow-primary-btn';
    primary.addEventListener('click',makePrimaryContact);
    wrap.append(picker,primary);
    const status=document.createElement('div');
    status.id='workflowContactStatus';
    status.className='workflow-contact-status';
    wrap.appendChild(status);
    name.insertAdjacentElement('afterend',wrap);
  }

  phone.readOnly=true;
  mail.readOnly=true;
  mail.classList.add('workflow-mail-click');
  mail.title='Bu kişiye CRM içinden mail yaz';
  mail.onclick=function(){openWorkflowMail(mail.value)};

  const mailRow=mail.closest('.info-row');
  if(mailRow&&!byId('workflowMailOpen')){
    const button=document.createElement('button');
    button.id='workflowMailOpen';
    button.type='button';
    button.className='btn small workflow-mail-open';
    button.textContent='Mail Yaz';
    button.addEventListener('click',()=>openWorkflowMail(mail.value));
    const wrap=document.createElement('div');
    wrap.className='workflow-mail-inline';
    mail.parentNode.insertBefore(wrap,mail);
    wrap.append(mail,button);
  }
  refreshContactPicker(activeContactIndex);
}

function decorateTable(){
  const table=document.querySelector('.table-card table');
  if(!table)return;
  const header=table.querySelector('thead tr');
  if(header){
    const ths=Array.from(header.children);
    const note=ths.find(th=>th.textContent.trim()==='Not');
    if(note)note.remove();
    if(!header.querySelector('th[data-workflow-mail]')){
      const phone=Array.from(header.children).find(th=>th.textContent.trim()==='Telefon');
      if(phone){
        const mail=document.createElement('th');
        mail.dataset.workflowMail='1';
        mail.textContent='Mail';
        phone.insertAdjacentElement('afterend',mail);
      }
    }
  }

  const rows=Array.from(table.querySelectorAll('tbody tr'));
  const data=visibleCustomerRows();
  rows.forEach((tr,index)=>{
    if(!tr.dataset.workflowNotRemoved){
      const cells=Array.from(tr.children);
      if(cells.length>=10&&cells[8])cells[8].remove();
      tr.dataset.workflowNotRemoved='1';
    }
    const old=tr.querySelector('td[data-workflow-mail]');
    if(old)old.remove();
    const cells=Array.from(tr.children);
    const phone=cells[2];
    if(!phone)return;
    const customer=data[index];
    const email=primaryEmail(customer);
    const td=document.createElement('td');
    td.dataset.workflowMail='1';
    if(email){
      const link=document.createElement('a');
      link.href='#';
      link.className='workflow-table-mail';
      link.textContent=email;
      link.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        try{if(typeof selectCustomer==='function')selectCustomer(customer.id)}catch(_){}
        setTimeout(()=>openWorkflowMail(email),40);
      });
      td.appendChild(link);
    }else{
      td.textContent='—';
    }
    phone.insertAdjacentElement('afterend',td);
  });
}

function ensureMailComposer(){
  const tab=byId('tabMails');
  if(!tab||byId('workflowMailComposer'))return;
  const panel=document.createElement('div');
  panel.className='panel workflow-mail-panel';
  panel.id='workflowMailComposer';
  panel.innerHTML=
    '<h3>Yeni Mail Gönder</h3>'+
    '<div class="workflow-mail-grid">'+
      '<label>Alıcı<input id="workflowMailTo" type="email" readonly></label>'+
      '<label>Konu<input id="workflowMailSubject" placeholder="Mail konusu"></label>'+
      '<label class="workflow-mail-full">Mesaj<textarea id="workflowMailBody" placeholder="Mesajınızı yazın..."></textarea></label>'+
      '<label>ali@jetlazer.com Mail Parolası<input id="workflowMailPassword" type="password" autocomplete="current-password" placeholder="Bu oturum için bir kez girin"></label>'+
      '<div class="workflow-mail-actions"><span id="workflowMailStatus"></span><button id="workflowMailSend" type="button" class="btn primary">✉ Mail Gönder</button></div>'+
    '</div>';
  tab.insertBefore(panel,tab.firstChild);
  const pass=byId('workflowMailPassword');
  try{if(pass)pass.value=sessionStorage.getItem('crm_mail_session_password')||''}catch(_){}
  byId('workflowMailSend')?.addEventListener('click',sendWorkflowMail);
  applyContact(activeContactIndex);
}

function openWorkflowMail(email){
  try{
    ensureMailComposer();
    if(typeof switchTab==='function')switchTab('mails');
    else document.querySelector('.tab[data-tab="mails"]')?.click();
    ensureMailComposer();
    const to=byId('workflowMailTo');
    if(to)to.value=String(email||currentContact().email||'').trim();
    setTimeout(()=>byId('workflowMailSubject')?.focus(),30);
  }catch(error){
    console.error('Mail alanı açılamadı',error);
  }
}
window.openWorkflowMail=openWorkflowMail;

async function sendWorkflowMail(){
  const customer=selectedCustomer();
  const to=String(byId('workflowMailTo')?.value||'').trim();
  const subject=String(byId('workflowMailSubject')?.value||'').trim();
  const body=String(byId('workflowMailBody')?.value||'').trim();
  const password=String(byId('workflowMailPassword')?.value||'');
  const status=byId('workflowMailStatus');
  const button=byId('workflowMailSend');
  const fail=message=>{if(status){status.textContent=message;status.className='err'}};
  if(!customer)return fail('Önce müşteri seçin.');
  if(!to)return fail('Seçili kişinin mail adresi yok.');
  if(!subject)return fail('Konu yazın.');
  if(!body)return fail('Mesaj yazın.');
  if(!password)return fail('Mail parolasını girin.');
  try{sessionStorage.setItem('crm_mail_session_password',password)}catch(_){}
  if(button)button.disabled=true;
  if(status){status.textContent='Mail gönderiliyor...';status.className=''}
  try{
    const response=await fetch('/api/customer-mail/send',{
      method:'POST',
      credentials:'same-origin',
      headers:{'content-type':'application/json','cache-control':'no-cache'},
      body:JSON.stringify({password,customer_id:customer.id,to,subject,body})
    });
    let data={};try{data=await response.json()}catch(_){}
    if(!response.ok)throw new Error(data.error||'Mail gönderilemedi.');
    if(status){status.textContent='✅ Mail gönderildi ve CRM geçmişine kaydedildi.';status.className=''}
    if(byId('workflowMailSubject'))byId('workflowMailSubject').value='';
    if(byId('workflowMailBody'))byId('workflowMailBody').value='';
    try{historyLoadedId=0;historyLoadInFlight=false}catch(_){}
    try{if(typeof ensureSelectedHistory==='function')await ensureSelectedHistory()}catch(_){}
  }catch(error){
    fail('Gönderilemedi: '+(error?.message||error));
  }finally{
    if(button)button.disabled=false;
  }
}

function mapMeetingResultToGeneral(result){
  return result==='Olumlu'?'positive':
    result==='Olumsuz'?'negative':
    result==='Beklemede'?'waiting':'open';
}

function wrapMeetingSave(){
  try{
    if(typeof saveMeetingNote!=='function'||saveMeetingNote.__workflowWrapped)return;
    const base=saveMeetingNote;
    const wrapped=async function(){
      const chosen=String(byId('meetingNoteResult')?.value||'Sonuçlanmamış');
      await base.apply(this,arguments);
      const status=byId('meetingNoteStatus');
      if(!status||!/^Kaydedildi/.test(String(status.textContent||'').trim()))return;
      try{
        const hidden=byId('dResultSelect');
        if(hidden)hidden.value=mapMeetingResultToGeneral(chosen);
        if(typeof saveCustomer==='function')await saveCustomer();
        ensureMeetingResult();
        if(status)status.textContent='Kaydedildi. Sonuç müşteri listesine işlendi.';
        setTimeout(decorateTable,0);
      }catch(error){
        console.error('Görüşme sonucu müşteri kartına işlenemedi',error);
        if(status)status.textContent='Görüşme kaydedildi; sonuç kartına aktarılırken hata oluştu.';
      }
    };
    wrapped.__workflowWrapped=true;
    saveMeetingNote=wrapped;
  }catch(error){console.error('Görüşme kayıt katmanı kurulamadı',error)}
}

function wrapPageFunctions(){
  try{
    if(typeof render==='function'&&!render.__workflowWrapped){
      const base=render;
      const wrapped=function(){const out=base.apply(this,arguments);setTimeout(decorateTable,0);return out};
      wrapped.__workflowWrapped=true;render=wrapped;
    }
  }catch(_){}
  try{
    if(typeof loadSelected==='function'&&!loadSelected.__workflowWrapped){
      const base=loadSelected;
      const wrapped=function(){const out=base.apply(this,arguments);setTimeout(syncDetail,0);return out};
      wrapped.__workflowWrapped=true;loadSelected=wrapped;
    }
  }catch(_){}
  try{
    if(typeof renderContacts==='function'&&!renderContacts.__workflowWrapped){
      const base=renderContacts;
      const wrapped=function(){const out=base.apply(this,arguments);setTimeout(()=>refreshContactPicker(activeContactIndex),0);return out};
      wrapped.__workflowWrapped=true;renderContacts=wrapped;
    }
  }catch(_){}
  wrapMeetingSave();
}

function syncDetail(){
  hideGeneralResultAndNotes();
  ensureMeetingResult();
  ensureContactControls();
  ensureMailComposer();
  decorateTable();
}

function init(){
  try{
    wrapPageFunctions();
    syncDetail();
    decorateTable();
  }catch(error){
    console.error('Portföy ek özellik katmanı atlandı; temel ekran korunuyor.',error);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
setTimeout(init,100);
})();