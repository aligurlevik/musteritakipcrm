import worker from './graphic_weekly_revenue_entry.js';
import {drawingApi} from './engview_drawings.js';
export default {
 async fetch(request,env,ctx){
  const result=await drawingApi(request,env,async()=>{
   const session=await worker.fetch(new Request(new URL('/api/session',request.url),{headers:request.headers}),env,ctx);
   return session.ok?(await session.json()).role:'';
  });if(result)return result;
  const response=await worker.fetch(request,env,ctx);
  if(request.method==='GET'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
   const html=await response.text();if(!html.includes('id="graphicJobs"'))return new Response(html,response);
   const headers=new Headers(response.headers);for(const h of ['content-length','content-encoding','etag'])headers.delete(h);
   return new Response(html.replace('</body>','<script src="/engview-sync.js" defer></script></body>'),{status:response.status,headers});
  }
  return response;
 },
 async scheduled(controller,env,ctx){if(worker.scheduled)return worker.scheduled(controller,env,ctx)}
};
