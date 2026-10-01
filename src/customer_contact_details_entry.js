import worker from './customer_followup_entry.js';

const CONTACT_DETAILS_PATCH=String.raw`
(function(){
  if(window.__crmContactDetailsPatch)return;
  window.__crmContactDetailsPatch='20261001-contact-v2-stable';

  var style=document.createElement('style');
  style.id='crmContactDetailsStyle';
  style.textContent='\n#portfolioDetailExpandModal .pie-hidden-contact-editor{display:block!important;margin-top:10px!important;padding:10px!important;border:1px solid #dbe5f0!important;border-radius:10px!important;background:#f8fafc!important}\n#portfolioDetailExpandModal .crm-contact-title{font-size:13px;font-weight:950;color:#b91c1c;margin-bottom:8px}\n#portfolioDetailExpandModal .pie-contact-toggle{display:none!important}\n#portfolioDetailExpandModal .pie-contact-panel{display:block!important;margin-top:0!important;border:0!important;background:transparent!important;padding:0!important}\n#portfolioDetailExpandModal .pie-contact-head{font-size:10px!important;color:#64748b!important}\n#portfolioDetailExpandModal .pie-contact-row input{background:#fff!important}\n@media(max-width:900px){#portfolioDetailExpandModal .pie-contacts{overflow-x:auto!important}}';
  document.head.appendChild(style);

  function showContactDetails(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var editor=modal.querySelector('.pie-editor');
    if(!editor)return;
    var toggle=editor.querySelector('.pie-contact-toggle');
    var holder=toggle&&toggle.closest('.pie-field');
    var panel=holder&&holder.querySelector('.pie-contact-panel');
    if(!holder||!panel)return;

    if(holder.classList.contains('pie-hidden-contact-editor'))holder.classList.remove('pie-hidden-contact-editor');
    if(panel.hasAttribute('hidden'))panel.removeAttribute('hidden');
    if(toggle.getAttribute('aria-expanded')!=='true')toggle.setAttribute('aria-expanded','true');

    if(!holder.querySelector('.crm-contact-title')){
      var title=document.createElement('div');
      title.className='crm-contact-title';
      title.textContent='👥 Yetkili Kişiler — İsim, Görev, Telefon ve E-posta';
      holder.insertBefore(title,panel);
    }
  }

  var observer=new MutationObserver(function(){setTimeout(showContactDetails,0)});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',function(){setTimeout(showContactDetails,40)},true);
  showContactDetails();
})();
`;

const NEW_CUSTOMER_LOCATION_PATCH=String.raw`
(function(){
  if(window.__newCustomerLocationPatch)return;
  window.__newCustomerLocationPatch='20261001-tr-locations-v1';

  var follow=document.getElementById('follow_date');
  if(follow){
    var followField=follow.closest('.field');
    var hidden=document.createElement('input');
    hidden.type='hidden';
    hidden.id='follow_date';
    hidden.value='';
    if(followField&&followField.parentNode){
      followField.parentNode.insertBefore(hidden,followField);
      followField.remove();
    }else{
      follow.type='hidden';
      follow.value='';
    }
  }

  var regionInput=document.getElementById('region');
  var districtInput=document.getElementById('district');
  if(!regionInput||!districtInput)return;

  var oldRegion=String(regionInput.value||'').trim();
  var oldDistrict=String(districtInput.value||'').trim();

  function makeSelect(oldInput,placeholder){
    var select=document.createElement('select');
    select.id=oldInput.id;
    select.className=oldInput.className||'';
    select.innerHTML='<option value="">'+placeholder+'</option>';
    oldInput.replaceWith(select);
    return select;
  }

  function normalize(v){
    return String(v||'').trim().toLocaleUpperCase('tr-TR');
  }

  function addOption(select,value,label,selected){
    var option=document.createElement('option');
    option.value=value;
    option.textContent=label;
    if(selected)option.selected=true;
    select.appendChild(option);
  }

  fetch('/api/turkey-locations',{cache:'force-cache',credentials:'same-origin'})
    .then(function(r){if(!r.ok)throw new Error('İl/ilçe listesi alınamadı.');return r.json()})
    .then(function(data){
      if(!Array.isArray(data)||!data.length)throw new Error('İl/ilçe listesi boş.');
      var collator=new Intl.Collator('tr-TR',{sensitivity:'base'});
      data=data.slice().sort(function(a,b){return collator.compare(a.name,b.name)});

      var region=makeSelect(regionInput,'İl seçin');
      var district=makeSelect(districtInput,'Önce il seçin');
      district.disabled=true;

      var selectedRegion='';
      data.forEach(function(city){
        var selected=normalize(city.name)===normalize(oldRegion);
        addOption(region,city.name,city.name,selected);
        if(selected)selectedRegion=city.name;
      });

      function fillDistricts(cityName,preferred){
        district.innerHTML='';
        if(!cityName){
          addOption(district,'','Önce il seçin',true);
          district.disabled=true;
          return;
        }
        var city=data.find(function(x){return normalize(x.name)===normalize(cityName)});
        var districts=city&&Array.isArray(city.districts)?city.districts.slice():[];
        districts.sort(function(a,b){return collator.compare(a.name,b.name)});
        addOption(district,'','İlçe seçin',!preferred);
        districts.forEach(function(item){
          addOption(district,item.name,item.name,normalize(item.name)===normalize(preferred));
        });
        district.disabled=false;
      }

      region.addEventListener('change',function(){fillDistricts(region.value,'')});
      fillDistricts(selectedRegion||region.value,oldDistrict);
    })
    .catch(function(err){
      console.warn('Türkiye il/ilçe listesi yüklenemedi:',err);
    });
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
    const url=new URL(request.url);

    if(request.method==='GET'&&url.pathname==='/api/turkey-locations'){
      try{
        const upstream=await fetch('https://raw.githubusercontent.com/nidea1/Turkey-s-Provinces-Districts/master/Turkey.json');
        if(!upstream.ok)throw new Error('location source failed');
        const headers=new Headers();
        headers.set('content-type','application/json; charset=utf-8');
        headers.set('cache-control','public, max-age=86400');
        return new Response(upstream.body,{status:200,headers});
      }catch(_){
        return new Response(JSON.stringify({error:'İl ve ilçe listesi alınamadı.'}),{status:502,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
      }
    }

    const response=await worker.fetch(request,env,ctx);

    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-contact-details-patch[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-contact-details-patch="20261001-contact-v2-stable">${CONTACT_DETAILS_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }

    if(request.method==='GET'&&url.pathname==='/yeni-musteri.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-new-customer-location-patch[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-new-customer-location-patch="20261001-tr-locations-v1">${NEW_CUSTOMER_LOCATION_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }

    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
