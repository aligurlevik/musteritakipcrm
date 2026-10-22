import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {CRM_SAFE_ROOT_HTML as html} from '../src/crm_safe_root_page.js';
test('Cagatay menu contains exactly Graphic Jobs and Tracking',()=>{
 const menus=['graphicJobs','tracking','portfolio','reports','agenda','customers'].map(page=>({dataset:{page},style:{},classList:{add(){},remove(){}}}));
 const nodes={title:{},graphicJobs:{classList:{add(){}}}};
 const code=html.match(/function applyAccess\(role\)[^\n]+/)[0];
 const ctx=vm.createContext({$:id=>nodes[id],document:{querySelector:()=>null,querySelectorAll:selector=>selector.includes('data-page')?menus:[]},localStorage:{setItem(){}},currentAccessRole:''});
 vm.runInContext(code+";applyAccess('graphic')",ctx);
 assert.deepEqual(menus.filter(x=>x.style.display==='block').map(x=>x.dataset.page),['graphicJobs','tracking']);
});
test('Cagatay may access tracking APIs but other modules remain blocked',()=>{
 const worker=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
 const guard=worker.match(/if\(role==='graphic'[^\n]+/)[0];
 for(const [path,allowed] of [['/api/tracking',true],['/api/tracking/5',true],['/api/graphic-jobs',true],['/api/customers',false],['/api/reports/production',false],['/api/agenda',false]]){
  const ctx=vm.createContext({role:'graphic',path,json:(body,status)=>({status})});
  const result=vm.runInContext('(function(){'+guard+';return {status:200}})()',ctx);assert.equal(result.status,allowed?200:403,path);
 }
 assert.match(worker,/trackingActor=role==='graphic'\?'Çağatay':'Recep'/);
});
