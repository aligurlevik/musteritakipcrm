import worker from './portfolio_recovery_entry.js';

function rebuild(response,html){
  const headers=new Headers(response.headers);
  for(const name of ['content-length','content-encoding','etag'])headers.delete(name);
  headers.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

const SALES_MEETINGS_PATCH=String.raw`
(function(){
  if(window.__crmSalesMeetingsMerged)return;
  window.__crmSalesMeetingsMerged='20261001-merge-v1';

  var style=document.createElement('style');
  style.id='crmSalesMeetingsMergedStyle';
  style.textContent='\n#portfolioDetailExpandModal .pie-top-tabs.crm-sales-meetings-merged{grid-template-columns:repeat(6,minmax(0,1fr))!important}\n#portfolioDetailExpandModal .pie-top-tab[data-tab-index="2"]{display:none!important}';
  document.head.appendChild(style);

  function showCombined(editor,sections){
    sections.forEach(function(section,i){
      var active=i===1||i===2;
      section.classList.toggle('active-tab-panel',active);
      if(active)section.setAttribute('open','');
      else section.removeAttribute('open');
    });
    editor.querySelectorAll('.pie-top-tab').forEach(function(button){
      var idx=Number(button.getAttribute('data-tab-index'));
      var active=idx===1;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',active?'true':'false');
    });
  }

  function normalizeMeetingDates(editor){
    editor.querySelectorAll('.pie-meeting').forEach(function(item){
      var headSpans=item.querySelectorAll('.pie-meeting-head span');
      var date=headSpans.length?String(headSpans[headSpans.length-1].textContent||'').trim():'';
      var note=item.querySelector('.pie-meeting-note');
      if(!date||!note)return;
      var text=String(note.textContent||'').trim();
      if(text.indexOf(date)===0)return;
      var strong=document.createElement('strong');
      strong.textContent=date;
      note.insertBefore(document.createTextNode(' — '),note.firstChild);
      note.insertBefore(strong,note.firstChild);
    });
  }

  function merge(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    var editor=modal.querySelector('.pie-editor');
    if(!editor)return;
    var tabs=editor.querySelector('.pie-top-tabs');
    if(!tabs)return;
    var sections=Array.prototype.slice.call(editor.querySelectorAll('.pie-section')).slice(0,5);
    if(sections.length<5)return;

    var sales=tabs.querySelector('.pie-top-tab[data-tab-index="1"]');
    var meetings=tabs.querySelector('.pie-top-tab[data-tab-index="2"]');
    if(!sales||!meetings)return;

    sales.textContent='Satış & Görüşmeler';
    meetings.style.display='none';
    meetings.setAttribute('aria-hidden','true');
    tabs.classList.add('crm-sales-meetings-merged');

    if(tabs.dataset.crmSalesMeetingsBound!=='1'){
      tabs.dataset.crmSalesMeetingsBound='1';
      tabs.addEventListener('click',function(event){
        var button=event.target&&event.target.closest?event.target.closest('.pie-top-tab'):null;
        if(!button)return;
        if(Number(button.getAttribute('data-tab-index'))===1){
          setTimeout(function(){
            showCombined(editor,sections);
            normalizeMeetingDates(editor);
          },0);
        }
      });
    }

    if(meetings.classList.contains('active'))showCombined(editor,sections);
    normalizeMeetingDates(editor);
  }

  var observer=new MutationObserver(function(){setTimeout(merge,0)});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',function(){setTimeout(merge,70)},true);
  merge();
})();
`;

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/musteri-portfoyu.html'&&response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
      let html=await response.text();
      html=html.replace(/<script[^>]*data-sales-meetings-merge[^>]*>[\s\S]*?<\/script>\s*/gi,'');
      html=html.replace(/<\/body>/i,`<script data-sales-meetings-merge="20261001-merge-v1">${SALES_MEETINGS_PATCH}</script>\n</body>`);
      return rebuild(response,html);
    }
    return response;
  },
  async scheduled(controller,env,ctx){
    if(typeof worker.scheduled==='function')return worker.scheduled(controller,env,ctx);
  }
};
