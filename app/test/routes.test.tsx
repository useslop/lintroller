import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from '../src/App';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('routes', () => {
  it.each([
    ['/', 'Find the charges that keep coming back.'],
    ['/how-to-export', 'How to download a CSV'],
    ['/privacy', 'Privacy: what runs where'],
    ['/about', 'About Lintroller'],
  ])('%s renders its page', (path, heading) => {
    window.history.pushState({}, '', path);
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeTruthy();
  });

  it.each(['/sweep/review', '/sweep/summary'])('%s without data goes back to import with a note', async (path) => {
    window.history.pushState({}, '', path);
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Import your file' })).toBeTruthy();
    expect(window.location.pathname).toBe('/sweep');
    expect(screen.getByRole('status').textContent).toContain('Import a file first');
  });

  it('shows a not-found page for unknown paths', () => {
    window.history.pushState({}, '', '/nope');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: "This page doesn't exist." })).toBeTruthy();
  });
});
