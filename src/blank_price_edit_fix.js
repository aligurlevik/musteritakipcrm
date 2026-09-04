import worker from './report_total_revenue_safe.js';

function shouldPatch(path){
  return path==='/'||path==='/index.html';
}

async function patchHtml(response){
  if(!response||!response.ok)return response;
  const ct=response.headers.get('content-type')||'';
  if(!ct.includes('text/html'))return response;
  let html=await response.text();
  if(html.includes('id="blankPriceEditFix"'))return response;

  const script=`<script id="blankPriceEditFix">
  (function(){
    function install(){
      if(typeof editableGraphicJobsForDay!=='function'||typeof updateGraphicJobPrice!=='function'){
        setTimeout(install,100);return;
      }
      window.enableGraphicPriceEditing=function(){
        var jobs=editableGraphicJobsForDay();
        document.querySelectorAll('#graphicJobRows .graphic-price').forEach(function(price,index){
          var job=jobs[index];if(!job)return;
          var selectedDate=document.getElementById('g_date')?.value||'';
          var entryDate=String(job.created_date||job.created_at||'').slice(0,10);
          var currentPrice=Number(job.price||0);
          // Fiyat daha önce girilmişse, başka güne taşınmış kayıtta pasif kalır.
          // Fiyat boş/0 ise sonradan hangi günde açılırsa açılsın girilebilir.
          if(entryDate!==selectedDate&&currentPrice>0){
            price.classList.add('passive-price');
            price.textContent=currentPrice.toLocaleString('tr-TR')+' TL';
            price.title='Bu fiyat ilk giriş gününün toplamına dahildir.';
            return;
          }
          var input=document.createElement('input');
          input.type='number';input.min='0';input.step='0.01';
          input.value=currentPrice||'';input.placeholder='Fiyat ₺';
          input.title=currentPrice>0?'Fiyatı düzenleyin':'Daha önce boş bırakılan fiyatı girin';
          input.style.cssText='width:66px;padding:6px 5px;font-weight:900;color:#047857;background:#fff;border:1px solid #86efac';
          input.addEventListener('keydown',function(event){if(event.key==='Enter')input.blur()});
          input.addEventListener('change',function(){updateGraphicJobPrice(job.id,input.value)});
          var wrap=document.createElement('span'),tl=document.createElement('b');
          wrap.style.cssText='display:inline-flex;align-items:center;gap:4px;white-space:nowrap';
          tl.textContent='TL';tl.style.color='#047857';wrap.append(input,tl);price.replaceWith(wrap);
        });
      };
      try{if(document.getElementById('graphicJobs')?.classList.contains('active')&&typeof renderGraphicJobs==='function')renderGraphicJobs()}catch(e){console.error('Boş fiyat düzenleme görünümü yenilenemedi:',e)}
    }
    install();
  })();
  </script>`;
  html=html.replace('</body>',script+'</body>');
  const h=new Headers(response.headers);
  h.delete('content-length');h.delete('content-encoding');h.delete('etag');
  h.set('content-type','text/html; charset=utf-8');
  h.set('cache-control','no-cache, no-store, must-revalidate');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:h});
}

export default{
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&shouldPatch(url.pathname))return patchHtml(response);
    return response;
  }
};
