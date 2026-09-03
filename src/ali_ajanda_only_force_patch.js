import worker from './ali_ajanda_user_patch.js';

const forcePatch = `
<script>
(function(){
  var oldLogin = window.login;
  window.login = async function(){
    var select=document.getElementById('loginUser');
    if(select && select.value==='Ali Ajanda'){
      var pw=document.getElementById('pw');
      var err=document.getElementById('loginErr');
      try{
        var r=await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({user:'Ali Ajanda',password:pw?pw.value:''})});
        var d={};try{d=await r.json()}catch(_){ }
        if(!r.ok){if(err)err.textContent=d.error||'Şifre hatalı.';return;}
        location.reload();
      }catch(e){if(err)err.textContent='Bağlantı kurulamadı.'}
      return;
    }
    if(typeof oldLogin==='function')return oldLogin.apply(this,arguments);
  };
})();
</script>`;

function isAliAgendaCookie(request){
  const cookie=request.headers.get('Cookie')||'';
  return /(?:^|;\s*)crm_session=ali_agenda\./.test(cookie);
}

export default {
  async fetch(request,env,ctx){
    const response=await worker.fetch(request,env,ctx);
    const url=new URL(request.url);
    const contentType=response.headers.get('content-type')||'';
    if(request.method==='GET'&&response.status===200&&(url.pathname==='/'||url.pathname==='/index.html')&&contentType.includes('text/html')){
      let html=await response.text();
      if(isAliAgendaCookie(request)){
        html=html.replace('<body>','<body class="ali-ajanda-only">');
      }
      if(!html.includes('var oldLogin = window.login'))html=html.replace('</body>',forcePatch+'\n</body>');
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
  }
};
