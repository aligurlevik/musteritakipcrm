(()=>{
  'use strict';

  const TEXT_COLORS=[
    ['#101828','Koyu lacivert'],
    ['#245b78','Mavi'],
    ['#176b4d','Yeşil'],
    ['#8a3d2f','Kahve'],
    ['#8f2d56','Bordo'],
    ['#633c7d','Mor'],
    ['#52606d','Gri'],
    ['#000000','Siyah']
  ];
  const BACKGROUND_COLORS=[
    ['#ffffff','Beyaz'],
    ['#fffdf1','Vanilya'],
    ['#fff3c4','Açık sarı'],
    ['#ffe5d9','Şeftali'],
    ['#ffe1ec','Pembe'],
    ['#eee5ff','Lila'],
    ['#e1eeff','Açık mavi'],
    ['#dff7f5','Açık turkuaz'],
    ['#e4f4df','Açık yeşil'],
    ['#eef2f6','Açık gri']
  ];
  const CONFIGS=[
    {textId:'editTextColor',backgroundId:'editBgColor',applyName:'applyEditColors'},
    {textId:'textColor',backgroundId:'bgColor',applyName:'applyColors'}
  ];

  function addStyles(){
    if(document.getElementById('noteColorPaletteStyles'))return;
    const style=document.createElement('style');
    style.id='noteColorPaletteStyles';
    style.textContent=`
      .notePaletteNativeInput{position:absolute!important;width:1px!important;height:1px!important;margin:0!important;padding:0!important;opacity:0!important;pointer-events:none!important}
      .colorItem.notePaletteColorItem{position:relative;cursor:default!important}
      .notePalettePreview{width:42px;height:34px;display:inline-block;flex:0 0 auto;border:2px solid #72869a;border-radius:9px;background:var(--note-preview,#fff);box-shadow:inset 0 0 0 3px rgba(255,255,255,.72)}
      .colorbar.notePaletteSourceBar{display:none!important}
      .noteColorPaletteLauncher{position:relative;display:flex;justify-content:flex-start;margin:4px 0 8px;z-index:22}
      .noteColorPaletteToggle{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;padding:8px 11px;border:1px solid #b7c7d4;border-radius:10px;background:#fff;color:#173f63;font:inherit;font-size:13px;font-weight:900;box-shadow:0 2px 7px rgba(25,62,88,.08);cursor:pointer;-webkit-tap-highlight-color:transparent}
      .noteColorPaletteToggle:active{transform:scale(.97)}
      .noteColorPaletteToggle.isOpen{border-color:#5c92ad;background:#eef7fb}
      .noteColorPalette{display:none;position:absolute;left:0;top:calc(100% + 6px);z-index:80;width:min(520px,calc(100vw - 24px));max-height:min(66vh,520px);overflow:auto;margin:0;padding:13px 14px 14px;border:2px solid #c8d8e6;border-radius:18px;background:#f8fbff;box-shadow:0 12px 30px rgba(25,62,88,.2)}
      .noteColorPalette.isOpen{display:block}
      .noteColorPaletteSection+.noteColorPaletteSection{margin-top:13px;padding-top:12px;border-top:1px solid #d9e4ed}
      .noteColorPaletteTitle{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px;color:#183b56;font-size:16px;font-weight:900}
      .noteColorPaletteHint{color:#60788d;font-size:12px;font-weight:800}
      .noteColorPaletteRow{display:grid;grid-template-columns:repeat(5,minmax(42px,1fr));gap:9px}
      .noteColorSwatch{position:relative;min-width:0;height:45px;padding:0;border:2px solid #93a6b7;border-radius:12px;background:var(--swatch);box-shadow:inset 0 0 0 3px rgba(255,255,255,.7);cursor:pointer;-webkit-tap-highlight-color:transparent}
      .noteColorSwatch:active{transform:scale(.94)}
      .noteColorSwatch.isSelected{border-color:#087aa0;box-shadow:0 0 0 3px rgba(8,122,160,.2),inset 0 0 0 3px rgba(255,255,255,.75)}
      .noteColorSwatch.isSelected::after{content:'✓';position:absolute;right:-5px;top:-7px;width:21px;height:21px;display:grid;place-items:center;border:2px solid #fff;border-radius:50%;color:#fff;background:#087aa0;font:900 13px/1 Arial,sans-serif;box-shadow:0 2px 5px rgba(0,0,0,.2)}
      .noteColorCustom{grid-column:span 2;height:45px;border:2px solid #9db0c0;border-radius:12px;color:#173f63;background:#fff;font:inherit;font-size:14px;font-weight:900;cursor:pointer}
      @media(max-width:390px){.noteColorPalette{padding:11px}.noteColorPaletteRow{gap:7px}.noteColorSwatch{height:42px}.notePalettePreview{width:36px}}
    `;
    document.head.appendChild(style);
  }

  function normalize(value){return String(value||'').trim().toLowerCase()}

  function sync(config){
    const panel=config.panel;
    if(!panel)return;
    for(const button of panel.querySelectorAll('.noteColorSwatch')){
      const input=document.getElementById(button.dataset.target);
      const selected=input&&normalize(input.value)===normalize(button.dataset.color);
      button.classList.toggle('isSelected',selected);
      button.setAttribute('aria-pressed',selected?'true':'false');
    }
    for(const id of [config.textId,config.backgroundId]){
      const input=document.getElementById(id),preview=document.querySelector(`[data-note-preview-for="${id}"]`);
      if(preview&&input)preview.style.setProperty('--note-preview',input.value);
    }
  }

  function choose(config,targetId,color){
    const input=document.getElementById(targetId);
    if(!input)return;
    input.value=color;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    sync(config);
  }

  function createSection(config,title,hint,targetId,colors){
    const section=document.createElement('div');
    section.className='noteColorPaletteSection';
    const heading=document.createElement('div');
    heading.className='noteColorPaletteTitle';
    heading.innerHTML=`<span>${title}</span><span class="noteColorPaletteHint">${hint}</span>`;
    section.appendChild(heading);
    const row=document.createElement('div');
    row.className='noteColorPaletteRow';
    for(const [color,name] of colors){
      const button=document.createElement('button');
      button.type='button';
      button.className='noteColorSwatch';
      button.dataset.target=targetId;
      button.dataset.color=color;
      button.style.setProperty('--swatch',color);
      button.title=name;
      button.setAttribute('aria-label',`${title}: ${name}`);
      button.setAttribute('aria-pressed','false');
      button.addEventListener('click',()=>choose(config,targetId,color));
      row.appendChild(button);
    }
    const custom=document.createElement('button');
    custom.type='button';
    custom.className='noteColorCustom';
    custom.textContent='＋ Özel renk';
    custom.setAttribute('aria-label',`${title} için özel renk seç`);
    custom.addEventListener('click',()=>document.getElementById(targetId)?.click());
    row.appendChild(custom);
    section.appendChild(row);
    return section;
  }

  function prepareInput(input){
    input.classList.add('notePaletteNativeInput');
    input.tabIndex=-1;
    const label=input.closest('.colorItem');
    if(!label||label.querySelector(`[data-note-preview-for="${input.id}"]`))return;
    label.classList.add('notePaletteColorItem');
    label.addEventListener('click',event=>{
      if(event.target!==input)event.preventDefault();
    });
    const preview=document.createElement('span');
    preview.className='notePalettePreview';
    preview.dataset.notePreviewFor=input.id;
    preview.setAttribute('aria-hidden','true');
    label.appendChild(preview);
  }

  function setup(config){
    const textInput=document.getElementById(config.textId),backgroundInput=document.getElementById(config.backgroundId);
    if(!textInput||!backgroundInput)return false;
    const colorbar=textInput.closest('.colorbar');
    if(!colorbar||colorbar.nextElementSibling?.dataset.notePalette==='true')return false;
    prepareInput(textInput);
    prepareInput(backgroundInput);
    colorbar.classList.add('notePaletteSourceBar');
    const launcher=document.createElement('div');
    launcher.className='noteColorPaletteLauncher';
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='noteColorPaletteToggle';
    toggle.textContent='🎨 Renkler';
    toggle.setAttribute('aria-expanded','false');
    const panel=document.createElement('div');
    panel.className='noteColorPalette';
    panel.dataset.notePalette='true';
    panel.appendChild(createSection(config,'Yazı renkleri','Koyu ve okunaklı',config.textId,TEXT_COLORS));
    panel.appendChild(createSection(config,'Açık zemin renkleri','Pastel seçenekler',config.backgroundId,BACKGROUND_COLORS));
    function setOpen(open){
      panel.classList.toggle('isOpen',open);
      toggle.classList.toggle('isOpen',open);
      toggle.setAttribute('aria-expanded',open?'true':'false');
      toggle.textContent=open?'✕ Renkleri Kapat':'🎨 Renkler';
    }
    toggle.addEventListener('click',()=>setOpen(!panel.classList.contains('isOpen')));
    launcher.append(toggle,panel);
    colorbar.insertAdjacentElement('afterend',launcher);
    document.addEventListener('pointerdown',event=>{
      if(panel.classList.contains('isOpen')&&!launcher.contains(event.target))setOpen(false);
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false)});
    config.panel=panel;
    textInput.addEventListener('input',()=>sync(config));
    backgroundInput.addEventListener('input',()=>sync(config));
    sync(config);
    return true;
  }

  function init(){
    addStyles();
    for(const config of CONFIGS){
      if(!setup(config))continue;
      const original=window[config.applyName];
      if(typeof original==='function'&&!original.notePaletteWrapped){
        const wrapped=function(...args){
          const result=original.apply(this,args);
          sync(config);
          return result;
        };
        wrapped.notePaletteWrapped=true;
        window[config.applyName]=wrapped;
      }
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
