import worker from './index.js';

const oldReset = "$('g_no').value='';$('g_description').value='';";
const newReset = "$('g_customer').value='';$('g_no').value='';$('g_description').value='';";

const fieldPatches = [
  ['<input id="g_customer" placeholder="Firma">','<input id="g_customer" placeholder="Firma" autocomplete="off">'],
  ['<input id="g_no" placeholder="İş kodu">','<input id="g_no" placeholder="İş kodu" autocomplete="off">'],
  ['<input id="g_description" placeholder="Kısa not">','<input id="g_description" placeholder="Kısa not" autocomplete="off">']
];

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const url = new URL(request.url);
    const contentType = response.headers.get('content-type') || '';

    if (
      request.method === 'GET' &&
      response.status === 200 &&
      (url.pathname === '/' || url.pathname === '/index.html') &&
      contentType.includes('text/html')
    ) {
      let html = await response.text();
      html = html.split(oldReset).join(newReset);
      for (const [from, to] of fieldPatches) html = html.split(from).join(to);

      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.delete('etag');
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return response;
  }
};
