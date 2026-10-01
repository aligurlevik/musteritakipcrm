(function(){
  'use strict';
  if(window.__crmPortfolioTabHotfix)return;
  window.__crmPortfolioTabHotfix='20261001-v1';

  var wantedIndex=null;
  var applying=false;

  function modalEditor(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return null;
    return modal.querySelector('.pie-editor');
  }

  function setActiveButtons(editor,index){
    editor.querySelectorAll('.pie-top-tab').forEach(function(btn){
      var idx=Number(btn.getAttribute('data-tab-index'));
      var active=idx===index;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',active?'true':'false');
    });
  }

  function closeMail(editor){
    var mailTab=editor.querySelector('.pie-top-tab[data-tab-index="6"]');
    if(mailTab){mailTab.classList.remove('active');mailTab.setAttribute('aria-selected','false')}
    editor.querySelectorAll('.crm-mail-v2-pane').forEach(function(p){p.style.setProperty('display','none','important')});
    editor.querySelectorAll('.crm-mail-fixed-pane').forEach(function(p){p.classList.remove('active');p.style.setProperty('display','none','important')});
  }

  function openMail(editor){
    editor.querySelectorAll('.crm-mail-v2-pane').forEach(function(p){p.style.removeProperty('display')});
    editor.querySelectorAll('.crm-mail-fixed-pane').forEach(function(p){p.style.removeProperty('display')});
  }

  function showMainSection(editor,index){
    var sections=Array.prototype.slice.call(editor.querySelectorAll('.pie-section')).slice(0,5);
    if(sections.length<5)return;
    sections.forEach(function(section,i){
      var active=index===1?(i===1||i===2):(i===index);
      section.classList.toggle('active-tab-panel',active);
      if(active)section.setAttribute('open',''); else section.removeAttribute('open');
    });
    var legacy=editor.querySelector('.pie-legacy-extra-host');
    if(legacy)legacy.style.display='none';
    var note=editor.querySelector('.pie-readonly-note');
    var actions=editor.querySelector('.pie-actions');
    if(note)note.style.display='';
    if(actions)actions.style.display='';
  }

  function enforce(index){
    if(applying)return;
    var editor=modalEditor();if(!editor)return;
    applying=true;
    try{
      if(index===6){
        openMail(editor);
        setActiveButtons(editor,6);
        return;
      }
      closeMail(editor);
      setActiveButtons(editor,index);
      if(index===0||index===1||index===3||index===4)showMainSection(editor,index);
      else if(index===5){
        editor.querySelectorAll('.pie-section').forEach(function(section){section.classList.remove('active-tab-panel');section.removeAttribute('open')});
        var note=editor.querySelector('.pie-readonly-note');if(note)note.style.display='none';
        var actions=editor.querySelector('.pie-actions');if(actions)actions.style.display='none';
      }
    }finally{applying=false}
  }

  function onTab(event){
    var button=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal .pie-top-tab'):null;
    if(!button)return;
    var index=Number(button.getAttribute('data-tab-index'));
    if(!Number.isFinite(index))return;
    wantedIndex=index;
    enforce(index);
    setTimeout(function(){enforce(index)},0);
    setTimeout(function(){enforce(index)},60);
    setTimeout(function(){enforce(index)},160);
  }

  document.addEventListener('pointerdown',onTab,true);
  document.addEventListener('click',onTab,true);

  var observer=new MutationObserver(function(){
    if(wantedIndex===null||wantedIndex===6)return;
    setTimeout(function(){enforce(wantedIndex)},0);
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});

  document.addEventListener('click',function(e){
    var customerBtn=e.target&&e.target.closest?e.target.closest('.detail-actions .crm-customer-button'):null;
    if(customerBtn){wantedIndex=0;setTimeout(function(){enforce(0)},120)}
  },true);
})();
