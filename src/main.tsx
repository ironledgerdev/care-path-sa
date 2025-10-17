// Resilient fetch wrapper: try native fetch, fallback to XHR on network failures
const _originalFetch = (window as any).fetch ? (window as any).fetch.bind(window) : undefined;
if (_originalFetch) {
  (window as any).fetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    try {
      return await _originalFetch(input, init);
    } catch (originalErr) {
      // Fallback to XMLHttpRequest for environments where fetch can fail (e.g., instrumented by third-party scripts)
      try {
        return await new Promise<Response>((resolve, reject) => {
          try {
            const url = typeof input === 'string' ? input : (input as Request).url;
            const method = (init?.method || (typeof input === 'object' && (input as Request).method) || 'GET').toString();
            const xhr = new XMLHttpRequest();
            xhr.open(method, url, true);

            // Set headers
            const headersInit = init?.headers;
            if (headersInit) {
              if (headersInit instanceof Headers) {
                headersInit.forEach((value, key) => xhr.setRequestHeader(key, value));
              } else if (Array.isArray(headersInit)) {
                headersInit.forEach(([k, v]) => xhr.setRequestHeader(k, v as string));
              } else {
                Object.entries(headersInit as Record<string, string>).forEach(([k, v]) => xhr.setRequestHeader(k, v));
              }
            }

            xhr.onload = () => {
              const rawHeaders = xhr.getAllResponseHeaders() || '';
              const headerLines = rawHeaders.trim().split(/\r?\n/).filter(Boolean);
              const resHeaders = new Headers();
              headerLines.forEach(line => {
                const idx = line.indexOf(':');
                if (idx > -1) {
                  const key = line.slice(0, idx).trim();
                  const val = line.slice(idx + 1).trim();
                  resHeaders.append(key, val);
                }
              });

              const body = 'response' in xhr ? (xhr.response as any) : xhr.responseText;
              resolve(new Response(body, { status: xhr.status || 0, statusText: xhr.statusText, headers: resHeaders }));
            };

            xhr.onerror = () => reject(new TypeError('Network request failed'));
            xhr.ontimeout = () => reject(new TypeError('Network request timed out'));

            // Send body
            if (init?.body) {
              try {
                xhr.send(init.body as any);
              } catch (e) {
                xhr.send(String(init.body));
              }
            } else {
              xhr.send();
            }
          } catch (e) {
            reject(e);
          }
        });
      } catch (fallbackErr) {
        // If fallback also fails, rethrow original error to preserve stack
        throw originalErr;
      }
    }
  };
}

import { createRoot } from 'react-dom/client'
import './utils/patchResizeObserver';
import './utils/suppressResizeObserverError';
import './integrations/sentry';
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
