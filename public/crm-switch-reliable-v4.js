(function(){
'use strict';
if(window.__crmReliableProgramSwitchV4)return;
window.__crmReliableProgramSwitchV4='20261007-v4';

window.__graphicCumulativeSummary=window.__graphicCumulativeSummary||{total:0,count:0};

function pageLabel(page){
  return ({
    dash:'Ana Ekran',
    customers:'Müşteriler',
    portfolio:'Müşteri Portföyü',
    meetings:'Görüşmeler',
    mails:'Mailler',
    graphicJobs:'Grafik İşleri',
    tracking:'Takip',
    reports:'Raporlama',
    agenda:'Ajanda'
  })[page]||'Program';
}

function showSwitchScreen(page){
  let overlay=document.getElementById('crmHardSwitchOverlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='crmHardSwitchOverlay';
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#f4f7fb;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif';
    overlay.innerHTML='<div style="background:#fff;border:1px solid #cbd5e1;border-radius:16px;padding:24px 32px;box-shadow:0 18px 60px #0f172a22;text-align:center;min-width:280px"><div style="font-size:18px;font-weight:900;color:#0f172a" id="crmHardSwitchTitle">Program açılıyor…</div><div style="font-size:12px;color:#64748b;margin-top:7px">Temiz oturum hazırlanıyor</div></div>';
    document.body.appendChild(overlay);
  }
  const title=document.getElementById('crmHardSwitchTitle');
  if(title)title.textContent=pageLabel(page)+' açılıyor…';
  document.body.style.pointerEvents='none';
}

function targetUrl(page,button){
  const url=new URL(location.origin+'/');
  url.searchParams.set('page',page);
  url.searchParams.set('switch','hard-v4');
  if(page==='customers'){
    const result=button&&button.dataset?String(button.dataset.result||''):'';
    if(result)url.searchParams.set('result',result);
  }
  return url.pathname+'?'+url.searchParams.toString();
}

function hardSwitch(page,button){
  if(!page)return;
  try{
    sessionStorage.setItem('crm_active_page',page);
    if(page==='customers'){
      const result=button&&button.dataset?String(button.dataset.result||''):'';
      sessionStorage.setItem('crm_customer_result_filter',result);
    }
  }catch(_){}
  showSwitchScreen(page);
  const target=targetUrl(page,button);
  location.replace(target);
}
window.hardSwitchCrmProgram=hardSwitch;

try{
  if(typeof req==='function'&&!req.__criticalTimeoutV4){
    const baseReq=req;
    const wrappedReq=async function(url,opt={}){
      const method=String(opt.method||'GET').toUpperCase();
      const timeoutMs=method==='GET'?7000:15000;
      const controller=new AbortController();
      const external=opt.signal;
      let externalAbort=null;
      if(external){
        if(external.aborted)controller.abort(external.reason);
        else{
          externalAbort=()=>controller.abort(external.reason);
          external.addEventListener('abort',externalAbort,{once:true});
        }
      }
      const timer=setTimeout(()=>controller.abort('crm-timeout'),timeoutMs);
      try{
        return await baseReq(url,{...opt,signal:controller.signal});
      }catch(error){
        if(controller.signal.aborted&&controller.signal.reason==='crm-timeout'){
          const e=new Error('Sunucu yanıtı gecikti. Program kilitlenmedi; tekrar deneyin.');
          e.code='CRM_REQUEST_TIMEOUT';
          throw e;
        }
        throw error;
      }finally{
        clearTimeout(timer);
        if(external&&externalAbort)external.removeEventListener('abort',externalAbort);
      }
    };
    wrappedReq.__criticalTimeoutV4=true;
    req=wrappedReq;
  }
}catch(error){console.error('CRM istek zaman aşımı katmanı kurulamadı',error)}

try{
  if(typeof renderGraphicPeriodTotals==='function'){
    renderGraphicPeriodTotals=function(){
      const cumulative=window.__graphicCumulativeSummary||{total:0,count:0};
      const title=document.querySelector('.graphic-daily-panel>h3');
      if(!title)return;
      let box=$('graphicPeriodTotals');
      if(currentAccessRole!=='admin'){if(box)box.remove();return}
      if(!box){
        box=document.createElement('div');
        box.id='graphicPeriodTotals';
        box.className='graphic-period-totals';
        title.insertAdjacentElement('afterend',box);
      }
      box.innerHTML='<div class="graphic-period-total cumulative">TOPLAM CİRO: <strong>'+
        Number(cumulative.total||0).toLocaleString('tr-TR')+
        ' TL</strong> • '+Number(cumulative.count||0)+' iş</div>';
    };
  }
}catch(error){console.error('Grafik toplam özeti katmanı kurulamadı',error)}

try{
  if(typeof loadGraphicJobs==='function'){
    loadGraphicJobs=async function(){
      ensureGraphicAlarmControls();
      if(!$('g_date').value)$('g_date').value=localDateKey();
      const selected=new Date($('g_date').value+'T12:00:00');
      graphicMonthDate=new Date(selected.getFullYear(),selected.getMonth(),1);
      const monthFrom=localDateKey(graphicMonthDate);
      const monthTo=localDateKey(new Date(selected.getFullYear(),selected.getMonth()+1,0));
      const search=$('graphicSearch').value.trim();
      const until=new Date();until.setDate(until.getDate()+30);
      $('graphicWorkingDay').textContent=selected.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

      const requests=[
        req('/api/graphic-jobs?'+(search?'search='+encodeURIComponent(search):'visible_date='+encodeURIComponent($('g_date').value))),
        req('/api/graphic-jobs?work_from='+encodeURIComponent(monthFrom)+'&work_to='+encodeURIComponent(monthTo)),
        req('/api/graphic-jobs?upcoming_from=2000-01-01&upcoming_to='+encodeURIComponent(localDateKey(until))),
        currentAccessRole==='admin'?req('/api/graphic-jobs-summary'):Promise.resolve({total:0,count:0})
      ];
      const results=await Promise.allSettled(requests);
      const arrayResult=(result,fallback=[])=>result.status==='fulfilled'&&Array.isArray(result.value)?result.value:fallback;

      allGraphicJobs=arrayResult(results[0]);
      graphicMonthJobs=arrayResult(results[1],allGraphicJobs);
      upcomingGraphicJobs=arrayResult(results[2]);
      graphicCumulativeJobs=[];
      if(results[3].status==='fulfilled'&&results[3].value&&typeof results[3].value==='object'){
        window.__graphicCumulativeSummary={
          total:Number(results[3].value.total||0),
          count:Number(results[3].value.count||0)
        };
      }

      const essentialFailures=results.slice(0,3).filter(x=>x.status==='rejected'||!Array.isArray(x.value));
      try{
        renderGraphicJobs();
        renderUpcomingGraphicJobs();
      }catch(error){
        console.error('Grafik ekranı çizilemedi:',error);
        const rows=$('graphicJobRows');
        if(rows)rows.innerHTML='<div class="graphic-empty" style="color:#b91c1c;font-weight:900">Grafik işleri gösterilirken hata oluştu: '+esc(error.message)+'</div>';
        try{renderGraphicMonth()}catch(calendarError){console.error('Takvim çizilemedi:',calendarError)}
      }
      if(essentialFailures.length){
        console.error('Grafik verilerinin bir bölümü yüklenemedi:',essentialFailures.map(x=>x.reason||x.value));
        const rows=$('graphicJobRows');
        if(rows&&!allGraphicJobs.length)rows.innerHTML='<div class="graphic-empty" style="color:#b91c1c;font-weight:900">Veri gecikti. Program kilitlenmedi; tekrar deneyin.</div>';
        try{renderGraphicMonth()}catch(error){console.error(error)}
      }
      if(essentialFailures.length===3){
        const err=essentialFailures[0].reason instanceof Error?essentialFailures[0].reason:new Error('Grafik verileri alınamadı.');
        throw err;
      }
    };
  }
}catch(error){console.error('Grafik hafif yükleme katmanı kurulamadı',error)}

try{
  const baseActivate=typeof activateCrmPage==='function'?activateCrmPage:null;

  activateCrmPage=function(page,button=null,options={}){
    if(page==='customers'&&button&&button.dataset&&button.dataset.result&&crmActivePage==='customers'&&baseActivate){
      return baseActivate(page,button,options);
    }
    hardSwitch(page,button);
  };

  document.querySelectorAll('.menu button[data-page]').forEach(button=>{
    button.onclick=function(event){
      if(event)event.preventDefault();
      activateCrmPage(button.dataset.page,button);
    };
  });
}catch(error){console.error('Güvenilir program geçişi kurulamadı',error)}

try{
  const params=new URLSearchParams(location.search);
  if(params.get('page')==='customers'){
    const wanted=params.get('result')||sessionStorage.getItem('crm_customer_result_filter')||'';
    if(wanted&&typeof currentCustomerResultFilter!=='undefined'){
      currentCustomerResultFilter=wanted;
      setTimeout(()=>{
        try{
          document.querySelectorAll('.menu button[data-page="customers"]').forEach(button=>{
            button.classList.toggle('active',String(button.dataset.result||'')===wanted);
          });
          if(typeof loadCrmPageData==='function')loadCrmPageData('customers',{force:true}).catch(()=>{});
        }catch(_){}
      },80);
    }
  }
}catch(_){}
})();