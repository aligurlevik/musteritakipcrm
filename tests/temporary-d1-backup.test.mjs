import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import test from 'node:test';

if(!globalThis.crypto)globalThis.crypto=webcrypto;

const {default:backupWorker}=await import('../src/temporary_d1_backup.js');
const backupPath='/api/admin/d1-backup-c5ff4d420c038f7860f8c8bb60ad4965';

async function adminCookie(secret){
  const day=new Date().toISOString().slice(0,10);
  const data=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',data.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,data.encode('admin.'+day));
  const hash=[...new Uint8Array(signature)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  return 'crm_session=admin.'+day+'.'+hash;
}

function mockDb(){
  const rows=[{id:1,note:"O'Brien",amount:42.5,payload:null}];
  return {
    prepare(sql){
      let bindings=[];
      return {
        bind(...values){bindings=values;return this},
        async all(){
          if(sql.includes('FROM sqlite_master'))return {results:[
            {type:'table',name:'sample',tbl_name:'sample',sql:'CREATE TABLE sample (id INTEGER PRIMARY KEY,note TEXT,amount REAL,payload BLOB)'},
            {type:'index',name:'idx_sample_note',tbl_name:'sample',sql:'CREATE INDEX idx_sample_note ON sample(note)'}
          ]};
          if(sql.startsWith('PRAGMA table_info'))return {results:[{name:'id'},{name:'note'},{name:'amount'},{name:'payload'}]};
          if(sql.startsWith('SELECT * FROM "sample"'))return {results:bindings[1]===0?rows:[]};
          throw new Error('Unexpected SQL: '+sql);
        }
      };
    }
  };
}

function context(){
  const waits=[];
  return {waits,waitUntil(promise){waits.push(promise)}};
}

test('temporary backup route rejects requests without an admin session',async()=>{
  const response=await backupWorker.fetch(new Request('https://example.com'+backupPath),{SESSION_SECRET:'secret',DB:mockDb()},{waitUntil(){}});
  assert.equal(response.status,401);
});

test('temporary backup page exposes only the authenticated download link',async()=>{
  const secret='test-secret';
  const response=await backupWorker.fetch(new Request('https://example.com'+backupPath,{headers:{cookie:await adminCookie(secret)}}),{SESSION_SECRET:secret,DB:mockDb()},{waitUntil(){}});
  assert.equal(response.status,200);
  assert.match(await response.text(),/SQL yedeğini indir/);
});

test('temporary backup produces restorable escaped SQL using read-only queries',async()=>{
  const secret='test-secret';
  const ctx=context();
  const response=await backupWorker.fetch(new Request('https://example.com'+backupPath+'.sql',{headers:{cookie:await adminCookie(secret)}}),{SESSION_SECRET:secret,DB:mockDb()},ctx);
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-disposition'),/\.sql/);
  const sql=await response.text();
  await Promise.all(ctx.waits);
  assert.match(sql,/BEGIN TRANSACTION/);
  assert.match(sql,/CREATE TABLE sample/);
  assert.match(sql,/O''Brien/);
  assert.match(sql,/CREATE INDEX idx_sample_note/);
  assert.match(sql,/COMMIT/);
});

