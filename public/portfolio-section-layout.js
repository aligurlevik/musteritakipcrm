(function(){
  'use strict';

  function applyLayout(){
    const modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    const body=modal.querySelector('.pdem-body');
    const editor=body&&body.querySelector('.pie-editor');
    if(!body||!editor||editor.dataset.sectionLayoutReady==='1')return;

    editor.dataset.sectionLayoutReady='1';

    const sections=Array.from(editor.querySelectorAll('.pie-section'));
    sections.forEach(section=>section.removeAttribute('open'));

    const firstSummary=sections[0]&&sections[0].querySelector('summary');
    if(firstSummary)firstSummary.textContent='🏢 1. Genel — Firma ve Yetkililer';

    const title=editor.querySelector('.pie-title');
    if(title)title.textContent='✏️ Müşteri Kartı — Bölümler';
    const sub=editor.querySelector('.pie-sub');
    if(sub)sub.textContent='Tüm başlıklar başlangıçta kapalıdır. Düzenlemek istediğiniz bölüme tıklayın.';

    requestAnimationFrame(()=>{
      body.scrollTop=0;
      const box=modal.querySelector('.pdem-box');
      if(box)box.scrollTop=0;
      modal.scrollTop=0;
      editor.scrollIntoView({block:'start',behavior:'auto'});
    });
  }

  const observer=new MutationObserver(()=>setTimeout(applyLayout,0));
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',()=>setTimeout(applyLayout,60),true);
  setInterval(applyLayout,800);
})();