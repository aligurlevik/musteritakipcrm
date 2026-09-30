let restorePromise;

const LEADS=[
  {company:'Polus Group Ambalaj A.Ş.',phones:['0312 255 00 25'],emails:['info@polusgroup.com.tr'],region:'Etimesgut / Şaşmaz',priority:'KRİTİK',note:'İlk arama yapılacak — karton kutu üretimi ve kesim/yapıştırma hattı var. Kesim kalıbı/bıçak tedarik yetkilisi sorulacak.'},
  {company:'RDF Ambalaj',phones:['0312 394 60 83','0554 497 61 70'],emails:['info@rdfambalaj.com.tr'],region:'İvedik OSB / Yenimahalle',priority:'KRİTİK',note:'İlk arama yapılacak — sitesinde muhtelif kazanlı kesim işleri açıkça belirtiliyor. Kesim kalıbı/bıçak satın alma sorumlusu sorulacak.'},
  {company:'Kuber Ambalaj',phones:['0312 394 77 04','0531 831 51 70'],emails:['info@kuberambalaj.com','kubergrafik@gmail.com'],region:'İvedik OSB / Yenimahalle',priority:'YÜKSEK',note:'İlk arama yapılacak — karton ambalaj ve matbaacılık üreticisi. Kesim kalıbı/bıçak ihtiyacı ve tedarik şekli sorulacak.'},
  {company:'On Ofset Ambalaj',phones:['0312 397 87 91','0532 467 05 27'],emails:['info@onofset.com'],region:'İvedikköy / Yenimahalle',priority:'KRİTİK',note:'İlk arama yapılacak — karton kutuda laminasyon, kesim ve yapıştırmayı kendi tesisinde yapıyor. Üretim/satın alma yetkilisi sorulacak.'},
  {company:'Kılıçaslan Basım Ambalaj A.Ş.',phones:['0312 394 55 11','0533 369 19 90'],emails:['info@kilicaslan.com.tr'],region:'İvedik OSB / Yenimahalle',priority:'YÜKSEK',note:'İlk arama yapılacak — baskılı karton kutu üreticisi. Kesim kalıplarını dışarıdan mı tedarik ettikleri sorulacak.'},
  {company:'Miki Matbaa',phones:['0312 395 21 28','0312 394 18 63','0533 765 33 62'],emails:['bilgi@miki.com.tr'],region:'İvedik OSB / Yenimahalle',priority:'YÜKSEK',note:'İlk arama yapılacak — karton ambalaj baskısı yapıyor. Özel kesim işleri ve kalıp tedarikçisi sorulacak.'},
  {company:'Çubuk Ofset',phones:['0312 341 10 73','0312 384 29 01'],emails:['info@cubukofset.com'],region:'İvedik OSB / Yenimahalle',priority:'NORMAL',note:'İlk arama yapılacak — kutu ve ambalaj üretimi var. Kesim kalıbı/bıçak işi yapıp yapmadıkları teyit edilecek.'},
  {company:"Bi'Dünya Kutu",phones:['0541 184 20 24'],emails:[],region:'Ankara',priority:'KRİTİK',note:'İlk arama yapılacak — Ankara’da ofset baskılı karton kutu üretimi var. Kesim kalıbı/bıçak tedarik yetkilisi sorulacak.'}
];

function todayIstanbul(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}

async function ensureCustomerTable(env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    region TEXT,
    sector TEXT,
    priority TEXT DEFAULT 'NORMAL',
    stage TEXT DEFAULT 'Yeni Lead',
    follow_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    invoice_title TEXT DEFAULT '',
    tax_office TEXT DEFAULT '',
    tax_number TEXT DEFAULT '',
    invoice_address TEXT DEFAULT '',
    record_status TEXT DEFAULT 'Aktif',
    special_notes TEXT DEFAULT '',
    machine_info TEXT DEFAULT '',
    phones_json TEXT DEFAULT '[]',
    emails_json TEXT DEFAULT '[]',
    categories TEXT DEFAULT '',
    note_image_data TEXT DEFAULT '',
    contacts_json TEXT DEFAULT '[]',
    district TEXT DEFAULT '',
    customer_requests TEXT DEFAULT ''
  )`).run();
}

async function columns(env){
  const r=await env.DB.prepare('PRAGMA table_info(customers)').all();
  return new Set((r.results||[]).map(x=>String(x.name)));
}

export async function restorePortfolioCustomers(env){
  if(restorePromise)return restorePromise;
  restorePromise=(async()=>{
    // Bu veri daha once geri yuklendiyse her API isteginde yeniden D1 yazma.
    // Eski davranis her yeni Worker isolate'inda 8 UPDATE calistiriyor ve API
    // isteklerinin Pending kalmasina yol acabiliyordu.
    try{
      const marker=await env.DB.prepare('SELECT value FROM app_meta WHERE key=?').bind('restore_ankara_portfolio_v4').first();
      if(marker)return;
    }catch(_){}

    await env.DB.prepare("CREATE TABLE IF NOT EXISTS app_meta(key TEXT PRIMARY KEY,value TEXT DEFAULT '')").run();
    await ensureCustomerTable(env);

    const cols=await columns(env);
    const followDate=todayIstanbul();

    for(const lead of LEADS){
      const exists=await env.DB.prepare('SELECT id FROM customers WHERE company=? LIMIT 1').bind(lead.company).first();
      if(exists){
        if(cols.has('record_status')){
          await env.DB.prepare("UPDATE customers SET record_status='Aktif',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(exists.id).run();
        }
        continue;
      }

      const data={
        company:lead.company,
        contact_name:'',
        phone:lead.phones[0]||'',
        email:lead.emails[0]||'',
        region:lead.region,
        sector:'Ambalaj,Matbaa',
        priority:lead.priority,
        stage:'Yeni Lead',
        follow_date:followDate,
        record_status:'Aktif',
        special_notes:lead.note,
        machine_info:'',
        phones_json:JSON.stringify(lead.phones),
        emails_json:JSON.stringify(lead.emails),
        categories:'Ambalaj,Matbaa',
        contacts_json:JSON.stringify([{name:'Genel İletişim',role:'',phone:lead.phones[0]||'',email:lead.emails[0]||''}]),
        district:lead.region.includes('/')?lead.region.split('/').pop().trim():'',
        customer_requests:''
      };
      const names=Object.keys(data).filter(name=>cols.has(name));
      const marks=names.map(()=>'?').join(',');
      await env.DB.prepare(`INSERT INTO customers(${names.join(',')}) VALUES(${marks})`).bind(...names.map(name=>data[name])).run();
    }

    await env.DB.prepare('INSERT OR REPLACE INTO app_meta(key,value) VALUES(?,?)')
      .bind('restore_ankara_portfolio_v4',new Date().toISOString()).run();
  })().catch(error=>{restorePromise=null;throw error});
  return restorePromise;
}
