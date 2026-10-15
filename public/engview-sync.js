(()=>{
'use strict';
let role='',busy=false,lastCodes='';
async function api(path,options){const r=await fetch('/api/engview/'+path,{cache:'no-store',...options});const d=await r.json();if(!r.ok)throw new Error(d.error||'İşlem yapılamadı.');return d}
function closeDialog(){document.getElementById('engviewSetup')?.remove()}
async function setup(){
 closeDialog();const dialog=document.createElement('dialog');dialog.id='engviewSetup';dialog.style.cssText='max-width:540px;width:90%;border:1px solid #94a3b8;border-radius:14px;padding:24px';
 dialog.innerHTML='<h3>EngView otomatik EVD aktarımı</h3><p>J:\\Dat2026 klasöründeki EVD dosyaları, dosya adındaki iş koduyla CRM’ye bağlanır. Çizimi görmek için EVD’yi indirip EngView’de açın. PDF önizleme yoktur. Dosya sınırı: 1 MB.</p><p>Kurulumu, J: sürücüsüne erişen ve açık kalacak tek bir Windows bilgisayarda yapın.</p><p id="engviewStatus"></p><button type="button" id="engviewGenerate">Kurulum anahtarı oluştur</button><div id="engviewInstructions" hidden><p>Anahtarı kopyalayın; kimseyle paylaşmayın.</p><input id="engviewToken" readonly style="width:100%;box-sizing:border-box"><button type="button" id="engviewCopy">Kopyala</button><p><a href="/CRM-EngView-Kur.cmd" download>Kurulum dosyasını indir</a>. İndirilen dosyayı çalıştırın ve istediğinde anahtarı yapıştırıp Enter’a basın. Bir kez kurmanız yeterlidir.</p></div><p><button type="button" id="engviewRevoke">Bağlantıyı iptal et</button> <button type="button" id="engviewClose">Kapat</button></p>';
 document.body.append(dialog);dialog.showModal();dialog.querySelector('#engviewClose').onclick=closeDialog;
 const status=dialog.querySelector('#engviewStatus');
 try{const d=await api('device');status.textContent=d.created_at?'Bağlantı tanımlı. Son başarılı aktarım: '+(d.last_seen||'henüz yok')+'. Yeni anahtar oluşturmak eski bağlantıyı iptal eder.':'Henüz bağlantı kurulmamış.'}catch(e){status.textContent=e.message}
 dialog.querySelector('#engviewGenerate').onclick=async function(){this.disabled=true;try{const d=await api('device',{method:'POST'});dialog.querySelector('#engviewToken').value=d.token;dialog.querySelector('#engviewInstructions').hidden=false;status.textContent='Anahtar oluşturuldu. Bilgisayardaki kurulum tamamlanana kadar aktarım başlamaz.'}catch(e){status.textContent=e.message}finally{this.disabled=false}};
 dialog.querySelector('#engviewCopy').onclick=async()=>{const input=dialog.querySelector('#engviewToken');try{await navigator.clipboard.writeText(input.value)}catch(_){input.select()}};
 dialog.querySelector('#engviewRevoke').onclick=async()=>{try{await api('device',{method:'DELETE'});dialog.querySelector('#engviewToken').value='';dialog.querySelector('#engviewInstructions').hidden=true;status.textContent='Bağlantı iptal edildi; yeni dosya aktarımı durduruldu.'}catch(e){status.textContent=e.message}};
}
async function refresh(force=false){
 const page=document.getElementById('graphicJobs');if(!page||!page.classList.contains('active')||document.hidden||busy||!['admin','graphic'].includes(role))return;
 if(role==='admin'&&!page.querySelector('#engviewSetupButton')){const button=document.createElement('button');button.id='engviewSetupButton';button.className='btn';button.textContent='📎 EngView bağlantısı';button.onclick=setup;page.querySelector('.toolbar')?.append(button)}
 const cards=[...page.querySelectorAll('.graphic-job-card')],codes=[...new Set(cards.map(c=>c.querySelector('.graphic-job-code')?.textContent.trim()).filter(c=>/^[A-Za-z0-9_-]{1,100}$/.test(c||'')))];
 const key=codes.join(',');if(!force&&key===lastCodes&&cards.every(c=>c.dataset.evdChecked))return;
 busy=true;try{const files=[];for(let i=0;i<codes.length;i+=100)files.push(...await api('files?codes='+encodeURIComponent(codes.slice(i,i+100).join(','))));const map=new Map(files.map(f=>[f.job_code.toLowerCase(),f]));for(const card of cards){const code=card.querySelector('.graphic-job-code')?.textContent.trim();const file=map.get(code?.toLowerCase());card.querySelector('.engview-file')?.remove();card.dataset.evdChecked='1';if(!file)continue;const link=document.createElement('a');link.className='engview-file';link.href='/api/engview/file/'+encodeURIComponent(code);link.textContent=' 📎 EVD indir';link.title='EngView çizimi — son aktarım (UTC): '+file.updated_at;link.style.cssText='display:inline-block;margin-left:6px;font-size:11px;color:#1d4ed8';link.onclick=e=>e.stopPropagation();(card.querySelector('.graphic-job-note')||card).append(link)}lastCodes=key}catch(e){console.warn('EngView:',e.message)}finally{busy=false}
}
fetch('/api/session',{cache:'no-store'}).then(r=>r.ok?r.json():{}).then(d=>{role=d.role;refresh()}).catch(()=>{});
let timer;new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('engview-file')))){clearTimeout(timer);timer=setTimeout(()=>refresh(),350)}}).observe(document.body,{subtree:true,childList:true});
setInterval(()=>refresh(true),30000);
})();
