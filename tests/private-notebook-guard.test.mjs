import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {Script} from 'node:vm';
import test from 'node:test';

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const {default:worker}=await import('../src/phone_reminders_entry.js');
const db=new DatabaseSync(':memory:');
db.exec(`
  CREATE TABLE agenda_entries(
    id INTEGER PRIMARY KEY AUTOINCREMENT,entry_date TEXT NOT NULL,sort_order INTEGER DEFAULT 1,note TEXT NOT NULL,
    remind_at TEXT DEFAULT '',reminder_status TEXT DEFAULT '',entry_status TEXT DEFAULT 'Yapılacak',completed_date TEXT DEFAULT '',
    image_data TEXT DEFAULT '',source_type TEXT DEFAULT 'manual',title TEXT DEFAULT '',note_type TEXT DEFAULT 'Genel Not',
    is_important INTEGER DEFAULT 0,is_archived INTEGER DEFAULT 0,is_locked INTEGER DEFAULT 0,text_color TEXT DEFAULT '#101828',
    bg_color TEXT DEFAULT '#fffdf1',notebook_no INTEGER DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE quick_request_files(agenda_id INTEGER PRIMARY KEY,file_name TEXT NOT NULL,mime_type TEXT NOT NULL,file_data BLOB NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
  INSERT INTO agenda_entries(id,entry_date,sort_order,note,title,remind_at,reminder_status,source_type,notebook_no)
    VALUES(1,'2031-01-01',1,'Açık not','Not 1','2031-01-01T10:00','Açık','manual',1),
          (2,'2031-01-01',2,'İkinci özel not','Not 2','2031-01-01T11:00','Açık','manual',2),
          (3,'2031-01-01',3,'Üçüncü çok özel not','Not 3','2031-01-01T12:00','Açık','manual',3);
  INSERT INTO quick_request_files(agenda_id,file_name,mime_type,file_data) VALUES
    (1,'acik.pdf','application/pdf',X'255044462D'),(2,'iki.pdf','application/pdf',X'255044462D'),(3,'uc.pdf','application/pdf',X'255044462D');
`);

const sessionSecret='private-notebook-session-secret';
const env={
  SESSION_SECRET:sessionSecret,
  INCOMING_PDF_TOKEN:'mail-token',
  DB:{
    prepare(sql){
      let values=[];
      return {
        bind(...next){values=next;return this},
        async all(){return {results:db.prepare(sql).all(...values),success:true}},
        async first(){return db.prepare(sql).get(...values)||null},
        async run(){const result=db.prepare(sql).run(...values);return {success:true,meta:{changes:result.changes,last_row_id:Number(result.lastInsertRowid)}}}
      };
    }
  },
  ASSETS:{
    async fetch(request){
      const pathname=new URL(request.url).pathname,path=pathname==='/'?'/index.html':pathname;
      try{return new Response(await readFile('public'+path),{headers:{'content-type':path.endsWith('.js')?'application/javascript; charset=utf-8':'text/html; charset=utf-8'}})}
      catch{return new Response('Bulunamadı',{status:404})}
    }
  }
};

