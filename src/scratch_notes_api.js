const schemas=new WeakMap();
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function validMedia(value,kind,max){return !value||typeof value==='string'&&value.length<=max&&(kind==='image'?/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/:/^data:audio\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/i).test(value)}
export async function scratchNotesApi(request,env,authenticate){
 const path=new URL(request.url).pathname,match=path.match(/^\/api\/scratch-notes(?:\/(\d+)(\/voice)?)?$/);if(!match)return null;
 if(await authenticate()!=='admin')return json({error:'Bu not defteri yalnızca Ali yöneticisine açıktır.'},403);
 try{
 if(!schemas.has(env.DB))schemas.set(env.DB,env.DB.prepare("CREATE TABLE IF NOT EXISTS scratch_notes(id INTEGER PRIMARY KEY AUTOINCREMENT,note TEXT NOT NULL,title TEXT DEFAULT '',entry_date TEXT NOT NULL,remind_at TEXT DEFAULT '',done INTEGER DEFAULT 0,image_data TEXT DEFAULT '',audio_data TEXT DEFAULT '',created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)").run().catch(e=>{schemas.delete(env.DB);throw e}));await schemas.get(env.DB);
 const id=Number(match[1]||0),voice=Boolean(match[2]);
 if(!id&&request.method==='GET'){await env.DB.prepare('UPDATE scratch_notes SET entry_date=? WHERE done=0 AND entry_date<?').bind(day(),day()).run();return json((await env.DB.prepare("SELECT id,title,note,entry_date,remind_at,done,image_data,CASE WHEN audio_data<>'' THEN 1 ELSE 0 END has_voice FROM scratch_notes ORDER BY done,id DESC LIMIT 2000").all()).results||[])}
 let existing;if(id){existing=await env.DB.prepare('SELECT * FROM scratch_notes WHERE id=?').bind(id).first();if(!existing)return json({error:'Not bulunamadı.'},404)}
 if(voice&&request.method==='GET'){const data=existing.audio_data;if(!data)return json({error:'Ses kaydı yok.'},404);const [header,content]=data.split(','),bytes=Uint8Array.from(atob(content),c=>c.charCodeAt(0));return new Response(bytes,{headers:{'content-type':header.slice(5).split(';')[0],'cache-control':'no-store'}})}
 if(id&&!voice&&request.method==='DELETE'){await env.DB.prepare('DELETE FROM scratch_notes WHERE id=?').bind(id).run();return json({ok:true})}
 if(request.method!=='POST'&&request.method!=='PUT')return json({error:'Geçersiz işlem.'},405);
 let b;try{b=await request.json()}catch{return json({error:'Not verisi geçersiz.'},400)}
 if(voice){if(!validMedia(b.audio_data,'audio',14000000)||!b.audio_data)return json({error:'Ses kaydı geçersiz veya çok büyük.'},400);await env.DB.prepare('UPDATE scratch_notes SET audio_data=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.audio_data,id).run();return json({ok:true})}
 if(id&&b.done!==undefined&&Object.keys(b).every(k=>k==='done')){await env.DB.prepare('UPDATE scratch_notes SET done=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.done?1:0,id).run();return json({ok:true})}
 const note=String(b.note??existing?.note??'').trim().slice(0,50000),title=String(b.title??existing?.title??'').trim().slice(0,120),image=b.image_data??existing?.image_data??'',remind=String(b.remind_at??existing?.remind_at??'');
 if(!note&&!title&&!image)return json({error:'Not yazın veya resim ekleyin.'},400);
 if(!validMedia(image,'image',3000000))return json({error:'Resim geçersiz veya çok büyük.'},400);
 if(remind&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(remind)||Number.isNaN(Date.parse(remind+'+03:00'))))return json({error:'Alarm tarihi ve saati geçersiz.'},400);
 if(id){await env.DB.prepare('UPDATE scratch_notes SET note=?,title=?,remind_at=?,image_data=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(note,title,remind,image,id).run();return json({ok:true,id})}
 const result=await env.DB.prepare('INSERT INTO scratch_notes(note,title,entry_date,remind_at,image_data) VALUES(?,?,?,?,?)').bind(note,title,day(),remind,image).run();return json({ok:true,id:result.meta.last_row_id},201)
 }catch(e){console.error('Scratch notes',e);return json({error:'Not kaydedilemedi. Tekrar deneyin.'},500)}
}
