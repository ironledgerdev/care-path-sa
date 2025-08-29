// Suppress benign Chromium ResizeObserver console noise without hiding real errors
// https://crbug.com/809574
const MSGS = [
  'ResizeObserver loop completed with undelivered notifications.',
  'ResizeObserver loop limit exceeded'
];

function includesROMessage(input: unknown) {
  const s = typeof input === 'string' ? input : (input as any)?.message;
  return typeof s === 'string' && MSGS.some((m) => s.includes(m));
}

if (typeof window !== 'undefined') {
  // Filter error events
  window.addEventListener('error', (event) => {
    if (includesROMessage(event?.message)) {
      event.stopImmediatePropagation();
    }
  });

  // Filter unhandledrejection events
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    if (includesROMessage((event?.reason && (event.reason.message || String(event.reason))) || '')) {
      event.preventDefault();
    }
  });

  // Patch console to drop only these specific messages
  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args: any[]) => {
    if (args.some(includesROMessage)) return;
    origError.apply(console, args);
  };
  console.warn = (...args: any[]) => {
    if (args.some(includesROMessage)) return;
    origWarn.apply(console, args);
  };
}
