import worker from './graphic_weekly_revenue_entry.js';

let schemaPromise;
async function columns(env,table){
  const result=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((result.results||[]).map(row=>row.name));
}
async function ensureColumn(env,table,name,definition){
  const existing=await columns(env,table);
  if(!existing.has(name))await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`).run();
}
async function ensureAgendaSchema(env){
  if(schemaPromise)return schemaPromise;
  schemaPromise=(async()=>{
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
    ])await ensureColumn(env,'agenda_entries',name,definition);
  })().catch(error=>{schemaPromise=undefined;throw error});
  return schemaPromise;
}

export default {
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/native-alarm/agenda')||path==='/api/native-alarm/reminders'||path==='/api/native-alarm/ack'){
      await ensureAgendaSchema(env);
    }
    return worker.fetch(request,env,ctx);
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
