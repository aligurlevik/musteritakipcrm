import worker from './portfolio_list_columns_visibility_entry.js';

const MENU_CLEANUP=String.raw`
<style data-main-menu-cleanup="20261001-v1">
.menu button[data-page="customers"],
.menu .customer-folder-group,
.menu button[data-page="mails"],
.nav a[href="/?page=customers"],
.nav a[href="/?page=mails"]{display:none!important}
</style>`;

const OLD_CUMULATIVE_QUERY="req('/api/graphic-jobs?created_from=2000-01-01&created_to='+encodeURIComponent(localDateKey()))";
const MONTHLY_CUMULATIVE_QUERY="req('/api/graphic-jobs?created_from='+encodeURIComponent(monthFrom)+'&created_to='+encodeURIComponent(monthTo))";

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
    const type=response.headers.get('content-type')||'';
    if(request.method==='GET'&&response.ok&&type.includes('text/html')&&['/','/index.html','/musteri-portfoyu.html'].includes(url.pathname)){
      let html=await response.text();
      html=html.replace(/<style[^>]*data-main-menu-cleanup[^>]*>[\s\S]*?<\/style>\s*/gi,'');
      html=html.replace(/<\/head>/i,`${MENU_CLEANUP}\n</head>`);
      if(url.pathname==='/'||url.pathname==='/index.html'){
        html=html.split(OLD_CUMULATIVE_QUERY).join(MONTHLY_CUMULATIVE_QUERY);
      }
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
