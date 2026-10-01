(function(){
  'use strict';
  if(window.__crmPortfolioTabHotfix)return;
  window.__crmPortfolioTabHotfix='20261001-v3';

  function editor(){
    var modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return null;
    return modal.querySelector('.pie-editor');
  }

  function setActive(ed,index){
    ed.querySelectorAll('.pie-top-tab').forEach(function(btn){
      var idx=Number(btn.getAttribute('data-tab-index'));
      var active=idx===index;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',active?'true':'false');
    });
  }

  function closeMail(ed){
    ed.querySelectorAll('.crm-mail-v2-pane').forEach(function(p){
      p.style.setProperty('display','none','important');
    });
    ed.querySelectorAll('.crm-mail-fixed-pane').forEach(function(p){
      p.classList.remove('active');
      p.style.setProperty('display','none','important');
    });
  }

  function openMail(ed){
    ed.querySelectorAll('.crm-mail-v2-pane,.crm-mail-fixed-pane').forEach(function(p){
      p.style.removeProperty('display');
    });
  }

  function showMain(ed,index){
    var sections=Array.prototype.slice.call(ed.querySelectorAll('.pie-section')).slice(0,5);
    if(sections.length<5)return;

    sections.forEach(function(section,i){
      var active=index===1 ? (i===1||i===2) : (i===index);
      section.classList.toggle('active-tab-panel',active);
      if(active)section.setAttribute('open','');
      else section.removeAttribute('open');
    });

    var legacy=ed.querySelector('.pie-legacy-extra-host');
    if(legacy)legacy.style.display='none';
    var note=ed.querySelector('.pie-readonly-note');
    var actions=ed.querySelector('.pie-actions');
    if(note)note.style.display='';
    if(actions)actions.style.display='';
  }

  function showOffers(ed){
    ed.querySelectorAll('.pie-section').forEach(function(section){
      section.classList.remove('active-tab-panel');
      section.removeAttribute('open');
    });
    var note=ed.querySelector('.pie-readonly-note');
    var actions=ed.querySelector('.pie-actions');
    if(note)note.style.display='none';
    if(actions)actions.style.display='none';
  }

  function stabilize(index){
    var ed=editor();
    if(!ed)return;

    setActive(ed,index);

    if(index===6){
      openMail(ed);
      return;
    }

    closeMail(ed);

    if(index===5){
      showOffers(ed);
      return;
    }

    if(index===0||index===1||index===3||index===4){
      showMain(ed,index);
    }
  }

  function onTab(event){
    var button=event.target&&event.target.closest?event.target.closest('#portfolioDetailExpandModal .pie-top-tab'):null;
    if(!button)return;
    var index=Number(button.getAttribute('data-tab-index'));
    if(!Number.isFinite(index))return;

    // Önce mevcut sekme kodu çalışsın; sonra yalnız bir kez görünümü sabitle.
    setTimeout(function(){stabilize(index)},0);
  }

  // Bubble aşamasında çalışır; eski sekme koduyla class döngüsüne girmez.
  document.addEventListener('click',onTab,false);

  document.addEventListener('click',function(event){
    var customerBtn=event.target&&event.target.closest?event.target.closest('.detail-actions .crm-customer-button'):null;
    if(customerBtn){
      setTimeout(function(){stabilize(0)},220);
    }
  },false);
})();
