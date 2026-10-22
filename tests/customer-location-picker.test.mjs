import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const script=readFileSync('public/customer-location-picker.js','utf8');
const packed=JSON.parse(readFileSync('public/tr-location-data.json','utf8'));
const data=JSON.parse(gunzipSync(Buffer.from(packed.data,'base64')));
test('location dataset contains all provinces and Ankara district neighborhoods',()=>{
 assert.equal(Object.keys(data).length,81);assert.equal(Object.keys(data.Ankara).length,25);assert.ok(data.Ankara.Yenimahalle.length>20);assert.ok(data.Ankara.Yenimahalle.includes('İvedikköy'));
});
test('card dropdowns cascade, preserve old values and update the existing save fields',async()=>{
 const nodes={};
 function node(value=''){return {value,style:{},events:{},setAttribute(){},addEventListener(name,fn){this.events[name]=fn},insertAdjacentElement(_,el){nodes[el.id]=el},replaceChildren(...options){this.options=options},focus(){this.focused=true}}}
 for(const [id,value] of Object.entries({dCity:'ANKARA',dDistrict:'Yeni Mahalle',dNeighborhood:'Eski özel mahalle'}))nodes[id]=Object.assign(node(value),{id});
 let loaded=0;
 const context={window:{loadSelected(){nodes.dCity.value='Ankara';nodes.dDistrict.value='Çankaya';nodes.dNeighborhood.value=''}},document:{readyState:'complete',getElementById:id=>nodes[id],createElement:()=>node()},Option:function(text,value){this.text=text;this.value=value},fetch:async()=>{loaded++;return {ok:true,json:async()=>packed}},atob,Uint8Array,Blob,DecompressionStream,Response,console};
 vm.runInNewContext(script,context);for(let i=0;i<200&&!nodes.dDistrictPicker.options.some(x=>x.value==='Yenimahalle');i++)await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(nodes.dCity.value,'ANKARA');assert.equal(nodes.dNeighborhood.value,'Eski özel mahalle');
 assert.ok(nodes.dDistrictPicker.options.some(x=>x.value==='Yenimahalle'));
 nodes.dCityPicker.value='Bursa';nodes.dCityPicker.events.change();await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(nodes.dCity.value,'Bursa');assert.equal(nodes.dDistrict.value,'');assert.equal(nodes.dNeighborhood.value,'');
 assert.ok(nodes.dDistrictPicker.options.some(x=>x.value==='Osmangazi'));
 nodes.dDistrictPicker.value='Osmangazi';nodes.dDistrictPicker.events.change();await new Promise(resolve=>setTimeout(resolve,20));assert.ok(nodes.dNeighborhoodPicker.options.length>10);
 const neighborhood=nodes.dNeighborhoodPicker.options[1].value;nodes.dNeighborhoodPicker.value=neighborhood;nodes.dNeighborhoodPicker.events.change();assert.equal(nodes.dNeighborhood.value,neighborhood);
 context.window.loadSelected();await new Promise(resolve=>setTimeout(resolve,20));assert.ok(nodes.dNeighborhoodPicker.options.some(x=>x.value==='Kızılay'));
 assert.equal(loaded,1);
});
