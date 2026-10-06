import worker from './portfolio_api_recovery_entry.js';

function rebuild(response, html) {
  const headers = new Headers(response.headers);
  for (const name of ['content-length', 'content-encoding', 'etag']) headers.delete(name);
  headers.set('cache-control', 'no-cache, no-store, must-revalidate');
  headers.set('x-crm-company-open', 'direct-inline-v2');
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

const COMPANY_OPEN_CSS = `
<style data-crm-company-open-final="20261006-v2">
.crm-company-open{
  appearance:none!important;
  border:0!important;
  background:transparent!important;
  padding:0!important;
  margin:0!important;
  color:#1769f6!important;
  text-decoration:underline!important;
  text-underline-offset:2px!important;
  font:inherit!important;
  font-weight:900!important;
  cursor:pointer!important;
  text-align:left!important;
}
#crmCustomerClose{display:none!important}
#crmPortfolioBuild{
  position:fixed!important;
  right:8px!important;
  bottom:8px!important;
  z-index:2147483646!important;
  background:#0b1730!important;
  color:#fff!important;
  border-radius:6px!important;
  padding:4px 7px!important;
  font:700 10px Segoe UI,Arial,sans-serif!important;
  opacity:.82!important;
  pointer-events:none!important;
}
body.crm-portfolio-detail-open{overflow:hidden!important}
body.crm-portfolio-detail-open #detail{
  position:fixed!important;
  inset:0!important;
  z-index:2147483000!important;
  width:100vw!important;
  height:100vh!important;
  max-width:none!important;
  max-height:none!important;
  min-width:0!important;
  min-height:0!important;
  margin:0!important;
  border:0!important;
  border-radius:0!important;
  overflow:auto!important;
  background:#f4f7fb!important;
  box-shadow:none!important;
}
body.crm-portfolio-detail-open #detail .detail-head{
  position:sticky!important;
  top:0!important;
  z-index:60!important;
  background:#fff!important;
}
body.crm-portfolio-detail-open #detail .tabs{
  position:sticky!important;
  top:52px!important;
  z-index:55!important;
  background:#fff!important;
}
body.crm-portfolio-detail-open #detail .detail-body{
  width:min(1500px,calc(100vw - 44px))!important;
  max-width:1500px!important;
  margin:0 auto!important;
  padding:20px 0 40px!important;
}
body.crm-portfolio-detail-open #crmCustomerClose{display:inline-flex!important}
@media(max-width:900px){
  body.crm-portfolio-detail-open #detail .detail-body{width:calc(100vw - 24px)!important}
  body.crm-portfolio-detail-open #detail .two-col{grid-template-columns:1fr!important}
}
</style>
`;

const COMPANY_OPEN_JS = `
<script data-crm-company-open-final="20261006-v2">
(function(){
  'use strict';

  window.crmOpenPortfolioCustomer = function(id, event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }

    var activeId = Number(id || 0);
    if(!activeId) return false;

    try{
      var task;
      if(typeof window.selectCustomer === 'function'){
        task = window.selectCustomer(activeId);
      }else if(typeof selectCustomer === 'function'){
        task = selectCustomer(activeId);
      }

      document.body.classList.add('crm-portfolio-detail-open');

      var detail = document.getElementById('detail');
      if(detail){
        try{ detail.scrollTop = 0; }catch(_){}
      }

      if(task && typeof task.catch === 'function'){
        task.catch(function(error){
          console.error('Müşteri seçilemedi', error);
        });
      }
    }catch(error){
      console.error('Müşteri açılamadı', error);
    }

    return false;
  };

  window.crmClosePortfolioCustomer = function(event){
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    document.body.classList.remove('crm-portfolio-detail-open');
    return false;
  };

  document.documentElement.setAttribute('data-crm-company-open', '20261006-v2');
})();
</script>
`;

function stripOldClickLayers(html){
  html = html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-detail\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi, '');
  html = html.replace(/<script\s+[^>]*src=["']\/portfolio-fullscreen-stable\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi, '');
  html = html.replace(/<script\s+[^>]*src=["']\/portfolio-customer-jump\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi, '');
  html = html.replace(/<script\s+[^>]*src=["']\/last-contact-auto\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi, '');
  html = html.replace(/<script[^>]*data-portfolio-fullscreen-stable[^>]*>[\s\S]*?<\/script>\s*/gi, '');
  html = html.replace(/<script[^>]*data-portfolio-name-click[^>]*>[\s\S]*?<\/script>\s*/gi, '');
  html = html.replace(/<script[^>]*data-portfolio-customer-jump[^>]*>[\s\S]*?<\/script>\s*/gi, '');
  html = html.replace(/<script[^>]*data-last-contact-auto[^>]*>[\s\S]*?<\/script>\s*/gi, '');
  html = html.replace(/<style[^>]*data-crm-company-open-final[^>]*>[\s\S]*?<\/style>\s*/gi, '');
  html = html.replace(/<script[^>]*data-crm-company-open-final[^>]*>[\s\S]*?<\/script>\s*/gi, '');
  return html;
}

export function patchPortfolioHtml(html){
  html = stripOldClickLayers(html);

  const directCompany =
    '<button type="button" class="company crm-company-open" onclick="return crmOpenPortfolioCustomer(${c.id},event)">${esc(c.company)}</button>';

  html = html.replace(
    /<span\b[^>]*class=["'][^"']*\bcompany\b[^"']*["'][^>]*>\$\{esc\(c\.company\)\}<\/span>/gi,
    directCompany
  );
  html = html.replace(
    /<a\b[^>]*class=["'][^"']*\bcompany\b[^"']*["'][^>]*>\$\{esc\(c\.company\)\}<\/a>/gi,
    directCompany
  );
  html = html.replace(
    /<button\b[^>]*class=["'][^"']*\bcompany\b[^"']*["'][^>]*>\$\{esc\(c\.company\)\}<\/button>/gi,
    directCompany
  );

  if(!html.includes('id="crmCustomerClose"')){
    html = html.replace(
      '<div class="detail-actions">',
      '<div class="detail-actions"><button id="crmCustomerClose" type="button" class="btn small" onclick="return crmClosePortfolioCustomer(event)">✕ Kapat</button>'
    );
  }

  if(!html.includes('id="crmPortfolioBuild"')){
    html = html.replace(
      /<body([^>]*)>/i,
      '<body$1><div id="crmPortfolioBuild">PORTFÖY 06.10-D</div>'
    );
  }

  html = html.replace(/<\/head>/i, COMPANY_OPEN_CSS + '\n</head>');
  html = html.replace(/<\/body>/i, COMPANY_OPEN_JS + '\n</body>');
  return html;
}

export default {
  async fetch(request, env, ctx){
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);

    if(
      request.method === 'GET' &&
      response.ok &&
      (response.headers.get('content-type') || '').includes('text/html')
    ){
      const html = await response.text();
      const isPortfolio =
        url.pathname === '/musteri-portfoyu.html' ||
        (
          html.includes('Müşteri Portföyü') &&
          html.includes('id="rows"') &&
          html.includes('id="detail"')
        );

      if(isPortfolio){
        return rebuild(response, patchPortfolioHtml(html));
      }

      return rebuild(response, html);
    }

    return response;
  },

  async scheduled(controller, env, ctx){
    if(typeof worker.scheduled === 'function'){
      return worker.scheduled(controller, env, ctx);
    }
  }
};
