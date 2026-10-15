import test from 'node:test';
import assert from 'node:assert/strict';
import {drawingApi,MAX_DRAWING_BYTES} from '../src/engview_drawings.js';
import {readFile} from 'node:fs/promises';
const base='https://crm.test';
function database(){
 const devices=new Map(),files=new Map();let jobs=[{id:7}],writes=0;
 return {devices,files,setJobs(value){jobs=value},get writes(){return writes},
 prepare(sql){let args=[];return {bind(...value){args=value;return this},
 async run(){
 if(sql.startsWith('DELETE FROM engview_devices'))devices.clear();
 if(sql.startsWith('INSERT INTO engview_devices'))devices.set(args[0],{token_hash:args[0]});
 if(sql.startsWith('INSERT INTO engview_drawings')){writes++;files.set(args[0].toLowerCase(),{job_code:args[0],file_name:args[1],file_data:args[2],checksum:args[3],updated_at:'today'})}
 return {success:true};},
 async first(){if(sql.includes('FROM engview_devices'))return devices.get(args[0])||null;if(sql.includes('FROM engview_drawings'))return files.get(args[0].toLowerCase())||null;return null},
 async all(){if(sql.includes('FROM graphic_jobs'))return {results:jobs};if(sql.includes('FROM engview_drawings'))return {results:args.map(c=>files.get(c.toLowerCase())).filter(Boolean).map(({file_data,checksum,...meta})=>meta)};return {results:[]}}
 }},async batch(statements){return Promise.all(statements.map(s=>s.run()))}};
}
function request(path,method='GET',body,headers={}){return new Request(base+'/api/engview/'+path,{method,body,headers:{origin:base,...headers}})}
async function setup(){const DB=database(),env={DB};const r=await drawingApi(request('device','POST'),env,async()=>'admin');const {token}=await r.json();return {DB,env,token,headers:{authorization:'Bearer '+token}}}
test('anonymous, tracking and graphic users cannot issue a device token; foreign origin is rejected',async()=>{
 for(const [role,status] of [['',401],['tracking',403],['graphic',403]])assert.equal((await drawingApi(request('device','POST'),{DB:database()},async()=>role)).status,status);
 assert.equal((await drawingApi(request('device','POST',null,{origin:'https://other.test'}),{DB:database()},async()=>'admin')).status,403);
});
test('device key is hashed, upload attaches by exact job code, and download preserves bytes',async()=>{
 const {env,DB,token,headers}=await setup();assert.equal(token.length,64);assert.equal(DB.devices.has(token),false);
 const bytes=new Uint8Array([0,255,65,20]);
 assert.equal((await drawingApi(request('sync?code=JL0800K60014','PUT',bytes,headers),env,async()=>'')).status,200);
 const download=await drawingApi(request('file/JL0800K60014'),env,async()=>'graphic');assert.equal(download.status,200);assert.deepEqual(new Uint8Array(await download.arrayBuffer()),bytes);assert.match(download.headers.get('content-disposition'),/attachment/);
 const metadata=await (await drawingApi(request('files?codes=jl0800k60014'),env,async()=>'admin')).json();assert.equal(metadata[0].file_name,'JL0800K60014.evd');assert.equal(metadata[0].file_data,undefined);
 const repeat=await (await drawingApi(request('sync?code=JL0800K60014','PUT',bytes,headers),env,async()=>'')).json();assert.equal(repeat.unchanged,true);assert.equal(DB.writes,1);
 await drawingApi(request('sync?code=JL0800K60014','PUT',new Uint8Array([2]),headers),env,async()=>'');assert.equal(DB.writes,2);
});
test('unknown, ambiguous, invalid and oversized files never overwrite a drawing',async()=>{
 const {env,DB,headers}=await setup();
 DB.setJobs([]);assert.equal((await drawingApi(request('sync?code=JL1','PUT','evd',headers),env,async()=>'')).status,404);
 DB.setJobs([{id:1},{id:2}]);assert.equal((await drawingApi(request('sync?code=JL1','PUT','evd',headers),env,async()=>'')).status,409);
 DB.setJobs([{id:1}]);assert.equal((await drawingApi(request('sync?code=../file','PUT','evd',headers),env,async()=>'')).status,400);
 for(const bytes of [new Uint8Array(),new Uint8Array(MAX_DRAWING_BYTES+1)])assert.equal((await drawingApi(request('sync?code=JL1','PUT',bytes,headers),env,async()=>'')).status,413);
 assert.equal(DB.writes,0);
});
test('revoked or missing bearer cannot upload; bearer cannot read files; tracking cannot download',async()=>{
 const {env,headers}=await setup();
 assert.equal((await drawingApi(request('sync?code=JL1','PUT','evd'),env,async()=>'admin')).status,401);
 assert.equal((await drawingApi(request('file/JL1','GET',undefined,headers),env,async()=>'')).status,401);
 assert.equal((await drawingApi(request('file/JL1'),env,async()=>'tracking')).status,403);
 await drawingApi(request('device','DELETE'),env,async()=>'admin');
 assert.equal((await drawingApi(request('sync?code=JL1','PUT','evd',headers),env,async()=>'')).status,401);
});
test('new device replaces previous key; unrelated API routes are passed through',async()=>{
 const {env,headers,DB}=await setup();await drawingApi(request('device','POST'),env,async()=>'admin');assert.equal(DB.devices.size,1);
 assert.equal((await drawingApi(request('sync?code=JL1','PUT','evd',headers),env,async()=>'')).status,401);
 assert.equal(await drawingApi(new Request(base+'/api/graphic-jobs'),env,async()=>''),null);
});
test('installer watches only Dat2026 EVD files and persists credentials using Windows protection',async()=>{
 const source=await readFile('public/engview-agent.ps1','utf8');assert.match(source,/J:\\Dat2026/);assert.match(source,/-Filter '\*\.evd' -File/);assert.doesNotMatch(source,/-Recurse/);assert.match(source,/Export-Clixml -LiteralPath \$ConfigFile/);assert.match(source,/FileShare\]::Read/);assert.match(source,/if \(\$State\[\$File.Name\] -eq \$Stamp\)/);
});
