import worker from './index.js';

const oldReset = "$('g_no').value='';$('g_description').value='';";
const newReset = "$('g_customer').value='';$('g_no').value='';$('g_description').value='';";

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
      const html = await response.text();
      const patchedHtml = html.includes(oldReset) ? html.replace(oldReset, newReset) : html;
      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.delete('etag');
      return new Response(patchedHtml, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    return response;
  }
};
