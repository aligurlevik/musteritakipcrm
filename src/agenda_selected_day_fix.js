import worker from './ciro_target_gap_fix.js';

const AGENDA_SELECTED_DAY_PATCH = String.raw`
<style id="agendaSelectedDayFixStyle">
#agendaRollingWeek .agenda-week-day.selected{
  border:2px solid #2563eb!important;
  background:#eff6ff!important;
  box-shadow:0 0 0 2px #93c5fd66!important;
  opacity:1!important;
}
#agendaRollingWeek .agenda-week-day.selected .agenda-week-date{color:#1d4ed8!important}
</style>
<script id="agendaSelectedDayFixPatch">
(() => {
  if (window.__agendaSelectedDayFixLoaded) return;
  window.__agendaSelectedDayFixLoaded = true;

  let selectedAgendaDate = '';

  function selectedDayItems(dateKey) {
    try {
      return (agendaEntries || [])
        .filter(x => String(x.entry_date || '').slice(0, 10) === dateKey)
        .sort(agendaTaskSort);
    } catch (_) {
      return [];
    }
  }

  function markSelectedDay() {
    document.querySelectorAll('[data-agenda-week-date]').forEach(button => {
      const selected = !!selectedAgendaDate && button.getAttribute('data-agenda-week-date') === selectedAgendaDate;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }

  if (typeof renderAgendaMonth === 'function') {
    const originalRenderAgendaMonth = renderAgendaMonth;
    renderAgendaMonth = function() {
      if (!selectedAgendaDate) return originalRenderAgendaMonth.apply(this, arguments);
      const originalTodayEntries = todayAgendaEntries;
      try {
        todayAgendaEntries = selectedDayItems(selectedAgendaDate);
        return originalRenderAgendaMonth.apply(this, arguments);
      } finally {
        todayAgendaEntries = originalTodayEntries;
      }
    };
  }

  if (typeof setupAgendaTimeSelectors === 'function') {
    const originalSetupAgendaTimeSelectors = setupAgendaTimeSelectors;
    setupAgendaTimeSelectors = function() {
      const result = originalSetupAgendaTimeSelectors.apply(this, arguments);
      if (selectedAgendaDate) {
        const dateInput = document.getElementById('todayInlineDate');
        if (dateInput) {
          dateInput.value = selectedAgendaDate;
          if (typeof agendaDateSelected === 'function') agendaDateSelected('todayInline');
        }
      }
      markSelectedDay();
      return result;
    };
  }

  if (typeof openDailyAgenda === 'function') {
    const originalOpenDailyAgenda = openDailyAgenda;
    openDailyAgenda = function(date) {
      selectedAgendaDate = String(date || '').slice(0, 10);
      const result = originalOpenDailyAgenda.apply(this, arguments);
      requestAnimationFrame(markSelectedDay);
      return result;
    };
  }

  if (typeof showAgendaMonth === 'function') {
    const originalShowAgendaMonth = showAgendaMonth;
    showAgendaMonth = function() {
      selectedAgendaDate = '';
      return originalShowAgendaMonth.apply(this, arguments);
    };
  }

  if (typeof goAgendaToday === 'function') {
    const originalGoAgendaToday = goAgendaToday;
    goAgendaToday = function() {
      selectedAgendaDate = '';
      return originalGoAgendaToday.apply(this, arguments);
    };
  }

  if (typeof changeAgendaMonth === 'function') {
    const originalChangeAgendaMonth = changeAgendaMonth;
    changeAgendaMonth = function() {
      selectedAgendaDate = '';
      return originalChangeAgendaMonth.apply(this, arguments);
    };
  }

  const observer = new MutationObserver(markSelectedDay);
  const startObserver = () => {
    const host = document.getElementById('agendaRollingWeek') || document.getElementById('agendaDays');
    if (host && host.parentNode) observer.observe(host.parentNode, {childList:true, subtree:true});
    markSelectedDay();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObserver, {once:true});
  else startObserver();
})();
</script>`;

function shouldPatch(path){
  return path === '/' || path === '/index.html';
}

export default {
  async fetch(request, env, ctx){
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const type = response.headers.get('content-type') || '';
    if(request.method !== 'GET' || !shouldPatch(url.pathname) || !response.ok || !type.includes('text/html')) return response;

    let html = await response.text();
    if(!html.includes('agendaSelectedDayFixPatch')) html = html.replace('</body>', AGENDA_SELECTED_DAY_PATCH + '\n</body>');

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('etag');
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.set('cache-control', 'no-cache, no-store, must-revalidate');
    headers.set('pragma', 'no-cache');
    headers.set('expires', '0');
    return new Response(html, {status:response.status, statusText:response.statusText, headers});
  }
};
