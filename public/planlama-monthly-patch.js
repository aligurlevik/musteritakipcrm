(function(){
  const $=s=>document.querySelector(s), pad=n=>String(n).padStart(2,'0');
  const state={mode:localStorage.getItem('crm_plan_view')||'month',month:new Date(),items:[],selected:''};
  state.month=new Date(state.month.getFullYear(),state.month.getMonth(),1,12);

  function key(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function label(x){return String(x.title||x.note||'Not').trim()}
  function typeClass(t){return t==='Hatırlatıcı'?'m-rem':t==='Görev'?'m-task':t==='Doğum Günü'?'m-bday':'m-note'}
  function eventKey(x,year){
    if(String(x.note_type||'')==='Doğum Günü'&&x.entry_date){const p=String(x.entry_date).slice(0,10).split('-');return year+'-'+(p[1]||'01')+'-'+(p[2]||'01')}
    return String(x.entry_date||'').slice(0,10)
  }

  async function loadItems(){
    try{
      const groups=await Promise.all([1,2,3].map(async n=>{
        const r=await fetch('/api/notes-v3?scope=all&notebook='+n,{cache:'no-store'});
        if(!r.ok)return[];
        return (await r.json()).map(x=>Object.assign({},x,{__notebook:n}));
      }));
      const seen=new Set(),all=[];
      for(const x of groups.flat()){
        const k=String(x.id)+'|'+String(x.__notebook);if(seen.has(k))continue;seen.add(k);all.push(x);
      }
      state.items=all;
    }catch(_){state.items=[]}
  }

  function installStyle(){
    if($('#planMonthlyStyle'))return;
    const s=document.createElement('style');s.id='planMonthlyStyle';s.textContent=`
.planViewBar{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:8px 10px;background:#fff;border-bottom:1px solid #d8e3ee;position:sticky;top:58px;z-index:42}.planViewBtn{border:2px solid #a9bfd2;border-radius:10px;padding:9px;background:#edf5fc;color:#21476b;font-weight:950}.planViewBtn.on{background:#1769c2;color:#fff;border-color:#1769c2}
.monthPanel{display:none;background:#eef4fa;padding:8px 8px 100px}.monthPanel.show{display:block}.monthWeek{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:3px}.monthWeek div{text-align:center;font-size:11px;font-weight:950;color:#506b83;padding:5px 1px}.monthGrid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}.monthDay{min-height:92px;border:1px solid #b9cddd;border-radius:8px;background:#fff;padding:4px;overflow:hidden;cursor:pointer}.monthDay.other{opacity:.38}.monthDay.today{border:3px solid #ffd338}.monthDay.selected{outline:3px solid #1769c2}.dayNo{font-size:13px;font-weight:950;margin-bottom:3px}.monthChip{display:block;border-radius:5px;padding:3px 4px;margin:2px 0;font-size:10px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.m-note{background:#dceeff;color:#0f5899}.m-rem{background:#ffe6a3;color:#7c4e00}.m-task{background:#d9f5e7;color:#087046}.m-bday{background:#f5defb;color:#78248d}.moreCount{font-size:10px;font-weight:950;color:#526b80;margin-top:3px}
.dayDetail{margin-top:10px;background:#fff;border:2px solid #9bb7d0;border-radius:12px;overflow:hidden}.dayDetailHead{background:#eaf3fb;padding:11px 12px;font-size:16px;font-weight:950;color:#173f63;display:flex;justify-content:space-between;gap:8px;align-items:center}.dayDetailCount{font-size:11px;background:#1769c2;color:#fff;border-radius:999px;padding:4px 8px}.dayDetailEmpty{padding:20px;text-align:center;color:#60788d;font-weight:850}.dayItem{padding:11px 12px;border-top:1px solid #d8e3ee;background:#fff}.dayItem.done{opacity:.55}.dayItemTop{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.bookTag{display:inline-block;border-radius:999px;padding:3px 7px;background:#111;color:#fff;font-size:10px;font-weight:950}.typeTag{display:inline-block;border-radius:999px;padding:3px 7px;background:#e9eef3;color:#42576a;font-size:10px;font-weight:950}.dayItemTitle{font-size:16px;font-weight:950;color:#102f4d;margin-top:5px}.dayItemMeta{font-size:12px;font-weight:900;color:#58728a;margin-top:3px}.dayItemNote{font-size:15px;font-weight:700;line-height:1.4;margin-top:7px;white-space:pre-wrap;color:#1f2937}.openNoteBtn{margin-top:8px;border:0;border-radius:8px;background:#edf5fc;color:#174d7c;padding:7px 9px;font-size:12px;font-weight:950}.weekOnlyHidden{display:none!important}
@media(max-width:650px){.planViewBar{top:55px}.monthPanel{padding:6px 5px 90px}.monthGrid{gap:2px}.monthDay{min-height:76px;padding:3px;border-radius:6px}.dayNo{font-size:12px}.monthChip{font-size:9px;padding:2px 3px}.monthWeek div{font-size:10px}.dayItemTitle{font-size:15px}.dayItemNote{font-size:14px}.dayDetailHead{font-size:15px}}
`;
    document.head.appendChild(s);
  }

  function installUI(){
    if($('#planViewBar'))return;
    const nav=$('.nav');if(!nav)return;
    const bar=document.createElement('div');bar.id='planViewBar';bar.className='planViewBar';
    bar.innerHTML='<button id="pvMonth" class="planViewBtn" type="button">📅 Aylık</button><button id="pvWeek" class="planViewBtn" type="button">🗓 Haftalık</button>';
    nav.insertAdjacentElement('afterend',bar);
    const panel=document.createElement('section');panel.id='monthPanel';panel.className='monthPanel';
    panel.innerHTML='<div class="monthWeek"><div>Pzt</div><div>Sal</div><div>Çar</div><div>Per</div><div>Cum</div><div>Cmt</div><div>Paz</div></div><div id="monthGrid" class="monthGrid"></div><div id="dayDetail" class="dayDetail"></div>';
    const legend=$('.legend');legend?.insertAdjacentElement('afterend',panel);
    $('#pvMonth').onclick=()=>setMode('month');$('#pvWeek').onclick=()=>setMode('week');
  }

  function setMode(mode){
    state.mode=mode;localStorage.setItem('crm_plan_view',mode);const month=mode==='month';
    $('#pvMonth')?.classList.toggle('on',month);$('#pvWeek')?.classList.toggle('on',!month);$('#monthPanel')?.classList.toggle('show',month);$('.wrap')?.classList.toggle('weekOnlyHidden',month);$('.legend')?.classList.toggle('weekOnlyHidden',month);wireNav();
    if(month)renderMonth();else if(window.goToday)window.goToday();
  }

  function wireNav(){
    const btns=document.querySelectorAll('.nav button');if(btns.length<2)return;
    if(state.mode==='month'){
      btns[0].onclick=e=>{e.preventDefault();state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1,12);state.selected='';renderMonth()};
      btns[1].onclick=e=>{e.preventDefault();state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1,12);state.selected='';renderMonth()};
    }else{
      btns[0].onclick=()=>window.moveWeek&&window.moveWeek(-1);btns[1].onclick=()=>window.moveWeek&&window.moveWeek(1);
    }
  }

  function monthCells(){
    const y=state.month.getFullYear(),m=state.month.getMonth(),first=new Date(y,m,1,12),offset=(first.getDay()+6)%7,start=new Date(y,m,1-offset,12);
    return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d});
  }

  function renderMonth(){
    const range=$('#range');if(range)range.textContent=state.month.toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
    const today=key(new Date()),y=state.month.getFullYear(),m=state.month.getMonth(),cells=monthCells();
    if(!state.selected||!cells.some(d=>key(d)===state.selected))state.selected=today.startsWith(y+'-'+pad(m+1))?today:key(new Date(y,m,1,12));
    const grid=$('#monthGrid');if(!grid)return;
    grid.innerHTML=cells.map(d=>{
      const k=key(d),arr=state.items.filter(x=>eventKey(x,d.getFullYear())===k),shown=arr.slice(0,2);
      return '<div class="monthDay '+(d.getMonth()!==m?'other ':'')+(k===today?'today ':'')+(k===state.selected?'selected':'')+'" data-date="'+k+'"><div class="dayNo">'+d.getDate()+'</div>'+shown.map(x=>'<span class="monthChip '+typeClass(x.note_type)+'">'+esc(label(x))+'</span>').join('')+(arr.length>2?'<div class="moreCount">+'+(arr.length-2)+' kayıt</div>':'')+'</div>';
    }).join('');
    grid.querySelectorAll('.monthDay').forEach(el=>el.onclick=()=>{state.selected=el.dataset.date;renderMonth()});
    renderDetail();
  }

  function renderDetail(){
    const box=$('#dayDetail');if(!box)return;
    const d=state.selected?new Date(state.selected+'T12:00:00'):new Date();
    const arr=state.items.filter(x=>eventKey(x,d.getFullYear())===state.selected).sort((a,b)=>String(a.remind_at||'').localeCompare(String(b.remind_at||'')));
    const head=d.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    box.innerHTML='<div class="dayDetailHead"><span>'+esc(head)+'</span><span class="dayDetailCount">'+arr.length+' kayıt</span></div>'+(arr.length?arr.map(x=>{
      const time=String(x.remind_at||'').includes('T')?String(x.remind_at).slice(11,16):'Gün boyu';
      const book='Not '+Number(x.__notebook||1),type=x.note_type||'Genel Not';
      return '<div class="dayItem '+(x.entry_status==='Yapıldı'?'done':'')+'"><div class="dayItemTop"><span class="bookTag">'+esc(book)+'</span><span class="typeTag">'+esc(type)+'</span></div><div class="dayItemTitle">'+esc(label(x))+'</div><div class="dayItemMeta">'+esc(time)+(x.entry_status==='Yapıldı'?' • ✓ Tamamlandı':'')+'</div>'+(x.note&&x.note!==x.title?'<div class="dayItemNote">'+esc(x.note)+'</div>':'')+'<button class="openNoteBtn" data-book="'+Number(x.__notebook||1)+'">📝 '+esc(book)+' sayfasını aç</button></div>';
    }).join(''):'<div class="dayDetailEmpty">Bu gün için kayıt yok.</div>');
    box.querySelectorAll('.openNoteBtn').forEach(b=>b.onclick=()=>{location.href='/notlar-v2.html?page='+b.dataset.book});
  }

  async function init(){
    if(!location.pathname.includes('planlama'))return;
    installStyle();installUI();await loadItems();setMode(state.mode);
    const todayBtn=[...document.querySelectorAll('.legend button')].find(b=>/Bugün/i.test(b.textContent||''));
    if(todayBtn)todayBtn.onclick=()=>{if(state.mode==='month'){const n=new Date();state.month=new Date(n.getFullYear(),n.getMonth(),1,12);state.selected=key(n);renderMonth()}else if(window.goToday)window.goToday()};
    setInterval(async()=>{await loadItems();if(state.mode==='month')renderMonth()},60000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
