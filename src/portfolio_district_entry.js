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
    function activeCustomers(){
      try{return (Array.isArray(customers)?customers:[]).filter(function(c){return c&&c.record_status!=='Silindi';});}
      catch(_){return [];}
    }

    function updateDistricts(reset){
      var cityValue=String(city.value||'').trim();
      var current=reset?'':String(district.value||'');
      var names=activeCustomers()
        .filter(function(c){return !cityValue||String(c.region||'').trim()===cityValue;})
        .map(function(c){return String(c.district||'').trim();})
        .filter(Boolean)
        .filter(function(v,i,a){return a.indexOf(v)===i;})
        .sort(function(a,b){return a.localeCompare(b,'tr');});
      district.innerHTML='<option value="">Tümü</option>'+names.map(function(name){return '<option value="'+esc(name)+'">'+esc(name)+'</option>';}).join('');
      if(!reset&&names.indexOf(current)>=0)district.value=current;
    }

    try{
      var originalFilterRows=filterRows;
      filterRows=function(){
        var rows=originalFilterRows();
        var chosen=String(district.value||'').trim();
        return chosen?rows.filter(function(c){return String(c.district||'').trim()===chosen;}):rows;
      };
    }catch(error){console.error('İlçe filtresi bağlanamadı',error);}

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
      var selectedCity=String(city.value||'').trim();
      if(!selectedCity)return;
      var alt=document.getElementById('portfolioAltViewForced');
      if(!alt)return;
      var rows=[];
      try{rows=filterRows();}catch(_){return;}
      var groups={};
      rows.forEach(function(c){
        var name=String(c.district||'').trim()||'İlçe belirtilmemiş';
        if(!groups[name])groups[name]=[];
        groups[name].push(c);
      });
      var names=Object.keys(groups).sort(function(a,b){return a.localeCompare(b,'tr');});
      alt.innerHTML='<h2>⌖ Harita — '+esc(selectedCity)+' / İlçeler</h2><div class="pvf-grid">'+(names.length?names.map(function(name){
        var firms=groups[name];
        return '<div class="pvf-box"><div class="pvf-titleline"><span>'+esc(name)+'</span><span>'+firms.length+' firma</span></div><div class="pvf-muted">'+firms.map(function(c){return esc(c.company||'Müşteri');}).join('<br>')+'</div></div>';
      }).join(''):'<div class="pvf-box">Bu il için ilçe bilgisi girilmiş müşteri bulunamadı.</div>')+'</div>';
    }

    try{
      var originalClearFilters=clearFilters;
      clearFilters=function(){
        district.value='';
        originalClearFilters();
        updateDistricts(true);
        refreshActiveView();
      };
    }catch(_){}

    try{
      var originalLoadAll=loadAll;
      loadAll=async function(){
        var result=await originalLoadAll.apply(this,arguments);
        updateDistricts(false);
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
      updateDistricts(false);
      if(activeCustomers().length||tries>20){
        clearInterval(timer);
        try{render();}catch(_){}
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
      html=html.replace(/<\/body>/i,`<script data-portfolio-district-filter="20260930-1655">\n${DISTRICT_FILTER_SCRIPT}\n</script>\n</body>`);
      return rebuildHtml(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};