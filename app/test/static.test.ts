// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from '../src/security';
import { sourceFiles } from './sources';

const BANNED = [
  'fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource',
  'dangerouslySetInnerHTML', 'console.log', 'eval(', 'new Function(',
];

describe('the app makes no network calls and renders no raw HTML', () => {
  it.each(BANNED)('app/src never uses %s', (token) => {
    expect(sourceFiles().filter((f) => f.text.includes(token)).map((f) => f.path)).toEqual([]);
  });

  it('vercel.json sends exactly the app\'s security headers on every route', () => {
    const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as {
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    const rule = config.headers.find((h) => h.source === '/(.*)');
    expect(Object.fromEntries(rule?.headers.map((h) => [h.key, h.value]) ?? [])).toEqual(SECURITY_HEADERS);
  });

  it('index.html has no inline script or style', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/);
    expect(html).not.toMatch(/<style/);
    expect(html).not.toMatch(/\sstyle=/);
  });
});
