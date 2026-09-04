import worker from './d1_like_emergency_patch.js';

function isProblematicLegacyLike(sql){
  const s=String(sql||'').replace(/\s+/g,' ').trim();
  return s.includes("UPDATE graphic_jobs SET remind_at=COALESCE((SELECT a.remind_at FROM agenda_entries a WHERE a.entry_date=graphic_jobs.work_date AND a.note LIKE graphic_jobs.customer_name||' — '||graphic_jobs.job_no||'%'")
    || s.includes("UPDATE agenda_entries SET source_type='graphic_job' WHERE COALESCE(source_type,'manual')='manual' AND EXISTS (SELECT 1 FROM graphic_jobs g WHERE agenda_entries.note LIKE g.customer_name||' — '||g.job_no||'%')");
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
  return new Proxy(db,{
    get(target,prop){
      if(prop==='prepare'){
        return function(sql){
          if(isProblematicLegacyLike(sql)){
            console.warn('Eski problemli LIKE şema eşleştirmesi atlandı.');
            return skippedStatement();
          }
          return target.prepare(sql);
        };
      }
      const value=target[prop];
      return typeof value==='function'?value.bind(target):value;
    }
  });
}

export default{
  async fetch(request,env,ctx){
    const safeEnv={...env,DB:safeDatabase(env.DB)};
    return worker.fetch(request,safeEnv,ctx);
  }
};
