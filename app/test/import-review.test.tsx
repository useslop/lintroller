import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from '../src/App';

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

const pressed = (button: HTMLElement) => button.getAttribute('aria-pressed');

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

describe('import, review, summary on the sample file', () => {
  it('confirms, dismisses and undoes, and the summary follows', async () => {
    renderAt('/sweep');
    fireEvent.click(screen.getByRole('button', { name: 'Try the sample file' }));
    await screen.findByRole('heading', { name: 'What we read' });
    fireEvent.click(screen.getByRole('button', { name: 'Next: review' }));
    await screen.findByRole('heading', { name: 'Review what repeats' });

    const cards = screen.getAllByRole('article');
    expect(cards.length).toBeGreaterThanOrEqual(2);
    const [first, second] = cards as [HTMLElement, HTMLElement];
    const yearlyText = within(first).getByText(/a year|total of the last 12 months/).textContent ?? '';
    const firstName = within(first).getByRole('heading', { level: 3 }).textContent ?? '';

    fireEvent.click(within(first).getByRole('button', { name: 'Yes, it repeats' }));
    expect(pressed(within(first).getByRole('button', { name: 'Yes, it repeats' }))).toBe('true');
    fireEvent.click(within(first).getByRole('button', { name: 'Undo' }));
    expect(pressed(within(first).getByRole('button', { name: 'Yes, it repeats' }))).toBe('false');

    fireEvent.click(within(first).getByRole('button', { name: 'Yes, it repeats' }));
    fireEvent.click(within(second).getByRole('button', { name: 'Not a repeating charge' }));
    expect(pressed(within(second).getByRole('button', { name: 'Not a repeating charge' }))).toBe('true');

    fireEvent.click(screen.getByRole('link', { name: 'See your yearly summary' }));
    await screen.findByRole('heading', { name: 'Your yearly summary' });
    const headline = screen.getByText(/^Confirmed: /).textContent ?? '';
    expect(headline).toContain(yearlyText.replace(/^about /, '').replace(' a year', '').trim());
    const chargeNames = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(chargeNames).toContain(firstName);
    expect(chargeNames).not.toContain(second.querySelector('h3')?.textContent);
  });
});
