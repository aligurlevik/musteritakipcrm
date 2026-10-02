(function(){
  'use strict';
  if(window.__crmAutoLastContact)return;
  window.__crmAutoLastContact='20261002-v3';

  var contacts=new Map();
  window.__crmAutoLastContactMap=contacts;

  function clean(v){return String(v==null?'':v).trim()}
  function isoKey(v){
    var s=clean(v);
    if(!s||s==='—')return '';
    var tr=s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if(tr)return tr[3]+'-'+tr[2]+'-'+tr[1];
    var iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(iso)return iso[1]+'-'+iso[2]+'-'+iso[3];
    var d=new Date(s);
    return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);
  }
  function trDate(v){
    var key=isoKey(v);
    if(!key)return '—';
    var p=key.split('-');
    return p[2]+'.'+p[1]+'.'+p[0];
  }
  function newer(a,b){
    var ak=isoKey(a),bk=isoKey(b);
    if(!ak)return b;
    if(!bk)return a;
    return bk>ak?b:a;
  }
  function customerIdFromRow(row){
    var text=row&&row.getAttribute('onclick')||'';
    var m=text.match(/selectCustomer\((\d+)\)/);
    if(m)return String(m[1]);
    var btn=row&&row.querySelector('[onclick*="selectCustomer("]');
    m=btn&&String(btn.getAttribute('onclick')||'').match(/selectCustomer\((\d+)\)/);
    return m?String(m[1]):'';
  }
  function lastContactColumn(){
    var headers=document.querySelectorAll('.table-card thead th');
    for(var i=0;i<headers.length;i++){
      var t=clean(headers[i].textContent).toLocaleLowerCase('tr');
      if(t.indexOf('son görüşme')===0)return i;
    }
    return -1;
  }
  function selectedCustomerId(){
    var row=document.querySelector('#rows tr.selected');
    return customerIdFromRow(row);
  }
  function patchDates(){
    try{
      var idx=lastContactColumn();
      if(idx>=0){
        document.querySelectorAll('#rows tr').forEach(function(row){
          var id=customerIdFromRow(row),cell=row.children&&row.children[idx];
          if(!cell)return;
          var auto=id?contacts.get(id):'';
          var best=newer(cell.textContent,auto);
          cell.textContent=trDate(best);
        });
      }
      var selectedId=selectedCustomerId();
      var last=document.getElementById('dLastMeeting');
      if(last){
        var bestSelected=newer(last.textContent,selectedId?contacts.get(selectedId):'');
        last.textContent=trDate(bestSelected);
      }
    }catch(_){}
  }
  function delayedPatch(){
    patchDates();
    setTimeout(patchDates,0);
    setTimeout(patchDates,80);
  }

  var originalRender=window.render;
  if(typeof originalRender==='function'){
    window.render=function(){
      var result=originalRender.apply(this,arguments);
      delayedPatch();
      return result;
    };
  }
  var originalLoadSelected=window.loadSelected;
  if(typeof originalLoadSelected==='function'){
    window.loadSelected=function(){
      var result=originalLoadSelected.apply(this,arguments);
      delayedPatch();
      return result;
    };
  }

  async function load(){
    try{
      var r=await fetch('/api/sales-care-contacts',{credentials:'same-origin',cache:'no-store',headers:{'cache-control':'no-cache'}});
      if(!r.ok)return;
      var d=await r.json();
      (d.contacts||[]).forEach(function(x){
        if(x&&x.customer_id&&x.last_contact_at)contacts.set(String(x.customer_id),x.last_contact_at);
      });
      delayedPatch();
    }catch(_){}
  }

  window.addEventListener('crm-last-contact-updated',function(event){
    var d=event&&event.detail||{};
    if(!d.customer_id||!d.last_contact_at)return;
    contacts.set(String(d.customer_id),d.last_contact_at);
    delayedPatch();
  });

  document.addEventListener('click',function(){setTimeout(patchDates,100)},true);
  delayedPatch();
  load();
})();
