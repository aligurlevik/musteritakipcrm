let extendedCustomerSchemaPromise;

async function tableColumns(env,table){
  const result=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((result.results||[]).map(row=>String(row.name)));
}

export async function ensureCustomerExtendedFields(env){
  if(extendedCustomerSchemaPromise)return extendedCustomerSchemaPromise;
  extendedCustomerSchemaPromise=(async()=>{
    const cols=await tableColumns(env,'customers');
    if(!cols.has('contacts_json'))await env.DB.prepare("ALTER TABLE customers ADD COLUMN contacts_json TEXT DEFAULT '[]'").run();
    if(!cols.has('district'))await env.DB.prepare("ALTER TABLE customers ADD COLUMN district TEXT DEFAULT ''").run();
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
  await env.DB.prepare('UPDATE customers SET contacts_json=?,district=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .bind(JSON.stringify(contacts),district,id).run();
}
