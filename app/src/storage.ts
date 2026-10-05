// The only storage the app writes (CONTRACT §7): one key, findings and statuses, opt-in only.
import type { Finding, StatusMap } from './engine';

export const STORAGE_KEY = 'subsweep:v1';

export interface SavedReview { savedAt: string; statuses: StatusMap; findings: Finding[] }

function device(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSaved(store: Storage | null = device()): SavedReview | null {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SavedReview> | null;
    if (!value || !Array.isArray(value.findings) || typeof value.statuses !== 'object' || value.statuses === null) return null;
    return { savedAt: String(value.savedAt ?? ''), statuses: value.statuses, findings: value.findings };
  } catch {
    return null;
  }
}

export function writeSaved(review: SavedReview, store: Storage | null = device()): void {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(review));
  } catch {
    // Storage full or blocked: the review simply is not remembered.
  }
}

export function forgetSaved(store: Storage | null = device()): void {
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to remove when storage is blocked.
  }
}
