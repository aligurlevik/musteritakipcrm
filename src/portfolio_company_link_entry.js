import worker from './portfolio_api_recovery_entry.js';

function rebuild(response, html) {
  const headers = new Headers(response.headers);
  for (const name of ['content-length', 'content-encoding', 'etag']) headers.delete(name);
  headers.set('cache-control', 'no-cache, no-store, must-revalidate');
  headers.set('x-crm-company-open', 'native-link-v3');
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

const LINK_CSS = `
<style data-crm-company-native-link="20261006-v3">
.crm-company-native-link{
  color:#1769f6!important;
  text-decoration:underline!important;
  text-underline-offset:2px!important;
  font-weight:900!important;
  cursor:pointer!important;
}
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
</style>
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
  html = html.replace(/<style[^>]*data-crm-company-native-link[^>]*>[\s\S]*?<\/style>\s*/gi, '');
  return html;
}

export function patchPortfolioHtml(html){
  html = stripOldClickLayers(html);

  const nativeCompany =
    '<a class="company crm-company-native-link" href="/?page=customers&editCustomer=${c.id}">${esc(c.company)}</a>';

  html = html.replace(
    /<span\b[^>]*class=["'][^"']*\bcompany\b[^"']*["'][^>]*>\$\{esc\(c\.company\)\}<\/span>/gi,
    nativeCompany
  );
  html = html.replace(
    /<a\b[^>]*class=["'][^"']*\bcompany\b[^"']*["'][^>]*>\$\{esc\(c\.company\)\}<\/a>/gi,
    nativeCompany
  );
  html = html.replace(
    /<button\b[^>]*class=["'][^"']*\bcompany\b[^"']*["'][^>]*>\$\{esc\(c\.company\)\}<\/button>/gi,
    nativeCompany
  );

  // Firma adına basınca satırın eski selectCustomer davranışı devreye girmesin.
  html = html.replace(
    /<tr class="\$\{cls\}\$\{sel\}" onclick="selectCustomer\(\$\{c\.id\}\)">/g,
    '<tr class="${cls}${sel}">'
  );

  if(!html.includes('id="crmPortfolioBuild"')){
    html = html.replace(
      /<body([^>]*)>/i,
      '<body$1><div id="crmPortfolioBuild">PORTFÖY 06.10-E</div>'
    );
  }

  html = html.replace(/<\/head>/i, LINK_CSS + '\n</head>');
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
