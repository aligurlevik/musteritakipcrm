(function(){
  'use strict';

  const clean=v=>String(v??'').trim();
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const parseArray=v=>{try{const x=Array.isArray(v)?v:JSON.parse(v||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
  const currentCustomer=()=>{try{return typeof selected!=='undefined'?selected:null}catch(_){return null}};

  function currentContacts(c){
    const direct=parseArray(c?.contacts_json).map(x=>({name:clean(x?.name),role:clean(x?.role),phone:clean(x?.phone),email:clean(x?.email)}));
    if(direct.length)return direct.slice(0,4);
    const names=clean(c?.contact_name).split(/\r?\n/).map(clean).filter(Boolean);
    const phones=parseArray(c?.phones_json).map(clean);
    const emails=parseArray(c?.emails_json).map(clean);
    const n=Math.min(4,Math.max(names.length,phones.length,emails.length,c?.phone?1:0,c?.email?1:0));
    const out=[];
    for(let i=0;i<n;i++)out.push({name:names[i]||'',role:'',phone:phones[i]||(!i?clean(c?.phone):''),email:emails[i]||(!i?clean(c?.email):'')});
    return out;
  }

  function resultFromStage(stage){
    const s=clean(stage);
    if(s==='Kazanıldı')return 'Olumlu';
    if(s==='Kaybedildi')return 'Olumsuz';
    if(s==='Beklemede')return 'Beklemede';
    return 'Sonuçlanmamış';
  }

  function stageFromResult(result,currentStage){
    if(result==='Olumlu')return 'Kazanıldı';
    if(result==='Olumsuz')return 'Kaybedildi';
    if(result==='Beklemede')return 'Beklemede';
    if(['Kazanıldı','Kaybedildi','Beklemede'].includes(currentStage))return 'Yeni Lead';
    return currentStage||'Yeni Lead';
  }

  function ensureStyle(){
    if(document.getElementById('portfolioInlineEditorStyle'))return;
    const st=document.createElement('style');
    st.id='portfolioInlineEditorStyle';
    st.textContent=`
      .pie-editor{border:2px solid #1769f6;border-radius:12px;background:#f8fbff;margin:8px 0 10px;padding:9px}
      .pie-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}.pie-title{font-size:14px;font-weight:900;color:#0f172a}.pie-sub{font-size:10px;color:#64748b;margin-top:2px}
      .pie-section{border:1px solid #d8e3ef;border-radius:10px;background:#fff;margin-top:7px;overflow:hidden}.pie-section>summary{list-style:none;cursor:pointer;padding:9px 11px;font-size:12px;font-weight:900;color:#0f172a;background:#f3f7fc;display:flex;align-items:center;gap:7px}.pie-section>summary::-webkit-details-marker{display:none}.pie-section>summary:after{content:'▼';margin-left:auto;color:#1769f6;font-size:10px}.pie-section:not([open])>summary:after{transform:rotate(-90deg)}.pie-section-body{padding:9px}
      .pie-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.pie-field{min-width:0}.pie-field.wide{grid-column:1/-1}.pie-field label{display:block;font-size:10px;font-weight:900;color:#64748b;margin-bottom:3px}
      .pie-field input,.pie-field select,.pie-field textarea{width:100%;border:1px solid #cbd8e8;border-radius:8px;background:#fff;color:#0f172a;padding:7px 8px;font:inherit;font-size:12px;outline:none}.pie-field textarea{min-height:50px;resize:vertical;line-height:1.35}.pie-field input:focus,.pie-field select:focus,.pie-field textarea:focus{border-color:#1769f6;box-shadow:0 0 0 3px rgba(23,105,246,.10)}
      .pie-contact-toggle{width:100%;min-height:38px;border:1px solid #cbd8e8;border-radius:9px;background:#fff;padding:7px 9px;display:flex;align-items:center;gap:9px;text-align:left;cursor:pointer;color:#0f172a;font-weight:900}.pie-contact-toggle:hover{border-color:#1769f6;background:#f8fbff}.pie-contact-summary{font-weight:700;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}.pie-contact-chevron{color:#1769f6;font-size:11px;transition:transform .15s ease}.pie-contact-toggle[aria-expanded="true"] .pie-contact-chevron{transform:rotate(180deg)}
      .pie-contact-panel{margin-top:6px;border:1px solid #dbe5f0;border-radius:9px;background:#fff;padding:7px}.pie-contact-panel[hidden]{display:none!important}.pie-contact-head,.pie-contact-row{display:grid;grid-template-columns:28px 1.15fr .85fr .9fr 1.2fr;gap:6px;align-items:center;min-width:720px}.pie-contacts{overflow:auto}.pie-contact-head{font-size:9px;font-weight:900;color:#64748b;margin-bottom:4px}.pie-contact-row{margin-bottom:5px}.pie-contact-row:last-child{margin-bottom:0}.pie-contact-row input{width:100%;border:1px solid #cbd8e8;border-radius:7px;padding:7px;font-size:11px}.pie-no{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#e8f1ff;color:#1769f6;font-size:10px;font-weight:900}
      .pie-meetings{display:grid;gap:6px}.pie-meeting{border-left:4px solid #1769f6;background:#f8fafc;border-radius:8px;padding:8px 10px}.pie-meeting-head{display:flex;justify-content:space-between;gap:10px;font-size:11px;font-weight:900}.pie-meeting-note{font-size:11px;margin-top:4px;white-space:pre-wrap}.pie-meeting-meta{font-size:10px;color:#64748b;margin-top:4px}.pie-empty{font-size:11px;color:#64748b;border:1px dashed #cbd8e8;border-radius:8px;padding:9px}
      .pie-reminder-row{display:grid;grid-template-columns:1fr 1.35fr auto;gap:7px;align-items:end}.pie-reminder-btn{border:0;border-radius:9px;background:#f59e0b;color:#fff;padding:8px 12px;font-weight:900;cursor:pointer;white-space:nowrap}.pie-reminder-btn:disabled{opacity:.55;cursor:wait}.pie-reminder-status{font-size:10px;font-weight:800;color:#059669;margin-top:6px}.pie-reminder-status.err{color:#dc2626}
      .pie-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:9px}.pie-save{border:0;border-radius:9px;background:#1769f6;color:#fff;padding:9px 14px;font-weight:900;cursor:pointer}.pie-save:disabled{opacity:.55;cursor:wait}.pie-status{font-size:11px;font-weight:800;margin-right:auto;color:#16a34a}.pie-status.err{color:#dc2626}.pie-readonly-note{font-size:10px;color:#64748b;background:#fff;border:1px dashed #cbd8e8;border-radius:8px;padding:7px 9px;margin-top:7px}
      @media(max-width:800px){.pie-grid,.pie-reminder-row{grid-template-columns:1fr}.pie-field.wide{grid-column:auto}}
    `;
    document.head.appendChild(st);
  }

  function option(value,label,current){return `<option value="${esc(value)}"${String(current)===String(value)?' selected':''}>${esc(label)}</option>`}

  function editorHtml(c){
    const originalContacts=currentContacts(c);
    const contactCount=originalContacts.filter(x=>x.name||x.role||x.phone||x.email).length;
    const contactSummary=originalContacts.filter(x=>x.name||x.phone||x.email).map(x=>x.name||x.phone||x.email).slice(0,3).join(' • ')||'Yetkili bilgisi ekle';
    const contacts=originalContacts.slice();while(contacts.length<4)contacts.push({name:'',role:'',phone:'',email:''});
    const categories=clean(c.categories||c.sector),priority=clean(c.priority||'NORMAL'),stage=clean(c.stage||'Yeni Lead'),result=resultFromStage(stage);
    const contactRows=contacts.map((x,i)=>`<div class="pie-contact-row"><span class="pie-no">${i+1}</span><input data-pie="name${i}" value="${esc(x.name)}" placeholder="İsim Soyisim"><input data-pie="role${i}" value="${esc(x.role)}" placeholder="Görevi"><input data-pie="phone${i}" value="${esc(x.phone)}" placeholder="Telefon"><input data-pie="email${i}" value="${esc(x.email)}" placeholder="E-posta"></div>`).join('');
    return `<section class="pie-editor" data-customer-id="${Number(c.id||0)}">
      <div class="pie-head"><div><div class="pie-title">✏️ Müşteri Kartı — Düzenleme</div><div class="pie-sub">Bölümler başlığa tıklanarak açılıp kapatılabilir.</div></div></div>

      <details class="pie-section" open><summary>🏢 1. Firma ve İletişim Bilgileri</summary><div class="pie-section-body"><div class="pie-grid">
        <div class="pie-field"><label>Firma Adı</label><input data-pie="company" value="${esc(c.company)}"></div>
        <div class="pie-field"><label>İl / Bölge</label><input data-pie="region" value="${esc(c.region)}"></div>
        <div class="pie-field wide"><button type="button" class="pie-contact-toggle" aria-expanded="false"><span>👥 Yetkililer (${contactCount})</span><span class="pie-contact-summary">${esc(contactSummary)}</span><span class="pie-contact-chevron">▼</span></button><div class="pie-contact-panel" hidden><div class="pie-contacts"><div class="pie-contact-head"><span></span><span>İsim Soyisim</span><span>Görevi</span><span>Telefon</span><span>E-posta</span></div>${contactRows}</div></div></div>
      </div></div></details>

      <details class="pie-section" open><summary>📊 2. Satış Durumu ve Potansiyel</summary><div class="pie-section-body"><div class="pie-grid">
        <div class="pie-field"><label>Potansiyel</label><select data-pie="priority">${option('KRİTİK','Yüksek',priority)}${option('YÜKSEK','Orta',priority)}${option('NORMAL','Düşük',priority)}${option('DÜŞÜK','Çok Düşük',priority)}</select></div>
        <div class="pie-field"><label>Sonuç</label><select data-pie="result">${option('Sonuçlanmamış','Sonuçlanmamış',result)}${option('Beklemede','Beklemede',result)}${option('Olumlu','Olumlu',result)}${option('Olumsuz','Olumsuz',result)}</select></div>
        <div class="pie-field"><label>Aşama</label><select data-pie="stage">${['Yeni Lead','İlk Görüşme','Teklif','Pazarlık','Beklemede','Kazanıldı','Kaybedildi'].map(v=>option(v,v,stage)).join('')}</select></div>
        <div class="pie-field"><label>İş Alanı</label><input data-pie="categories" value="${esc(categories)}" placeholder="Ambalaj, Matbaa ..."></div>
      </div></div></details>

      <details class="pie-section" open><summary>🗣️ 3. Yapılan Görüşmeler</summary><div class="pie-section-body"><div class="pie-meetings" data-pie-meetings><div class="pie-empty">Görüşmeler yükleniyor...</div></div></div></details>

      <details class="pie-section" open><summary>⏰ 4. Yapılması Gerekenler ve Hatırlatma</summary><div class="pie-section-body">
        <div class="pie-grid"><div class="pie-field"><label>Sonraki İşlem Tarihi</label><input data-pie="follow_date" type="date" value="${esc(clean(c.follow_date).slice(0,10))}"></div><div class="pie-field"><label>Hatırlatma Tarih / Saat</label><input data-pie="remind_at" type="datetime-local"></div></div>
        <div class="pie-reminder-row" style="margin-top:7px"><div class="pie-field" style="grid-column:span 2"><label>Hatırlatma Notu</label><input data-pie="remind_note" placeholder="Örn. Teklif sonucunu sor, tekrar ara..."></div><button type="button" class="pie-reminder-btn">🔔 Bildirimi Ayarla</button></div>
        <div class="pie-reminder-status"></div>
      </div></details>

      <details class="pie-section"><summary>📝 5. Teknik Bilgi, Talepler ve Özel Notlar</summary><div class="pie-section-body"><div class="pie-grid">
        <div class="pie-field wide"><label>Makine / Teknik Bilgi</label><textarea data-pie="machine_info">${esc(c.machine_info)}</textarea></div>
        <div class="pie-field wide"><label>Müşteri Talepleri</label><textarea data-pie="customer_requests">${esc(c.customer_requests)}</textarea></div>
        <div class="pie-field wide"><label>Özel Notlar</label><textarea data-pie="special_notes">${esc(c.special_notes)}</textarea></div>
      </div></div></details>

      <div class="pie-readonly-note">Son Görüşme, Görüşme Sayısı ve Teklif Sayısı kayıt geçmişinden otomatik hesaplanır; elle değiştirilmez.</div>
      <div class="pie-actions"><span class="pie-status"></span><button type="button" class="pie-save">✓ Değişiklikleri Kaydet</button></div>
    </section>`;
  }

  function getField(root,name){return root.querySelector(`[data-pie="${name}"]`)}

  async function saveEditor(root,c,quiet=false){
    const btn=root.querySelector('.pie-save'),status=root.querySelector('.pie-status');
    const company=clean(getField(root,'company')?.value);
    if(!company){status.textContent='Firma adı boş olamaz.';status.className='pie-status err';return false}
    const contacts=[];
    for(let i=0;i<4;i++){
      const row={name:clean(getField(root,'name'+i)?.value),role:clean(getField(root,'role'+i)?.value),phone:clean(getField(root,'phone'+i)?.value),email:clean(getField(root,'email'+i)?.value)};
      if(row.name||row.role||row.phone||row.email)contacts.push(row);
    }
    const phones=contacts.map(x=>x.phone).filter(Boolean),emails=contacts.map(x=>x.email).filter(Boolean),stage=clean(getField(root,'stage')?.value),categories=clean(getField(root,'categories')?.value).split(',').map(clean).filter(Boolean);
    const payload={company,contact_name:contacts.map(x=>x.name).filter(Boolean).join('\n'),contacts,phones,emails,region:clean(getField(root,'region')?.value),district:clean(c.district),priority:clean(getField(root,'priority')?.value)||'NORMAL',stage:stage||'Yeni Lead',follow_date:getField(root,'follow_date')?.value||'',categories,customer_requests:clean(getField(root,'customer_requests')?.value),special_notes:clean(getField(root,'special_notes')?.value),machine_info:clean(getField(root,'machine_info')?.value),invoice_title:clean(c.invoice_title),tax_office:clean(c.tax_office),tax_number:clean(c.tax_number),invoice_address:clean(c.invoice_address),cargo_enabled:Boolean(c.cargo_enabled),cargo_company:clean(c.cargo_company),cargo_code:clean(c.cargo_code),cargo_note:clean(c.cargo_note),service_requested:Boolean(c.service_requested),service_type:clean(c.service_type),service_description:clean(c.service_description),service_date:clean(c.service_date)};
    btn.disabled=true;btn.textContent='Kaydediliyor...';if(!quiet){status.textContent='';status.className='pie-status'}
    try{
      const r=await fetch('/api/customers/'+Number(c.id),{method:'PUT',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});let data={};try{data=await r.json()}catch(_){}if(r.status===401){location.href='/';return false}if(!r.ok)throw new Error(data.error||'Değişiklikler kaydedilemedi.');
      if(payload.stage==='Kaybedildi'){const rr=await fetch('/api/customers/'+Number(c.id)+'/result',{method:'PUT',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({result:'Olumsuz'})});if(!rr.ok)throw new Error('Sonuç kaydedilemedi.')}else if(payload.stage==='Kazanıldı'){const rr=await fetch('/api/customers/'+Number(c.id)+'/result',{method:'PUT',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({result:'Olumlu'})});if(!rr.ok)throw new Error('Sonuç kaydedilemedi.')}else await fetch('/api/customers/'+Number(c.id)+'/restore',{method:'POST',credentials:'same-origin'});
      Object.assign(c,payload,{categories:categories.join(','),sector:categories.join(','),contacts_json:JSON.stringify(contacts),phones_json:JSON.stringify(phones),emails_json:JSON.stringify(emails),phone:phones[0]||'',email:emails[0]||''});
      if(!quiet){status.textContent='✓ Değişiklikler kaydedildi.';status.className='pie-status'}btn.textContent='✓ Değişiklikleri Kaydet';btn.disabled=false;setTimeout(()=>{try{if(typeof loadCustomers==='function')loadCustomers()}catch(_){ }},100);return true;
    }catch(e){status.textContent=e?.message||'Değişiklikler kaydedilemedi.';status.className='pie-status err';btn.disabled=false;btn.textContent='✓ Değişiklikleri Kaydet';return false}
  }

  function meetingDate(m){return clean(m?.meeting_date||m?.created_at).slice(0,10)}
  function renderMeetings(root,data){
    const box=root.querySelector('[data-pie-meetings]'),items=Array.isArray(data?.meetings)?data.meetings:[];
    root._pieHistory=data||{};
    if(!box)return;
    const ordered=[...items].sort((a,b)=>clean(b.meeting_date||b.created_at).localeCompare(clean(a.meeting_date||a.created_at)));
    if(!ordered.length){box.innerHTML='<div class="pie-empty">Henüz görüşme kaydı yok. İlk görüşmeden sonra geçmiş burada tarih sırasıyla görünecek.</div>';return}
    box.innerHTML=ordered.slice(0,8).map(m=>`<div class="pie-meeting"><div class="pie-meeting-head"><span>${esc(m.meeting_no||'')}. Görüşme</span><span>${esc(meetingDate(m)||'Tarih yok')}</span></div><div class="pie-meeting-note">${esc(m.note||'Not yazılmamış')}</div><div class="pie-meeting-meta">Sonuç: ${esc(m.result||'Beklemede')}${m.next_follow_date?' • Sonraki takip: '+esc(m.next_follow_date):''}${m.remind_at?' • 🔔 '+esc(String(m.remind_at).replace('T',' ').slice(0,16)):''}</div></div>`).join('');
    const latest=ordered[0];
    if(latest?.remind_at&&!getField(root,'remind_at').value)getField(root,'remind_at').value=String(latest.remind_at).slice(0,16);
    if(latest?.remind_note&&!getField(root,'remind_note').value)getField(root,'remind_note').value=latest.remind_note;
  }

  async function loadMeetings(root,c){
    try{const r=await fetch('/api/customers/'+Number(c.id)+'/history',{credentials:'same-origin'});if(!r.ok)throw new Error();renderMeetings(root,await r.json())}catch(_){const box=root.querySelector('[data-pie-meetings]');if(box)box.innerHTML='<div class="pie-empty">Görüşme geçmişi şu anda yüklenemedi.</div>'}
  }

  async function scheduleReminder(root,c){
    const button=root.querySelector('.pie-reminder-btn'),status=root.querySelector('.pie-reminder-status'),remindAt=clean(getField(root,'remind_at')?.value),note=clean(getField(root,'remind_note')?.value)||'Müşteri ile tekrar görüş';
    if(!remindAt){status.textContent='Hatırlatma için tarih ve saat seçin.';status.className='pie-reminder-status err';return}
    getField(root,'follow_date').value=remindAt.slice(0,10);
    button.disabled=true;button.textContent='Kaydediliyor...';status.textContent='';status.className='pie-reminder-status';
    try{
      const saved=await saveEditor(root,c,true);if(!saved)throw new Error('Müşteri bilgileri kaydedilemedi.');
      const entryDate=remindAt.slice(0,10),agendaNote='📞 '+clean(getField(root,'company')?.value)+' — '+note,key='crm-customer-follow-'+Number(c.id);let agendaId=Number(localStorage.getItem(key)||0),r;
      if(agendaId){r=await fetch('/api/agenda/'+agendaId,{method:'PUT',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({entry_date:entryDate,note:agendaNote,remind_at:remindAt})});if(r.status===404)agendaId=0;else if(!r.ok)throw new Error('Hatırlatma güncellenemedi.');}
      if(!agendaId){r=await fetch('/api/agenda',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({entry_date:entryDate,note:agendaNote,remind_at:remindAt})});if(!r.ok)throw new Error('Hatırlatma oluşturulamadı.');const data=await r.json();agendaId=Number(data.id||0);if(agendaId)localStorage.setItem(key,String(agendaId));}
      const meetings=Array.isArray(root._pieHistory?.meetings)?root._pieHistory.meetings:[];if(meetings.length){const latest=[...meetings].sort((a,b)=>clean(b.meeting_date||b.created_at).localeCompare(clean(a.meeting_date||a.created_at)))[0];if(latest?.id)await fetch('/api/meetings/'+Number(latest.id)+'/reminder',{method:'PUT',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({remind_at:remindAt,remind_note:note})});}
      status.textContent='✓ Bildirim '+remindAt.replace('T',' ')+' için ayarlandı. Ana ekranda takip tarihi de güncellendi.';status.className='pie-reminder-status';await loadMeetings(root,c);
    }catch(e){status.textContent=e?.message||'Bildirim ayarlanamadı.';status.className='pie-reminder-status err'}finally{button.disabled=false;button.textContent='🔔 Bildirimi Ayarla'}
  }

  function wire(root,c){
    const result=getField(root,'result'),stage=getField(root,'stage');
    result?.addEventListener('change',()=>{stage.value=stageFromResult(result.value,stage.value)});stage?.addEventListener('change',()=>{result.value=resultFromStage(stage.value)});
    root.querySelector('.pie-contact-toggle')?.addEventListener('click',e=>{const button=e.currentTarget,panel=root.querySelector('.pie-contact-panel'),open=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',open?'false':'true');if(panel)panel.hidden=open});
    root.querySelector('.pie-save')?.addEventListener('click',()=>saveEditor(root,c));root.querySelector('.pie-reminder-btn')?.addEventListener('click',()=>scheduleReminder(root,c));
  }

  function mount(){
    ensureStyle();const modal=document.getElementById('portfolioDetailExpandModal'),c=currentCustomer();if(!modal||!modal.classList.contains('show')||!c?.id)return;const body=modal.querySelector('.pdem-body');if(!body)return;const existing=body.querySelector('.pie-editor');if(existing&&Number(existing.dataset.customerId)===Number(c.id))return;existing?.remove();body.insertAdjacentHTML('afterbegin',editorHtml(c));const root=body.querySelector('.pie-editor');wire(root,c);loadMeetings(root,c);
  }

  const observer=new MutationObserver(()=>setTimeout(mount,0));observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});document.addEventListener('click',()=>setTimeout(mount,40),true);setInterval(mount,1200);
})();