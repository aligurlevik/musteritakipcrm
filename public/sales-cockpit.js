(function(){
  'use strict';

  let salesRows=[];
  let salesFilter='all';
  let salesQuery='';

  const escSales=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const parseList=value=>{try{const x=JSON.parse(value||'[]');return Array.isArray(x)?x:[]}catch{return []}};
  const todayKey=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+day};
  const dateMs=value=>{if(!value)return 0;const raw=String(value);const d=new Date(raw.length<=10?raw+'T12:00:00':raw.replace(' ','T'));return Number.isNaN(d.getTime())?0:d.getTime()};
  const daysSince=value=>{const ms=dateMs(value);if(!ms)return null;return Math.floor((Date.now()-ms)/86400000)};
  const displayDate=value=>{if(!value)return '—';const ms=dateMs(value);return ms?new Date(ms).toLocaleDateString('tr-TR'):'—'};
  const normalize=value=>String(value||'').trim().toLocaleLowerCase('tr-TR');
  const isSeedPlaceholder=m=>!String(m.meeting_date||'').trim()&&normalize(m.note).startsWith('ilk arama yapılacak');
  const activeOffer=o=>['Taslak','Gönderildi','Revize','Bekliyor'].includes(String(o.status||''));

  function ensureSalesUi(){
    if(!document.getElementById('salesCockpitMenu')){
      const meetingsButton=document.querySelector('.menu button[data-page="meetings"]');
      const button=document.createElement('button');
      button.id='salesCockpitMenu';button.dataset.page='salesCockpit';button.dataset.title='Satış Takip';button.textContent='🎯 Satış Takip';button.onclick=openSalesCockpit;
      if(meetingsButton)meetingsButton.insertAdjacentElement('beforebegin',button);else document.querySelector('.menu')?.appendChild(button);
    }
    if(!document.getElementById('salesCockpit')){
      const section=document.createElement('section');section.id='salesCockpit';section.className='section';
      section.innerHTML='<div class="sales-head"><div><h2>🎯 Satış Takip ve Müşteri Analizi</h2><div class="sales-sub">Kimi arayacağını, ne konuşulduğunu ve sıradaki işi tek ekranda gör.</div></div><div class="sales-actions"><button class="btn" onclick="loadSalesCockpit()">↻ Yenile</button><button class="btn green" onclick="openCustomer()">＋ Yeni Müşteri</button></div></div><div id="salesKpis" class="sales-kpis"></div><div class="sales-filterbar"><input id="salesSearch" placeholder="Firma, kişi, telefon, bölge ara..." oninput="salesSearchChanged(this.value)"><button class="sales-filter active" data-sales-filter="all" onclick="setSalesCockpitFilter(\'all\',this)">Tümü</button><button class="sales-filter" data-sales-filter="uncontacted" onclick="setSalesCockpitFilter(\'uncontacted\',this)">Aranmadı</button><button class="sales-filter" data-sales-filter="today" onclick="setSalesCockpitFilter(\'today\',this)">Bugün</button><button class="sales-filter" data-sales-filter="overdue" onclick="setSalesCockpitFilter(\'overdue\',this)">Geciken</button><button class="sales-filter" data-sales-filter="hot" onclick="setSalesCockpitFilter(\'hot\',this)">🔥 Sıcak</button><button class="sales-filter" data-sales-filter="offer" onclick="setSalesCockpitFilter(\'offer\',this)">Teklifte</button><button class="sales-filter" data-sales-filter="follow" onclick="setSalesCockpitFilter(\'follow\',this)">Tekrar Ara</button></div><div id="salesSummary" class="small" style="margin:7px 2px 10px"></div><div class="sales-table-wrap"><table><thead><tr><th>Firma</th><th>Durum</th><th>Puan</th><th>Son Temas</th><th>Takip</th><th>Risk</th><th>Önerilen Sonraki İş</th><th>Hızlı İşlem</th></tr></thead><tbody id="salesRows"></tbody></table></div>';
      const meetings=document.getElementById('meetings');if(meetings)meetings.insertAdjacentElement('beforebegin',section);else document.querySelector('main.main')?.appendChild(section);
    }
    if(!document.getElementById('salesAnalysisModal')){
      const modal=document.createElement('div');modal.id='salesAnalysisModal';modal.className='modal';modal.onclick=e=>{if(e.target===modal)closeSalesAnalysis()};
      modal.innerHTML='<div class="box sales-analysis-box"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h3 id="salesAnalysisTitle" style="margin:0">Müşteri Analizi</h3><button class="btn" onclick="closeSalesAnalysis()">Kapat</button></div><div id="salesAnalysisBody"></div></div>';
      document.body.appendChild(modal);
    }
  }

  function stageWeight(stage){return ({'Yeni Lead':10,'İlk Görüşme':30,'Teklif':55,'Pazarlık':70,'Beklemede':35,'Kazanıldı':95,'Kaybedildi':0})[stage]??15}
  function priorityWeight(priority){return ({'KRİTİK':12,'YÜKSEK':8,'NORMAL':4,'DÜŞÜK':0})[priority]??2}

  function analyzeCustomer(customer,meetings,offers,mails){
    const realMeetings=meetings.filter(m=>!isSeedPlaceholder(m));
    const realActivity=[];
    realMeetings.forEach(m=>realActivity.push({type:'Görüşme',date:m.meeting_date||m.created_at,note:m.note||'',raw:m}));
    mails.forEach(m=>realActivity.push({type:'Mail',date:m.mail_date||m.created_at,note:m.subject||m.summary||'',raw:m}));
    offers.forEach(o=>realActivity.push({type:'Teklif',date:o.offer_date||o.created_at,note:o.subject||'',raw:o}));
    realActivity.sort((a,b)=>dateMs(b.date)-dateMs(a.date));
    const lastActivity=realActivity[0]||null;
    const latestMeeting=[...realMeetings].sort((a,b)=>dateMs(b.meeting_date||b.created_at)-dateMs(a.meeting_date||a.created_at))[0]||null;
    const openOffers=offers.filter(activeOffer);
    const phones=parseList(customer.phones_json);if(!phones.length&&customer.phone)phones.push(customer.phone);
    const emails=parseList(customer.emails_json);if(!emails.length&&customer.email)emails.push(customer.email);
    const followDate=customer.follow_date||latestMeeting?.next_follow_date||'';
    const today=todayKey(),overdue=Boolean(followDate&&followDate<today),dueToday=followDate===today;
    const silence=lastActivity?daysSince(lastActivity.date):null;
    let score=stageWeight(customer.stage)+priorityWeight(customer.priority);
    if(phones.length)score+=6;else score-=8;
    if(emails.length)score+=3;
    if(customer.region)score+=2;
    score+=Math.min(15,realMeetings.length*5);
    if(openOffers.length)score+=12;
    if(offers.some(o=>o.status==='Onaylandı'))score+=10;
    if(lastActivity){if(silence<=7)score+=10;else if(silence<=30)score+=5;else if(silence>60)score-=10}else score-=4;
    if(overdue)score-=12;
    if(customer.stage==='Kazanıldı')score=Math.max(score,90);
    if(customer.stage==='Kaybedildi')score=Math.min(score,10);
    score=Math.max(0,Math.min(100,Math.round(score)));
    let heat=score>=75?'Sıcak':score>=50?'Ilık':'Soğuk';if(customer.stage==='Kazanıldı')heat='Kazanıldı';
    let status='Aranmadı',statusClass='uncontacted';
    if(customer.stage==='Kazanıldı'){status='Kazanıldı';statusClass='won'}
    else if(customer.stage==='Kaybedildi'){status='Kaybedildi';statusClass='lost'}
    else if(openOffers.length||['Teklif','Pazarlık'].includes(customer.stage)){status='Teklifte';statusClass='offer'}
    else if(overdue||latestMeeting?.result==='Tekrar Görüşülecek'){status='Tekrar Ara';statusClass='follow'}
    else if(realMeetings.length){status='Görüşüldü';statusClass='talked'}
    else if(mails.length){status='Mail Teması';statusClass='talked'}
    const noContact=!realActivity.length;
    let risk='Normal',riskBad=false;
    if(overdue){risk='Takip gecikmiş';riskBad=true}
    else if(!phones.length){risk='Telefon eksik';riskBad=true}
    else if(noContact)risk='Henüz temas yok';
    else if(silence!==null&&silence>60){risk=silence+' gündür sessiz';riskBad=true}
    else if(silence!==null&&silence>30)risk=silence+' gündür sessiz';
    let nextAction='İlişkiyi sıcak tut';
    if(customer.stage==='Kaybedildi')nextAction='Kaybetme nedenini not et / arşivle';
    else if(customer.stage==='Kazanıldı')nextAction='Düzenli temas ve yeni iş fırsatı ara';
    else if(!phones.length)nextAction='Önce doğru telefon / satın alma yetkilisini bul';
    else if(noContact)nextAction='İlk aramayı yap — kesim kalıbı/bıçak ihtiyacını sor';
    else if(overdue)nextAction='Bugün tekrar ara — geciken takibi kapat';
    else if(openOffers.length)nextAction='Teklif dönüşünü sor ve karar tarihini netleştir';
    else if(latestMeeting?.result==='Tekrar Görüşülecek')nextAction='Takip görüşmesini yap';
    else if(dueToday)nextAction='Bugün takip et';
    else if(silence!==null&&silence>30)nextAction='Yeniden temas kur — yeni iş / numune sor';
    else if(!followDate)nextAction='Bir sonraki takip tarihini belirle';
    const reasons=[];
    reasons.push('Aşama: '+(customer.stage||'Yeni Lead'));
    reasons.push('Öncelik: '+(customer.priority||'NORMAL'));
    reasons.push(realMeetings.length+' gerçek görüşme, '+offers.length+' teklif, '+mails.length+' mail kaydı');
    if(openOffers.length)reasons.push(openOffers.length+' açık teklif var');
    if(overdue)reasons.push('Takip tarihi geçmiş');
    if(noContact)reasons.push('Henüz gerçek temas kaydı yok');
    if(silence!==null)reasons.push('Son gerçek temastan '+silence+' gün geçti');
    return {customer,meetings,realMeetings,offers,mails,realActivity,lastActivity,latestMeeting,openOffers,phones,emails,followDate,overdue,dueToday,silence,score,heat,status,statusClass,risk,riskBad,nextAction,reasons,noContact};
  }

  async function loadSalesCockpit(){
    ensureSalesUi();
    const body=document.getElementById('salesRows');if(body)body.innerHTML='<tr><td colspan="8" class="sales-empty">Veriler analiz ediliyor...</td></tr>';
    try{
      const [customers,meetings,offers,mails]=await Promise.all([req('/api/customers?status=Tümü'),req('/api/meetings?status=Tümü'),req('/api/offers'),req('/api/mails')]);
      const activeCustomers=customers.filter(c=>c.record_status!=='Silindi');
      salesRows=activeCustomers.map(c=>analyzeCustomer(c,meetings.filter(m=>Number(m.customer_id)===Number(c.id)),offers.filter(o=>Number(o.customer_id)===Number(c.id)),mails.filter(m=>Number(m.customer_id)===Number(c.id))));
      salesRows.sort((a,b)=>Number(b.overdue)-Number(a.overdue)||Number(b.dueToday)-Number(a.dueToday)||b.score-a.score||String(a.customer.company||'').localeCompare(String(b.customer.company||''),'tr'));
      renderSalesCockpit();
    }catch(error){if(body)body.innerHTML='<tr><td colspan="8" class="sales-empty" style="color:#b91c1c">Satış verileri yüklenemedi: '+escSales(error.message)+'</td></tr>'}
  }

  function filteredRows(){
    const q=normalize(salesQuery),today=todayKey();
    return salesRows.filter(row=>{
      const c=row.customer;
      const hay=[c.company,c.contact_name,c.phone,c.email,c.region,c.categories,c.sector,row.phones.join(' ')].join(' ').toLocaleLowerCase('tr-TR');
      if(q&&!hay.includes(q))return false;
      if(salesFilter==='uncontacted')return row.noContact&&c.stage!=='Kaybedildi';
      if(salesFilter==='today')return row.followDate===today;
      if(salesFilter==='overdue')return row.overdue;
      if(salesFilter==='hot')return row.score>=75&&c.stage!=='Kazanıldı'&&c.stage!=='Kaybedildi';
      if(salesFilter==='offer')return row.openOffers.length||['Teklif','Pazarlık'].includes(c.stage);
      if(salesFilter==='follow')return row.status==='Tekrar Ara';
      return true;
    });
  }

  function scoreClass(row){if(row.customer.stage==='Kazanıldı')return 'won';return row.score>=75?'hot':row.score>=50?'warm':'cold'}
  function renderSalesCockpit(){
    const today=todayKey(),uncontacted=salesRows.filter(r=>r.noContact&&r.customer.stage!=='Kaybedildi').length,due=salesRows.filter(r=>r.followDate===today).length,overdue=salesRows.filter(r=>r.overdue).length,hot=salesRows.filter(r=>r.score>=75&&!['Kazanıldı','Kaybedildi'].includes(r.customer.stage)).length,offer=salesRows.filter(r=>r.openOffers.length||['Teklif','Pazarlık'].includes(r.customer.stage)).length;
    const kpis=document.getElementById('salesKpis');if(kpis)kpis.innerHTML='<button class="sales-kpi" onclick="setSalesCockpitFilter(\'all\')"><span>Toplam Takip</span><b>'+salesRows.length+'</b></button><button class="sales-kpi" onclick="setSalesCockpitFilter(\'uncontacted\')"><span>Aranmadı</span><b>'+uncontacted+'</b></button><button class="sales-kpi" onclick="setSalesCockpitFilter(\'today\')"><span>Bugün</span><b>'+due+'</b></button><button class="sales-kpi danger" onclick="setSalesCockpitFilter(\'overdue\')"><span>Geciken</span><b>'+overdue+'</b></button><button class="sales-kpi hot" onclick="setSalesCockpitFilter(\'hot\')"><span>Sıcak Fırsat</span><b>'+hot+'</b></button><button class="sales-kpi offer" onclick="setSalesCockpitFilter(\'offer\')"><span>Teklifte</span><b>'+offer+'</b></button>';
    const rows=filteredRows(),body=document.getElementById('salesRows'),summary=document.getElementById('salesSummary');if(summary)summary.textContent=rows.length+' firma gösteriliyor • Puan; aşama, temas sıklığı, teklif, takip disiplini ve iletişim kalitesine göre hesaplanır.';
    if(!body)return;
    body.innerHTML=rows.length?rows.map(row=>{
      const c=row.customer,phone=row.phones[0]||'',last=row.lastActivity?displayDate(row.lastActivity.date)+' • '+row.lastActivity.type:'Temas yok',rowClass=row.overdue?'sales-overdue':row.dueToday?'sales-today':'';
      return '<tr class="'+rowClass+'"><td><div class="sales-company">'+escSales(c.company)+'</div><div class="sales-mini">'+escSales(c.region||'Bölge yok')+' • '+escSales(c.categories||c.sector||'Kategori yok')+'</div></td><td><span class="sales-badge '+row.statusClass+'">'+escSales(row.status)+'</span><div class="sales-mini">'+escSales(c.stage||'Yeni Lead')+'</div></td><td><span class="sales-score '+scoreClass(row)+'">'+row.score+'</span><div class="sales-mini">'+escSales(row.heat)+'</div></td><td>'+escSales(last)+'</td><td><b>'+escSales(row.followDate?displayDate(row.followDate):'Belirlenmedi')+'</b></td><td><span class="sales-risk '+(row.riskBad?'bad':'')+'">'+escSales(row.risk)+'</span></td><td class="sales-next">'+escSales(row.nextAction)+'</td><td><div class="sales-row-actions">'+(phone?'<a class="btn green" href="tel:'+encodeURIComponent(phone)+'">☎ Ara</a>':'')+'<button class="btn primary" onclick="salesOpenMeeting('+c.id+')">＋ Görüşme</button><button class="btn" onclick="salesOpenAnalysis('+c.id+')">🔎 Analiz</button><button class="btn" onclick="salesOpenHistory('+c.id+')">📋 Geçmiş</button></div></td></tr>';
    }).join(''):'<tr><td colspan="8" class="sales-empty">Bu filtrede müşteri bulunmuyor.</td></tr>';
  }

  function setSalesCockpitFilter(filter,button){salesFilter=filter||'all';document.querySelectorAll('#salesCockpit .sales-filter').forEach(x=>x.classList.toggle('active',x.dataset.salesFilter===salesFilter));if(button&&button.dataset?.salesFilter)button.classList.add('active');renderSalesCockpit()}
  function salesSearchChanged(value){salesQuery=value||'';renderSalesCockpit()}

  async function openSalesCockpit(){
    ensureSalesUi();
    document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));document.getElementById('salesCockpit')?.classList.add('active');
    document.querySelectorAll('.menu button').forEach(x=>x.classList.remove('active'));document.getElementById('salesCockpitMenu')?.classList.add('active');
    const title=document.getElementById('title');if(title)title.textContent='Satış Takip';
    const topCustomerButton=document.querySelector('.top .primary');if(topCustomerButton)topCustomerButton.style.display='';
    await loadSalesCockpit();
  }

  async function salesOpenMeeting(id){try{if(typeof openMeetingForCustomer==='function')await openMeetingForCustomer(id);else throw new Error('Görüşme formu bulunamadı.')}catch(e){alert(e.message)}}
  async function salesOpenHistory(id){try{if(typeof openHistory==='function')await openHistory(id);else throw new Error('Geçmiş ekranı bulunamadı.')}catch(e){alert(e.message)}}

  function analysisSuggestions(row){
    const list=[];
    if(row.noContact)list.push('Bu firma hâlâ lead aşamasında. İlk aramada satın alma/üretim sorumlusunu ve kesim kalıbını nereden tedarik ettiklerini öğren.');
    if(!row.phones.length)list.push('Telefon eksik. İlk iş doğru santral veya satın alma telefonunu tamamlamak.');
    if(row.overdue)list.push('Takip tarihi geçmiş; bugün temas edilmezse fırsat soğuma riski yükseliyor.');
    if(row.openOffers.length)list.push('Açık teklif var. Fiyat sormaktan çok karar tarihi, itiraz ve bir sonraki adımı netleştir.');
    if(row.silence!==null&&row.silence>30)list.push('Uzun süredir temas yok. Yeni sipariş, numune veya yaklaşan üretim planını sorarak yeniden giriş yap.');
    if(row.realMeetings.length>=2&&!row.openOffers.length&&!['Kazanıldı','Kaybedildi'].includes(row.customer.stage))list.push('Birden fazla görüşme olmuş ama açık teklif yok. Somut numune/teklif aşamasına geçiş iste.');
    if(row.customer.stage==='Kazanıldı')list.push('Mevcut müşteri: son işten sonra memnuniyet ve yeni kalıp ihtiyacı için periyodik temas planla.');
    return list.length?list:['Kayıt dengeli görünüyor. Bir sonraki takip tarihini net tut ve her görüşmeden sonra sonuç notu gir.'];
  }

  function salesOpenAnalysis(id){
    const row=salesRows.find(x=>Number(x.customer.id)===Number(id));if(!row)return;
    const c=row.customer,modal=document.getElementById('salesAnalysisModal'),title=document.getElementById('salesAnalysisTitle'),body=document.getElementById('salesAnalysisBody');
    title.textContent=c.company+' — Müşteri Analizi';
    const latestNotes=[...row.realMeetings].sort((a,b)=>dateMs(b.meeting_date||b.created_at)-dateMs(a.meeting_date||a.created_at)).slice(0,3);
    body.innerHTML='<div class="sales-analysis-grid"><div class="sales-analysis-stat"><span>Satış Puanı</span><b>'+row.score+' / 100</b></div><div class="sales-analysis-stat"><span>Potansiyel</span><b>'+escSales(row.heat)+'</b></div><div class="sales-analysis-stat"><span>Durum</span><b>'+escSales(row.status)+'</b></div><div class="sales-analysis-stat"><span>Risk</span><b>'+escSales(row.risk)+'</b></div><div class="sales-analysis-stat"><span>Görüşme</span><b>'+row.realMeetings.length+'</b></div><div class="sales-analysis-stat"><span>Teklif</span><b>'+row.offers.length+'</b></div><div class="sales-analysis-stat"><span>Mail</span><b>'+row.mails.length+'</b></div><div class="sales-analysis-stat"><span>Son Temas</span><b>'+escSales(row.lastActivity?displayDate(row.lastActivity.date):'Yok')+'</b></div></div><div class="sales-analysis-section"><h4>Şimdi Ne Yapmalısın?</h4><div class="sales-analysis-item"><b>'+escSales(row.nextAction)+'</b></div>'+analysisSuggestions(row).map(x=>'<div class="sales-analysis-item">'+escSales(x)+'</div>').join('')+'</div><div class="sales-analysis-section"><h4>Puanı Oluşturan Sinyaller</h4><div class="sales-analysis-list">'+row.reasons.map(x=>'<div class="sales-analysis-item">'+escSales(x)+'</div>').join('')+'</div></div><div class="sales-analysis-section"><h4>Firma Bilgileri</h4><div><b>Bölge:</b> '+escSales(c.region||'—')+' &nbsp; <b>Kategori:</b> '+escSales(c.categories||c.sector||'—')+' &nbsp; <b>Öncelik:</b> '+escSales(c.priority||'NORMAL')+'</div>'+(c.machine_info?'<div class="sales-analysis-note" style="margin-top:8px"><b>Makine / üretim bilgisi:</b> '+escSales(c.machine_info)+'</div>':'')+(c.special_notes?'<div class="sales-analysis-note" style="margin-top:8px"><b>Özel not:</b> '+escSales(c.special_notes)+'</div>':'')+'</div><div class="sales-analysis-section"><h4>Son Görüşme Notları</h4>'+(latestNotes.length?latestNotes.map(m=>'<div class="sales-analysis-item"><b>'+escSales(displayDate(m.meeting_date||m.created_at))+'</b> — '+escSales(m.note||'Not yok')+'</div>').join(''):'<div class="sales-analysis-item">Henüz gerçek görüşme yok.</div>')+'</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn primary" onclick="closeSalesAnalysis();salesOpenMeeting('+c.id+')">＋ Görüşme Ekle</button><button class="btn" onclick="closeSalesAnalysis();salesOpenHistory('+c.id+')">📋 Tüm Geçmiş</button>'+(row.phones[0]?'<a class="btn green" href="tel:'+encodeURIComponent(row.phones[0])+'">☎ Ara</a>':'')+'</div>';
    modal.classList.add('open');
  }
  function closeSalesAnalysis(){document.getElementById('salesAnalysisModal')?.classList.remove('open')}

  function init(){ensureSalesUi();setInterval(()=>{const menu=document.getElementById('salesCockpitMenu');if(!menu)return;try{if(typeof currentAccessRole!=='undefined'&&currentAccessRole&&currentAccessRole!=='admin')menu.style.display='none';else if(typeof currentAccessRole!=='undefined'&&currentAccessRole==='admin')menu.style.display=''}catch(_){}},1200)}

  window.openSalesCockpit=openSalesCockpit;
  window.loadSalesCockpit=loadSalesCockpit;
  window.setSalesCockpitFilter=setSalesCockpitFilter;
  window.salesSearchChanged=salesSearchChanged;
  window.salesOpenMeeting=salesOpenMeeting;
  window.salesOpenHistory=salesOpenHistory;
  window.salesOpenAnalysis=salesOpenAnalysis;
  window.closeSalesAnalysis=closeSalesAnalysis;

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
