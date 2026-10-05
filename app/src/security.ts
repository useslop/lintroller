// Mirrors the headers in the repo-root vercel.json (SPEC §10). test/headers.test.ts keeps the two in step.
export const CSP =
  "default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'none'; img-src 'self' data: blob:; style-src 'self'; font-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests";
export const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=(), browsing-topics=(), clipboard-read=(), payment=(), usb=()';
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': PERMISSIONS_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};
