import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from '../src/App';
import { STORAGE_KEY } from '../src/storage';

beforeEach(() => {
  window.localStorage.clear();
  window.history.pushState({}, '', '/sweep');
});
afterEach(() => cleanup());

async function reviewSample() {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Try the sample file' }));
  await screen.findByRole('heading', { name: 'What we read' });
  fireEvent.click(screen.getByRole('button', { name: 'Next: review' }));
  await screen.findByRole('heading', { name: 'Review what repeats' });
  fireEvent.click(screen.getByRole('link', { name: 'See your yearly summary' }));
  await screen.findByRole('heading', { name: 'Your yearly summary' });
}

describe('storage is opt-in and removable', () => {
  it('writes exactly one key after opt-in and none after Delete everything', async () => {
    await reviewSample();
    expect(window.localStorage.length).toBe(0);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Remember on this device' }));
    expect(window.localStorage.length).toBe(1);
    expect(window.localStorage.key(0)).toBe(STORAGE_KEY);
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Record<string, unknown>;
    expect(Object.keys(saved).sort()).toEqual(['findings', 'savedAt', 'statuses']);

    fireEvent.click(screen.getByRole('button', { name: 'Delete everything' }));
    expect(window.localStorage.length).toBe(0);
  });
});
