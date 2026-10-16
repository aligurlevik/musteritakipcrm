import worker from './graphic_weekly_revenue_entry.js';
import {drawingApi} from './engview_drawings.js';

let agendaSchemaPromise;
async function agendaColumns(env){
 const result=await env.DB.prepare('PRAGMA table_info(agenda_entries)').all();
 return new Set((result.results||[]).map(row=>row.name));
}
async function ensureAgendaColumn(env,name,definition){
 const existing=await agendaColumns(env);
 if(!existing.has(name))await env.DB.prepare(`ALTER TABLE agenda_entries ADD COLUMN ${name} ${definition}`).run();
}
async function ensureAgendaSchema(env){
 if(agendaSchemaPromise)return agendaSchemaPromise;
 agendaSchemaPromise=(async()=>{
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS agenda_entries(
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   entry_date TEXT NOT NULL,
   sort_order INTEGER DEFAULT 1,
   note TEXT NOT NULL,
   remind_at TEXT DEFAULT '',
   reminder_status TEXT DEFAULT '',
   entry_status TEXT DEFAULT 'Yapılacak',
   completed_date TEXT DEFAULT '',
   image_data TEXT DEFAULT '',
   source_type TEXT DEFAULT 'manual',
   created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`).run();
  for(const [name,definition] of [
   ['sort_order','INTEGER DEFAULT 1'],
   ['remind_at',"TEXT DEFAULT ''"],
   ['reminder_status',"TEXT DEFAULT ''"],
   ['entry_status',"TEXT DEFAULT 'Yapılacak'"],
   ['completed_date',"TEXT DEFAULT ''"],
   ['source_type',"TEXT DEFAULT 'manual'"]
  ])await ensureAgendaColumn(env,name,definition);
 })().catch(error=>{agendaSchemaPromise=undefined;throw error});
 return agendaSchemaPromise;
}

export default {
 async fetch(request,env,ctx){
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/native-alarm/agenda')||path==='/api/native-alarm/reminders'||path==='/api/native-alarm/ack')await ensureAgendaSchema(env);
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
