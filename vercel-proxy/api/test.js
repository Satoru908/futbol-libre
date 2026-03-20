export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  console.log('[Vercel Test] Request received!');
  console.log('[Vercel Test] URL:', req.url);
  console.log('[Vercel Test] Method:', req.method);
  console.log('[Vercel Test] RENDER_PROXY_URL:', process.env.RENDER_PROXY_URL);
  
  return new Response(JSON.stringify({
    status: 'ok',
    message: 'Vercel is working!',
    timestamp: new Date().toISOString(),
    renderProxyUrl: process.env.RENDER_PROXY_URL || 'NOT SET',
    url: req.url
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
