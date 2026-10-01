import worker from './new_customer_cache_entry.js';

const LIST_COLUMNS_PATCH=String.raw`
(function(){
  if(window.__crmPortfolioListColumnsVisibilityV1)return;
  window.__crmPortfolioListColumnsVisibilityV1='20261001-list-columns-visibility-v1';

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

    table.querySelectorAll('#rows > tr').forEach(function(row){
      Array.from(row.children).forEach(function(cell,index){
        if(index===8||index===9)cell.style.setProperty('display','none','important');
        else cell.style.setProperty('display','table-cell','important');
        if(widths[index])cell.style.setProperty('width',widths[index],'important');
      });
    });
  }

  function install(){
    enforce();
    var tbody=document.getElementById('rows');
    if(tbody)new MutationObserver(function(){setTimeout(enforce,0)}).observe(tbody,{childList:true,subtree:false});
    setTimeout(enforce,120);
    setTimeout(enforce,700);
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
      html=html.replace(/<\/body>/i,`<script data-list-columns-visibility="v1">${LIST_COLUMNS_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
