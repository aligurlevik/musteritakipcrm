(function(){
  'use strict';
  if(window.__crmPortfolioLastAction)return;
  window.__crmPortfolioLastAction='20261001-v1';

  function addStyle(){
    if(document.getElementById('crmLastActionStyle'))return;
    var s=document.createElement('style');
    s.id='crmLastActionStyle';
    s.textContent='\n#rows td.crm-last-action-cell{min-width:230px;max-width:320px}\n.crm-last-action-wrap{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center}\n.crm-last-action-text{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px;color:#334155;font-weight:700}\n.crm-last-action-empty{color:#94a3b8;font-weight:600}\n.crm-last-action-buttons{display:flex;gap:4px}\n.crm-last-action-btn{border:1px solid #cbd5e1;background:#fff;border-radius:6px;padding:4px 6px;font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap}\n.crm-last-action-btn:hover{background:#f8fafc}\n.crm-last-action-btn.mail{color:#1769f6;border-color:#bcd2ff;background:#f4f8ff}\n';
    document.head.appendChild(s);
  }

  function cleanNoteLine(value){
    return String(value||'').trim().replace(/^\[[ xX]\]\s*/,'');
  }

  function lastActionText(customer){
    var lines=String(customer&&customer.special_notes||'').split('\n').map(function(x){return cleanNoteLine(x)}).filter(Boolean);
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
    return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]});
  }

  function refresh(){
    addStyle();
    var table=document.querySelector('.table-card table');
    if(!table)return;
    var headers=table.querySelectorAll('thead th');
    if(headers[9])headers[9].textContent='Son İşlem';

    document.querySelectorAll('#rows tr').forEach(function(row){
      var id=customerIdFromRow(row);if(!id)return;
      var cells=row.children;if(!cells||!cells[9])return;
      var customer=customerById(id);if(!customer)return;
      var text=lastActionText(customer);
      var cell=cells[9];
      cell.classList.add('crm-last-action-cell');
      cell.innerHTML='<div class="crm-last-action-wrap">'+
        '<div class="crm-last-action-text '+(text?'':'crm-last-action-empty')+'" title="'+escHtml(text||'Henüz işlem yok')+'">'+escHtml(text||'Henüz işlem yok')+'</div>'+
        '<div class="crm-last-action-buttons">'+
          '<button type="button" class="crm-last-action-btn mail" data-crm-mail-action="'+id+'" title="Mail gönderildi olarak kaydet">✉ Mail</button>'+
          '<button type="button" class="crm-last-action-btn" data-crm-add-action="'+id+'" title="Başka işlem ekle">＋</button>'+
        '</div></div>';
    });
  }

  function trDate(){
    var d=new Date();
    try{return new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}catch(_){return d.toLocaleDateString('tr-TR')}
  }

  function arrayFromJson(value,fallback){
    try{var a=JSON.parse(value||'');if(Array.isArray(a)&&a.length)return a}catch(_){ }
    return fallback?[fallback]:[];
  }

  async function saveAction(id,text){
    var c=customerById(id);if(!c)return;
    text=String(text||'').trim();if(!text)return;
    var line='[ ] '+trDate()+' – '+text;
    var old=String(c.special_notes||'').trim();
    var specialNotes=old?line+'\n'+old:line;
    var phones=arrayFromJson(c.phones_json,c.phone||'');
    var emails=arrayFromJson(c.emails_json,c.email||'');
    var categories=String(c.categories||c.sector||'').split(',').map(function(x){return x.trim()}).filter(Boolean);
    var payload={
      company:c.company||'',
      contact_name:c.contact_name||'',
      phones:phones,
      emails:emails,
      region:c.region||'',
      categories:categories,
      priority:c.priority||'NORMAL',
      stage:c.stage||'Yeni Lead',
      follow_date:c.follow_date||'',
      invoice_title:c.invoice_title||'',
      tax_office:c.tax_office||'',
      tax_number:c.tax_number||'',
      invoice_address:c.invoice_address||'',
      special_notes:specialNotes,
      machine_info:c.machine_info||''
    };
    try{
      await api('/api/customers/'+id,{method:'PUT',body:JSON.stringify(payload)});
      c.special_notes=specialNotes;
      if(typeof render==='function')render();else refresh();
    }catch(error){
      alert('İşlem kaydedilemedi: '+String(error&&error.message||error));
    }
  }

  document.addEventListener('click',function(event){
    var mail=event.target&&event.target.closest?event.target.closest('[data-crm-mail-action]'):null;
    if(mail){
      event.preventDefault();event.stopPropagation();
      saveAction(Number(mail.getAttribute('data-crm-mail-action')),'✉ Mail gönderildi');
      return;
    }
    var add=event.target&&event.target.closest?event.target.closest('[data-crm-add-action]'):null;
    if(add){
      event.preventDefault();event.stopPropagation();
      var text=prompt('Bu müşteri için son işlemi yazın:','Telefonla görüşüldü');
      if(text)saveAction(Number(add.getAttribute('data-crm-add-action')),text);
    }
  },true);

  var rows=document.getElementById('rows');
  if(rows)new MutationObserver(function(){setTimeout(refresh,0)}).observe(rows,{childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(refresh,50)},{once:true});
  else setTimeout(refresh,50);
})();
