import worker from './new_customer_cache_entry.js';

const LIST_COLUMNS_PATCH=String.raw`
(function(){
  if(window.__crmPortfolioListColumnsVisibilityV2)return;
  window.__crmPortfolioListColumnsVisibilityV2='20261001-list-columns-visibility-v2';

  var PROVINCES=['Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin','Aydın','Balıkesir','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Isparta','Mersin','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla','Muş','Nevşehir','Niğde','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Şanlıurfa','Uşak','Van','Yozgat','Zonguldak','Aksaray','Bayburt','Karaman','Kırıkkale','Batman','Şırnak','Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce'];
  var AREA_CODES={
    '312':'Ankara','224':'Bursa','212':'İstanbul','216':'İstanbul','232':'İzmir','322':'Adana','416':'Adıyaman','272':'Afyonkarahisar','472':'Ağrı','358':'Amasya','242':'Antalya','466':'Artvin','256':'Aydın','266':'Balıkesir','228':'Bilecik','426':'Bingöl','434':'Bitlis','374':'Bolu','248':'Burdur','286':'Çanakkale','376':'Çankırı','364':'Çorum','258':'Denizli','412':'Diyarbakır','284':'Edirne','424':'Elazığ','446':'Erzincan','442':'Erzurum','222':'Eskişehir','342':'Gaziantep','454':'Giresun','456':'Gümüşhane','438':'Hakkari','326':'Hatay','246':'Isparta','324':'Mersin','474':'Kars','366':'Kastamonu','352':'Kayseri','288':'Kırklareli','386':'Kırşehir','262':'Kocaeli','332':'Konya','274':'Kütahya','422':'Malatya','236':'Manisa','344':'Kahramanmaraş','482':'Mardin','252':'Muğla','436':'Muş','384':'Nevşehir','388':'Niğde','452':'Ordu','464':'Rize','264':'Sakarya','362':'Samsun','484':'Siirt','368':'Sinop','346':'Sivas','282':'Tekirdağ','356':'Tokat','462':'Trabzon','428':'Tunceli','414':'Şanlıurfa','276':'Uşak','432':'Van','354':'Yozgat','372':'Zonguldak','382':'Aksaray','458':'Bayburt','338':'Karaman','318':'Kırıkkale','488':'Batman','486':'Şırnak','378':'Bartın','478':'Ardahan','476':'Iğdır','226':'Yalova','370':'Karabük','348':'Kilis','328':'Osmaniye','380':'Düzce'
  };

  function clean(v){return String(v==null?'':v).trim()}
  function rowsData(){try{return Array.isArray(visibleRows)?visibleRows:[]}catch(_){return []}}
  function parseArray(v){if(Array.isArray(v))return v;try{var a=JSON.parse(v||'[]');return Array.isArray(a)?a:[]}catch(_){return []}}
  function normalize(v){return clean(v).toLocaleLowerCase('tr-TR')}

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

  function enforce(){
    var table=document.querySelector('.table-card table');
    if(!table)return;
    var headers=table.querySelectorAll('thead th');
    if(headers.length<11)return;

    var titles=['Firma Adı','Yetkili','Telefon','İl','İş Alanı','Potansiyel','Durum','Son Görüşme Tarihi','','','Detay'];
    headers.forEach(function(cell,index){
      if(titles[index])cell.textContent=titles[index];
      if(index===8||index===9)cell.style.setProperty('display','none','important');
      else cell.style.setProperty('display','table-cell','important');
    });

    var widths=['17%','13%','12%','9%','14%','9%','9%','10%','','','7%'];
    headers.forEach(function(cell,index){if(widths[index])cell.style.setProperty('width',widths[index],'important')});

    var data=rowsData();
    table.querySelectorAll('#rows > tr').forEach(function(row,rowIndex){
      Array.from(row.children).forEach(function(cell,index){
        if(index===8||index===9)cell.style.setProperty('display','none','important');
        else cell.style.setProperty('display','table-cell','important');
        if(widths[index])cell.style.setProperty('width',widths[index],'important');
      });
      if(row.children[3])row.children[3].textContent=provinceOnly(data[rowIndex]);
    });
  }

  function install(){
    enforce();
    var tbody=document.getElementById('rows');
    if(tbody)new MutationObserver(function(){setTimeout(enforce,0)}).observe(tbody,{childList:true,subtree:false});
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
      html=html.replace(/<\/body>/i,`<script data-list-columns-visibility="v2">${LIST_COLUMNS_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
