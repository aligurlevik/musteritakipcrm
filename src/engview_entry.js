import {scratchNotesApi} from './scratch_notes_api.js';
import worker from './graphic_weekly_revenue_entry.js';
import {drawingApi} from './engview_drawings.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
function bearer(request){const h=request.headers.get('Authorization')||'';return h.startsWith('Bearer ')?h.slice(7).trim():''}
async function nativeAgendaHotPath(request,env,path){
 const token=bearer(request);if(!token)return json({error:'Cihaz eşleşmemiş.'},401);
 const device=await env.DB.prepare('SELECT device_token FROM native_alarm_devices_v2 WHERE device_token=?').bind(token).first();
 if(!device)return json({error:'Cihaz eşleşmemiş.'},401);
 if(path==='/api/native-alarm/agenda'&&request.method==='GET'){
  const r=await env.DB.prepare("SELECT id,entry_date,note,remind_at,entry_status,completed_date FROM agenda_entries ORDER BY CASE WHEN COALESCE(entry_status,'Yapılacak')='Yapıldı' THEN 1 ELSE 0 END, entry_date DESC, id DESC LIMIT 500").all();
  return json({ok:true,entries:r.results||[]});
 }
 if(path==='/api/native-alarm/agenda'&&request.method==='POST'){
  let b={};try{b=await request.json()}catch{}
  const note=String(b.note||'').trim();if(!note)return json({error:'Not boş olamaz.'},400);
  const date=String(b.entry_date||new Date().toISOString().slice(0,10)),remind=String(b.remind_at||'');
  const r=await env.DB.prepare("INSERT INTO agenda_entries(entry_date,sort_order,note,remind_at,reminder_status,entry_status,completed_date,image_data,source_type,title,note_type,is_important,is_archived,is_locked,text_color,bg_color,notebook_no) VALUES(?,1,?,?,?,'Yapılacak','','','manual','','Genel Not',0,0,0,'#101828','#fffdf1',1)").bind(date,note,remind,remind?'Açık':'').run();
  return json({ok:true,id:Number(r.meta?.last_row_id||0)});
 }
 const m=path.match(/^\/api\/native-alarm\/agenda\/(\d+)$/);
 if(m&&request.method==='PUT'){
  let b={};try{b=await request.json()}catch{}const note=String(b.note||'').trim();if(!note)return json({error:'Not boş olamaz.'},400);
  await env.DB.prepare("UPDATE agenda_entries SET entry_date=?,note=?,remind_at=?,reminder_status='' WHERE id=?").bind(String(b.entry_date||''),note,String(b.remind_at||''),Number(m[1])).run();return json({ok:true});
 }
 if(m&&request.method==='DELETE'){await env.DB.prepare('DELETE FROM agenda_entries WHERE id=?').bind(Number(m[1])).run();return json({ok:true});}
 if(m&&request.method==='POST'){let b={};try{b=await request.json()}catch{}const archived=!!b.archived;await env.DB.prepare("UPDATE agenda_entries SET entry_status=?,completed_date=? WHERE id=?").bind(archived?'Yapıldı':'Yapılacak',archived?new Date().toISOString().slice(0,10):'',Number(m[1])).run();return json({ok:true});}
 if(path==='/api/native-alarm/reminders'&&request.method==='GET'){
  const r=await env.DB.prepare("SELECT a.id,a.remind_at,a.note FROM agenda_entries a WHERE COALESCE(a.remind_at,'')<>'' AND COALESCE(a.reminder_status,'')<>'Tamamlandı' AND COALESCE(a.entry_status,'Yapılacak')<>'Yapıldı' AND NOT EXISTS (SELECT 1 FROM native_alarm_acks_v2 k WHERE k.device_token=? AND k.agenda_id=a.id AND k.remind_at=a.remind_at) ORDER BY a.remind_at ASC LIMIT 200").bind(token).all();
  const reminders=(r.results||[]).map(x=>{const s=String(x.remind_at||'');const iso=/[zZ]|[+-]\d\d:\d\d$/.test(s)?s:s.replace(' ','T')+':00+03:00';return {id:Number(x.id),remind_at:s,when:new Date(iso).getTime(),title:'Ajanda Hatırlatması',body:String(x.note||'Hatırlatma zamanı geldi.')}}).filter(x=>Number.isFinite(x.when));
  return json({ok:true,reminders});
 }
 if(path==='/api/native-alarm/ack'&&request.method==='POST'){
  let b={};try{b=await request.json()}catch{}const id=Number(b.id)||0,remind=String(b.remind_at||'');
  await env.DB.prepare('INSERT OR REPLACE INTO native_alarm_acks_v2(device_token,agenda_id,remind_at,acked_at) VALUES(?,?,?,CURRENT_TIMESTAMP)').bind(token,id,remind).run();
  await env.DB.prepare("UPDATE agenda_entries SET reminder_status='Tamamlandı' WHERE id=? AND remind_at=?").bind(id,remind).run();return json({ok:true});
 }
 return null;
}

export default {
 async fetch(request,env,ctx){
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/scratch-notes'))return scratchNotesApi(request,env,async()=>{const response=await worker.fetch(new Request(new URL('/api/session',request.url),{headers:request.headers}),env,ctx);return response.ok?(await response.json()).role:''});
  if(path==='/api/native-alarm/agenda'||path.startsWith('/api/native-alarm/agenda/')||path==='/api/native-alarm/reminders'||path==='/api/native-alarm/ack'){
   try{const hot=await nativeAgendaHotPath(request,env,path);if(hot)return hot}catch(error){console.error('AJANDAM hot path',error);const detail=String(error?.cause?.message||error?.message||error).replace(/^D1_ERROR:\s*/,'').slice(0,220);return json({error:'Android alarm sunucu hatası: '+detail},500)}
  }
  const result=await drawingApi(request,env,async()=>{
   const session=await worker.fetch(new Request(new URL('/api/session',request.url),{headers:request.headers}),env,ctx);
   return session.ok?(await session.json()).role:'';
  });if(result)return result;
  const response=await worker.fetch(request,env,ctx);
  if(request.method==='GET'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
   const html=(await response.text()).replace(/<head([^>]*)>/i,'<head$1><script src="/silent-fullscreen-reminders.js?v=20261023"></script>');
   const headers=new Headers(response.headers);for(const h of ['content-length','content-encoding','etag'])headers.delete(h);
   return new Response(html.includes('id="graphicJobs"')?html.replace('</body>','<script src="/engview-sync.js" defer></script></body>'):html,{status:response.status,headers});
  }
  return response;
 },
 async scheduled(controller,env,ctx){if(worker.scheduled)return worker.scheduled(controller,env,ctx)}
};
