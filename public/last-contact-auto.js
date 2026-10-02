(function(){
  'use strict';
  if(window.__crmAutoLastContact)return;
  window.__crmAutoLastContact='20261002-v2';

  var original=window.lastMeeting;
  if(typeof original!=='function')return;

  var contacts=new Map();
  window.__crmAutoLastContactMap=contacts;

  function clean(v){return String(v==null?'':v).trim()}
  function dateOf(v){
    var s=clean(v);
    if(!s)return '';
    var d=new Date(s);
    return Number.isNaN(d.getTime())?s:d.toISOString();
  }
  function trDate(v){
    var s=clean(v);
    if(!s||s==='—')return s||'—';
    var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m)return m[3]+'.'+m[2]+'.'+m[1];
    var d=new Date(s);
    if(Number.isNaN(d.getTime()))return s;
    return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear();
  }

  window.lastMeeting=function(c){
    var meeting=original(c);
    var meetingAt=dateOf(meeting&&(meeting.meeting_date||meeting.created_at));
    var contactAt=dateOf(c&&contacts.get(String(c.id)));
    if(contactAt&&(!meetingAt||contactAt>meetingAt)){
      return {customer_id:c.id,meeting_date:contactAt,created_at:contactAt,source:'auto-contact'};
    }
    return meeting;
  };

  function formatDates(){
    try{
      document.querySelectorAll('#rows tr').forEach(function(row){
        var cell=row.children&&row.children[5];
        if(cell)cell.textContent=trDate(cell.textContent);
      });
      var last=document.getElementById('dLastMeeting');
      if(last)last.textContent=trDate(last.textContent);
    }catch(_){}
  }

  var originalRender=window.render;
  if(typeof originalRender==='function'){
    window.render=function(){
      var result=originalRender.apply(this,arguments);
      formatDates();
      return result;
    };
  }
  var originalLoadSelected=window.loadSelected;
  if(typeof originalLoadSelected==='function'){
    window.loadSelected=function(){
      var result=originalLoadSelected.apply(this,arguments);
      formatDates();
      return result;
    };
  }

  function refresh(){
    try{if(typeof window.render==='function')window.render()}catch(_){}
    try{if(typeof window.loadSelected==='function')window.loadSelected()}catch(_){}
    formatDates();
  }

  async function load(){
    try{
      var r=await fetch('/api/sales-care-contacts',{credentials:'same-origin',cache:'no-store',headers:{'cache-control':'no-cache'}});
      if(!r.ok)return;
      var d=await r.json();
      (d.contacts||[]).forEach(function(x){
        if(x&&x.customer_id&&x.last_contact_at)contacts.set(String(x.customer_id),x.last_contact_at);
      });
      refresh();
    }catch(_){}
  }

  window.addEventListener('crm-last-contact-updated',function(event){
    var d=event&&event.detail||{};
    if(!d.customer_id||!d.last_contact_at)return;
    contacts.set(String(d.customer_id),d.last_contact_at);
    refresh();
  });

  formatDates();
  load();
})();
