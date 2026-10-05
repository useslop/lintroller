import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from '../src/App';

const HOSTILE = '<img src=x onerror=alert(1)>';

beforeEach(() => {
  window.localStorage.clear();
  window.history.pushState({}, '', '/sweep');
});
afterEach(() => cleanup());

describe('evidence rendering', () => {
  it('shows a hostile descriptor as text, never as markup', async () => {
    const { container } = render(<App />);
    const rows = [
      'Date,Description,Amount',
      `2026-01-03,${HOSTILE},-9.99`,
      `2026-02-03,${HOSTILE},-9.99`,
      `2026-03-03,${HOSTILE},-9.99`,
    ].join('\n');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: rows } });
    fireEvent.click(screen.getByRole('button', { name: 'Use pasted rows' }));
    await screen.findByRole('heading', { name: 'What we read' });
    fireEvent.click(screen.getByRole('button', { name: 'Next: review' }));
    await screen.findByRole('heading', { name: 'Review what repeats' });

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(screen.getAllByText(HOSTILE).length).toBeGreaterThan(0);
  });
});
