import worker from './quick_request_vertical_compact.js';

const SALES_COCKPIT_ASSETS = '<link rel="stylesheet" href="/sales-cockpit.css?v=20260929a">\n<script src="/sales-cockpit.js?v=20260929a"></script>';

function rebuild(response, html) {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('cache-control', 'no-cache, no-store, must-revalidate');
  headers.set('pragma', 'no-cache');
  headers.set('expires', '0');
  return new Response(html, {status: response.status, statusText: response.statusText, headers});
}

export default {
  async fetch(request, env, ctx) {
    const response = await worker.fetch(request, env, ctx);
    const backup = response.clone();
    try {
      const type = response.headers.get('content-type') || '';
      if (request.method !== 'GET' || !type.includes('text/html')) return response;
      const html = await response.text();
      if (html.includes('/sales-cockpit.js?v=20260929a')) return rebuild(response, html);
      const next = html.includes('</body>')
        ? html.replace('</body>', SALES_COCKPIT_ASSETS + '\n</body>')
        : html + SALES_COCKPIT_ASSETS;
      return rebuild(response, next);
    } catch (error) {
      console.error('Sales cockpit HTML patch failed', error);
      return backup;
    }
  }
};
