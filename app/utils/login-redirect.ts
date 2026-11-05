const defaultDestination = '/me/profile';
const localOrigin = 'https://corpord.local';

/** Login may return only to a local page, never an external URL or auth loop. */
export function safeLoginRedirect(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\u0000-\u0020\u007F-\u009F\\]/.test(value)) return defaultDestination;
  let decoded = value;
  try {
    for (let depth = 0; depth < 4; depth++) {
      // Encoded separators/control characters are unnecessary for our return
      // routes and can acquire a different meaning in URL/router normalization.
      if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(decoded)) return defaultDestination;
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
      if (/[\u0000-\u001F\u007F-\u009F\\]/.test(decoded)) return defaultDestination;
      if (depth === 3 && decoded.includes('%')) return defaultDestination;
    }
    const resolved = new URL(decoded, localOrigin);
    if (resolved.origin !== localOrigin || /^\/(?:login|register|logout|auth)(?:\/|$)/i.test(resolved.pathname)) return defaultDestination;
    const destination = new URL(value, localOrigin);
    if (destination.origin !== localOrigin) return defaultDestination;
    return destination.pathname + destination.search + destination.hash;
  } catch { return defaultDestination; }
}
