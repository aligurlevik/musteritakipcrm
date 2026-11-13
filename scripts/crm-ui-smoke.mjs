import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {CLEAN_PORTFOLIO_HTML} from '../src/portfolio_clean_page.js';
const screenshotDir=process.env.CRM_SCREENSHOT_DIR||'test-artifacts';
fs.mkdirSync(screenshotDir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const host=await browser.newPage({viewport:{width:1440,height:1000}});
 let page=host;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const img='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jxWQAAAAASUVORK5CYII=';
 let customer={id:289,company:'ÖRNEK MATBAA',invoice_title:'Örnek Matbaacılık San. ve Tic. Ltd. Şti.',city:'Ankara',district:'Yenimahalle',neighborhood:'İvedik OSB',region:'İvedik OSB / Yenimahalle',contact_name:'Mustafa Bey',phone:'0312 000 00 00',email:'info@example.com',contacts_json:JSON.stringify([{name:'Mustafa Bey',role:'Satın Alma',phone:'0532 000 00 00',email:'mustafa@example.com'}]),categories:'Matbaa, Ambalaj, Etiket',machine_info:'Bobst kesim makinesi\nPedallı kesim',special_notes:'[ ] 2026-11-13 | Numune desteği',customer_requests:'Maket kesimlerinde hızlı teslim',cargo_enabled:1,cargo_company:'Örnek Kargo',cargo_code:'K123',cargo_note:'Teslim notu',service_requested:1,service_type:'Teknik destek',service_description:'Örnek açıklama',service_date:'2026-12-01',first_meeting_date:'2026-10-01',note_image_data:img,priority:'YÜKSEK',stage:'Yeni Lead',record_status:'Aktif'};
 const saves=[];
 await page.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());let body={ok:true};
  if(!u.pathname.startsWith('/api/')){
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><iframe id="crm" title="CRM" src="/musteri-portfoyu.html?embedded=1" style="width:100%;height:100vh;border:0;display:block"></iframe></body></html>'});
   if(u.pathname==='/musteri-portfoyu.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:CLEAN_PORTFOLIO_HTML});
   const file=path.join('public',path.basename(u.pathname));
   if(fs.existsSync(file))return route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript':undefined});
   return route.fulfill({status:404,body:''});
  }
  if(u.pathname==='/api/portfolio-bootstrap')body={customers:[customer]};
  else if(u.pathname==='/api/portfolio-meetings')body={meetings:[]};
  else if(u.pathname.includes('/history'))body={meetings:[{id:1,meeting_date:'2026-11-01',note:'[GERCEK_GORUSME] Numune görüşüldü',participants_json:'[{"name":"Mustafa Bey"}]',result:'Olumlu'}],offers:[{id:2,offer_no:'T-001',amount:1500,currency:'TL',status:'Açık'}],mails:[{id:3,subject:'Numune talebi',direction:'Gelen',summary:'Örnek posta',email:'mustafa@example.com'}]};
  else if(req.method()==='PUT'&&u.pathname==='/api/customers/289'){body=JSON.parse(req.postData());saves.push(body);customer={...customer,...body,contacts_json:JSON.stringify(body.contacts),categories:body.categories.join(',')};body={ok:true};}
  else if(u.pathname.includes('delete-access'))body={can_delete:false};
  await route.fulfill({json:body});
 });
 await host.goto('https://crm.example.test/');
 await host.locator('#crm').waitFor();
 page=host.frames().find(frame=>frame.parentFrame());
 await page.getByRole('button',{name:'ÖRNEK MATBAA',exact:true}).click();
 await page.locator('#dCustomerRequests').waitFor();
 for(const key of ['name','role','phone','email'])if(!await page.locator('#contactPeople input').nth(['name','role','phone','email'].indexOf(key)).isVisible())throw Error('contact not visible '+key);
 for(const sel of ['.work-accordion','.machine-accordion','.payment-accordion']){
  if(await page.locator(sel).getAttribute('open')!==null)throw Error('accordion initially open');
  await page.locator(sel+' summary').click();
  if(await page.locator(sel).getAttribute('open')===null)throw Error('accordion failed');
 }
 await page.locator('#dPaymentDays').fill('30');await page.locator('#dPaymentMethod').fill('Havale / EFT');await page.locator('#dPaymentCurrency').fill('TL');await page.locator('#dPaymentLimit').fill('1000000');await page.locator('#dPaymentRisk').selectOption('Düşük');
 await page.locator('#dCustomerRequests').fill('Hızlı teslim ve çizim desteği');
 await page.locator('#contactPeople input').nth(1).fill('Üretim Müdürü');
 await page.locator('#newNote').fill('Yeni numune notu');await page.getByRole('button',{name:'＋ Not Ekle',exact:true}).click();
 await page.locator('.detail-head').getByRole('button',{name:'✓ Kaydet',exact:true}).click();
 await page.locator('#customerSaveStatus').filter({hasText:'Kaydedildi.'}).waitFor();
 const payload=saves.at(-1);
 for(const key of ['cargo_enabled','cargo_company','cargo_code','cargo_note','service_requested','service_type','service_description','service_date','first_meeting_date','note_image_data'])if(payload[key]!==customer[key])throw Error('lost field '+key);
 if(!payload.special_notes.includes('CRM_PAYMENT')||!payload.special_notes.includes('Yeni numune notu')||!payload.special_notes.includes('Numune desteği'))throw Error('notes/payment lost');
 if(payload.contacts[0].role!=='Üretim Müdürü')throw Error('contact edit lost');
 if(await page.locator('#dPaymentDays').inputValue()!=='30')throw Error('payment roundtrip lost');
 for(const [tab,target,text] of [['notes','#meetingHistory','Numune'],['offers','#offerHistory','T-001'],['analysis','#analysisBox','ÖRNEK MATBAA'],['mails','#mailHistory','Numune talebi']]){
  await page.locator('[data-tab='+tab+']').click();await page.locator(target).filter({hasText:text}).waitFor();
 }
 await page.locator('[data-tab=general]').click();
 // Show the normal collapsed layout.
 for(const sel of ['.work-accordion','.machine-accordion','.payment-accordion'])if(await page.locator(sel).getAttribute('open')!==null)await page.locator(sel+' summary').click();
 await host.screenshot({path:path.join(screenshotDir,'crm-desktop-preview.png'),fullPage:true});
 await host.setViewportSize({width:390,height:844});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
 if(overflow)throw Error('mobile horizontal overflow');
 await host.screenshot({path:path.join(screenshotDir,'crm-mobile-preview.png'),fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));
 console.log(JSON.stringify({desktop:'OK',mobile:'OK',contacts:'OK',accordions:'OK',save:'OK',payment_roundtrip:'OK',preserved_fields:'OK',tabs:'OK',page_errors:errors}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
