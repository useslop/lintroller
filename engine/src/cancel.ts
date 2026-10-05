// Cancel lookup: platform route first when billedThrough is set, then the merchant's own page.
// Entries with verified: null are never returned; 'stale' when the last ok check is > 90 days old.
import type { CancelEntry, CancelLink, Finding, LinkCheck, PlatformId } from './types';
import { dayNum, etDate } from './values';

const PLATFORM_ENTRY: Record<PlatformId, string[]> = {
  apple: ['apple'], 'google-play': ['google-play'], amazon: ['amazon-channels', 'amazon'], paypal: ['paypal'], roku: ['roku'],
};
const STALE_DAYS = 90;

function toLink(e: CancelEntry, route: CancelLink['route'], today: string): CancelLink | null {
  if (e.verified === null) return null;
  const useHelp = e.stepsStated && e.helpUrl !== null;
  const url = useHelp ? e.helpUrl : e.manageUrl ?? e.helpUrl;
  if (!url) return null;
  const okChecks = [e.check.manage, e.check.help].filter((c): c is LinkCheck => Boolean(c?.ok));
  // the ET calendar date of the check: a check at 21:30 ET on Oct 4 is '2026-10-05T01:30Z' in UTC
  const lastOk = okChecks.map((c) => etDate(c.checkedAt)).sort().pop() ?? e.verified;
  return {
    entryId: e.id, name: e.name, url, kind: useHelp || url === e.helpUrl ? 'help' : 'manage',
    badge: dayNum(today) - dayNum(lastOk) > STALE_DAYS ? 'stale' : 'verified',
    checkedOn: lastOk, route, notes: [...e.notes],
  };
}

export function lookupCancel(m: Pick<Finding, 'aliasId' | 'billedThrough'>, dir: CancelEntry[], today: string): CancelLink[] {
  const byId = new Map(dir.map((e) => [e.id, e]));
  const out: CancelLink[] = [];
  if (m.billedThrough) {
    for (const id of PLATFORM_ENTRY[m.billedThrough]) {
      const e = byId.get(id);
      const link = e ? toLink(e, m.billedThrough, today) : null;
      if (link) { out.push(link); break; }
    }
  }
  if (m.aliasId && !out.some((l) => l.entryId === m.aliasId)) {
    const e = byId.get(m.aliasId);
    const link = e ? toLink(e, 'merchant', today) : null;
    if (link) out.push(link);
  }
  return out.slice(0, 2);
}
