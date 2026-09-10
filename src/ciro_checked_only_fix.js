import worker from './agenda_selected_day_fix.js';

function shouldPatch(path){
  return path === '/' || path === '/index.html';
}

function patchHtml(html){
  // Raporlama ekranındaki ciro: sadece tiklenmiş / Bitti durumundaki işler.
  html = html.replace(
    "const total=jobs.length?jobs.reduce((sum,job)=>sum+Number(job.price||0),0):Number(s.revenue_total||0);",
    "const completedJobs=jobs.filter(job=>graphicStatusIs(job.status,'Bitti'));const total=completedJobs.reduce((sum,job)=>sum+Number(job.price||0),0);"
  );
  html = html.replace(
    "+jobs.length+' iş</small></div>'+",
    "+completedJobs.length+' iş</small></div>'+"
  );

  // Grafik İşleri > Günlük Ciro: fiyatı olan ama tiklenmemiş iş sayılmaz.
  html = html.replace(
    "const dayJobs=(source||[]).filter(job=>String(job.created_date||job.created_at||'').slice(0,10)===selectedDate);",
    "const dayJobs=(source||[]).filter(job=>String(job.created_date||job.created_at||'').slice(0,10)===selectedDate&&graphicStatusIs(job.status,'Bitti'));"
  );

  // Grafik İşleri > Toplam Ciro: sadece tamamlanan/tikli işler.
  html = html.replace(
    "const summarize=jobs=>{\n    const total=jobs.reduce((sum,job)=>sum+Number(job.price||0),0);\n    return {total,count:jobs.length};\n  };",
    "const summarize=jobs=>{\n    const completed=(jobs||[]).filter(job=>graphicStatusIs(job.status,'Bitti'));\n    const total=completed.reduce((sum,job)=>sum+Number(job.price||0),0);\n    return {total,count:completed.length};\n  };"
  );

  // Aylık ciro grafiğinde de sadece tikli işleri topla.
  html = html.replace(
    "for(const job of jobs){const key=String(job.created_date||job.created_at||'').slice(0,10);totals.set(key,(totals.get(key)||0)+Number(job.price||0))}",
    "for(const job of jobs){if(!graphicStatusIs(job.status,'Bitti'))continue;const key=String(job.created_date||job.created_at||'').slice(0,10);totals.set(key,(totals.get(key)||0)+Number(job.price||0))}"
  );

  // Tik, durum veya fiyat değişince Toplam Ciro anında güncellensin.
  html = html.split("[allGraphicJobs,graphicMonthJobs,upcomingGraphicJobs].forEach").join("[allGraphicJobs,graphicMonthJobs,upcomingGraphicJobs,graphicCumulativeJobs].forEach");
  html = html.replace(
    "if(x){x.status=payload.status;x.completed_by=payload.completed_by}renderGraphicJobs();",
    "if(x){x.status=payload.status;x.completed_by=payload.completed_by}[graphicMonthJobs,upcomingGraphicJobs,graphicCumulativeJobs].forEach(list=>{const item=list.find(i=>i.id===id);if(item){item.status=payload.status;item.completed_by=payload.completed_by}});renderGraphicJobs();"
  );
  html = html.replace(
    "const x=allGraphicJobs.find(i=>i.id===id);if(x)x.status=status;renderGraphicJobs();",
    "const x=allGraphicJobs.find(i=>i.id===id);if(x)x.status=status;[graphicMonthJobs,upcomingGraphicJobs,graphicCumulativeJobs].forEach(list=>{const item=list.find(i=>i.id===id);if(item)item.status=status});renderGraphicJobs();"
  );

  return html;
}

export default {
  async fetch(request, env, ctx){
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const type = response.headers.get('content-type') || '';
    if(request.method !== 'GET' || !shouldPatch(url.pathname) || !response.ok || !type.includes('text/html')) return response;

    const html = patchHtml(await response.text());
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('etag');
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.set('cache-control', 'no-cache, no-store, must-revalidate');
    headers.set('pragma', 'no-cache');
    headers.set('expires', '0');
    return new Response(html, {status:response.status, statusText:response.statusText, headers});
  }
};
