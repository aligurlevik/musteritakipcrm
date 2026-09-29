import worker from './quick_request_vertical_compact.js';

const SALES_COCKPIT_ASSETS = '<link rel="stylesheet" href="/sales-cockpit.css?v=20260929b">\n<script src="/sales-cockpit.js?v=20260929b"></script>\n<script src="/sales-fields.js?v=20260929b"></script>';
let salesSchemaPromise;

const ANKARA_LEADS = [
  {
    company:'Polus Group Ambalaj A.Ş.', phones:['0312 255 00 25'], emails:['info@polusgroup.com.tr'],
    region:'Etimesgut / Şaşmaz', city:'Ankara', priority:'KRİTİK', website:'https://www.polusgroup.com.tr/',
    business_area:'Ofset baskılı karton kutu; gıda, ilaç, medikal, kozmetik ve tekstil kutuları; laminasyon, kesim ve yapıştırma',
    note:'İlk arama yapılacak — karton kutu üretimi ve kesim/yapıştırma hattı var. Kesim kalıbı/bıçak tedarik yetkilisi sorulacak.'
  },
  {
    company:'RDF Ambalaj', phones:['0312 394 60 83','0554 497 61 70'], emails:['info@rdfambalaj.com.tr'],
    region:'İvedik OSB / Yenimahalle', city:'Ankara', priority:'KRİTİK', website:'https://www.rdfambalaj.com.tr/',
    business_area:'Karton kutu; kozmetik, sağlık, medikal, ilaç ve parfüm kutuları; kazanlı kesim ve kutu yapıştırma',
    note:'İlk arama yapılacak — sitesinde muhtelif kazanlı kesim işleri açıkça belirtiliyor. Kesim kalıbı/bıçak satın alma sorumlusu sorulacak.'
  },
  {
    company:'Kuber Ambalaj', phones:['0312 394 77 04','0531 831 51 70'], emails:['info@kuberambalaj.com','kubergrafik@gmail.com'],
    region:'İvedik OSB / Yenimahalle', city:'Ankara', priority:'YÜKSEK', website:'https://kuberambalaj.com/',
    business_area:'Karton ambalaj ve matbaacılık; tasarım ve üretim',
    note:'İlk arama yapılacak — karton ambalaj ve matbaacılık üreticisi. Kesim kalıbı/bıçak ihtiyacı ve tedarik şekli sorulacak.'
  },
  {
    company:'On Ofset Ambalaj', phones:['0312 397 87 91','0532 467 05 27'], emails:['info@onofset.com'],
    region:'İvedikköy / Yenimahalle', city:'Ankara', priority:'KRİTİK', website:'https://onofset.com/',
    business_area:'Karton kutu ve etiket; ofset baskı, laminasyon, kesim ve yapıştırma',
    note:'İlk arama yapılacak — karton kutuda laminasyon, kesim ve yapıştırmayı kendi tesisinde yapıyor. Üretim/satın alma yetkilisi sorulacak.'
  },
  {
    company:'Kılıçaslan Basım Ambalaj A.Ş.', phones:['0312 394 55 11','0533 369 19 90'], emails:['info@kilicaslan.com.tr'],
    region:'İvedik OSB / Yenimahalle', city:'Ankara', priority:'YÜKSEK', website:'https://www.kilicaslan.com.tr/',
    business_area:'Baskılı karton kutu; ilaç, gıda ve tüketim ürünleri kutuları; matbaa ve ambalaj',
    note:'İlk arama yapılacak — baskılı karton kutu üreticisi. Kesim kalıplarını dışarıdan mı tedarik ettikleri sorulacak.'
  },
  {
    company:'Miki Matbaa', phones:['0312 395 21 28','0312 394 18 63','0533 765 33 62'], emails:['bilgi@miki.com.tr'],
    region:'İvedik OSB / Yenimahalle', city:'Ankara', priority:'YÜKSEK', website:'https://miki.com.tr/',
    business_area:'Ofset ve dijital baskı; karton kutu ve ambalaj baskısı; karton çanta',
    note:'İlk arama yapılacak — karton ambalaj baskısı yapıyor. Özel kesim işleri ve kalıp tedarikçisi sorulacak.'
  },
  {
    company:'Çubuk Ofset', phones:['0312 341 10 73','0312 384 29 01'], emails:['info@cubukofset.com'],
    region:'İvedik OSB / Yenimahalle', city:'Ankara', priority:'NORMAL', website:'https://www.cubukofset.com/',
    business_area:'Kutu-ambalaj, karton çanta, etiket ve ofset baskı',
    note:'İlk arama yapılacak — kutu ve ambalaj üretimi var. Kesim kalıbı/bıçak işi yapıp yapmadıkları teyit edilecek.'
  },
  {
    company:"Bi'Dünya Kutu", phones:['0541 184 20 24'], emails:[],
    region:'Ankara', city:'Ankara', priority:'KRİTİK', website:'https://www.bidunyakutu.com/',
    business_area:'Ofset baskılı karton kutu, karton çanta, karton/ofset etiket; gıda, kozmetik, tekstil ve medikal kutuları',
    note:'İlk arama yapılacak — Ankara’da 2.400 m² fabrikada ofset baskılı karton kutu üretiyor. Kesim kalıbı/bıçak tedarik yetkilisi sorulacak.'
  }
];

