import worker from './ali_ajanda_user_patch.js';

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';

    if (request.method === 'GET' && response.status === 200 && (url.pathname === '/' || url.pathname === '/index.html') && contentType.includes('text/html')) {
      let html = await response.text();
      const oldSelect = '<select id="loginUser" style="margin:6px 0 10px"><option>Ali</option><option>Çağatay</option><option>Recep</option></select>';
      const newSelect = '<select id="loginUser" style="margin:6px 0 10px"><option>Ali</option><option>Ali Ajanda</option><option>Çağatay</option><option>Recep</option></select>';
      if (html.includes(oldSelect)) html = html.replace(oldSelect, newSelect);

      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.delete('etag');
      return new Response(html, { status: response.status, statusText: response.statusText, headers });
    }

    return response;
  }
};
