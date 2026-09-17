import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const {default:worker}=await import('../src/quick_request_page_clean_edit_v2.js');
const database=new DatabaseSync(':memory:');
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1kAAAAASUVORK5CYII=';
const replacement='data:image/jpeg;base64,/9j/AAAA';
const secret='notes-image-test-secret';
const env={
  SESSION_SECRET:secret,
  DB:{
    prepare(sql){
      let values=[];
      return {
        bind(...next){values=next;return this},
        async all(){return {results:database.prepare(sql).all(...values),success:true}},
        async first(){return database.prepare(sql).get(...values)||null},
        async run(){const r=database.prepare(sql).run(...values);return {success:true,meta:{changes:r.changes,last_row_id:Number(r.lastInsertRowid)}}}
      };
    }
  },
  ASSETS:{async fetch(request){
    const pathname=new URL(request.url).pathname;
    const path=pathname==='/'?'/index.html':pathname;
    try{return new Response(await readFile('public'+path),{headers:{'content-type':path.endsWith('.js')?'application/javascript':'text/html; charset=utf-8'}})}
    catch{return new Response('Bulunamadı',{status:404})}
  }}
};
async function cookie(role='admin'){
  const day=new Date().toISOString().slice(0,10),data=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',data.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,data.encode(role+'.'+day));
  return 'crm_session='+role+'.'+day+'.'+[...new Uint8Array(signature)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function request(path,method='GET',body,role='admin'){
  const headers={'content-type':'application/json'};
  if(role)headers.cookie=await cookie(role);
  return worker.fetch(new Request('https://crm.test'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),env,{});
}
async function create(notebook=1){
  const response=await request('/api/notes-v3','POST',{note:'Muayene belgesi',title:'Araç',notebook_no:notebook,image_data:photo,remind_at:'2030-09-22T11:00',text_color:'#123456',bg_color:'#abcdef'});
  assert.equal(response.status,201);
  return (await response.json()).id;
}

test('photos persist in all three notebooks and remain attached through archive and restore',async()=>{
  for(const notebook of [1,2,3]){
    const id=await create(notebook);
    let rows=await (await request('/api/notes-v3?notebook='+notebook)).json();
    assert.equal(rows.find(row=>row.id===id).image_data,photo);
    assert.equal((await request('/api/notes-v3/'+id+'/archive','POST',{})).status,200);
    rows=await (await request('/api/notes-v3?scope=archive&notebook='+notebook)).json();
    assert.equal(rows.find(row=>row.id===id).image_data,photo);
    assert.equal((await request('/api/notes-v3/'+id+'/unarchive','POST',{})).status,200);
    rows=await (await request('/api/notes-v3?notebook='+notebook)).json();
    assert.equal(rows.find(row=>row.id===id).image_data,photo);
  }
});

test('editing text preserves the photo; replacing and removing it preserve note fields',async()=>{
  const id=await create();
  assert.equal((await request('/api/notes-v3/'+id,'PUT',{note:'Yeni açıklama'})).status,200);
  assert.equal(database.prepare('SELECT image_data FROM agenda_entries WHERE id=?').get(id).image_data,photo);
  assert.equal((await request('/api/notes-v3/'+id,'PUT',{image_data:replacement})).status,200);
  const row=database.prepare('SELECT * FROM agenda_entries WHERE id=?').get(id);
  assert.equal(row.image_data,replacement);
  assert.equal(row.note,'Yeni açıklama');
  assert.equal(row.remind_at,'2030-09-22T11:00');
  assert.equal(row.text_color,'#123456');
  assert.equal(row.bg_color,'#abcdef');
  assert.equal(row.notebook_no,1);
  assert.equal((await request('/api/notes-v3/'+id,'PUT',{image_data:''})).status,200);
  assert.equal(database.prepare('SELECT image_data FROM agenda_entries WHERE id=?').get(id).image_data,'');
});

test('invalid and oversized photos are rejected without erasing the saved photo',async()=>{
  const id=await create();
  for(const invalid of [null,{},'not an image','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,AA=AAA','data:image/png;base64,AAA']){
    assert.equal((await request('/api/notes-v3/'+id,'PUT',{image_data:invalid})).status,400);
    assert.equal(database.prepare('SELECT image_data FROM agenda_entries WHERE id=?').get(id).image_data,photo);
  }
  const oversized='data:image/jpeg;base64,'+'A'.repeat(900000);
  assert.equal((await request('/api/notes-v3/'+id,'PUT',{image_data:oversized})).status,413);
  assert.equal(database.prepare('SELECT image_data FROM agenda_entries WHERE id=?').get(id).image_data,photo);
  assert.equal((await request('/api/notes-v3','POST',{note:'Hata',image_data:oversized})).status,413);
});

test('photo changes respect admin sessions and individual note locks',async()=>{
  const id=await create();
  assert.equal((await request('/api/notes-v3/'+id,'PUT',{image_data:replacement},'')).status,401);
  assert.equal((await request('/api/notes-v3/'+id,'PUT',{image_data:replacement},'graphic')).status,401);
  assert.equal((await request('/api/notes-v3/'+id+'/lock','POST',{})).status,200);
  assert.equal((await request('/api/notes-v3/'+id,'PUT',{image_data:replacement})).status,423);
  assert.equal(database.prepare('SELECT image_data FROM agenda_entries WHERE id=?').get(id).image_data,photo);
});

test('the current mobile home and note routes load the photo controls once',async()=>{
  for(const path of ['/?mobile=1','/notlar-v2','/notlar-v2/','/notlar-v2.html','/yeni-not.html']){
    const response=await worker.fetch(new Request('https://crm.test'+path,{headers:{'user-agent':'Mozilla/5.0 Android Mobile'}}),env,{});
    assert.equal(response.status,200);
    const html=await response.text();
    assert.equal((html.match(/src="\/notes-image-patch\.js\?v=20260917-1"/g)||[]).length,1,path);
  }
  const response=await request('/notes-image-patch.js?v=20260917-1');
  assert.equal(response.status,200);
  assert.match(await response.text(),/Resim Ekle/);
});
