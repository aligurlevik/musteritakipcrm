import worker from './phone_reminders_entry.js';

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
    return worker.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    if (worker.scheduled) return worker.scheduled(controller, env, ctx);
  }
};
