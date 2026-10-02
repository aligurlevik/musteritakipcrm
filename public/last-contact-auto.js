(function(){
  'use strict';
  if(window.__crmAutoLastContact)return;
  window.__crmAutoLastContact='20261002-v1';

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

  window.lastMeeting=function(c){
    var meeting=original(c);
    var meetingAt=dateOf(meeting&&(meeting.meeting_date||meeting.created_at));
    var contactAt=dateOf(c&&contacts.get(String(c.id)));
    if(contactAt&&(!meetingAt||contactAt>meetingAt)){
      return {customer_id:c.id,meeting_date:contactAt,created_at:contactAt,source:'auto-contact'};
    }
    return meeting;
  };

  function refresh(){
    try{if(typeof window.render==='function')window.render()}catch(_){}
    try{if(typeof window.loadSelected==='function')window.loadSelected()}catch(_){}
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

  load();
})();
