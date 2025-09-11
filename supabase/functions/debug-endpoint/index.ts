console.info('debug-endpoint function starting');

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  const origin = req.headers.get('origin') || '*';

  // Common CORS headers
  const corsHeaders = new Headers();
  corsHeaders.set('Access-Control-Allow-Origin', origin);
  corsHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  corsHeaders.set('Access-Control-Allow-Headers', req.headers.get('access-control-request-headers') || 'Content-Type, Authorization');
  corsHeaders.set('Access-Control-Max-Age', '600');

  // Handle preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Parse query params
  const query: Record<string, string | string[]> = {};
  for (const [k, v] of url.searchParams) {
    if (Object.prototype.hasOwnProperty.call(query, k)) {
      const cur = query[k];
      if (Array.isArray(cur)) {
        cur.push(v);
      } else {
        query[k] = [cur as string, v];
      }
    } else {
      query[k] = v;
    }
  }

  // Parse headers into an object
  const headersObj: Record<string, string> = {};
  for (const [k, v] of req.headers) headersObj[k] = v;

  // Attempt to parse body (JSON or text)
  let body: unknown = null;
  try {
    const ct = req.headers.get('content-type') || '';
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      if (ct.includes('application/json')) {
        body = await req.json();
      } else {
        body = await req.text();
      }
    }
  } catch (e) {
    body = `__body_parse_error__: ${String(e)}`;
  }

  const payload = {
    method,
    url: url.href,
    path: url.pathname,
    query,
    headers: headersObj,
    body,
    forwarded_for: req.headers.get('x-forwarded-for') || null,
    timestamp: new Date().toISOString(),
  };

  const respHeaders = new Headers(corsHeaders);
  respHeaders.set('Content-Type', 'application/json');

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: respHeaders,
  });
});
