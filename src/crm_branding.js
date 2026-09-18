const iconVersion='20260918-2';

export async function applyCrmBranding(response,request){
  if(request&&request.method!=='GET')return response;
  if(!response.ok||!(response.headers.get('content-type')||'').includes('text/html'))return response;
  let html=await response.text();
  html=html.replace(/<link\b[^>]*\brel\s*=\s*(?:"(?:shortcut\s+)?icon"|'(?:shortcut\s+)?icon'|"apple-touch-icon"|'apple-touch-icon')[^>]*>/gi,'');
  if(request&&['/','/index.html'].includes(new URL(request.url).pathname))html=html.replace(/<link\b[^>]*\brel\s*=\s*["']manifest["'][^>]*>/gi,'<link rel="manifest" href="/crm.webmanifest">');
  const icons=`<link rel="icon" type="image/png" sizes="192x192" href="/agenda-icon-192.png?v=${iconVersion}">
<link rel="icon" type="image/png" sizes="512x512" href="/agenda-icon-512.png?v=${iconVersion}">
<link rel="apple-touch-icon" sizes="192x192" href="/agenda-icon-192.png?v=${iconVersion}">`;
  const manifest=/<link\b[^>]*\brel\s*=\s*["']manifest["']/i.test(html)?'':'<link rel="manifest" href="/crm.webmanifest">';
  html=html.replace(/<\/head>/i,icons+'\n'+manifest+'\n</head>');
  html=html.replace('<div class="logo">CRM Müşteri Takip</div>','<div class="logo crmBrand"><img src="/notes-logo-ag-v1.webp" width="48" height="48" alt="AG"><span>CRM Müşteri Takip</span></div>');
  if(html.includes('class="logo crmBrand"')&&!html.includes('id="crmBrandStyle"'))html=html.replace(/<\/head>/i,'<style id="crmBrandStyle">.crmBrand{display:flex;align-items:center;gap:10px}.crmBrand img{display:block;width:48px;height:48px;flex:0 0 48px;object-fit:contain}</style>\n</head>');
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