async function adminCookie(){
  const day=new Date().toISOString().slice(0,10),value='admin.'+day,data=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',data.encode(sessionSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,data.encode(value));
  return 'crm_session='+value+'.'+[...new Uint8Array(signature)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function call(path,{method='GET',json,body,cookies=[]}={}){
  const headers={cookie:[await adminCookie(),...cookies].join('; ')};
  if(json!==undefined){headers['content-type']='application/json';body=JSON.stringify(json)}
  const waits=[],ctx={waitUntil(promise){waits.push(promise)}};
  const response=await worker.fetch(new Request('https://crm.test'+path,{method,headers,body}),env,ctx);
  await Promise.all(waits);return response;
}

function unlockCookie(response,notebook){
  const values=typeof response.headers.getSetCookie==='function'?response.headers.getSetCookie():[response.headers.get('set-cookie')||''];
  const match=values.join('\n').match(new RegExp('(notes_page_unlock_'+notebook+'=[^;]+)'));
  assert.ok(match,'unlock cookie missing');return match[1];
}

test('Not 3 remains private across note, agenda, planner, PDF and logout routes',async()=>{
  let response=await call('/api/notes-v3/page-lock/status?notebook=3');
  assert.deepEqual(await response.json(),{notebook:3,configured:false,unlocked:false});

  response=await call('/api/notes-v3/page-lock/set',{method:'POST',json:{notebook:3,password:'12345'}});
  assert.equal(response.status,400);assert.match((await response.json()).error,/en az 6/);

  response=await call('/api/notes-v3/page-lock/set',{method:'POST',json:{notebook:3,password:'gizli-3'}});
  assert.equal(response.status,201);let page3Cookie=unlockCookie(response,3);
  const stored=db.prepare('SELECT * FROM note_page_locks WHERE notebook_no=3').get();
  assert.ok(stored.salt);assert.ok(stored.password_hash);assert.ok(!stored.password_hash.includes('gizli-3'));

  response=await call('/api/notes-v3?scope=all&notebook=3');
  assert.equal(response.status,423);assert.equal((await response.json()).code,'PAGE_LOCKED');

  response=await call('/api/agenda/active?from=2030-01-01');
  assert.deepEqual((await response.json()).map(row=>row.id),[1]);

  response=await call('/api/quick-request-files?ids=1,2,3');
  assert.deepEqual((await response.json()).map(row=>row.agenda_id),[1]);
  assert.equal((await call('/api/quick-request-file/3')).status,423);
  assert.equal((await call('/api/agenda/3/task-done',{method:'POST',json:{completed_date:'2031-01-01'}})).status,423);
  assert.equal((await call('/api/notes-v3/3',{method:'PUT',json:{title:'Değişmemeli',note:'Gizli'}})).status,423);
  assert.equal(db.prepare('SELECT entry_status FROM agenda_entries WHERE id=3').get().entry_status,'Yapılacak');

  response=await call('/api/notes-v3/page-lock/verify',{method:'POST',json:{notebook:3,password:'yanlış'}});
  assert.equal(response.status,403);
  response=await call('/api/notes-v3/page-lock/verify',{method:'POST',json:{notebook:3,password:'gizli-3'}});
  assert.equal(response.status,200);const verifiedCookie=unlockCookie(response,3);assert.notEqual(verifiedCookie,page3Cookie);page3Cookie=verifiedCookie;

  response=await call('/api/notes-v3?scope=all&notebook=3',{cookies:[page3Cookie]});
  assert.equal(response.status,200);assert.deepEqual((await response.json()).map(row=>row.id),[3]);
  assert.equal((await call('/api/notes-v3?scope=all&notebook=2',{cookies:[page3Cookie]})).status,423);

  response=await call('/api/agenda/active?from=2030-01-01',{cookies:[page3Cookie]});
  assert.deepEqual((await response.json()).map(row=>row.id),[1,3]);
  response=await call('/api/quick-request-files?ids=1,2,3',{cookies:[page3Cookie]});
  assert.deepEqual((await response.json()).map(row=>row.agenda_id),[1,3]);
  assert.equal((await call('/api/quick-request-file/3',{cookies:[page3Cookie]})).status,200);

  response=await call('/api/agenda/3/task-done',{method:'POST',json:{completed_date:'2031-01-01'},cookies:[page3Cookie]});
  assert.equal(response.status,200);assert.equal(db.prepare('SELECT entry_status FROM agenda_entries WHERE id=3').get().entry_status,'Yapıldı');
  response=await call('/api/notes-v3/3',{method:'PUT',json:{title:'Özel başlık',note:'Özel içerik'},cookies:[page3Cookie]});
  assert.equal(response.status,200);assert.equal(db.prepare('SELECT title FROM agenda_entries WHERE id=3').get().title,'Özel başlık');

  response=await call('/api/logout',{cookies:[page3Cookie]});assert.equal(response.status,200);
  const cleared=typeof response.headers.getSetCookie==='function'?response.headers.getSetCookie().join('\n'):response.headers.get('set-cookie')||'';
  assert.match(cleared,/notes_page_unlock_2=;/);assert.match(cleared,/notes_page_unlock_3=;/);assert.match(cleared,/Max-Age=0/i);
  assert.equal((await call('/api/agenda/3',{method:'DELETE'})).status,423);
  assert.equal((await call('/api/notes-v3?notebook=3',{cookies:[page3Cookie]})).status,423,'logout revokes a copied cookie on the server');
  response=await call('/api/notes-v3/page-lock/verify',{method:'POST',json:{notebook:3,password:'gizli-3'}});
  page3Cookie=unlockCookie(response,3);
  assert.equal((await call('/api/notes-v3/page-lock/lock',{method:'POST',json:{notebook:3},cookies:[page3Cookie]})).status,200);
  assert.equal((await call('/api/mobile-voice/3',{cookies:[page3Cookie]})).status,423);
  response=await call('/api/notes-v3/page-lock/verify',{method:'POST',json:{notebook:3,password:'gizli-3'}});
  page3Cookie=unlockCookie(response,3);
  db.prepare('UPDATE note_page_sessions SET expires_at=0').run();
  assert.equal((await call('/api/notes-v3?notebook=3',{cookies:[page3Cookie]})).status,423,'expired session cannot read notes');
  for(let i=0;i<5;i++)assert.equal((await call('/api/notes-v3/page-lock/verify',{method:'POST',json:{notebook:3,password:'wrong'}})).status,403);
  assert.equal((await call('/api/notes-v3/page-lock/verify',{method:'POST',json:{notebook:3,password:'gizli-3'}})).status,429);
  db.prepare('UPDATE note_page_attempts SET reset_at=0').run();
  assert.equal((await call('/api/notes-v3/page-lock/verify',{method:'POST',json:{notebook:3,password:'gizli-3'}})).status,200);
  assert.equal((await call('/api/notes-v3/page-lock/set',{method:'POST',json:{notebook:3,password:'replace-password'}})).status,409);
  const unauth=await worker.fetch(new Request('https://crm.test/api/notes-v3?notebook=3'),env,{});assert.equal(unauth.status,401);
  const crossSite=await worker.fetch(new Request('https://crm.test/api/notes-v3/page-lock/set',{method:'POST',headers:{cookie:await adminCookie(),origin:'https://other.test','content-type':'application/json'},body:JSON.stringify({notebook:2,password:'hijack-password'})}),env,{});assert.equal(crossSite.status,403);

});

test('private-note browser assets hide locked content on background and planner skips locked books',async()=>{
  const asset=await call('/notes-page-lock-patch.js');assert.equal(asset.status,200);
  const source=await asset.text();assert.doesNotThrow(()=>new Script(source,{filename:'notes-page-lock-patch.js'}));
  assert.match(source,/pagePrivacyShield/);assert.match(source,/visibilitychange/);assert.match(source,/lockPrivatePages/);assert.match(source,/en az 6 karakter/);
  const notes=await call('/notlar-v2.html?page=3'),notesHtml=await notes.text();assert.equal(notes.status,200);assert.equal((notesHtml.match(/src="\/notes-page-lock-patch\.js\?v=20260920-1"/g)||[]).length,1);
  const planner=await call('/planlama.html'),html=await planner.text();assert.equal(planner.status,200);
  assert.match(html,/PAGE_PASSWORD_NOT_SET/);assert.match(html,/state\.items=state\.items\.filter\(item=>notebook\(item\)===1\)/);assert.match(html,/page-lock\/lock/);
});
