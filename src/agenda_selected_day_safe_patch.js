import worker from './cagatay_agenda_patch.js';

const selectedDayCss = `
<style>
  #agendaDays .month-day.today{
    background:#f0fdf4!important;
    border-color:#86efac!important;
    box-shadow:inset 0 0 0 1px #86efac!important;
  }
  #agendaDays .month-day.today .month-day-number{
    color:#166534!important;
  }
  #agendaDays .month-day.agenda-selected{
    background:#dbeafe!important;
    border:2px solid #2563eb!important;
    box-shadow:inset 0 0 0 1px #60a5fa,0 2px 8px #2563eb22!important;
  }
  #agendaDays .month-day.agenda-selected .month-day-number{
    color:#1d4ed8!important;
    font-weight:1000!important;
  }
</style>`;

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';

    if(request.method==='GET' && response.status===200 && (url.pathname==='/' || url.pathname==='/index.html') && contentType.includes('text/html')){
      let html = await response.text();

      const oldClass = 'class="month-day ${date===localDateKey()?\'today\':\'\'}"';
      const newClass = 'class="month-day ${date===localDateKey()?\'today\':\'\'} ${date===agendaDateKey()?\'agenda-selected\':\'\'}"';
      if(html.includes(oldClass)) html = html.replace(oldClass, newClass);

      if(!html.includes('#agendaDays .month-day.agenda-selected')){
        html = html.replace('</body>', selectedDayCss + '\n</body>');
      }

      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.delete('etag');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }

    return response;
  }
};
