let extendedCustomerSchemaPromise;

async function tableColumns(env,table){
  const result=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((result.results||[]).map(row=>String(row.name)));
}

export async function ensureCustomerExtendedFields(env){
  if(extendedCustomerSchemaPromise)return extendedCustomerSchemaPromise;
  extendedCustomerSchemaPromise=(async()=>{
    const cols=await tableColumns(env,'customers');
    const additions=[
      ['contacts_json',"TEXT DEFAULT '[]'"],
      ['district',"TEXT DEFAULT ''"],
      ['customer_requests',"TEXT DEFAULT ''"],
      ['cargo_enabled','INTEGER DEFAULT 0'],
      ['cargo_company',"TEXT DEFAULT ''"],
      ['cargo_code',"TEXT DEFAULT ''"],
      ['cargo_note',"TEXT DEFAULT ''"],
      ['service_requested','INTEGER DEFAULT 0'],
      ['service_type',"TEXT DEFAULT ''"],
      ['service_description',"TEXT DEFAULT ''"],
      ['service_date',"TEXT DEFAULT ''"]
    ];
    for(const [name,def] of additions)if(!cols.has(name))await env.DB.prepare(`ALTER TABLE customers ADD COLUMN ${name} ${def}`).run();
  })().catch(error=>{extendedCustomerSchemaPromise=null;throw error});
  return extendedCustomerSchemaPromise;
}

function cleanContacts(value){
  return (Array.isArray(value)?value:[]).slice(0,4).map(item=>({
    name:String(item?.name||'').trim().slice(0,180),
    role:String(item?.role||'').trim().slice(0,180),
    phone:String(item?.phone||'').trim().slice(0,80),
    email:String(item?.email||'').trim().slice(0,240)
  })).filter(item=>item.name||item.role||item.phone||item.email);
}

export async function persistCustomerExtendedFields(env,customerId,payload){
  const id=Number(customerId||0);if(!id)return;
  await ensureCustomerExtendedFields(env);
  const contacts=cleanContacts(payload?.contacts);
  const district=String(payload?.district||'').trim().slice(0,180);
  const customerRequests=String(payload?.customer_requests||'').trim().slice(0,5000);
  const cargoEnabled=payload?.cargo_enabled?1:0;
  const cargoCompany=String(payload?.cargo_company||'').trim().slice(0,180);
  const cargoCode=String(payload?.cargo_code||'').trim().slice(0,180);
  const cargoNote=String(payload?.cargo_note||'').trim().slice(0,2000);
  const serviceRequested=payload?.service_requested?1:0;
  const serviceType=String(payload?.service_type||'').trim().slice(0,180);
  const serviceDescription=String(payload?.service_description||'').trim().slice(0,3000);
  const serviceDate=String(payload?.service_date||'').trim().slice(0,40);
  await env.DB.prepare(`UPDATE customers SET
    contacts_json=?,district=?,customer_requests=?,cargo_enabled=?,cargo_company=?,cargo_code=?,cargo_note=?,
    service_requested=?,service_type=?,service_description=?,service_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(JSON.stringify(contacts),district,customerRequests,cargoEnabled,cargoCompany,cargoCode,cargoNote,
      serviceRequested,serviceType,serviceDescription,serviceDate,id).run();
}
