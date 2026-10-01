import worker from './customer_sales_meetings_entry.js';

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

const MAIL_POOL_PATCH=String.raw`
(function(){
  if(window.__crmMailPoolFix)return;
  window.__crmMailPoolFix='20261001-mail-pool-v1';

  var style=document.createElement('style');
  style.id='crmMailPoolFixStyle';
  style.textContent='\n#mails.active{display:block!important}\n#mails .mail-sync-info{margin:0 0 12px;padding:10px 12px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1e3a8a;font-size:12px;font-weight:800}\n#mails .mail-sync-info b{color:#1e40af}\n#mails .mail-load-error{margin-top:10px;padding:10px 12px;border:1px solid #fecaca;border-radius:9px;background:#fff1f2;color:#b91c1c;font-size:12px;font-weight:800}';
  document.head.appendChild(style);

  function qs(sel){return document.querySelector(sel)}
  function qsa(sel){return Array.prototype.slice.call(document.querySelectorAll(sel))}

  function ensureInfo(){
    var section=document.getElementById('mails');
    if(!section||section.querySelector('.mail-sync-info'))return;
    var info=document.createElement('div');
    info.className='mail-sync-info';
    info.innerHTML='<b>Mail Havuzu:</b> CRM’ye kaydedilmiş gelen ve giden yazışmalar burada firma bazında görünür. Otomatik Outlook/POP3 gelen-mail aktarımı henüz bağlı değildir.';
    var toolbar=section.querySelector('.toolbar');
    if(toolbar&&toolbar.nextSibling)section.insertBefore(info,toolbar.nextSibling);else section.prepend(info);
  }

  async function loadMailPool(){
    var section=document.getElementById('mails');
    if(!section)return;
    ensureInfo();
    var list=document.getElementById('mailCompanyList');
    var summary=document.getElementById('mailListSummary');
    if(list&&!list.children.length)list.innerHTML='<div class="mail-pool-empty">Mail kayıtları yükleniyor...</div>';
    try{
      if(typeof loadMails==='function'){
        await loadMails();
      }else{
        throw new Error('Mail yükleme fonksiyonu bulunamadı.');
      }
      if(summary&&!String(summary.textContent||'').trim())summary.textContent='Mail havuzu hazır.';
    }catch(error){
      if(list)list.innerHTML='<div class="mail-load-error">Mailler yüklenemedi: '+String(error&&error.message||error)+'</div>';
    }
  }

  function activateMailPage(){
    var section=document.getElementById('mails');
    if(!section)return;
    qsa('.section').forEach(function(x){x.classList.remove('active')});
    section.classList.add('active');
    section.style.display='block';
    qsa('.menu button[data-page]').forEach(function(x){x.classList.toggle('active',x.getAttribute('data-page')==='mails')});
    var title=document.getElementById('title');
    if(title)title.textContent='Mailler';
    var topCustomerButton=qs('.top .primary');
    if(topCustomerButton)topCustomerButton.style.display='none';
    loadMailPool();
  }

  document.addEventListener('click',function(event){
    var button=event.target&&event.target.closest?event.target.closest('.menu button[data-page="mails"]'):null;
    if(!button)return;
    setTimeout(activateMailPage,0);
  },true);

  function init(){
    var page='';
    try{page=new URLSearchParams(location.search).get('page')||''}catch(_){ }
    if(page==='mails')activateMailPage();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
`;

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html')&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-mail-pool-fix[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-mail-pool-fix="20261001-mail-pool-v1">${MAIL_POOL_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
