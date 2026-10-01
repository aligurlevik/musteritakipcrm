import worker from './new_customer_cache_entry.js';

const LIST_COLUMNS_PATCH=String.raw`
(function(){
  if(window.__crmPortfolioListColumnsVisibilityV6)return;
  window.__crmPortfolioListColumnsVisibilityV6='20261001-list-columns-visibility-v6';

  var PROVINCES=['Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın','Balıkesir','Bilecik','Bingöl','Bitlis','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Isparta','Mersin','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Şanlıurfa','Uşak','Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman','Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce'];
  var AREA_CODES={
    '312':'Ankara','224':'Bursa','212':'İstanbul','216':'İstanbul','232':'İzmir','322':'Adana','416':'Adıyaman','272':'Afyonkarahisar','472':'Ağrı','358':'Amasya','242':'Antalya','466':'Artvin','256':'Aydın','266':'Balıkesir','228':'Bilecik','426':'Bingöl','434':'Bitlis','374':'Bolu','248':'Burdur','286':'Çanakkale','376':'Çankırı','364':'Çorum','258':'Denizli','412':'Diyarbakır','284':'Edirne','424':'Elazığ','446':'Erzincan','442':'Erzurum','222':'Eskişehir','342':'Gaziantep','454':'Giresun','456':'Gümüşhane','438':'Hakkari','326':'Hatay','246':'Isparta','324':'Mersin','474':'Kars','366':'Kastamonu','352':'Kayseri','288':'Kırklareli','386':'Kırşehir','262':'Kocaeli','332':'Konya','274':'Kütahya','422':'Malatya','236':'Manisa','344':'Kahramanmaraş','482':'Mardin','252':'Muğla','436':'Muş','384':'Nevşehir','388':'Niğde','452':'Ordu','464':'Rize','264':'Sakarya','362':'Samsun','484':'Siirt','368':'Sinop','346':'Sivas','282':'Tekirdağ','356':'Tokat','462':'Trabzon','428':'Tunceli','414':'Şanlıurfa','276':'Uşak','432':'Van','354':'Yozgat','372':'Zonguldak','382':'Aksaray','458':'Bayburt','338':'Karaman','318':'Kırıkkale','488':'Batman','486':'Şırnak','378':'Bartın','478':'Ardahan','476':'Iğdır','226':'Yalova','370':'Karabük','348':'Kilis','328':'Osmaniye','380':'Düzce'
  };

  function clean(v){return String(v==null?'':v).trim()}
  function rowsData(){try{return Array.isArray(visibleRows)?visibleRows:[]}catch(_){return []}}
  function currentCustomer(){try{return typeof selected!=='undefined'?selected:null}catch(_){return null}}
  function parseArray(v){if(Array.isArray(v))return v;try{var a=JSON.parse(v||'[]');return Array.isArray(a)?a:[]}catch(_){return []}}
  function normalize(v){return clean(v).toLocaleLowerCase('tr-TR')}
  function pad(v){return String(v).padStart(2,'0')}

  function ensureStyle(){
    if(document.getElementById('crmMeetingTimeColumnStyle'))return;
    var style=document.createElement('style');
    style.id='crmMeetingTimeColumnStyle';
    style.textContent='\n.table-card th:nth-child(11),.table-card td:nth-child(11){white-space:normal!important;overflow:visible!important;text-overflow:clip!important}\n.crm-meeting-time{display:grid;gap:2px;line-height:1.25;font-size:9px;color:#334155}\n.crm-meeting-time b{font-size:9px;color:#0f172a}\n.crm-meeting-warning{display:inline-flex;width:max-content;max-width:100%;align-items:center;border-radius:999px;padding:3px 6px;font-size:8px;font-weight:950;margin-top:2px;white-space:nowrap}\n.crm-meeting-warning.future{background:#e9f9f0;color:#15803d}\n.crm-meeting-warning.soon{background:#fff7df;color:#a16207}\n.crm-meeting-warning.today{background:#ffedd5;color:#c2410c}\n.crm-meeting-warning.overdue{background:#ffe4e6;color:#be123c}\n.crm-meeting-warning.none{background:#eef2f7;color:#64748b}\n#portfolioDetailExpandModal .crm-general-follow-card{display:grid;grid-template-columns:1fr 1fr auto;gap:9px;align-items:end;border:1px solid #fecaca;background:#fff7f7;border-radius:10px;padding:10px;margin:0 0 11px}\n#portfolioDetailExpandModal .crm-general-follow-field label{display:block;font-size:10px;font-weight:950;color:#991b1b;margin-bottom:4px}\n#portfolioDetailExpandModal .crm-general-follow-field select,#portfolioDetailExpandModal .crm-general-follow-field input{width:100%;height:36px;border:1px solid #cbd8e8;border-radius:8px;background:#fff;padding:0 9px;font-size:12px;font-weight:800;color:#0f172a}\n#portfolioDetailExpandModal .crm-general-follow-save{height:36px;border:0;border-radius:8px;background:#1769f6;color:#fff;padding:0 13px;font-size:11px;font-weight:950;cursor:pointer;white-space:nowrap}\n#portfolioDetailExpandModal .crm-general-follow-note{grid-column:1/-1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:10px;color:#64748b}\n@media(max-width:850px){#portfolioDetailExpandModal .crm-general-follow-card{grid-template-columns:1fr}.crm-general-follow-note{grid-column:auto}}\n';
    document.head.appendChild(style);
  }

  function provinceOnly(customer){
    if(!customer)return '—';
    var region=clean(customer.region);
    var nr=normalize(region);
    for(var i=0;i<PROVINCES.length;i++){
      if(nr.indexOf(normalize(PROVINCES[i]))>=0)return PROVINCES[i];
    }

    var phone=clean(customer.phone)||clean(parseArray(customer.phones_json)[0]);
    var digits=phone.replace(/\D/g,'').replace(/^90/,'').replace(/^0/,'');
    var code=digits.slice(0,3);
    if(AREA_CODES[code])return AREA_CODES[code];

    var districtHints={
      'yenimahalle':'Ankara','etimesgut':'Ankara','şaşmaz':'Ankara','ivedik':'Ankara','sincan':'Ankara','çankaya':'Ankara','keçiören':'Ankara','mamak':'Ankara','pursaklar':'Ankara','gölbaşı':'Ankara',
      'osmangazi':'Bursa','nilüfer':'Bursa','yıldırım':'Bursa','inegöl':'Bursa','gemlik':'Bursa','mudanya':'Bursa',
      'kadıköy':'İstanbul','üsküdar':'İstanbul','beşiktaş':'İstanbul','şişli':'İstanbul','pendik':'İstanbul','tuzla':'İstanbul','esenler':'İstanbul','bağcılar':'İstanbul','başakşehir':'İstanbul','ataşehir':'İstanbul','beylikdüzü':'İstanbul','bakırköy':'İstanbul',
      'konak':'İzmir','bornova':'İzmir','buca':'İzmir','karşıyaka':'İzmir','çiğli':'İzmir','gaziemir':'İzmir','torbalı':'İzmir'
    };
    for(var key in districtHints){if(nr.indexOf(key)>=0)return districtHints[key]}
    return region||'—';
  }

  function stageText(customer){
    var stage=clean(customer&&customer.stage);
    if(!stage||stage==='Yeni Lead')return 'Yeni Müşteri';
    if(stage==='İlk Görüşme')return 'Arandı';
    if(stage==='Teklif')return 'Teklif Verildi';
    return stage;
  }

  function normalizedStageValue(value){
    var stage=clean(value);
    if(!stage||stage==='Yeni Lead')return 'Yeni Müşteri';
    if(stage==='İlk Görüşme')return 'Arandı';
    if(stage==='Teklif'||stage==='Pazarlık')return 'Teklif Verildi';
    return stage;
  }

  function stageClass(customer){
    var s=normalize(stageText(customer));
    if(s.indexOf('kazan')>=0||s==='olumlu')return 'pos';
    if(s.indexOf('kaybed')>=0||s==='olumsuz')return 'neg';
    if(s.indexOf('bekle')>=0)return 'wait';
    if(s.indexOf('mail')>=0||s.indexOf('teklif')>=0)return 'offer';
    return 'open';
  }

  function showStage(cell,customer){
    if(!cell)return;
    cell.innerHTML='';
    var badge=document.createElement('span');
    badge.className='badge '+stageClass(customer);
    badge.textContent=stageText(customer);
    cell.appendChild(badge);
  }

  function ymd(value){
    var s=clean(value);
    var m=s.match(/(20\d{2})-(\d{2})-(\d{2})/);
    return m?m[1]+'-'+m[2]+'-'+m[3]:'';
  }

  function trDate(value){
    var d=ymd(value);
    if(!d)return '—';
    var p=d.split('-');
    return p[2]+'.'+p[1]+'.'+p[0];
  }

  function mailSentDate(customer){
    if(!customer)return '';
    var direct=ymd(customer.last_outgoing_mail_date);
    if(direct)return direct;
    var notes=clean(customer.special_notes);
    var marker=notes.match(/\[MAIL_ATILDI:(20\d{2}-\d{2}-\d{2})\]/i);
    if(marker)return marker[1];
    var human=notes.match(/(\d{2})\.(\d{2})\.(20\d{2})[^\n]{0,40}mail\s*at[ıi]ld[ıi]/i);
    if(human)return human[3]+'-'+human[2]+'-'+human[1];
    if(normalize(stageText(customer)).indexOf('mail')>=0){
      return ymd(customer.updated_at)||ymd(customer.created_at);
    }
    return '';
  }

  function todayKey(){
    var d=new Date();
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  }

  function datePlusDays(days){
    var d=new Date();
    d.setHours(12,0,0,0);
    d.setDate(d.getDate()+Number(days||0));
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  }

  function dateSerial(value){
    var d=ymd(value);
    if(!d)return null;
    var p=d.split('-').map(Number);
    return Date.UTC(p[0],p[1]-1,p[2]);
  }

  function warningInfo(followDate){
    var target=dateSerial(followDate),today=dateSerial(todayKey());
    if(target==null)return {cls:'none',text:'⚪ Takip tarihi yok'};
    var diff=Math.round((target-today)/86400000);
    if(diff<0)return {cls:'overdue',text:'🔴 '+Math.abs(diff)+' gün gecikti'};
    if(diff===0)return {cls:'today',text:'🟠 BUGÜN GÖRÜŞ'};
    if(diff===1)return {cls:'soon',text:'🟡 YARIN GÖRÜŞ'};
    if(diff<=3)return {cls:'soon',text:'⏰ '+diff+' gün kaldı'};
    return {cls:'future',text:'✓ '+diff+' gün kaldı'};
  }

  function showMeetingTime(cell,customer){
    if(!cell)return;
    var mailDate=mailSentDate(customer),follow=clean(customer&&customer.follow_date),warning=warningInfo(follow);
    cell.innerHTML='';
    var box=document.createElement('div');
    box.className='crm-meeting-time';
    box.innerHTML='<div>✉ Mail: <b>'+trDate(mailDate)+'</b></div><div>📅 Görüşme: <b>'+trDate(follow)+'</b></div><span class="crm-meeting-warning '+warning.cls+'">'+warning.text+'</span>';
    cell.appendChild(box);
  }

  function ensureStageOption(select,value){
    if(!select||!value)return;
    var exists=Array.prototype.some.call(select.options||[],function(o){return o.value===value});
    if(exists)return;
    var option=document.createElement('option');
    option.value=value;
    option.textContent=value;
    select.appendChild(option);
  }

  function statusOptionsHtml(current){
    var values=['Yeni Müşteri','Arandı','Mail Atıldı','Teklif Verildi','Beklemede','Kazanıldı','Kaybedildi'];
    return values.map(function(v){var label=v==='Kazanıldı'?'Olumlu':v==='Kaybedildi'?'Olumsuz':v;return '<option value="'+v+'"'+(v===current?' selected':'')+'>'+label+'</option>'}).join('');
  }

  function ensureGeneralEditor(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var editor=modal.querySelector('.pie-editor');
    if(!editor)return;
    var sections=editor.querySelectorAll('.pie-section');
    var generalBody=sections[0]&&sections[0].querySelector('.pie-section-body');
    var hiddenStage=editor.querySelector('[data-pie="stage"]');
    var hiddenFollow=editor.querySelector('[data-pie="follow_date"]');
    var c=currentCustomer();
    if(!generalBody||!hiddenStage||!hiddenFollow||!c)return;

    var savedStage=normalizedStageValue(c.stage);
    ensureStageOption(hiddenStage,savedStage);

    var card=generalBody.querySelector('.crm-general-follow-card');
    if(!card){
      card=document.createElement('div');
      card.className='crm-general-follow-card';
      card.innerHTML='<div class="crm-general-follow-field"><label>Durum</label><select data-crm-general-stage></select></div><div class="crm-general-follow-field"><label>Görüşme Zamanı</label><input type="date" data-crm-general-follow></div><button type="button" class="crm-general-follow-save">✓ Kaydet</button><div class="crm-general-follow-note"><span>Bu tarih ana listedeki <b>Görüşme Zamanı</b> alanına gider.</span><span class="crm-meeting-warning none" data-crm-general-warning>⚪ Takip tarihi yok</span><span data-crm-general-save-status></span></div>';
      generalBody.insertBefore(card,generalBody.firstChild);
    }

    var identity=String(c.id||'');
    var stageSelect=card.querySelector('[data-crm-general-stage]');
    var followInput=card.querySelector('[data-crm-general-follow]');
    var warningBox=card.querySelector('[data-crm-general-warning]');
    var saveStatus=card.querySelector('[data-crm-general-save-status]');

    if(card.dataset.customerId!==identity){
      card.dataset.customerId=identity;
      hiddenStage.value=savedStage;
      hiddenFollow.value=clean(c.follow_date).slice(0,10);
      stageSelect.innerHTML=statusOptionsHtml(savedStage);
      stageSelect.value=savedStage;
      followInput.value=clean(c.follow_date).slice(0,10);
      if(saveStatus)saveStatus.textContent='';
    }else{
      var liveStage=normalizedStageValue(hiddenStage.value||savedStage);
      ensureStageOption(hiddenStage,liveStage);
      if(!Array.prototype.some.call(stageSelect.options||[],function(o){return o.value===liveStage}))stageSelect.innerHTML=statusOptionsHtml(liveStage);
      if(document.activeElement!==stageSelect)stageSelect.value=liveStage;
      if(document.activeElement!==followInput)followInput.value=clean(hiddenFollow.value||c.follow_date).slice(0,10);
    }

    function refreshWarning(){
      if(!warningBox)return;
      var w=warningInfo(followInput.value);
      warningBox.className='crm-meeting-warning '+w.cls;
      warningBox.textContent=w.text;
    }
    refreshWarning();

    if(card.dataset.bound!=='1'){
      card.dataset.bound='1';
      stageSelect.addEventListener('change',function(){
        ensureStageOption(hiddenStage,stageSelect.value);
        hiddenStage.value=stageSelect.value;
        hiddenStage.dispatchEvent(new Event('change',{bubbles:true}));
        if(stageSelect.value==='Mail Atıldı'&&!followInput.value){
          followInput.value=datePlusDays(10);
          hiddenFollow.value=followInput.value;
          hiddenFollow.dispatchEvent(new Event('change',{bubbles:true}));
        }
        refreshWarning();
      });
      followInput.addEventListener('change',function(){
        hiddenFollow.value=followInput.value;
        hiddenFollow.dispatchEvent(new Event('change',{bubbles:true}));
        refreshWarning();
      });
      card.querySelector('.crm-general-follow-save').addEventListener('click',function(){
        ensureStageOption(hiddenStage,stageSelect.value);
        hiddenStage.value=stageSelect.value;
        hiddenFollow.value=followInput.value;
        hiddenStage.dispatchEvent(new Event('change',{bubbles:true}));
        hiddenFollow.dispatchEvent(new Event('change',{bubbles:true}));
        var save=editor.querySelector('.pie-save');
        if(save){
          if(saveStatus)saveStatus.textContent='Kaydediliyor...';
          save.click();
          setTimeout(function(){if(saveStatus)saveStatus.textContent='Kaydetme işlemi gönderildi.'},350);
        }else if(saveStatus){saveStatus.textContent='Kaydet düğmesi bulunamadı.'}
      });
    }
  }

  function enforce(){
    ensureStyle();
    ensureGeneralEditor();
    var table=document.querySelector('.table-card table');
    if(!table)return;
    var headers=table.querySelectorAll('thead th');
    if(headers.length<11)return;

    var titles=['Firma Adı','Yetkili','Telefon','İl','İş Alanı','Potansiyel','Durum','Son Görüşme Tarihi','','','Görüşme Zamanı'];
    headers.forEach(function(cell,index){
      if(titles[index])cell.textContent=titles[index];
      if(index===8||index===9)cell.style.setProperty('display','none','important');
      else cell.style.setProperty('display','table-cell','important');
    });

    var widths=['15%','11%','10%','8%','13%','8%','9%','9%','','','17%'];
    headers.forEach(function(cell,index){if(widths[index])cell.style.setProperty('width',widths[index],'important')});

    var data=rowsData();
    table.querySelectorAll('#rows > tr').forEach(function(row,rowIndex){
      Array.from(row.children).forEach(function(cell,index){
        if(index===8||index===9)cell.style.setProperty('display','none','important');
        else cell.style.setProperty('display','table-cell','important');
        if(widths[index])cell.style.setProperty('width',widths[index],'important');
      });
      var customer=data[rowIndex]||null;
      if(row.children[3])row.children[3].textContent=provinceOnly(customer);
      if(row.children[6])showStage(row.children[6],customer);
      if(row.children[10])showMeetingTime(row.children[10],customer);
    });
  }

  function install(){
    enforce();
    var tbody=document.getElementById('rows');
    if(tbody)new MutationObserver(function(){setTimeout(enforce,0)}).observe(tbody,{childList:true,subtree:false});
    document.addEventListener('click',function(){setTimeout(enforce,70);setTimeout(enforce,220)},true);
    setTimeout(enforce,120);
    setTimeout(enforce,700);
    setTimeout(enforce,1400);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
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
      html=html.replace(/<script[^>]*data-list-columns-visibility[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-list-columns-visibility="v6">${LIST_COLUMNS_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};