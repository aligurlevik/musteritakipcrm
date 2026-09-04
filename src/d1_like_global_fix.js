import worker from './d1_like_emergency_patch.js';

function isProblematicLegacyLike(sql){
  const s=String(sql||'').replace(/\s+/g,' ').trim();
  const upper=s.toUpperCase();
  // Eski şema eşleştirmeleri iki tabloyu dinamik LIKE deseniyle birbirine bağlıyor.
  // Bazı eski/uzun kayıtlarda SQLite "LIKE or GLOB pattern too complex" hatası veriyor.
  // Bunlar yalnızca yardımcı otomatik eşleştirmeler; ana kayıtları okumak/yazmak için zorunlu değiller.
  return upper.startsWith('UPDATE ')
    && upper.includes('AGENDA_ENTRIES')
    && upper.includes('GRAPHIC_JOBS')
    && upper.includes(' LIKE ')
    && s.includes('||');
}

function skippedStatement(){
  const result={success:true,meta:{changes:0,skipped_legacy_like:true}};
  const stmt={
    bind(){return stmt},
    async run(){return result},
    async all(){return {results:[],success:true,meta:result.meta}},
    async first(){return null},
    async raw(){return []}
  };
  return stmt;
}

function safeDatabase(db){
  const prepare=(sql)=>{
    if(isProblematicLegacyLike(sql)){
      console.warn('Eski problemli dinamik LIKE eşleştirmesi atlandı.');
      return skippedStatement();
    }
    return db.prepare(sql);
  };
  // Proxy yerine sade bir sarmalayıcı kullanıyoruz; D1 binding davranışı daha öngörülebilir.
  return {
    prepare,
    batch: typeof db.batch==='function' ? db.batch.bind(db) : undefined,
    exec: typeof db.exec==='function' ? db.exec.bind(db) : undefined,
    dump: typeof db.dump==='function' ? db.dump.bind(db) : undefined
  };
}

export default{
  async fetch(request,env,ctx){
    const safeEnv=Object.create(env);
    Object.defineProperty(safeEnv,'DB',{value:safeDatabase(env.DB),enumerable:true,configurable:true});
    return worker.fetch(request,safeEnv,ctx);
  }
};
