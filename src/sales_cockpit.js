import worker from './quick_request_vertical_compact.js';

const SALES_COCKPIT_ASSETS = '<link rel="stylesheet" href="/sales-cockpit.css?v=20260929d">\n<script src="/sales-cockpit.js?v=20260929d"></script>\n<script src="/sales-fields.js?v=20260929d"></script>';
let salesSchemaPromise;

const ANKARA_LEADS = [
  {company:'Polus Group Ambalaj A.Ş.',phones:['0312 255 00 25'],emails:['info@polusgroup.com.tr'],region:'Şaşmaz / Etimesgut',city:'Ankara',priority:'KRİTİK',website:'https://www.polusgroup.com.tr/',business_area:'Ofset baskılı karton kutu; gıda, ilaç, medikal, kozmetik ve tekstil kutuları; laminasyon, kesim ve yapıştırma',note:'İlk arama yapılacak — karton kutu üretimi ve kesim/yapıştırma hattı var. Kesim kalıbı/bıçak tedarik yetkilisi sorulacak.'},
  {company:'RDF Ambalaj',phones:['0312 394 60 83','0554 497 61 70'],emails:['info@rdfambalaj.com.tr'],region:'İvedik OSB / Yenimahalle',city:'Ankara',priority:'KRİTİK',website:'https://www.rdfambalaj.com.tr/',business_area:'Karton kutu; kozmetik, sağlık, medikal, ilaç ve parfüm kutuları; kazanlı kesim ve kutu yapıştırma',note:'İlk arama yapılacak — muhtelif kazanlı kesim yapıyor. Kesim kalıbı/bıçak satın alma sorumlusu sorulacak.'},
  {company:'Kuber Ambalaj',phones:['0312 394 77 04','0531 831 51 70'],emails:['info@kuberambalaj.com','kubergrafik@gmail.com'],region:'İvedik OSB / Yenimahalle',city:'Ankara',priority:'YÜKSEK',website:'https://kuberambalaj.com/',business_area:'Karton ambalaj ve matbaacılık; tasarım ve üretim',note:'İlk arama yapılacak — karton ambalaj üreticisi. Kesim kalıbı/bıçak ihtiyacı ve tedarik şekli sorulacak.'},
  {company:'On Ofset Ambalaj',phones:['0312 397 87 87','0532 467 05 27','0531 640 68 98'],emails:['info@onofset.com'],region:'İvedikköy / Yenimahalle',city:'Ankara',priority:'KRİTİK',website:'https://onofset.com/',business_area:'Karton kutu ve etiket; ofset baskı, laminasyon, kesim ve yapıştırma',note:'İlk arama yapılacak — karton kutuda kesim ve yapıştırma üretimi var. Üretim/satın alma yetkilisi sorulacak.'},
  {company:'Kılıçaslan Basım Ambalaj A.Ş.',phones:['0312 394 55 11','0533 369 19 90'],emails:['info@kilicaslan.com.tr'],region:'İvedik OSB / Yenimahalle',city:'Ankara',priority:'YÜKSEK',website:'https://www.kilicaslan.com.tr/',business_area:'Baskılı karton kutu; ilaç, gıda ve tüketim ürünleri kutuları; matbaa ve ambalaj',note:'İlk arama yapılacak — baskılı karton kutu üreticisi. Kesim kalıplarını dışarıdan mı tedarik ettikleri sorulacak.'},
  {company:'Miki Matbaa',phones:['0312 395 21 28','0312 394 18 63','0533 765 33 62'],emails:['bilgi@miki.com.tr'],region:'İvedik OSB / Yenimahalle',city:'Ankara',priority:'YÜKSEK',website:'https://miki.com.tr/',business_area:'Ofset ve dijital baskı; karton kutu ve ambalaj baskısı; karton çanta',note:'İlk arama yapılacak — karton ambalaj baskısı yapıyor. Özel kesim işleri ve kalıp tedarikçisi sorulacak.'},
  {company:'Çubuk Ofset',phones:['0312 341 10 73','0312 384 29 01'],emails:['info@cubukofset.com'],region:'İvedik OSB / Yenimahalle',city:'Ankara',priority:'NORMAL',website:'https://www.cubukofset.com/',business_area:'Kutu-ambalaj, karton kutu, karton çanta, etiket ve ofset baskı',note:'İlk arama yapılacak — kutu ve ambalaj üretimi var. Kesim kalıbı/bıçak işi ve tedarikçisi teyit edilecek.'},
  {company:"Bi'Dünya Kutu",phones:['0541 184 20 24'],emails:[],region:'Ankara',city:'Ankara',priority:'KRİTİK',website:'https://www.bidunyakutu.com/',business_area:'Ofset baskılı karton kutu, karton çanta ve karton/ofset etiket; gıda, kozmetik, tekstil ve medikal kutuları',note:'İlk arama yapılacak — ofset baskılı karton kutu üreticisi. Kesim kalıbı/bıçak tedarik yetkilisi sorulacak.'}
];

function istanbulDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}

