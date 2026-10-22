(function(){
 'use strict';
 if(window.__customerLocationPicker)return;
 window.__customerLocationPicker=true;
 let dataPromise;
 const normalize=value=>String(value||'').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]/g,'');
 const findKey=(object,value)=>Object.keys(object||{}).find(key=>normalize(key)===normalize(value))||'';
 function districtKey(districts,value,city){return findKey(districts,value)||(normalize(city)==='ankara'&&normalize(value)==='kazan'?findKey(districts,'Kahramankazan'):'')}
 async function loadData(){
  if(!dataPromise)dataPromise=fetch('/tr-location-data.json?v=20261022',{cache:'force-cache'}).then(async response=>{
   if(!response.ok)throw new Error('Adres listesi yüklenemedi.');
   const packed=await response.json();
   const bytes=Uint8Array.from(atob(packed.data),char=>char.charCodeAt(0));
   const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
   return JSON.parse(await new Response(stream).text());
  }).catch(error=>{dataPromise=null;throw error});
  return dataPromise;
 }
 function options(select,names,current,placeholder){
  const values=[...new Set(names)].sort((a,b)=>a.localeCompare(b,'tr'));
  const match=values.find(value=>normalize(value)===normalize(current));
  if(current&&!match)values.unshift(current);
  select.replaceChildren(new Option(placeholder,''),...values.map(value=>new Option(value,value)),new Option('Listede yok — elle yaz','__manual__'));
  select.value=match||current||'';
 }
 function mount(prefix){
  const inputs=['city','district','neighborhood'].map(name=>document.getElementById(prefix==='d'?'d'+name[0].toUpperCase()+name.slice(1):prefix+name));
  if(inputs.some(input=>!input))return null;
  if(inputs[0].__locationGroup)return inputs[0].__locationGroup;
  const labels=['İl seçin','İlçe seçin','Mahalle seçin'];
  const selects=inputs.map((input,index)=>{
   const select=document.createElement('select');select.id=input.id+'Picker';select.setAttribute('aria-label',labels[index]);select.style.width='100%';
   options(select,[],input.value,labels[index]);input.insertAdjacentElement('afterend',select);input.style.display='none';
   return select;
  });
  let revision=0;
  const group={async sync(){
   const generation=++revision;
   try{
    const data=await loadData();if(generation!==revision)return;
    const city=findKey(data,inputs[0].value),districts=data[city]||{},district=districtKey(districts,inputs[1].value,city);
    options(selects[0],Object.keys(data),inputs[0].value,labels[0]);
    options(selects[1],Object.keys(districts),inputs[1].value,labels[1]);
    options(selects[2],districts[district]||[],inputs[2].value,labels[2]);
    selects[1].disabled=!inputs[0].value;selects[2].disabled=!inputs[1].value;
   }catch(error){inputs.forEach(input=>{input.style.display=''});selects.forEach(select=>{select.style.display='none'});console.error(error)}
  }};
  inputs[0].__locationGroup=group;
  selects.forEach((select,index)=>select.addEventListener('change',()=>{
   if(select.value==='__manual__'){inputs[index].style.display='';inputs[index].focus();return}
   inputs[index].value=select.value;inputs[index].style.display='none';
   for(let child=index+1;child<inputs.length;child++){inputs[child].value='';inputs[child].style.display='none'}
   group.sync();
  }));
  inputs.forEach((input,index)=>input.addEventListener('change',()=>{for(let child=index+1;child<inputs.length;child++)inputs[child].value='';group.sync()}));
  group.sync();return group;
 }
 function sync(){mount('c_')?.sync();mount('d')?.sync()}
 function hook(name){
  const original=window[name];if(typeof original!=='function'||original.__locationPicker)return;
  const wrapped=function(){const result=original.apply(this,arguments);if(result&&typeof result.then==='function')return result.then(value=>{sync();return value});sync();return result};wrapped.__locationPicker=true;window[name]=wrapped;
 }
 function install(){['loadSelected','openCustomer','editCustomer'].forEach(hook);sync()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
