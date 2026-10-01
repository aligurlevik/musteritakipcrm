import worker from './customer_followup_entry.js';

const CONTACT_DETAILS_PATCH=String.raw`
(function(){
  if(window.__crmContactDetailsPatch)return;
  window.__crmContactDetailsPatch='20261001-contact-v3-2-status';

  var style=document.createElement('style');
  style.id='crmContactDetailsStyle';
  style.textContent='\n#portfolioDetailExpandModal .pie-hidden-contact-editor{display:block!important;margin-top:10px!important;padding:10px!important;border:1px solid #dbe5f0!important;border-radius:10px!important;background:#f8fafc!important}\n#portfolioDetailExpandModal .crm-contact-title{font-size:13px;font-weight:950;color:#b91c1c;margin-bottom:8px}\n#portfolioDetailExpandModal .pie-contact-toggle{display:none!important}\n#portfolioDetailExpandModal .pie-contact-panel{display:block!important;margin-top:0!important;border:0!important;background:transparent!important;padding:0!important}\n#portfolioDetailExpandModal .pie-contact-head{font-size:10px!important;color:#64748b!important}\n#portfolioDetailExpandModal .pie-contact-row input{background:#fff!important}\n#portfolioDetailExpandModal .crm-primary-contact-input{width:100%;border:1px solid #cbd8e8;border-radius:7px;background:#fff;color:#0f172a;padding:7px 8px;font:inherit;font-size:12px;font-weight:800;outline:none}\n#portfolioDetailExpandModal .crm-primary-contact-input:focus{border-color:#1769f6;box-shadow:0 0 0 3px rgba(23,105,246,.10)}\n#portfolioDetailExpandModal .crm-general-status-item{border-color:#fecaca!important;background:#fff7f7!important}\n#portfolioDetailExpandModal .crm-general-status-item .pdem-contact-label{color:#b91c1c!important}\n@media(max-width:900px){#portfolioDetailExpandModal .pie-contacts{overflow-x:auto!important}}';
  document.head.appendChild(style);

  function clean(v){return String(v==null?'':v).trim()}
  function parseArray(v){if(Array.isArray(v))return v;try{var a=JSON.parse(v||'[]');return Array.isArray(a)?a:[]}catch(_){return []}}
  function currentCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}
  function normalizeStage(v){
    var s=clean(v);
    if(!s||s==='Yeni Lead')return 'Yeni Müşteri';
    if(s==='İlk Görüşme')return 'Arandı';
    if(s==='Teklif'||s==='Pazarlık')return 'Teklif Verildi';
    return s;
  }
  function datePlusDays(days){
    var d=new Date();
    d.setHours(12,0,0,0);
    d.setDate(d.getDate()+Number(days||0));
    var y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+day;
  }
  function statusOptionsHtml(current){
    var opts=[
      ['Yeni Müşteri','Yeni Müşteri'],
      ['Arandı','Arandı'],
      ['Mail Atıldı','Mail Atıldı'],
      ['Teklif Verildi','Teklif Verildi'],
      ['Beklemede','Beklemede'],
      ['Kazanıldı','Olumlu'],
      ['Kaybedildi','Olumsuz']
    ];
    return opts.map(function(x){return '<option value="'+x[0]+'"'+(current===x[0]?' selected':'')+'>'+x[1]+'</option>'}).join('');
  }
  function ensureStageOption(select,value,label){
    if(!select||!value)return;
    var exists=Array.prototype.some.call(select.options||[],function(o){return o.value===value});
    if(exists)return;
    var option=document.createElement('option');
    option.value=value;
    option.textContent=label||value;
    select.appendChild(option);
  }

  function firstContact(c){
    var direct=parseArray(c&&c.contacts_json);
    var first=direct&&direct.length&&direct[0]&&typeof direct[0]==='object'?direct[0]:{};
    var names=clean(c&&c.contact_name).split(/\r?\n/).map(clean).filter(Boolean);
    var phones=parseArray(c&&c.phones_json).map(clean).filter(Boolean);
    var emails=parseArray(c&&c.emails_json).map(clean).filter(Boolean);
    var name=clean(first.name)||clean(names[0]);
    if(name.toLocaleLowerCase('tr-TR')==='yetkili')name='';
    return {
      name:name,
      phone:clean(first.phone)||clean(c&&c.phone)||clean(phones[0]),
      email:clean(first.email)||clean(c&&c.email)||clean(emails[0])
    };
  }

  function setIfBlank(input,value){
    if(input&&!clean(input.value)&&clean(value))input.value=clean(value);
  }

  function bindMirror(top,row,key){
    if(!top||!row)return;
    if(top.dataset.mirrorBound!=='1'){
      top.dataset.mirrorBound='1';
      var toRow=function(){row.value=top.value;row.dispatchEvent(new Event('input',{bubbles:true}))};
      top.addEventListener('input',toRow);
      top.addEventListener('change',toRow);
    }
    if(row.dataset['primaryMirror'+key]!=='1'){
      row.dataset['primaryMirror'+key]='1';
      var toTop=function(){
        var current=document.querySelector('#portfolioDetailExpandModal [data-primary-contact="'+key+'"]');
        if(current&&document.activeElement!==current)current.value=row.value;
      };
      row.addEventListener('input',toTop);
      row.addEventListener('change',toTop);
    }
  }

  function ensureGeneralStatus(host,editor,c){
    if(!host||!editor||!c)return;
    var hiddenStage=editor.querySelector('[data-pie="stage"]');
    var hiddenFollow=editor.querySelector('[data-pie="follow_date"]');
    if(!hiddenStage)return;

    [
      ['Yeni Müşteri','Yeni Müşteri'],['Arandı','Arandı'],['Mail Atıldı','Mail Atıldı'],
      ['Teklif Verildi','Teklif Verildi'],['Beklemede','Beklemede'],['Kazanıldı','Olumlu'],['Kaybedildi','Olumsuz']
    ].forEach(function(x){ensureStageOption(hiddenStage,x[0],x[1])});

    var normalized=normalizeStage(hiddenStage.value||c.stage);
    if(hiddenStage.value!==normalized){
      ensureStageOption(hiddenStage,normalized,normalized);
      hiddenStage.value=normalized;
    }

    var statusItem=host.querySelector('[data-general-status-item="stage"]');
    if(!statusItem){
      statusItem=document.createElement('div');
      statusItem.className='pdem-contact-item crm-general-status-item';
      statusItem.setAttribute('data-general-status-item','stage');
      statusItem.innerHTML='<div class="pdem-contact-label">Durum</div><select class="crm-primary-contact-input" data-general-status="stage"></select>';
      host.appendChild(statusItem);
    }
    var followItem=host.querySelector('[data-general-status-item="follow"]');
    if(!followItem){
      followItem=document.createElement('div');
      followItem.className='pdem-contact-item';
      followItem.setAttribute('data-general-status-item','follow');
      followItem.innerHTML='<div class="pdem-contact-label">Sonraki Takip</div><input class="crm-primary-contact-input" data-general-status="follow" type="date">';
      host.appendChild(followItem);
    }

    var topStage=statusItem.querySelector('[data-general-status="stage"]');
    var topFollow=followItem.querySelector('[data-general-status="follow"]');
    if(topStage){
      var current=normalizeStage(hiddenStage.value||c.stage);
      if(topStage.dataset.optionsReady!=='1'){
        topStage.innerHTML=statusOptionsHtml(current);
        topStage.dataset.optionsReady='1';
      }
      if(document.activeElement!==topStage)topStage.value=current;
      if(topStage.dataset.statusBound!=='1'){
        topStage.dataset.statusBound='1';
        topStage.addEventListener('change',function(){
          ensureStageOption(hiddenStage,topStage.value,topStage.options[topStage.selectedIndex]?topStage.options[topStage.selectedIndex].text:topStage.value);
          hiddenStage.value=topStage.value;
          hiddenStage.dispatchEvent(new Event('change',{bubbles:true}));
          if(topStage.value==='Mail Atıldı'&&hiddenFollow&&topFollow){
            var follow=datePlusDays(10);
            topFollow.value=follow;
            hiddenFollow.value=follow;
            hiddenFollow.dispatchEvent(new Event('change',{bubbles:true}));
          }
        });
      }
    }
    if(topFollow&&hiddenFollow){
      if(document.activeElement!==topFollow)topFollow.value=clean(hiddenFollow.value||c.follow_date).slice(0,10);
      if(topFollow.dataset.statusBound!=='1'){
        topFollow.dataset.statusBound='1';
        var syncFollow=function(){hiddenFollow.value=topFollow.value;hiddenFollow.dispatchEvent(new Event('change',{bubbles:true}))};
        topFollow.addEventListener('input',syncFollow);
        topFollow.addEventListener('change',syncFollow);
      }
    }
    if(hiddenStage.dataset.generalMirrorBound!=='1'){
      hiddenStage.dataset.generalMirrorBound='1';
      hiddenStage.addEventListener('change',function(){
        var current=document.querySelector('#portfolioDetailExpandModal [data-general-status="stage"]');
        if(current&&document.activeElement!==current)current.value=normalizeStage(hiddenStage.value);
      });
    }
    if(hiddenFollow&&hiddenFollow.dataset.generalMirrorBound!=='1'){
      hiddenFollow.dataset.generalMirrorBound='1';
      hiddenFollow.addEventListener('change',function(){
        var current=document.querySelector('#portfolioDetailExpandModal [data-general-status="follow"]');
        if(current&&document.activeElement!==current)current.value=clean(hiddenFollow.value).slice(0,10);
      });
    }
  }

  function showContactDetails(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var editor=modal.querySelector('.pie-editor');
    if(!editor)return;
    var c=currentCustomer();
    if(!c)return;

    var toggle=editor.querySelector('.pie-contact-toggle');
    var holder=toggle&&toggle.closest('.pie-field');
    var panel=holder&&holder.querySelector('.pie-contact-panel');
    if(holder&&panel){
      holder.classList.remove('pie-hidden-contact-editor');
      panel.removeAttribute('hidden');
      toggle.setAttribute('aria-expanded','true');
      if(!holder.querySelector('.crm-contact-title')){
        var title=document.createElement('div');
        title.className='crm-contact-title';
        title.textContent='👥 Yetkili Kişiler — İsim, Görev, Telefon ve E-posta';
        holder.insertBefore(title,panel);
      }
    }

    var first=firstContact(c);
    var rowName=editor.querySelector('[data-pie="name0"]');
    var rowPhone=editor.querySelector('[data-pie="phone0"]');
    var rowEmail=editor.querySelector('[data-pie="email0"]');
    setIfBlank(rowName,first.name);
    setIfBlank(rowPhone,first.phone);
    setIfBlank(rowEmail,first.email);

    var host=modal.querySelector('.pdem-contact');
    if(!host)return;
    var identity=String(c.id||'');
    if(host.dataset.crmPrimaryContactId!==identity||!host.querySelector('[data-primary-contact="name"]')){
      host.dataset.crmPrimaryContactId=identity;
      host.innerHTML='\n        <div class="pdem-contact-item"><div class="pdem-contact-label">Yetkili Adı</div><input class="crm-primary-contact-input" data-primary-contact="name" placeholder="Yetkili adı"></div>\n        <div class="pdem-contact-item"><div class="pdem-contact-label">Telefon</div><input class="crm-primary-contact-input" data-primary-contact="phone" placeholder="Telefon"></div>\n        <div class="pdem-contact-item"><div class="pdem-contact-label">E-posta</div><input class="crm-primary-contact-input" data-primary-contact="email" type="email" placeholder="E-posta"></div>';
    }

    var topName=host.querySelector('[data-primary-contact="name"]');
    var topPhone=host.querySelector('[data-primary-contact="phone"]');
    var topEmail=host.querySelector('[data-primary-contact="email"]');
    if(topName&&document.activeElement!==topName)topName.value=rowName?rowName.value:first.name;
    if(topPhone&&document.activeElement!==topPhone)topPhone.value=rowPhone?rowPhone.value:first.phone;
    if(topEmail&&document.activeElement!==topEmail)topEmail.value=rowEmail?rowEmail.value:first.email;
    bindMirror(topName,rowName,'name');
    bindMirror(topPhone,rowPhone,'phone');
    bindMirror(topEmail,rowEmail,'email');
    ensureGeneralStatus(host,editor,c);
  }

  var observer=new MutationObserver(function(){setTimeout(showContactDetails,0)});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',function(){setTimeout(showContactDetails,80)},true);
  showContactDetails();
})();
`;

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-contact-details-patch[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-contact-details-patch="20261001-contact-v3-2-status">${CONTACT_DETAILS_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
