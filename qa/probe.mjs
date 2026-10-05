// Q1: prints the interactive structure of a route (headings, buttons, inputs, live regions), truncated.
// Run: node qa/probe.mjs [path]
import { chromium } from 'playwright-core';
import os from 'node:os';
import path from 'node:path';
export const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const route = process.argv[2] ?? '/sweep';
const b = await chromium.launch({ executablePath: exe, headless: true });
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await p.goto('https://lintroller.vercel.app' + route);
await p.waitForTimeout(800);
const info = await p.evaluate(() => ({
  h: [...document.querySelectorAll('h1,h2,h3')].map((e) => e.tagName + ':' + e.textContent.trim().slice(0, 80)),
  btn: [...document.querySelectorAll('button,a[role=button],label')].map((e) => e.tagName + ':' + (e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 60)),
  inp: [...document.querySelectorAll('input,textarea,select')].map((e) => [e.tagName, e.type, e.id, e.getAttribute('aria-label'), e.accept, e.multiple ? 'multi' : ''].join(':')),
  live: [...document.querySelectorAll('[aria-live],[role=status],[role=alert]')].map((e) => e.tagName + ':' + e.getAttribute('aria-live') + ':' + e.textContent.trim().slice(0, 80)),
}));
console.log(JSON.stringify(info, null, 1));
await b.close();
