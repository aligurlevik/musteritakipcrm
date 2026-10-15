export const MAX_DRAWING_BYTES = 1024 * 1024;
const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const hash = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const codePattern=/^[A-Za-z0-9_-]{1,100}$/;
async function schema(db){
 await db.prepare('CREATE TABLE IF NOT EXISTS engview_devices (token_hash TEXT PRIMARY KEY, created_at TEXT DEFAULT CURRENT_TIMESTAMP, last_seen TEXT)').run();
 await db.prepare('CREATE TABLE IF NOT EXISTS engview_drawings (job_code TEXT PRIMARY KEY COLLATE NOCASE, file_name TEXT NOT NULL, file_data BLOB NOT NULL, checksum TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)').run();
}
async function limitedBytes(request){
 const reader=request.body?.getReader();if(!reader)return null;
 const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_DRAWING_BYTES){await reader.cancel();return null}chunks.push(value)}
 if(!size)return null;const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return bytes;
}
export async function drawingApi(request,env,getRole){
 const url=new URL(request.url),path=url.pathname;
 if(!path.startsWith('/api/engview/'))return null;
 const sync=path==='/api/engview/sync';
 let role='';
 if(sync){
  const token=(request.headers.get('authorization')||'').match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if(!token)return json({error:'Bağlantı anahtarı geçersiz.'},401);
  await schema(env.DB);
  const device=await env.DB.prepare('SELECT token_hash FROM engview_devices WHERE token_hash=?').bind(await hash(token)).first();
  if(!device)return json({error:'Bağlantı anahtarı iptal edilmiş veya geçersiz.'},401);
  if(request.method!=='PUT')return json({error:'Yöntem desteklenmiyor.'},405);
 }else{
  role=await getRole(request,env);
  if(!role)return json({error:'Oturum açın.'},401);
  if(!['admin','graphic'].includes(role))return json({error:'Bu bölüm yetkinize açık değil.'},403);
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)return json({error:'Geçersiz kaynak.'},403);
  await schema(env.DB);
 }
 if(path==='/api/engview/device'){
  if(role!=='admin')return json({error:'Bağlantıyı yalnızca Ali kurabilir.'},403);
  if(request.method==='POST'){
   const token=[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');
   // One active connection; replacement immediately revokes the previous token.
   await env.DB.batch([env.DB.prepare('DELETE FROM engview_devices'),env.DB.prepare('INSERT INTO engview_devices(token_hash) VALUES(?)').bind(await hash(token))]);
   return json({token},201);
  }
  if(request.method==='DELETE'){await env.DB.prepare('DELETE FROM engview_devices').run();return json({ok:true})}
  if(request.method==='GET'){return json(await env.DB.prepare('SELECT created_at,last_seen FROM engview_devices LIMIT 1').first()||{})}
  return json({error:'Yöntem desteklenmiyor.'},405);
 }
 if(sync){
  const code=url.searchParams.get('code')||'';
  if(!codePattern.test(code))return json({error:'İş kodu geçersiz.'},400);
  const jobs=await env.DB.prepare('SELECT id FROM graphic_jobs WHERE lower(job_no)=lower(?) LIMIT 2').bind(code).all();
  if(!jobs.results?.length)return json({error:'CRM iş kodu henüz bulunamadı.'},404);
  if(jobs.results.length!==1)return json({error:'Aynı kodla birden fazla iş bulundu.'},409);
  const bytes=await limitedBytes(request);
  if(!bytes)return json({error:'EVD dosyası boş veya 1 MB sınırını aşıyor.'},413);
  const checksum=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const previous=await env.DB.prepare('SELECT checksum FROM engview_drawings WHERE job_code=? COLLATE NOCASE').bind(code).first();
  if(previous?.checksum!==checksum)await env.DB.prepare('INSERT INTO engview_drawings(job_code,file_name,file_data,checksum) VALUES(?,?,?,?) ON CONFLICT(job_code) DO UPDATE SET file_name=excluded.file_name,file_data=excluded.file_data,checksum=excluded.checksum,updated_at=CURRENT_TIMESTAMP').bind(code,code+'.evd',bytes.buffer,checksum).run();
  const token=request.headers.get('authorization').slice(7);
  await env.DB.prepare('UPDATE engview_devices SET last_seen=CURRENT_TIMESTAMP WHERE token_hash=?').bind(await hash(token)).run();
  return json({ok:true,unchanged:previous?.checksum===checksum});
 }
 if(path==='/api/engview/files'&&request.method==='GET'){
  const codes=[...new Set((url.searchParams.get('codes')||'').split(',').filter(c=>codePattern.test(c)))].slice(0,100);
  if(!codes.length)return json([]);
  return json((await env.DB.prepare('SELECT job_code,file_name,updated_at FROM engview_drawings WHERE job_code COLLATE NOCASE IN ('+codes.map(()=>'?').join(',')+')').bind(...codes).all()).results||[]);
 }
 const file=path.match(/^\/api\/engview\/file\/([A-Za-z0-9_-]{1,100})$/);
 if(file&&request.method==='GET'){
  const row=await env.DB.prepare('SELECT file_name,file_data FROM engview_drawings WHERE job_code=? COLLATE NOCASE').bind(file[1]).first();
  if(!row)return json({error:'Çizim bulunamadı.'},404);
  return new Response(row.file_data,{headers:{'content-type':'application/octet-stream','content-disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(row.file_name),'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 }
 return json({error:'Bulunamadı.'},404);
}
