// Suppress benign Chromium ResizeObserver error spam without affecting real errors
// https://crbug.com/809574
const MSG = 'ResizeObserver loop completed with undelivered notifications.';

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event?.message === MSG) {
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = (event?.reason && (event.reason.message || String(event.reason))) || '';
    if (typeof reason === 'string' && reason.includes(MSG)) {
      event.preventDefault();
    }
  });
}