async function tableColumns(env,table){
  try{const r=await env.DB.prepare(`PRAGMA table_info(${table})`).all();return new Set((r.results||[]).map(x=>x.name))}catch{return new Set()}
}

async function ensureSalesSchema(env){
  if(!env?.DB?.prepare)return;
  if(salesSchemaPromise)return salesSchemaPromise;
  salesSchemaPromise=(async()=>{
    const cols=await tableColumns(env,'customers');
    if(!cols.size)return;
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT DEFAULT '', updated_at TEXT DEFAULT CURRENT_TIMESTAMP)").run();
    if(!cols.has('city'))await env.DB.prepare("ALTER TABLE customers ADD COLUMN city TEXT DEFAULT ''").run();
    if(!cols.has('business_area'))await env.DB.prepare("ALTER TABLE customers ADD COLUMN business_area TEXT DEFAULT ''").run();
    if(!cols.has('website'))await env.DB.prepare("ALTER TABLE customers ADD COLUMN website TEXT DEFAULT ''").run();

    const marker=await env.DB.prepare("SELECT value FROM app_meta WHERE key='ankara_carton_leads_v2'").first();
    if(marker)return;

    for(const table of ['meetings','offers','mails','reminders']){
      try{await env.DB.prepare(`DELETE FROM ${table}`).run()}catch{}
    }
    await env.DB.prepare('DELETE FROM customers').run();

    const followDate=istanbulDate();
    for(const lead of ANKARA_LEADS){
      const inserted=await env.DB.prepare(`INSERT INTO customers(
        company,contact_name,phone,email,region,sector,priority,stage,follow_date,record_status,
        special_notes,machine_info,phones_json,emails_json,categories,city,business_area,website
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        lead.company,'',lead.phones[0]||'',lead.emails[0]||'',lead.region,'Ambalaj,Matbaa',lead.priority,'Yeni Lead',followDate,'Aktif',
        lead.note,'',JSON.stringify(lead.phones),JSON.stringify(lead.emails),'Ambalaj,Matbaa',lead.city,lead.business_area,lead.website
      ).run();
      const customerId=Number(inserted.meta?.last_row_id||0);
      if(customerId){
        await env.DB.prepare(`INSERT INTO meetings(customer_id,meeting_no,meeting_date,note,next_follow_date,remind_at,remind_note,reminder_status,result,result_note,participants_json)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(customerId,1,'',lead.note,followDate,'','','','Beklemede','İlk temas bekleniyor','[]').run();
      }
    }
    await env.DB.prepare("INSERT OR REPLACE INTO app_meta(key,value,updated_at) VALUES('ankara_carton_leads_v2',?,CURRENT_TIMESTAMP)").bind(String(ANKARA_LEADS.length)).run();
  })().catch(error=>{salesSchemaPromise=undefined;throw error});
  return salesSchemaPromise;
}

function customerWriteBody(request,path){
  if(!['POST','PUT'].includes(request.method))return null;
  if(!(path==='/api/customers'||/^\/api\/customers\/\d+$/.test(path)))return null;
  return request.clone().json().catch(()=>null);
}