function istanbulDate(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}

async function tableColumns(env,table){
  const r=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((r.results||[]).map(x=>x.name));
}

async function ensureSalesSchema(env){
  if(salesSchemaPromise)return salesSchemaPromise;
  salesSchemaPromise=(async()=>{
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT DEFAULT '', updated_at TEXT DEFAULT CURRENT_TIMESTAMP)").run();
    const cols=await tableColumns(env,'customers');
    if(!cols.has('city'))await env.DB.prepare("ALTER TABLE customers ADD COLUMN city TEXT DEFAULT ''").run();
    if(!cols.has('business_area'))await env.DB.prepare("ALTER TABLE customers ADD COLUMN business_area TEXT DEFAULT ''").run();
    if(!cols.has('website'))await env.DB.prepare("ALTER TABLE customers ADD COLUMN website TEXT DEFAULT ''").run();

    const marker=await env.DB.prepare("SELECT value FROM app_meta WHERE key='ankara_carton_leads_v1'").first();
    if(marker)return;

    for(const table of ['meetings','offers','mails','customers']){
      try{await env.DB.prepare(`DELETE FROM ${table}`).run()}catch(error){console.error('Sales reset failed for',table,error?.message)}
    }

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
        await env.DB.prepare(`INSERT INTO meetings(customer_id,meeting_no,meeting_date,note,next_follow_date,result,result_note,participants_json)
          VALUES(?,?,?,?,?,?,?,?)`).bind(customerId,1,'',lead.note,followDate,'Beklemede','İlk temas bekleniyor','[]').run();
      }
    }
    await env.DB.prepare("INSERT INTO app_meta(key,value,updated_at) VALUES('ankara_carton_leads_v1',?,CURRENT_TIMESTAMP)").bind(String(ANKARA_LEADS.length)).run();
  })().catch(error=>{salesSchemaPromise=undefined;throw error});
  return salesSchemaPromise;
}

function rebuild(response, html) {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('cache-control', 'no-cache, no-store, must-revalidate');
  headers.set('pragma', 'no-cache');
  headers.set('expires', '0');
  return new Response(html, {status: response.status, statusText: response.statusText, headers});
}

async function saveExtraCustomerFields(request,response,env,path){
  if(!response.ok)return;
  const method=request.method;
  if(method!=='POST'&&method!=='PUT')return;
  if(!(path==='/api/customers'||/^\/api\/customers\/\d+$/.test(path)))return;
  let body={};try{body=await request.clone().json()}catch{return}
  const fields=[];const values=[];
  for(const key of ['city','business_area','website']){
    if(Object.prototype.hasOwnProperty.call(body,key)){fields.push(`${key}=?`);values.push(String(body[key]||'').trim())}
  }
  if(!fields.length)return;
  let id=0;
  if(method==='PUT')id=Number(path.match(/(\d+)$/)?.[1]||0);
  else{try{id=Number((await response.clone().json()).id||0)}catch{}}
  if(!id)return;
  values.push(id);
  await env.DB.prepare(`UPDATE customers SET ${fields.join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...values).run();
}

export default {
  async fetch(request, env, ctx) {
    await ensureSalesSchema(env);
    const path=new URL(request.url).pathname;
    const response = await worker.fetch(request, env, ctx);
    await saveExtraCustomerFields(request,response,env,path);
    const backup = response.clone();
    try {
      const type = response.headers.get('content-type') || '';
      if (request.method !== 'GET' || !type.includes('text/html')) return response;
      const html = await response.text();
      if (html.includes('/sales-cockpit.js?v=20260929b')) return rebuild(response, html);
      const next = html.includes('</body>')
        ? html.replace('</body>', SALES_COCKPIT_ASSETS + '\n</body>')
        : html + SALES_COCKPIT_ASSETS;
      return rebuild(response, next);
    } catch (error) {
      console.error('Sales cockpit HTML patch failed', error);
      return backup;
    }
  }
};
