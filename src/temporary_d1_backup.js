import worker from './production_guard.js';

// This route is intentionally temporary. It is removed as soon as the backup
// download has been validated.
const BACKUP_PATH='/api/admin/d1-backup-c5ff4d420c038f7860f8c8bb60ad4965';
const enc=new TextEncoder();

async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,enc.encode(value));
  return [...new Uint8Array(signature)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

function safeEqual(left,right){
  left=String(left||'');
  right=String(right||'');
  let diff=left.length^right.length;
  const length=Math.max(left.length,right.length);
  for(let i=0;i<length;i++)diff|=(left.charCodeAt(i)||0)^(right.charCodeAt(i)||0);
  return diff===0;
}

async function isAdmin(request,env){
  const cookie=request.headers.get('cookie')||'';
  const match=cookie.match(/(?:^|;\s*)crm_session=([^;]+)/);
  if(!match)return false;
  const day=new Date().toISOString().slice(0,10);
  const expected='admin.'+day+'.'+await hmac(env.SESSION_SECRET||'change-me','admin.'+day);
  return safeEqual(match[1],expected);
}

function quoteIdentifier(value){
  return '"'+String(value).replaceAll('"','""')+'"';
}

function bytesToHex(bytes){
  return [...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

function sqlLiteral(value){
  if(value===null||value===undefined)return 'NULL';
  if(typeof value==='number')return Number.isFinite(value)?String(value):'NULL';
  if(typeof value==='bigint')return String(value);
  if(typeof value==='boolean')return value?'1':'0';
  if(value instanceof ArrayBuffer)return "X'"+bytesToHex(new Uint8Array(value))+"'";
  if(ArrayBuffer.isView(value))return "X'"+bytesToHex(new Uint8Array(value.buffer,value.byteOffset,value.byteLength))+"'";
  if(Array.isArray(value)&&value.every(byte=>Number.isInteger(byte)&&byte>=0&&byte<=255))return "X'"+bytesToHex(value)+"'";
  const text=typeof value==='string'?value:JSON.stringify(value);
  return "'"+String(text??'').replaceAll("'","''")+"'";
}

async function writeSqlDump(writer,env){
  const write=value=>writer.write(enc.encode(value));
  try{
    const schema=(await env.DB.prepare(`SELECT type,name,tbl_name,sql FROM sqlite_master
      WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
      ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 WHEN 'view' THEN 3 ELSE 4 END,name`).all()).results||[];
    const tables=schema.filter(item=>item.type==='table');
    const deferredSchema=schema.filter(item=>item.type!=='table');

    await write('-- musteri-takip-crm D1 backup\n');
    await write('-- UTC: '+new Date().toISOString()+'\n');
    await write('PRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\n');

    for(const table of tables){
      await write(String(table.sql).replace(/;\s*$/,'')+';\n');
      const tableName=String(table.name);
      const escapedName=tableName.replaceAll("'","''");
      const columns=(await env.DB.prepare("PRAGMA table_info('"+escapedName+"')").all()).results||[];
      const columnNames=columns.map(column=>String(column.name));
      if(columnNames.length){
        const identifiers=columnNames.map(quoteIdentifier).join(',');
        let offset=0;
        while(true){
          const page=(await env.DB.prepare('SELECT * FROM '+quoteIdentifier(tableName)+' LIMIT ? OFFSET ?').bind(250,offset).all()).results||[];
          if(!page.length)break;
          for(const row of page){
            const values=columnNames.map(column=>sqlLiteral(row[column])).join(',');
            await write('INSERT INTO '+quoteIdentifier(tableName)+' ('+identifiers+') VALUES ('+values+');\n');
          }
          offset+=page.length;
          if(page.length<250)break;
        }
      }
      await write('\n');
    }

    for(const item of deferredSchema)await write(String(item.sql).replace(/;\s*$/,'')+';\n');
    await write('\nCOMMIT;\nPRAGMA foreign_keys=ON;\n');
    await writer.close();
  }catch(error){
    console.error('Temporary D1 backup export failed',error);
    await writer.abort(error);
  }
}

function backupPage(){
  const headers={
    'content-type':'text/html; charset=utf-8',
    'cache-control':'no-store',
    'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    'x-content-type-options':'nosniff'
  };
  const html='<!doctype html><meta charset="utf-8"><title>D1 Yedek</title><style>body{font:18px system-ui;margin:40px;max-width:700px}a{display:inline-block;padding:14px 18px;background:#111;color:#fff;border-radius:10px;text-decoration:none}</style><h1>D1 veritabanı yedeği</h1><p>Bu bağlantı yalnızca geçici olarak ve yönetici oturumunda çalışır.</p><a href="'+BACKUP_PATH+'.sql">SQL yedeğini indir</a>';
  return new Response(html,{headers});
}

function unauthorized(){
  return new Response(JSON.stringify({error:'Yönetici oturumu gerekli.'}),{
    status:401,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
  });
}

function sqlBackup(env,ctx){
  const stream=new TransformStream();
  const writing=writeSqlDump(stream.writable.getWriter(),env);
  ctx.waitUntil(writing);
  return new Response(stream.readable,{
    headers:{
      'content-type':'application/sql; charset=utf-8',
      'content-disposition':'attachment; filename="musteri-takip-crm-veritabani-yedegi-2026-09-11.sql"',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff'
    }
  });
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname!==BACKUP_PATH&&url.pathname!==BACKUP_PATH+'.sql')return worker.fetch(request,env,ctx);
    if(request.method!=='GET')return new Response('Method Not Allowed',{status:405,headers:{allow:'GET'}});
    if(!await isAdmin(request,env))return unauthorized();
    return url.pathname.endsWith('.sql')?sqlBackup(env,ctx):backupPage();
  }
};

