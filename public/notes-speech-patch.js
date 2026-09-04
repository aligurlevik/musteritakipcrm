(function(){
  if(!location.pathname.includes('yeni-not'))return;
  const tools=document.querySelector('.tools');
  const note=document.getElementById('note');
  if(!tools||!note||document.getElementById('speechToTextBtn'))return;

  const box=document.createElement('div');
  box.style.cssText='margin-top:8px';
  box.innerHTML='<button id="speechToTextBtn" type="button" class="tool" style="width:100%">🎙️ Konuşarak Yaz</button><div id="speechToTextStatus" style="display:none;margin-top:6px;padding:7px 9px;border-radius:8px;background:#eef6ff;border:1px solid #c9def6;color:#31577d;font-size:12px;font-weight:850">Dinliyorum… Konuşabilirsiniz.</div>';
  tools.insertAdjacentElement('afterend',box);

  const btn=box.querySelector('#speechToTextBtn');
  const status=box.querySelector('#speechToTextStatus');
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  let rec=null,active=false,prefix='',finalText='';

  function flash(text){
    const m=document.getElementById('msg');
    if(!m){alert(text);return}
    m.textContent=text;m.style.display='block';
    clearTimeout(window.__speechMsgTimer);
    window.__speechMsgTimer=setTimeout(()=>m.style.display='none',1900);
  }
  function updateNote(interim){
    const lead=prefix&& !/\s$/.test(prefix)?prefix+' ':prefix;
    note.value=lead+finalText+interim;
    note.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function stop(){
    if(rec){try{rec.stop()}catch(_){}}
  }
  btn.onclick=function(){
    if(active){stop();return}
    if(!SpeechRecognition){flash('Bu cihazın tarayıcısı konuşarak yazmayı desteklemiyor.');return}
    if(document.getElementById('micBtn')?.classList.contains('recording')){flash('Önce ses kaydını durdurun.');return}
    prefix=note.value||'';finalText='';
    rec=new SpeechRecognition();
    rec.lang='tr-TR';rec.continuous=true;rec.interimResults=true;
    rec.onstart=()=>{active=true;btn.textContent='■ Yazmayı Durdur';btn.classList.add('on');status.style.display='block'};
    rec.onresult=e=>{
      let interim='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const text=String(e.results[i][0]?.transcript||'');
        if(e.results[i].isFinal)finalText+=text.trim()+' ';
        else interim+=text;
      }
      updateNote(interim);
    };
    rec.onerror=e=>{
      if(e.error==='not-allowed'||e.error==='service-not-allowed')flash('Konuşarak yazmak için mikrofon izni verin.');
      else if(e.error!=='no-speech'&&e.error!=='aborted')flash('Konuşma algılanamadı. Tekrar deneyin.');
    };
    rec.onend=()=>{active=false;btn.textContent='🎙️ Konuşarak Yaz';btn.classList.remove('on');status.style.display='none';rec=null};
    try{rec.start()}catch(_){flash('Konuşarak yazma başlatılamadı. Tekrar deneyin.')}
  };
})();
