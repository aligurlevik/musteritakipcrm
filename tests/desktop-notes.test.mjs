import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const wrapper=readFileSync('public/desktop-notes.html','utf8');
test('desktop notes uses the existing agenda, voice and reminder forms',()=>{
 assert.match(wrapper,/src="\/yeni-not.html\?desktop=1"/);assert.match(wrapper,/src="\/notlar-v2.html\?desktop=1"/);assert.match(wrapper,/allow="microphone"/);
 const form=readFileSync('public/yeni-not.html','utf8'),api=readFileSync('src/mobile_notes_latest_api.js','utf8');
 assert.match(form,/\/api\/notes-v3/);assert.match(form,/\/api\/mobile-voice\//);assert.match(form,/remind_at:remind/);assert.match(api,/INSERT INTO agenda_entries/);
});
for(const file of ['public/index.html','src/crm_safe_root_page.js'])test(file+' provides lazy desktop notes navigation and valid scripts',()=>{
 let html=readFileSync(file,'utf8');if(file.endsWith('.js'))html=JSON.parse(html.slice(html.indexOf('=')+1).trim().replace(/;$/,''));
 assert.match(html,/data-page="notes">NOTLAR/);assert.match(html,/data-src="\/desktop-notes.html"/);assert.match(html,/if\(page==='notes'\)/);
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].trim())new vm.Script(match[1]);
});
test('successful save refreshes the shared list and resets quick entry',()=>{
 const code=wrapper.match(/<script>([\s\S]*?)<\/script>/)[1];let refresh=0;const events={};
 const composer={addEventListener:(name,fn)=>events.composer=fn,contentWindow:{location:{href:'https://crm.test/notlar-v2.html?saved=1'}}};
 const notebook={addEventListener:(name,fn)=>events.notebook=fn,contentWindow:{location:{reload:()=>refresh++}}};const saved={style:{}};
 const ctx=vm.createContext({URL,console,setTimeout:()=>{},document:{getElementById:id=>({composer,notebook,saved,refresh:{}})[id]}});
 vm.runInContext(code,ctx);events.composer();assert.equal(refresh,1);assert.equal(composer.src,'/yeni-not.html?desktop=1');assert.equal(saved.style.display,'inline');
});
