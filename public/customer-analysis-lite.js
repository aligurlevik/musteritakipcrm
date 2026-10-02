(function(){
  'use strict';
  if(window.__crmCustomerAnalysisNativeV2)return;
  window.__crmCustomerAnalysisNativeV2='20261002-native-v2';

  function setText(node,text){if(node&&node.textContent!==text)node.textContent=text}
  function editorNow(){var m=document.getElementById('portfolioDetailExpandModal');return m&&m.classList.contains('show')?m.querySelector('.pie-editor'):null}

  function ensureStyle(){
    if(document.getElementById('crmCustomerAnalysisNativeStyle'))return;
    var s=document.createElement('style');
    s.id='crmCustomerAnalysisNativeStyle';
    s.textContent='\n#portfolioDetailExpandModal .pie-editor.crm-root-tabs:not(.crm-native-analysis-active) .crm-care-satisfaction-card{display:none!important}\n#portfolioDetailExpandModal .crm-root-tabbar.crm-analysis-ready{grid-template-columns:1fr 1.28fr 1fr 1.15fr 1.05fr .82fr .82fr!important}\n#portfolioDetailExpandModal .pie-editor.crm-native-analysis-active .pie-section.crm-root-visible .pie-section-body>*{display:none!important}\n#portfolioDetailExpandModal .pie-editor.crm-native-analysis-active .pie-section.crm-root-visible .pie-section-body>.crm-care-satisfaction-card{display:block!important;margin-top:0!important}\n@media(max-width:1050px){#portfolioDetailExpandModal .crm-root-tabbar.crm-analysis-ready{grid-template-columns:repeat(7,minmax(125px,1fr))!important;overflow-x:auto}}';
    document.head.appendChild(s);
  }

  function renameCard(editor){
    var card=editor&&editor.querySelector('.crm-care-satisfaction-card');if(!card)return null;
    setText(card.querySelector('.crm-care-card-title'),'📊 Müşteri Analizi');
    var satisfaction=card.querySelector('[data-satisfaction]'),sf=satisfaction?satisfaction.closest('.crm-care-field'):null;
    setText(sf?sf.querySelector('label'):null,'Memnuniyet Durumu');
    var loss=card.querySelector('[data-loss-reason]'),lf=loss?loss.closest('.crm-care-field'):null;
    setText(lf?lf.querySelector('label'):null,'Kaybedilme Sebebi');
    setText(card.querySelector('[data-sat-save]'),'Müşteri Analizini Kaydet');
    var status=card.querySelector('[data-sat-status]');
    if(status&&status.textContent==='Memnuniyet bilgisi kaydedildi.')status.textContent='Müşteri analizi kaydedildi.';
    return card;
  }

  function install(){
    ensureStyle();
    var editor=editorNow();if(!editor)return;
    var bar=editor.querySelector('.crm-root-tabbar');
    var card=renameCard(editor);
    if(!bar||!card)return;
    bar.classList.add('crm-analysis-ready');
    if(bar.querySelector('.crm-native-analysis-tab'))return;
    var b=document.createElement('button');
    b.type='button';b.className='pie-top-tab crm-native-analysis-tab';b.setAttribute('role','tab');b.setAttribute('aria-selected','false');b.setAttribute('data-tab-index','7');b.textContent='Müşteri Analizi';
    var offers=bar.querySelector('.pie-top-tab[data-tab-index="5"]');
    if(offers)bar.insertBefore(b,offers);else bar.appendChild(b);
  }

  function showAnalysis(editor){
    if(!editor)return;
    var card=renameCard(editor);if(!card)return;
    editor.classList.add('crm-native-analysis-active');
    editor.querySelectorAll('.crm-root-tabbar .pie-top-tab').forEach(function(b){b.classList.remove('active');b.setAttribute('aria-selected','false')});
    var tab=editor.querySelector('.crm-native-analysis-tab');if(tab){tab.classList.add('active');tab.setAttribute('aria-selected','true')}
    var sections=Array.prototype.slice.call(editor.querySelectorAll('.pie-section')).slice(0,5);
    sections.forEach(function(s,i){s.classList.toggle('crm-root-visible',i===0);s.classList.toggle('active-tab-panel',i===0);if(i===0)s.setAttribute('open','');else s.removeAttribute('open')});
    var host=editor.querySelector('.crm-root-extra-host');if(host)host.classList.remove('active');
    var note=editor.querySelector('.pie-readonly-note');if(note)note.style.display='none';
    var actions=editor.querySelector('.pie-actions');if(actions)actions.style.display='none';
  }

  function leaveAnalysis(editor){if(editor)editor.classList.remove('crm-native-analysis-active')}
  function scheduleInstall(){[60,180,420,800].forEach(function(ms){setTimeout(install,ms)})}

  function start(){
    ensureStyle();
    setTimeout(install,120);
    document.addEventListener('click',function(event){
      var editor=editorNow();
      var analysis=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal .crm-native-analysis-tab'):null;
      if(analysis&&editor){
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
        showAnalysis(editor);setTimeout(function(){showAnalysis(editor)},70);setTimeout(function(){showAnalysis(editor)},150);return;
      }
      var normal=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal .crm-root-tabbar .pie-top-tab'):null;
      if(normal&&editor)leaveAnalysis(editor);
      var save=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal [data-sat-save]'):null;
      if(save&&editor){setTimeout(function(){renameCard(editor)},120);setTimeout(function(){renameCard(editor)},350)}
      scheduleInstall();
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
