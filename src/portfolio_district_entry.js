import worker from './portfolio_editor_entry.js';

function rebuildHtml(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

const DISTRICT_FILTER_SCRIPT=String.raw`
(function(){
  if(window.__portfolioDistrictFilterLoaded)return;
  window.__portfolioDistrictFilterLoaded=true;

  function install(){
    var city=document.getElementById('city');
    var grid=document.querySelector('.filter-grid');
    if(!city||!grid){setTimeout(install,120);return;}
    if(document.getElementById('district'))return;

    var style=document.createElement('style');
    style.id='portfolioDistrictFilterStyle';
    style.textContent='\n.filter-grid.district-enabled{grid-template-columns:130px 130px 130px 140px 140px 140px minmax(220px,1fr) 88px 82px}\n@media(max-width:1380px){.filter-grid.district-enabled{grid-template-columns:repeat(3,1fr)}.filter-grid.district-enabled .filter.search{grid-column:span 2}}\n@media(max-width:1000px){.filter-grid.district-enabled{grid-template-columns:1fr 1fr}.filter-grid.district-enabled .filter.search{grid-column:1/-1}}';
    document.head.appendChild(style);
    grid.classList.add('district-enabled');

    var holder=document.createElement('div');
    holder.className='filter';
    holder.innerHTML='<label>İlçe</label><select id="district"><option value="">Tümü</option></select>';
    city.parentElement.insertAdjacentElement('afterend',holder);
    var district=document.getElementById('district');

    function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]});}
    function clean(v){return String(v==null?'':v).trim();}
    function activeCustomers(){
      try{return (Array.isArray(customers)?customers:[]).filter(function(c){return c&&c.record_status!=='Silindi';});}
      catch(_){return [];}
    }

    var provinceByDistrict={};
    function addProvince(province,names){names.forEach(function(name){provinceByDistrict[name.toLocaleLowerCase('tr')]=province;});}
    addProvince('Ankara',['Akyurt','Altındağ','Ayaş','Bala','Beypazarı','Çamlıdere','Çankaya','Çubuk','Elmadağ','Etimesgut','Evren','Gölbaşı','Güdül','Haymana','Kahramankazan','Kalecik','Keçiören','Kızılcahamam','Mamak','Nallıhan','Polatlı','Pursaklar','Sincan','Şereflikoçhisar','Yenimahalle']);
    addProvince('Bursa',['Büyükorhan','Gemlik','Gürsu','Harmancık','İnegöl','İznik','Karacabey','Keles','Kestel','Mudanya','Mustafakemalpaşa','Nilüfer','Orhaneli','Orhangazi','Osmangazi','Yenişehir']);
    addProvince('İstanbul',['Adalar','Arnavutköy','Ataşehir','Avcılar','Bağcılar','Bahçelievler','Bakırköy','Başakşehir','Bayrampaşa','Beşiktaş','Beykoz','Beylikdüzü','Beyoğlu','Büyükçekmece','Çatalca','Çekmeköy','Esenler','Esenyurt','Eyüpsultan','Fatih','Gaziosmanpaşa','Güngören','Kadıköy','Kağıthane','Kartal','Küçükçekmece','Maltepe','Pendik','Sancaktepe','Sarıyer','Silivri','Sultanbeyli','Sultangazi','Şile','Şişli','Tuzla','Ümraniye','Üsküdar','Zeytinburnu']);
    addProvince('İzmir',['Aliağa','Balçova','Bayındır','Bayraklı','Bergama','Beydağ','Bornova','Buca','Çeşme','Çiğli','Dikili','Foça','Gaziemir','Güzelbahçe','Karabağlar','Karaburun','Karşıyaka','Kemalpaşa','Kınık','Kiraz','Konak','Menderes','Menemen','Narlıdere','Ödemiş','Seferihisar','Selçuk','Tire','Torbalı','Urla']);

    function legacyParts(c){
      var region=clean(c&&c.region);
      if(region.indexOf('/')<0)return null;
      var parts=region.split('/').map(function(x){return clean(x);}).filter(Boolean);
      if(parts.length<2)return null;
      return {left:parts.slice(0,-1).join(' / '),district:parts[parts.length-1]};
    }
    function districtOf(c){
      var stored=clean(c&&c.district);
      if(stored)return stored;
      var legacy=legacyParts(c);
      return legacy?legacy.district:'';
    }
    function cityOf(c){
      var region=clean(c&&c.region);
      if(!region)return '';
      if(region.indexOf('/')<0)return region;
      var d=districtOf(c);
      var mapped=provinceByDistrict[d.toLocaleLowerCase('tr')];
      if(mapped)return mapped;
      var legacy=legacyParts(c);
      return legacy?legacy.left:region;
    }

    function rebuildCityOptions(keepSelection){
      var previous=keepSelection?clean(city.value):'';
      var names=activeCustomers().map(cityOf).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return a.localeCompare(b,'tr');});
      city.innerHTML='<option value="">Tümü</option>'+names.map(function(name){return '<option value="'+esc(name)+'">'+esc(name)+'</option>';}).join('');
      if(previous&&names.indexOf(previous)>=0)city.value=previous;
    }

    function updateDistricts(reset){
      var cityValue=clean(city.value);
      var current=reset?'':clean(district.value);
      var names=activeCustomers()
        .filter(function(c){return !cityValue||cityOf(c)===cityValue;})
        .map(districtOf)
        .filter(Boolean)
        .filter(function(v,i,a){return a.indexOf(v)===i;})
        .sort(function(a,b){return a.localeCompare(b,'tr');});
      district.innerHTML='<option value="">Tümü</option>'+names.map(function(name){return '<option value="'+esc(name)+'">'+esc(name)+'</option>';}).join('');
      if(!reset&&names.indexOf(current)>=0)district.value=current;
    }

    try{
      var originalFillFilters=fillFilters;
      fillFilters=function(){
        originalFillFilters();
        rebuildCityOptions(true);
        updateDistricts(false);
      };
    }catch(_){}

    try{
      filterRows=function(){
        var q=clean(document.getElementById('search')&&document.getElementById('search').value).toLocaleLowerCase('tr');
        var cityValue=clean(city.value),districtValue=clean(district.value);
        var sector=clean(document.getElementById('sector')&&document.getElementById('sector').value);
        var prio=clean(document.getElementById('priority')&&document.getElementById('priority').value);
        var res=clean(document.getElementById('result')&&document.getElementById('result').value);
        var follow=clean(document.getElementById('followFilter')&&document.getElementById('followFilter').value);
        return activeCustomers()
          .filter(function(c){return !cityValue||cityOf(c)===cityValue;})
          .filter(function(c){return !districtValue||districtOf(c)===districtValue;})
          .filter(function(c){return !sector||String(c.categories||c.sector||'').includes(sector);})
          .filter(function(c){return !prio||c.priority===prio;})
          .filter(function(c){return !res||resultOf(c)===res;})
          .filter(function(c){
            if(!follow)return true;
            if(follow==='overdue')return isOverdue(c);
            if(follow==='today')return isToday(c);
            if(follow==='future')return c.follow_date>today();
            return true;
          })
          .filter(function(c){
            if(!q)return true;
            return [c.company,c.contact_name,c.phone,c.email,cityOf(c),districtOf(c),c.region,c.categories,c.sector].join(' ').toLocaleLowerCase('tr').includes(q);
          });
      };
    }catch(error){console.error('İl / ilçe filtresi bağlanamadı',error);}

    function refreshActiveView(){
      var buttons=Array.prototype.slice.call(document.querySelectorAll('.views .viewbtn'));
      var active=document.querySelector('.views .viewbtn.active');
      var index=buttons.indexOf(active);
      if(index>0)setTimeout(function(){try{active.click();}catch(_){}},0);
    }

    function renderDistrictMap(){
      var buttons=Array.prototype.slice.call(document.querySelectorAll('.views .viewbtn'));
      var active=document.querySelector('.views .viewbtn.active');
      if(buttons.indexOf(active)!==3)return;
      var selectedCity=clean(city.value);
      var alt=document.getElementById('portfolioAltViewForced');
      if(!alt)return;
      var rows=[];
      try{rows=filterRows();}catch(_){return;}
      var groups={};
      rows.forEach(function(c){
        var name=selectedCity?(districtOf(c)||'İlçe belirtilmemiş'):(cityOf(c)||'İl belirtilmemiş');
        if(!groups[name])groups[name]=[];
        groups[name].push(c);
      });
      var names=Object.keys(groups).sort(function(a,b){return a.localeCompare(b,'tr');});
      var heading=selectedCity?('⌖ Harita — '+esc(selectedCity)+' / İlçeler'):'⌖ Harita — İller';
      alt.innerHTML='<h2>'+heading+'</h2><div class="pvf-grid">'+(names.length?names.map(function(name){
        var firms=groups[name];
        return '<div class="pvf-box"><div class="pvf-titleline"><span>'+esc(name)+'</span><span>'+firms.length+' firma</span></div><div class="pvf-muted">'+firms.map(function(c){return esc(c.company||'Müşteri');}).join('<br>')+'</div></div>';
      }).join(''):'<div class="pvf-box">Gösterilecek müşteri bulunamadı.</div>')+'</div>';
    }

    try{
      var originalClearFilters=clearFilters;
      clearFilters=function(){
        district.value='';
        originalClearFilters();
        rebuildCityOptions(false);
        updateDistricts(true);
        refreshActiveView();
      };
    }catch(_){}

    try{
      var originalLoadAll=loadAll;
      loadAll=async function(){
        var selectedCity=clean(city.value),selectedDistrict=clean(district.value);
        var result=await originalLoadAll.apply(this,arguments);
        rebuildCityOptions(false);
        var cityNames=Array.prototype.map.call(city.options,function(o){return o.value;});
        if(selectedCity&&cityNames.indexOf(selectedCity)>=0)city.value=selectedCity;
        updateDistricts(false);
        var districtNames=Array.prototype.map.call(district.options,function(o){return o.value;});
        if(selectedDistrict&&districtNames.indexOf(selectedDistrict)>=0)district.value=selectedDistrict;
        try{render();}catch(_){}
        refreshActiveView();
        return result;
      };
    }catch(_){}

    city.addEventListener('change',function(){
      updateDistricts(true);
      try{render();}catch(_){}
      refreshActiveView();
    });
    district.addEventListener('change',function(){
      try{render();}catch(_){}
      refreshActiveView();
    });

    window.addEventListener('click',function(ev){
      var button=ev.target&&ev.target.closest?ev.target.closest('.views .viewbtn'):null;
      if(!button)return;
      var buttons=Array.prototype.slice.call(document.querySelectorAll('.views .viewbtn'));
      if(buttons.indexOf(button)===3)setTimeout(renderDistrictMap,0);
    },true);

    var tries=0;
    var timer=setInterval(function(){
      tries++;
      if(activeCustomers().length){
        rebuildCityOptions(true);
        updateDistricts(false);
        clearInterval(timer);
        try{render();}catch(_){}
      }else if(tries>28){
        clearInterval(timer);
      }
    },250);
  }

  install();
})();
`;

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const response=await worker.fetch(request,env,ctx);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-portfolio-district-filter[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-portfolio-district-filter="20260930-1702">\n${DISTRICT_FILTER_SCRIPT}\n</script>\n</body>`);
      return rebuildHtml(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};