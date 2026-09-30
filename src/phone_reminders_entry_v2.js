import worker from './phone_reminders_entry.js';

function rebuildHtml(response, html) {
  const headers = new Headers(response.headers);
  for (const name of ['content-length','content-encoding','etag']) headers.delete(name);
  headers.set('cache-control', 'no-cache, no-store, must-revalidate');
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/portfolio-edit-modal.js') {
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set('cache-control', 'no-cache, no-store, must-revalidate');
      headers.set('content-type', 'application/javascript; charset=utf-8');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    const response = await worker.fetch(request, env, ctx);

    if (request.method === 'GET' && url.pathname === '/musteri-portfoyu.html' && response.ok) {
      const type = response.headers.get('content-type') || '';
      if (type.includes('text/html')) {
        let html = await response.text();
        html = html.replace(/onclick=["']focusEdit\(\)["']/g, 'onclick="window.focusEdit && window.focusEdit()"');
        if (!html.includes('/portfolio-edit-modal.js')) {
          html = html.replace(/<\/body>/i, '<script src="/portfolio-edit-modal.js?v=20260930-2"></script>\n</body>');
        } else {
          html = html.replace(/portfolio-edit-modal\.js\?v=[^"']+/g, 'portfolio-edit-modal.js?v=20260930-2');
        }
        return rebuildHtml(response, html);
      }
    }

    return response;
  },
  async scheduled(controller, env, ctx) {
    if (worker.scheduled) return worker.scheduled(controller, env, ctx);
  }
};
