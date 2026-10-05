import worker from './portfolio_api_recovery_entry.js';

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

function patchPortfolioHtml(html){
  // Eski firma tıklama/tam ekran katmanlarını final HTML'den kaldır.
  html=html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-detail\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,'');
  html=html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-stable\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi,'');
  html=html.replace(/<script[^>]*data-portfolio-fullscreen-stable[^>]*>[\s\S]*?<\/script>\s*/gi,'');
  html=html.replace(/<script[^>]*data-last-contact-auto[^>]*>[\s\S]*?<\/script>\s*/gi,'');

  // Firma adı yalnızca normal bağlantıdır. Satırın onclick'i bu tıklamayı alamaz.
  const plainCompany='<span class="company">${esc(c.company)}</span>';
  const linkedCompany='<a class="company" href="/?page=customers&editCustomer=${c.id}" onclick="event.stopPropagation()">${esc(c.company)}</a>';
  html=html.split(plainCompany).join(linkedCompany);

  return html;
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      return rebuild(response,patchPortfolioHtml(await response.text()));
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
