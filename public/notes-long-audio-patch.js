(function(){
  if(!location.pathname.includes('yeni-not'))return;
  const NativeRecorder=window.MediaRecorder;
  if(!NativeRecorder)return;

  const MAX_MS=15*60*1000;
  const recInfo=new WeakMap();
  let activeRecorder=null;
  let manualStopUntil=0;
  let previewUrl='';

  function installUi(){
    if(document.getElementById('voiceQualityBox'))return;
    const status=document.getElementById('voiceStatus');
    if(!status)return;
    const box=document.createElement('div');
    box.id='voiceQualityBox';
    box.style.cssText='display:none;margin-top:7px;padding:9px;border:1px solid #c9def6;border-radius:9px;background:#f8fbff';
    box.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px"><b id="voiceQualityText" style="font-size:12px">🎙️ Mikrofon hazır</b><span style="font-size:11px;font-weight:850">En fazla 15 dk</span></div><div style="height:10px;border-radius:99px;background:#dce5ee;overflow:hidden"><div id="voiceLevelBar" style="height:100%;width:0%;background:#11865f;transition:width .08s linear"></div></div><audio id="voicePreviewPlayer" controls preload="metadata" style="display:none;width:100%;margin-top:8px"></audio>';
    status.insertAdjacentElement('afterend',box);
  }

  function setUiRecording(on){
    installUi();
    const box=document.getElementById('voiceQualityBox');
    if(box)box.style.display='block';
    if(on){
      const p=document.getElementById('voicePreviewPlayer');
      if(p){p.pause();p.style.display='none';p.removeAttribute('src')}
      document.getElementById('voiceLevelBar').style.width='0%';
      document.getElementById('voiceQualityText').textContent='🎙️ Ses bekleniyor...';
    }
  }

  function startMeter(rec,info){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    try{
      const ac=new AC();
      const analyser=ac.createAnalyser();
      analyser.fftSize=512;
      const source=ac.createMediaStreamSource(rec.stream);
      source.connect(analyser);
      const data=new Uint8Array(analyser.fftSize);
      info.audioContext=ac;
      info.analyser=analyser;
      const tick=()=>{
        if(rec.state!=='recording')return;
        analyser.getByteTimeDomainData(data);
        let sum=0;
        for(let i=0;i<data.length;i++){const v=(data[i]-128)/128;sum+=v*v}
        const rms=Math.sqrt(sum/data.length);
        const pct=Math.max(2,Math.min(100,Math.round(rms*520)));
        const bar=document.getElementById('voiceLevelBar');
        const txt=document.getElementById('voiceQualityText');
        if(bar)bar.style.width=pct+'%';
        if(txt){
          if(rms<0.018)txt.textContent='⚠️ Ses zayıf — telefona biraz yaklaş';
          else if(rms>0.42)txt.textContent='⚠️ Ses çok yüksek — biraz uzaklaş';
          else txt.textContent='✅ Ses iyi';
        }
        info.raf=requestAnimationFrame(tick);
      };
      tick();
    }catch(_){}
  }

  function setupRecorder(rec){
    if(recInfo.has(rec))return;
    installUi();
    const info={start:Date.now(),chunks:[],raf:0,audioContext:null};
    recInfo.set(rec,info);
    activeRecorder=rec;
    setUiRecording(true);
    rec.addEventListener('dataavailable',e=>{if(e.data&&e.data.size)info.chunks.push(e.data)});
    rec.addEventListener('start',()=>{info.start=Date.now();startMeter(rec,info)});
    rec.addEventListener('stop',()=>{
      if(info.raf)cancelAnimationFrame(info.raf);
      try{info.audioContext&&info.audioContext.close()}catch(_){}
      activeRecorder=null;
      const bar=document.getElementById('voiceLevelBar');if(bar)bar.style.width='0%';
      const txt=document.getElementById('voiceQualityText');if(txt)txt.textContent='✅ Kayıt hazır — aşağıdan dinleyebilirsin';
      try{
        const blob=new Blob(info.chunks,{type:rec.mimeType||'audio/webm'});
        if(previewUrl)URL.revokeObjectURL(previewUrl);
        previewUrl=URL.createObjectURL(blob);
        const p=document.getElementById('voicePreviewPlayer');
        if(p){p.src=previewUrl;p.style.display='block';p.load()}
      }catch(_){}
    });
  }

  const NativeStart=NativeRecorder.prototype.start;
  const NativeStop=NativeRecorder.prototype.stop;
  NativeRecorder.prototype.start=function(){setupRecorder(this);return NativeStart.apply(this,arguments)};
  NativeRecorder.prototype.stop=function(){
    const info=recInfo.get(this);
    if(info&&this.state==='recording'){
      const elapsed=Date.now()-info.start;
      const manual=performance.now()<manualStopUntil;
      if(!manual&&elapsed<MAX_MS)return;
    }
    return NativeStop.apply(this,arguments);
  };

  function RecorderWithSpeechBitrate(stream,options){
    const o=Object.assign({},options||{});
    if(!o.audioBitsPerSecond)o.audioBitsPerSecond=64000;
    return new NativeRecorder(stream,o);
  }
  RecorderWithSpeechBitrate.prototype=NativeRecorder.prototype;
  try{Object.setPrototypeOf(RecorderWithSpeechBitrate,NativeRecorder)}catch(_){}
  RecorderWithSpeechBitrate.isTypeSupported=NativeRecorder.isTypeSupported.bind(NativeRecorder);
  window.MediaRecorder=RecorderWithSpeechBitrate;

  document.addEventListener('click',e=>{
    const b=e.target&&e.target.closest?e.target.closest('#micBtn'):null;
    if(b&&activeRecorder&&activeRecorder.state==='recording')manualStopUntil=performance.now()+1200;
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUi,{once:true});else installUi();
})();
