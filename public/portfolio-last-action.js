(function(){
  'use strict';
  if(window.__crmPortfolioLastAction)return;
  window.__crmPortfolioLastAction='20261001-v2';

  function addStyle(){
    if(document.getElementById('crmLastActionStyle'))return;
    var s=document.createElement('style');
    s.id='crmLastActionStyle';
    s.textContent='\n#rows td.crm-last-action-cell{min-width:255px;max-width:350px}\n.crm-last-action-wrap{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center}\n.crm-last-action-text{min-width:0;font-size:10px;color:#334155;font-weight:800;line-height:1.35}\n.crm-last-action-main{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.crm-last-action-follow{margin-top:3px;color:#64748b;font-size:9px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.crm-last-action-follow.today{color:#b45309;font-weight:900}\n.crm-last-action-follow.overdue{color:#dc2626;font-weight:900}\n.crm-last-action-empty{color:#94a3b8;font-weight:600}\n.crm-last-action-buttons{display:flex;gap:4px}\n.crm-last-action-btn{border:1px solid #cbd5e1;background:#fff;border-radius:6px;padding:4px 6px;font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap}\n.crm-last-action-btn:hover{background:#f8fafc}\n.crm-last-action-btn.mail{color:#1769f6;border-color:#bcd2ff;background:#f4f8ff}\n.crm-mail-status-badge{display:inline-flex;align-items:center;justify-content:center;padding:4px 7px;border-radius:5px;font-weight:900;font-size:9px;white-space:nowrap;background:#eaf2ff;color:#1769f6}\n';
    document.head.appendChild(s);
  }

  function cleanNoteLine(value){return String(value||'').trim().replace(/^\[[ xX]\]\s*/,'')}
  function lastActionText(customer){
    var lines=String(customer&&customer.special_notes||'').split('\n').map(cleanNoteLine).filter(Boolean);
    return lines[0]||'';
  }
  function customerIdFromRow(row){
    var onclick=row&&row.getAttribute('onclick')||'';
    var m=onclick.match(/selectCustomer\((\d+)\)/);
    return m?Number(m[1]):0;
  }
  function customerById(id){
    try{return Array.isArray(customers)?customers.find(function(c){return Number(c.id)===Number(id)}):null}catch(_){return null}
  }
  function escHtml(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})
  }
  function isoToday(){
    try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}catch(_){return new Date().toISOString().slice(0,10)}
  }
  function addDaysIso(days){
    var base=new Date(isoToday()+'T12:00:00+03:00');
    base.setDate(base.getDate()+Number(days||0));
    return base.toISOString().slice(0,10);
  }
  function trDate(iso){
    var value=iso||isoToday();
    var p=String(value).slice(0,10).split('-');
    return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:String(value)
  }
  function dayDiff(iso){
    if(!iso)return null;
    var a=new Date(isoToday()+'T12:00:00+03:00');
    var b=new Date(String(iso).slice(0,10)+'T12:00:00+03:00');
    return Math.round((b-a)/86400000);
  }
  function followInfo(customer){
    var date=String(customer&&customer.follow_date||'').slice(0,10);
    if(!date)return {text:'Takip tarihi yok',cls:''};
    var diff=dayDiff(date),when='';
    if(diff<0)when=Math.abs(diff)+' gün gecikti';
    else if(diff===0)when='BUGÜN';
    else if(diff===1)when='Yarın';
    else when=diff+' gün sonra';
    var method=String(customer&&customer.stage||'')==='Mail Atıldı'?'Mail dönüşünü kontrol et':'Takip et';
    return {text:'Takip: '+trDate(date)+' · '+when+' · '+method,cls:diff<0?'overdue':diff===0?'today':''};
  }

  function ensureMailStatusOption(){
    var select=document.getElementById('dResultSelect');
    if(!select)return;
    if(!select.querySelector('option[value="mailed"]')){
      var option=document.createElement('option');
      option.value='mailed';option.textContent='Mail Atıldı';
      select.appendChild(option);
    }
    try{if(selected&&String(selected.stage||'')==='Mail Atıldı')select.value='mailed'}catch(_){ }
  }

  function refresh(){
    addStyle();ensureMailStatusOption();
    var table=document.querySelector('.table-card table');
    if(!table)return;
    var headers=table.querySelectorAll('thead th');
    if(headers[9])headers[9].textContent='Son İşlem / Takip';

    document.querySelectorAll('#rows tr').forEach(function(row){
      var id=customerIdFromRow(row);if(!id)return;
      var cells=row.children;if(!cells||!cells[9])return;
      var customer=customerById(id);if(!customer)return;
      var text=lastActionText(customer),follow=followInfo(customer);
      var cell=cells[9];
      cell.classList.add('crm-last-action-cell');
      cell.innerHTML='<div class="crm-last-action-wrap">'+
        '<div class="crm-last-action-text '+(text?'':'crm-last-action-empty')+'">'+
          '<div class="crm-last-action-main" title="'+escHtml(text||'Henüz işlem yok')+'">'+escHtml(text||'Henüz işlem yok')+'</div>'+
          '<div class="crm-last-action-follow '+follow.cls+'" title="'+escHtml(follow.text)+'">'+escHtml(follow.text)+'</div>'+
        '</div>'+
        '<div class="crm-last-action-buttons">'+
          '<button type="button" class="crm-last-action-btn mail" data-crm-mail-action="'+id+'" title="Mail gönderildi olarak kaydet ve 10 gün sonrası için takip oluştur">✉ Mail</button>'+
          '<button type="button" class="crm-last-action-btn" data-crm-add-action="'+id+'" title="Başka işlem ekle">＋</button>'+
        '</div></div>';

      if(cells[7]&&String(customer.stage||'')==='Mail Atıldı'){
        cells[7].innerHTML='<span class="crm-mail-status-badge">✉ Mail Atıldı</span>';
      }
    });
    ensureMailStatusOption();
  }

  function arrayFromJson(value,fallback){
    try{var a=JSON.parse(value||'');if(Array.isArray(a)&&a.length)return a}catch(_){ }
    return fallback?[fallback]:[];
  }

  async function saveAction(id,text,mailMode){
    var c=customerById(id);if(!c)return;
    text=String(text||'').trim();if(!text)return;
    var actionDate=isoToday();
    var line='[ ] '+trDate(actionDate)+' – '+text;
    var old=String(c.special_notes||'').trim();
    var specialNotes=old?line+'\n'+old:line;
    var phones=arrayFromJson(c.phones_json,c.phone||'');
    var emails=arrayFromJson(c.emails_json,c.email||'');
    var categories=String(c.categories||c.sector||'').split(',').map(function(x){return x.trim()}).filter(Boolean);
    var followDate=mailMode?addDaysIso(10):(c.follow_date||'');
    var payload={
      company:c.company||'',contact_name:c.contact_name||'',phones:phones,emails:emails,region:c.region||'',categories:categories,
      priority:c.priority||'NORMAL',stage:mailMode?'Mail Atıldı':(c.stage||'Yeni Lead'),follow_date:followDate,
      invoice_title:c.invoice_title||'',tax_office:c.tax_office||'',tax_number:c.tax_number||'',invoice_address:c.invoice_address||'',
      special_notes:specialNotes,machine_info:c.machine_info||''
    };
    try{
      await api('/api/customers/'+id,{method:'PUT',body:JSON.stringify(payload)});
      c.special_notes=specialNotes;c.follow_date=followDate;if(mailMode)c.stage='Mail Atıldı';
      if(typeof render==='function')render();else refresh();
      setTimeout(refresh,30);
    }catch(error){alert('İşlem kaydedilemedi: '+String(error&&error.message||error))}
  }

  document.addEventListener('click',function(event){
    var mail=event.target&&event.target.closest?event.target.closest('[data-crm-mail-action]'):null;
    if(mail){event.preventDefault();event.stopPropagation();saveAction(Number(mail.getAttribute('data-crm-mail-action')),'✉ Mail atıldı',true);return}
    var add=event.target&&event.target.closest?event.target.closest('[data-crm-add-action]'):null;
    if(add){event.preventDefault();event.stopPropagation();var text=prompt('Bu müşteri için son işlemi yazın:','Telefonla görüşüldü');if(text)saveAction(Number(add.getAttribute('data-crm-add-action')),text,false)}
  },true);

  function wrapDetailFunctions(){
    ensureMailStatusOption();
    if(typeof window.loadSelected==='function'&&!window.loadSelected.__crmMailWrapped){
      var oldLoad=window.loadSelected;
      var wrappedLoad=function(){var out=oldLoad.apply(this,arguments);setTimeout(function(){ensureMailStatusOption();try{if(selected&&String(selected.stage||'')==='Mail Atıldı')document.getElementById('dResultSelect').value='mailed'}catch(_){ }},0);return out};
      wrappedLoad.__crmMailWrapped=true;window.loadSelected=wrappedLoad;
    }
    if(typeof window.saveCustomer==='function'&&!window.saveCustomer.__crmMailWrapped){
      var oldSave=window.saveCustomer;
      var wrappedSave=async function(){
        var select=document.getElementById('dResultSelect');
        if(!select||select.value!=='mailed')return oldSave.apply(this,arguments);
        try{
          if(selected){
            selected.stage='Mail Atıldı';
            var follow=document.getElementById('dFollow');
            if(follow&&!follow.value)follow.value=addDaysIso(10);
            if(follow)selected.follow_date=follow.value;
            var stamp=trDate(isoToday())+' – ✉ Mail atıldı';
            try{
              if(Array.isArray(notes)&&!notes.some(function(n){return String(n&&n.text||'').indexOf(stamp)>=0}))notes.unshift({done:false,text:stamp});
            }catch(_){ }
          }
        }catch(_){ }
        var result=await oldSave.apply(this,arguments);
        setTimeout(refresh,50);
        return result;
      };
      wrappedSave.__crmMailWrapped=true;window.saveCustomer=wrappedSave;
    }
  }

  var rows=document.getElementById('rows');
  if(rows)new MutationObserver(function(){setTimeout(function(){refresh();wrapDetailFunctions()},0)}).observe(rows,{childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){refresh();wrapDetailFunctions()},50)},{once:true});
  else setTimeout(function(){refresh();wrapDetailFunctions()},50);
})();