async function saveExtraCustomerFields(extraBody,response,env,path,method){
  if(!response.ok||!env?.DB?.prepare||!extraBody)return;
  const fields=[],values=[];
  for(const key of ['city','business_area','website'])if(Object.prototype.hasOwnProperty.call(extraBody,key)){fields.push(`${key}=?`);values.push(String(extraBody[key]||'').trim())}
  if(!fields.length)return;
  let id=0;
  if(method==='PUT')id=Number(path.match(/(\d+)$/)?.[1]||0);
  else{try{id=Number((await response.clone().json()).id||0)}catch{}}
  if(!id)return;
  values.push(id);
  await env.DB.prepare(`UPDATE customers SET ${fields.join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...values).run();
}

async function enrichMeetings(response,env){
  if(!response.ok)return response;
  let rows;try{rows=await response.clone().json()}catch{return response}
  if(!Array.isArray(rows)||!rows.length)return response;
  const customers=(await env.DB.prepare('SELECT id,city,business_area,website FROM customers').all()).results||[];
  const map=new Map(customers.map(x=>[Number(x.id),x]));
  return json(rows.map(x=>({...x,...(map.get(Number(x.customer_id))||{})})),response.status);
}

function patchHtml(html){
  let out=html;
  out=out.replace(
    '<div class="field-row"><label>Bölge</label><input id="c_region"></div><div class="field-row"><label>Öncelik</label>',
    '<div class="field-row"><label>Bölge / İlçe</label><input id="c_region"></div><div class="field-row"><label>İl</label><input id="c_city" placeholder="Örn: Ankara"></div><div><label style="font-size:13px;font-weight:700">Yaptığı İş Alanı</label><textarea id="c_business_area" rows="3" placeholder="Örn: Ofset baskılı karton kutu, ilaç kutusu, kazanlı kesim"></textarea></div><div class="field-row"><label>Web Sitesi</label><input id="c_website" placeholder="https://..."></div><div class="field-row"><label>Öncelik</label>'
  );
  out=out.replace(
    '<th>Mailler</th><th>Bölge</th><th>Kategori</th>',
    '<th>Mailler</th><th>Bölge / İlçe</th><th>İl</th><th>Yaptığı İş Alanı</th><th>Kategori</th>'
  );
  out=out.replace(
    '<th>🏢 Firma</th><th>👤 Yetkili</th>',
    '<th>🏢 Firma</th><th>📍 İl</th><th>🏭 Yaptığı İş Alanı</th><th>👤 Yetkili</th>'
  );
  out=out.replace("let currentAccessRole=''; let currentMeetingFilter='Aktif';", "let currentAccessRole=''; let currentMeetingFilter='Bekleyen';");
  out=out.replace('<button class="btn primary meeting-filter-btn" onclick="setMeetingFilter(\'Aktif\',this)">Aktif</button>\n    <button class="btn meeting-filter-btn" onclick="setMeetingFilter(\'Bekleyen\',this)">Bekleyen</button>', '<button class="btn meeting-filter-btn" onclick="setMeetingFilter(\'Aktif\',this)">Aktif</button>\n    <button class="btn primary meeting-filter-btn" onclick="setMeetingFilter(\'Bekleyen\',this)">Aranacak / Bekleyen</button>');
  out=out.replace("['c_company','c_emails','c_region','c_follow','c_special_notes','c_machine_info','c_invoice_title','c_tax_office','c_tax_number','c_invoice_address']", "['c_company','c_emails','c_region','c_city','c_business_area','c_website','c_follow','c_special_notes','c_machine_info','c_invoice_title','c_tax_office','c_tax_number','c_invoice_address']");
  out=out.replace("$('c_emails').value=em.join('\\n');$('c_region').value=x.region||'';$('c_priority').value", "$('c_emails').value=em.join('\\n');$('c_region').value=x.region||'';$('c_city').value=x.city||'';$('c_business_area').value=x.business_area||'';$('c_website').value=x.website||'';$('c_priority').value");
  out=out.replace("phones,emails,region:$('c_region').value.trim(),priority:$('c_priority').value", "phones,emails,region:$('c_region').value.trim(),city:$('c_city').value.trim(),business_area:$('c_business_area').value.trim(),website:$('c_website').value.trim(),priority:$('c_priority').value");
  out=out.replace("<td>${x.region||''}</td><td>${(x.categories||x.sector||'').replaceAll(',',', ')}</td>", "<td>${x.region||''}</td><td>${x.city||''}</td><td style=\"min-width:240px\">${x.business_area||''}</td><td>${(x.categories||x.sector||'').replaceAll(',',', ')}</td>");
  out=out.replace("groups.set(meeting.customer_id,{customer_id:meeting.customer_id,company:meeting.company,contact_name:meeting.contact_name||'',phone,email,items:[]})", "groups.set(meeting.customer_id,{customer_id:meeting.customer_id,company:meeting.company,city:meeting.city||'',business_area:meeting.business_area||'',contact_name:meeting.contact_name||'',phone,email,items:[]})");
  out=out.replace("<td><b>${esc(group.company)}</b></td><td>${esc(group.contact_name||'Yok')}</td>", "<td><b>${esc(group.company)}</b></td><td>${esc(group.city||'—')}</td><td style=\"min-width:260px\">${esc(group.business_area||'—')}</td><td>${esc(group.contact_name||'Yok')}</td>");
  out=out.replace('class="meeting-detail-row"><td colspan="9">','class="meeting-detail-row"><td colspan="11">');
  out=out.replace("$('meetingRows').innerHTML=rows||'<tr><td colspan=\"8\"><div class=\"history-empty\">", "$('meetingRows').innerHTML=rows||'<tr><td colspan=\"11\"><div class=\"history-empty\">");
  out=out.replace('placeholder="Firma, kişi, telefon, mail ara..."','placeholder="Firma, kişi, telefon, mail ara..."');
  if(!out.includes('/sales-cockpit.js?v=20260929d'))out=out.includes('</body>')?out.replace('</body>',SALES_COCKPIT_ASSETS+'\n</body>'):out+SALES_COCKPIT_ASSETS;
  return out;
}

function rebuild(response,html){
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('cache-control','no-cache, no-store, must-revalidate');headers.set('pragma','no-cache');headers.set('expires','0');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    await ensureSalesSchema(env);
    const path=new URL(request.url).pathname;
    const extraBodyPromise=customerWriteBody(request,path);
    let response=await worker.fetch(request,env,ctx);
    await saveExtraCustomerFields(extraBodyPromise?await extraBodyPromise:null,response,env,path,request.method);
    if(path==='/api/meetings'&&request.method==='GET')response=await enrichMeetings(response,env);
    const backup=response.clone();
    try{
      const type=response.headers.get('content-type')||'';
      if(request.method!=='GET'||!type.includes('text/html'))return response;
      return rebuild(response,patchHtml(await response.text()));
    }catch(error){console.error('Sales cockpit native patch failed',error);return backup}
  }
};
