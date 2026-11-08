/* Sales prospect import. Only runs when an authenticated CRM admin clicks the button. */
(function(){
'use strict';
const prospects=[["RONAPACK Ambalaj","Ankara","Kahramankazan","Saray",["0312 475 18 58","0540 609 17 18"],"info@ronapack.com","Saray Mahallesi, Bekir Adıbelli Bulvarı, 12. Cadde No:15, Kahramankazan/Ankara","Ambalaj,Oluklu Mukavva,Karton Kutu",["ronapack"],"https://www.ronapack.com/services/"],["AKON Kutu Ambalaj","Ankara","Kahramankazan","Saray",["0534 734 44 72"],"","Saray Mahallesi, 614. Cadde No:43A, Kahramankazan/Ankara","Ambalaj,Karton Kutu",["akon kutu","akon ambalaj"],"https://www.find.com.tr/Company/akonkutuambalajsanayiveticaretanonimsirketi"],["Başkent Şimşek Ambalaj","Ankara","Yenimahalle","İvedik OSB",["0536 253 85 25","0539 654 05 99","0312 395 62 70"],"info@baskentsimsekambalaj.com","İvedik OSB, 1342. Sokak No:62, Yenimahalle/Ankara","Ambalaj,Oluklu Mukavva,Karton Kutu",["baskent simsek","simsek ambalaj"],"https://www.find.com.tr/Company/hasansimsekbaskentsimsekambalaj"],["ES Oluklu Mukavva","Ankara","Kahramankazan","Saray",["0312 394 45 38"],"info@esoluklu.com","Saray Mahallesi, 675. Cadde No:8 A Blok, Kahramankazan/Ankara (İvedik OSB şubesi: 2266. Cad. No:38 Yenimahalle)","Ambalaj,Oluklu Mukavva,Karton Kutu",["es oluklu","es ambalaj oluklu"],"https://www.esoluklu.com/iletisim/"],["Esmer Kutu (Oluklu Mukavva)","Ankara","Yenimahalle","İvedik OSB",["0312 999 86 09","0533 294 28 49","0542 237 12 34"],"esmerkutu@gmail.com","İvedik OSB Mahallesi, 1548. Cadde No:33, Yenimahalle/Ankara","Ambalaj,Oluklu Mukavva,Karton Kutu",["esmer kutu","esmer oluklu"],"https://www.esmerkutu.com/"],["Elif Oluklu Mukavva","Çorum","Merkez","",["0533 205 80 14"],"info@elifoluklu.com.tr","Cemilbey Yolu 5. km, Merkez/Çorum","Ambalaj,Oluklu Mukavva,Karton Kutu",["elif oluklu"],"https://www.omko.org.tr/omkouygulama/?dil=tr&sayfa=-26574"]];
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ı/g,'i').replace(/[^a-z0-9]+/g,' ').trim();
const button=document.createElement('button');
button.type='button';
button.className='btn primary';
button.id='crmProspectImportBtn';
button.style.cssText='background:#0f766e;border-color:#0f766e;white-space:nowrap';
button.textContent='＋ 6 Firmayı CRM’ye Ekle';
button.title='5 Ankara ve 1 Çorum firması. Mevcut isimler tekrar eklenmez.';
const host=document.querySelector('.head-actions');
if(!host)return;
host.insertBefore(button,host.firstChild);
const status=document.createElement('span');
status.id='crmProspectImportStatus';
status.style.cssText='display:none;align-self:center;font-size:12px;font-weight:700;color:#0f766e';
host.insertBefore(status,button.nextSibling);
button.addEventListener('click',async()=>{
 if(!window.confirm('5 Ankara ve 1 Çorum firması CRM portföyüne eklensin mi? Mevcut kayıtlar değiştirilmeyecek.'))return;
 button.disabled=true;button.textContent='Firmalar kontrol ediliyor…';
 status.style.display='inline';status.textContent='';
 let added=0,skipped=0,failed=[];
 try{
  const response=await fetch('/api/customers?status=T%C3%BCm%C3%BC',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw new Error('Müşteri listesi okunamadı ('+response.status+'). CRM’ye Ali hesabıyla giriş yapın.');
  const existing=await response.json();
  if(!Array.isArray(existing))throw new Error('Müşteri listesi beklenen biçimde değil.');
  const known=existing.map(c=>normalize(c.company));
  for(const [company,city,district,neighborhood,phones,email,address,categories,aliases,source] of prospects){
   if(aliases.some(alias=>known.some(name=>name.includes(normalize(alias))))){skipped++;continue;}
   const special_notes='Adres (fatura adresi ayrıca doğrulanmalı): '+address+'. Kaynak: '+source+(city!=='Ankara'?'. NOT: Bu firma Ankara değil, Çorum ilindedir.':'');
   const payload={company,contact_name:'',phones,emails:email?[email]:[],region:city,city,district,neighborhood,categories:categories.split(','),priority:'NORMAL',stage:'Yeni Lead',special_notes,follow_date:''};
   try{
    const save=await fetch('/api/customers',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    if(!save.ok){let msg='HTTP '+save.status;try{const data=await save.json();msg=data.error||msg}catch{}throw new Error(msg);}
    added++;known.push(normalize(company));
   }catch(error){failed.push(company+': '+error.message)}
  }
  status.textContent=added+' yeni firma eklendi, '+skipped+' mükerrer atlandı.'+(failed.length?' '+failed.length+' hata.':'');
  button.textContent='✓ Firma Aktarımını Kontrol Et';
  if(typeof loadAll==='function') await loadAll();
  if(failed.length)window.alert(status.textContent+'\n'+failed.join('\n'));
  else window.alert(status.textContent+'\nİl filtresinde Ankara veya Çorum seçerek görebilirsiniz.');
 }catch(error){
  status.textContent='Aktarım yapılamadı: '+error.message;
  window.alert(status.textContent);
 }finally{button.disabled=false;button.textContent='＋ 6 Firmayı CRM’ye Ekle';}
});
})();