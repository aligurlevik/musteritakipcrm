import worker from './customer_contact_details_entry.js';

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

const PORTFOLIO_RECOVERY_PATCH=String.raw`
(function(){
  if(window.__portfolioBlankRecoveryLoaded)return;
  window.__portfolioBlankRecoveryLoaded='20261001-1005';

  function banner(text,ok){
    var old=document.getElementById('portfolioRecoveryBanner');
    if(old)old.remove();
    var main=document.querySelector('main.main')||document.querySelector('.main');
    if(!main)return;
    var box=document.createElement('div');
    box.id='portfolioRecoveryBanner';
    box.style.cssText='margin:0 0 12px;padding:10px 12px;border-radius:9px;font-size:12px;font-weight:900;border:1px solid '+(ok?'#86efac':'#fecaca')+';background:'+(ok?'#ecfdf5':'#fff1f2')+';color:'+(ok?'#166534':'#b91c1c');
    box.textContent=text;
    var head=main.querySelector('.head');
    if(head&&head.nextSibling)main.insertBefore(box,head.nextSibling);else main.prepend(box);
    if(ok)setTimeout(function(){var x=document.getElementById('portfolioRecoveryBanner');if(x)x.remove();},2200);
  }

  async function getJson(url){
    var r=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{'cache-control':'no-cache'}});
    if(r.status===401){location.href='/';throw new Error('Oturum süresi dolmuş.');}
    var d=null;try{d=await r.json();}catch(_){ }
    if(!r.ok)throw new Error((d&&d.error)||('HTTP '+r.status));
    return d;
  }

  function clearFilters(){
    ['search','city','district','sector','priority','result','followFilter'].forEach(function(id){
      var el=document.getElementById(id);if(el)el.value='';
    });
  }

  async function recover(){
    if(location.pathname!='/musteri-portfoyu.html')return;
    var rows=document.getElementById('rows');
    if(!rows){setTimeout(recover,250);return;}
    if(rows.children.length)return;
    try{
      var c=await getJson('/api/customers?status=T%C3%BCm%C3%BC');
      if(!Array.isArray(c))throw new Error('Müşteri listesi geçersiz cevap verdi.');
      if(!c.length){banner('CRM müşteri servisi 0 kayıt döndürdü. Veritabanı tarafını kontrol ediyorum.',false);return;}
      var m=[];try{m=await getJson('/api/meetings?status=T%C3%BCm%C3%BC');}catch(_){m=[];}
      try{
        customers=c.filter(function(x){return x&&x.record_status!=='Silindi';});
        meetings=Array.isArray(m)?m:[];
        selected=null;
        selectedHistory=null;
        clearFilters();
        if(typeof fillFilters==='function')fillFilters();
        if(typeof counts==='function')counts();
        if(typeof render==='function')render();
        var first=(typeof visibleRows!=='undefined'&&visibleRows&&visibleRows[0])||customers[0];
        if(first&&typeof selectCustomer==='function')await selectCustomer(first.id);
      }catch(e){throw new Error('Ekran çizimi başarısız: '+(e&&e.message?e.message:e));}
      if(document.getElementById('rows')&&document.getElementById('rows').children.length)banner('Müşteri listesi yeniden yüklendi.',true);
      else banner('Müşteriler geldi ancak tablo çizilemedi.',false);
    }catch(e){banner('Müşteriler yüklenemedi: '+(e&&e.message?e.message:e),false);}
  }

  setTimeout(recover,1200);
  setTimeout(function(){var rows=document.getElementById('rows');if(rows&&!rows.children.length)recover();},4000);
})();
`;

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-portfolio-blank-recovery[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-portfolio-blank-recovery="20261001-1005">${PORTFOLIO_RECOVERY_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};