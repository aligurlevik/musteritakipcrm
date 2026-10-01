import worker from './portfolio_list_columns_visibility_entry.js';

const MENU_CLEANUP=String.raw`
<style data-main-menu-cleanup="20261001-v1">
.menu button[data-page="customers"],
.menu .customer-folder-group,
.menu button[data-page="mails"],
.nav a[href="/?page=customers"],
.nav a[href="/?page=mails"]{display:none!important}
</style>`;

const FOLLOWUP_WIDGET=String.raw`
<style data-safe-followup-widget="20261001-v1">
.safe-followup{background:#fff;border:1px solid #dce5ef;border-radius:10px;padding:10px 12px;margin:0 0 12px}.safe-followup-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.safe-followup-title{font-size:13px;font-weight:950;color:#0f172a}.safe-followup-refresh{border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:5px 9px;font-size:10px;font-weight:900;cursor:pointer}.safe-followup-grid{display:grid;grid-template-columns:160px 160px minmax(0,1fr);gap:8px}.safe-followup-kpi{border:1px solid #e2e8f0;border-radius:9px;padding:9px 10px}.safe-followup-kpi.today{background:#fff7ed;border-color:#fed7aa}.safe-followup-kpi.overdue{background:#fff1f2;border-color:#fecaca}.safe-followup-kpi strong{font-size:20px;display:block;line-height:1}.safe-followup-kpi span{font-size:9px;font-weight:900;color:#64748b}.safe-followup-list{border:1px solid #e2e8f0;border-radius:9px;overflow:hidden;min-height:56px}.safe-followup-row{display:grid;grid-template-columns:minmax(120px,1.3fr) 95px minmax(140px,1fr);gap:8px;padding:6px 8px;border-bottom:1px solid #edf2f7;font-size:10px;align-items:center}.safe-followup-row:last-child{border-bottom:0}.safe-followup-row strong{font-size:10px}.safe-followup-row .late{color:#dc2626;font-weight:900}.safe-followup-row .today{color:#d97706;font-weight:900}.safe-followup-empty{padding:10px;color:#64748b;font-size:10px}.safe-followup-error{padding:8px;color:#b91c1c;font-size:10px;font-weight:800}@media(max-width:900px){.safe-followup-grid{grid-template-columns:1fr 1fr}.safe-followup-list{grid-column:1/-1}}@media(max-width:620px){.safe-followup-grid{grid-template-columns:1fr}.safe-followup-list{grid-column:auto}}
</style>
<script data-safe-followup-widget="20261001-v1">
(function(){
  if(window.__safeFollowupWidgetV1)return;
  window.__safeFollowupWidgetV1=1;
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
  function localDate(){var d=new Date(),o=d.getTimezoneOffset()*60000;return new Date(d.getTime()-o).toISOString().slice(0,10)}
  function prettyDate(v){if(!v)return '—';var p=String(v).slice(0,10).split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:v}
  function noteOf(c){return String(c.follow_note||c.next_action||c.next_action_note||c.remind_note||'Müşteri takibi').trim()||'Müşteri takibi'}
  function ensureBox(){
    var box=document.getElementById('safeFollowupBox');
    if(box)return box;
    var cards=document.querySelector('.cards');
    var workbar=document.querySelector('.workbar');
    if(!cards&&!workbar)return null;
    box=document.createElement('section');
    box.id='safeFollowupBox';
    box.className='safe-followup';
    box.innerHTML='<div class="safe-followup-head"><div class="safe-followup-title">📌 Bugün Yapılacaklar & Geciken Takipler</div><button type="button" class="safe-followup-refresh">↻ Yenile</button></div><div class="safe-followup-grid"><div class="safe-followup-kpi today"><strong data-today-count>0</strong><span>BUGÜN YAPILACAK</span></div><div class="safe-followup-kpi overdue"><strong data-overdue-count>0</strong><span>GECİKEN TAKİP</span></div><div class="safe-followup-list" data-followup-list><div class="safe-followup-empty">Takipler yükleniyor...</div></div></div>';
    if(cards&&cards.parentNode)cards.insertAdjacentElement('afterend',box);else if(workbar&&workbar.parentNode)workbar.parentNode.insertBefore(box,workbar);
    box.querySelector('.safe-followup-refresh').addEventListener('click',load);
    return box;
  }
  async function load(){
    var box=ensureBox();if(!box)return;
    var list=box.querySelector('[data-followup-list]');
    try{
      var r=await fetch('/api/customers?status=Tümü',{credentials:'same-origin',cache:'no-store',headers:{'cache-control':'no-cache'}});
      if(!r.ok)throw new Error('Müşteri takibi yüklenemedi');
      var rows=await r.json();if(!Array.isArray(rows))throw new Error('Müşteri takibi yüklenemedi');
      var today=localDate();
      var active=rows.filter(function(c){return String(c.record_status||'')!=='Silindi'&&String(c.follow_date||'').slice(0,10)});
      var due=active.filter(function(c){return String(c.follow_date).slice(0,10)===today});
      var overdue=active.filter(function(c){return String(c.follow_date).slice(0,10)<today});
      box.querySelector('[data-today-count]').textContent=due.length;
      box.querySelector('[data-overdue-count]').textContent=overdue.length;
      var items=overdue.concat(due).sort(function(a,b){return String(a.follow_date||'').localeCompare(String(b.follow_date||''))}).slice(0,8);
      if(!items.length){list.innerHTML='<div class="safe-followup-empty">Bugün için geciken veya yapılacak müşteri takibi yok.</div>';return}
      list.innerHTML=items.map(function(c){var d=String(c.follow_date||'').slice(0,10),late=d<today;return '<div class="safe-followup-row"><strong>'+esc(c.company||'Müşteri')+'</strong><span class="'+(late?'late':'today')+'">'+(late?'Gecikti':'Bugün')+' • '+esc(prettyDate(d))+'</span><span>'+esc(noteOf(c))+'</span></div>'}).join('');
    }catch(e){list.innerHTML='<div class="safe-followup-error">Takip özeti yüklenemedi. Ana müşteri listesi etkilenmez.</div>'}
  }
  function start(){ensureBox();load()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
</script>`;

const OLD_CUMULATIVE_QUERY="req('/api/graphic-jobs?created_from=2000-01-01&created_to='+encodeURIComponent(localDateKey()))";
const MONTHLY_CUMULATIVE_QUERY="req('/api/graphic-jobs?created_from='+encodeURIComponent(monthFrom)+'&created_to='+encodeURIComponent(monthTo))";

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    const type=response.headers.get('content-type')||'';
    if(request.method==='GET'&&response.ok&&type.includes('text/html')&&['/','/index.html','/musteri-portfoyu.html'].includes(url.pathname)){
      let html=await response.text();
      html=html.replace(/<style[^>]*data-main-menu-cleanup[^>]*>[\s\S]*?<\/style>\s*/gi,'');
      html=html.replace(/<style[^>]*data-safe-followup-widget[^>]*>[\s\S]*?<\/style>\s*/gi,'');
      html=html.replace(/<script[^>]*data-safe-followup-widget[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/head>/i,`${MENU_CLEANUP}\n</head>`);
      if(url.pathname==='/musteri-portfoyu.html')html=html.replace(/<\/body>/i,`${FOLLOWUP_WIDGET}\n</body>`);
      if(url.pathname==='/'||url.pathname==='/index.html'){
        html=html.split(OLD_CUMULATIVE_QUERY).join(MONTHLY_CUMULATIVE_QUERY);
      }
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
