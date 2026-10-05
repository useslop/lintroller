// TEMPORARY stand-in for @subsweep/data (B3). Two entries, enough for the UI. Delete with dev-fixtures/engine.ts.
import type { AliasEntry, CancelEntry, FormatHelp } from '@subsweep/engine';

export const aliases: AliasEntry[] = [
  { id: 'netflix', name: 'Netflix', category: 'video', kind: 'subscription', patterns: ['netflix'], source: null, verified: false },
  { id: 'spotify', name: 'Spotify', category: 'music', kind: 'subscription', patterns: ['spotify'], source: null, verified: false },
];
export const cancelDirectory: CancelEntry[] = [
  {
    id: 'netflix', name: 'Netflix', category: 'video', domains: ['netflix.com'],
    manageUrl: 'https://www.netflix.com/account', helpUrl: null, stepsStated: false, notes: [],
    check: {}, verified: '2026-10-04',
  },
];
export const formatsHelp: FormatHelp[] = [
  { format: 'chase-card', institution: 'Chase', product: 'Credit card', steps: ['Sign in and open the account.', 'Choose Download activity and pick CSV.'], helpUrl: null, verified: null },
];
export const dataMeta: { generated: string; aliasCount: number; cancelCount: number; verifiedCount: number; linkCheckRanAt: string | null } = {
  generated: '2026-10-04', aliasCount: aliases.length, cancelCount: cancelDirectory.length, verifiedCount: 1, linkCheckRanAt: null,
};
