import worker from './sales_care_bridge_entry.js';

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-cache, no-store, must-revalidate','x-crm-portfolio-recovery':'direct-d1-v1'}});
}

async function sessionOk(request,env,ctx){
  try{
    const u=new URL(request.url);
    u.pathname='/api/session';
    u.search='';
    const r=await worker.fetch(new Request(u,{method:'GET',headers:request.headers}),env,ctx);
    return r.ok;
  }catch(_){return false}
}

async function directCustomers(env){
  const r=await env.DB.prepare(`SELECT * FROM customers WHERE COALESCE(record_status,'Aktif')<>'Silindi' ORDER BY CASE priority WHEN 'KRİTİK' THEN 1 WHEN 'YÜKSEK' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, company COLLATE NOCASE`).all();
  return r.results||[];
}

async function directMeetings(env){
  const r=await env.DB.prepare(`SELECT m.* FROM meetings m LEFT JOIN customers c ON c.id=m.customer_id WHERE COALESCE(c.record_status,'Aktif')<>'Silindi' ORDER BY COALESCE(m.meeting_date,m.created_at) DESC`).all();
  return r.results||[];
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    const path=url.pathname;
    const wantsAll=url.searchParams.get('status')==='Tümü';

    if(request.method==='GET'&&wantsAll&&(path==='/api/customers'||path==='/api/meetings')){
      if(await sessionOk(request,env,ctx)){
        try{
          if(path==='/api/customers')return json(await directCustomers(env));
          return json(await directMeetings(env));
        }catch(error){
          console.error('portfolio api recovery failed',error?.message||error);
        }
      }
    }

    return worker.fetch(request,env,ctx);
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
