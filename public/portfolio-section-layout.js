(function(){
  'use strict';

  const TAB_LABELS=[
    'Genel',
    'Satış & Potansiyel',
    'Görüşmeler & Notlar',
    'Yapılacaklar',
    'Teknik & Notlar'
  ];

  function currentCustomer(){
    try{return typeof selected!=='undefined'?selected:null}catch(_){return null}
  }

  function ensureStyle(){
    if(document.getElementById('portfolioSectionTabsStyle'))return;
    const style=document.createElement('style');
    style.id='portfolioSectionTabsStyle';
    style.textContent=`
      #portfolioDetailExpandModal .pdem-head{grid-template-columns:minmax(260px,1fr) 38px!important}
      #portfolioDetailExpandModal .pdem-head>.pdem-close{grid-column:2!important}
      .pie-editor.pie-tabs-mode{background:#fff;border:1px solid #dce5ef;border-radius:12px;padding:0;overflow:hidden}
      .pie-editor.pie-tabs-mode .pie-head{padding:12px 14px 8px;margin:0;background:#fff}
      .pie-top-tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-top:1px solid #e5edf6;border-bottom:1px solid #dce5ef;background:#fff;position:sticky;top:0;z-index:3}
      .pie-top-tab{border:0;background:#fff;padding:11px 7px 9px;font-size:11px;font-weight:900;color:#475569;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pie-top-tab:hover{background:#f8fbff;color:#1769f6}
      .pie-top-tab.active{color:#1769f6;border-bottom-color:#1769f6;background:#fff}
      .pie-editor.pie-tabs-mode .pie-section{display:none;border:0;border-radius:0;margin:0;background:#fff;overflow:visible}
      .pie-editor.pie-tabs-mode .pie-section.active-tab-panel{display:block}
      .pie-editor.pie-tabs-mode .pie-section>summary{display:none!important}
      .pie-editor.pie-tabs-mode .pie-section-body{padding:12px 14px}
      .pie-editor.pie-tabs-mode .pie-readonly-note{margin:0 14px 8px}
      .pie-editor.pie-tabs-mode .pie-actions{padding:0 14px 12px;margin-top:8px}
      .pie-general-contact{margin:0 0 10px!important;padding:0!important;background:transparent!important;border:0!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;width:100%!important}
      .pie-general-contact .pdem-contact-item{background:#f8fafc!important}
      .pie-tab-quick-note{margin:0 0 12px!important;padding:10px!important;border:1px solid #dbe5f0!important;border-radius:10px!important;background:#f8fbff!important}
      @media(max-width:900px){.pie-top-tabs{grid-template-columns:repeat(5,minmax(120px,1fr));overflow-x:auto}.pie-top-tab{font-size:10px}.pie-general-contact{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function activate(editor,sections,index){
    sections.forEach((section,i)=>{
      const active=i===index;
      section.classList.toggle('active-tab-panel',active);
      if(active)section.setAttribute('open','');
      else section.removeAttribute('open');
    });
    editor.querySelectorAll('.pie-top-tab').forEach((button,i)=>{
      button.classList.toggle('active',i===index);
      button.setAttribute('aria-selected',i===index?'true':'false');
    });
  }

  function moveHeaderContent(modal,sections){
    const generalBody=sections[0]&&sections[0].querySelector('.pie-section-body');
    const meetingsBody=sections[2]&&sections[2].querySelector('.pie-section-body');

    const contact=modal.querySelector('.pdem-contact');
    if(contact&&generalBody&&contact.parentNode!==generalBody){
      contact.classList.add('pie-general-contact');
      generalBody.insertBefore(contact,generalBody.firstChild);
    }

    const quickNote=modal.querySelector('.pdem-quick-note');
    if(quickNote&&meetingsBody&&quickNote.parentNode!==meetingsBody){
      quickNote.classList.add('pie-tab-quick-note');
      meetingsBody.insertBefore(quickNote,meetingsBody.firstChild);
    }
  }

  function updateCustomerTitle(modal){
    const c=currentCustomer();
    const company=String(c&&c.company||'').trim();
    const title=modal.querySelector('.pdem-title');
    if(title)title.textContent=company?'Müşteri Kartı — '+company:'Müşteri Kartı';
    const sub=modal.querySelector('.pdem-sub');
    if(sub)sub.textContent='Firma bilgileri, görüşmeler ve yapılacak işlemler.';
  }

  function applyLayout(){
    const modal=document.getElementById('portfolioDetailExpandModal');
    if(!modal||!modal.classList.contains('show'))return;
    const body=modal.querySelector('.pdem-body');
    const editor=body&&body.querySelector('.pie-editor');
    if(!body||!editor)return;

    ensureStyle();
    const sections=Array.from(editor.querySelectorAll('.pie-section')).slice(0,5);
    if(sections.length<5)return;

    updateCustomerTitle(modal);
    moveHeaderContent(modal,sections);

    if(editor.dataset.sectionLayoutReady==='tabs-v3')return;
    editor.dataset.sectionLayoutReady='tabs-v3';
    editor.classList.add('pie-tabs-mode');

    const title=editor.querySelector('.pie-title');
    if(title)title.textContent='Müşteri Bilgileri';
    const sub=editor.querySelector('.pie-sub');
    if(sub)sub.textContent='Bölüm seçerek bilgileri görüntüleyebilir ve düzenleyebilirsiniz.';

    let tabs=editor.querySelector('.pie-top-tabs');
    if(!tabs){
      tabs=document.createElement('div');
      tabs.className='pie-top-tabs';
      tabs.setAttribute('role','tablist');
      tabs.innerHTML=TAB_LABELS.map((label,i)=>`<button type="button" class="pie-top-tab${i===0?' active':''}" role="tab" aria-selected="${i===0?'true':'false'}" data-tab-index="${i}">${label}</button>`).join('');
      const firstSection=sections[0];
      firstSection.parentNode.insertBefore(tabs,firstSection);
      tabs.addEventListener('click',event=>{
        const button=event.target.closest('.pie-top-tab');
        if(!button)return;
        const index=Number(button.dataset.tabIndex||0);
        activate(editor,sections,index);
      });
    }

    activate(editor,sections,0);

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