import { describe, expect, it } from 'vitest';
import {
  AliasEntrySchema, CancelEntrySchema, FormatHelpSchema, FORMAT_IDS,
  buildAliasIndex, lintCopy, normalizeMerchant,
} from '@subsweep/engine';
import { aliases, cancelDirectory, formatsHelp, dataMeta } from '../index';

// SPEC §8 denylist: third-party "how to cancel" and aggregator hosts
const DENYLIST = ['justcancel', 'donotpay', 'rocketmoney', 'truebill', 'wikihow', 'reddit', 'quora', 'cancelsubscription', 'howtocancel'];

const urlsOf = (e: { manageUrl: string | null; helpUrl: string | null }) =>
  [e.manageUrl, e.helpUrl].filter((u): u is string => u !== null);

describe('schemas (engine CONTRACT §4)', () => {
  it('every alias passes AliasEntrySchema', () => {
    for (const a of aliases) expect(AliasEntrySchema.safeParse(a).success, a.id).toBe(true);
  });
  it('every cancel entry passes CancelEntrySchema', () => {
    for (const e of cancelDirectory) expect(CancelEntrySchema.safeParse(e).success, e.id).toBe(true);
  });
  it('every format help passes FormatHelpSchema', () => {
    for (const f of formatsHelp) expect(FormatHelpSchema.safeParse(f).success, f.format).toBe(true);
  });
});

describe('data rules (CONTRACT §4)', () => {
  it('ids are unique within each file', () => {
    expect(new Set(aliases.map((a) => a.id)).size).toBe(aliases.length);
    expect(new Set(cancelDirectory.map((e) => e.id)).size).toBe(cancelDirectory.length);
    expect(new Set(formatsHelp.map((f) => f.format)).size).toBe(formatsHelp.length);
  });

  it('every URL is https and on its entry domains', () => {
    for (const e of cancelDirectory) {
      for (const u of urlsOf(e)) {
        const url = new URL(u);
        expect(url.protocol, `${e.id} ${u}`).toBe('https:');
        const onEntry = e.domains.some((d) => url.hostname === d || url.hostname.endsWith('.' + d));
        expect(onEntry, `${e.id} ${u}`).toBe(true);
      }
    }
    for (const f of formatsHelp) {
      if (f.helpUrl) expect(new URL(f.helpUrl).protocol, f.format).toBe('https:');
    }
  });

  it('no URL is on a denylisted host', () => {
    const hosts = [
      ...cancelDirectory.flatMap(urlsOf),
      ...formatsHelp.flatMap((f) => (f.helpUrl ? [f.helpUrl] : [])),
    ].map((u) => new URL(u).hostname);
    for (const h of hosts) for (const term of DENYLIST) expect(h.includes(term), h).toBe(false);
  });

  it('a verified cancel entry links only a URL whose own check passed', () => {
    for (const e of cancelDirectory) {
      if (e.verified === null) continue;
      const linked = e.stepsStated ? e.check.help : e.check.manage;
      expect(linked?.ok, e.id).toBe(true);
    }
  });

  it('cancel and alias categories agree for shared ids', () => {
    const byId = new Map(aliases.map((a) => [a.id, a]));
    for (const e of cancelDirectory) {
      const a = byId.get(e.id);
      if (a) expect(a.category, e.id).toBe(e.category);
    }
  });

  it('every FormatId except generic has a format help entry', () => {
    const have = new Set(formatsHelp.map((f) => f.format));
    for (const id of FORMAT_IDS) if (id !== 'generic') expect(have.has(id), id).toBe(true);
  });

  it('every alias pattern compiles', () => {
    for (const a of aliases) for (const p of a.patterns) expect(() => new RegExp(p, 'i'), `${a.id} ${p}`).not.toThrow();
    expect(() => buildAliasIndex(aliases)).not.toThrow();
  });
});

describe('volume targets', () => {
  it('at least 60 aliases', () => {
    expect(aliases.length).toBeGreaterThanOrEqual(60);
  });
  it('at least 60 verified cancel entries', () => {
    expect(cancelDirectory.filter((e) => e.verified !== null).length).toBeGreaterThanOrEqual(60);
  });
  it('dataMeta counts match the arrays', () => {
    expect(dataMeta.aliasCount).toBe(aliases.length);
    expect(dataMeta.cancelCount).toBe(cancelDirectory.length);
    expect(dataMeta.verifiedCount).toBe(cancelDirectory.filter((e) => e.verified !== null).length);
    expect(dataMeta.linkCheckRanAt).not.toBeNull();
  });
});

describe('copy (SPEC §4)', () => {
  it('no never-say term in any cancel note or format step', () => {
    const copy = [
      ...cancelDirectory.flatMap((e) => e.notes),
      ...formatsHelp.flatMap((f) => f.steps),
    ];
    for (const s of copy) expect(lintCopy(s), s).toEqual([]);
  });
});

describe('merchant normalisation smoke (RESEARCH §3 synthetic examples with an expected alias)', () => {
  // RESEARCH §3 holds 15 synthetic examples, not 40; these are the 7 whose expected alias exists in the table.
  const index = buildAliasIndex(aliases);
  const cases: [string, string][] = [
    ['PAYPAL *SPOTIFYUSA', 'spotify'],
    ['NETFLIX.COM', 'netflix'],
    ['GOOGLE *YOUTUBE PREMIUM', 'youtube-premium'],
    ['RECURRING PAYMENT AUTHORIZED ON 09/01 PANDORA MEDIA 8773526479', 'pandora'],
    ['PP*FS*ADOBE SYSTEMS', 'adobe'],
    ['ACH DEBIT NETFLIX.COM DES:Subscr ID:XXXXXXXXXX WEB', 'netflix'],
  ];
  for (const [desc, id] of cases) {
    it(`${desc} -> ${id}`, () => {
      expect(normalizeMerchant(desc, index).aliasId).toBe(id);
    });
  }
  it('APPLE.COM/BILL routes to the Apple platform, not a guessed product', () => {
    expect(normalizeMerchant('APPLE.COM/BILL 866-712-7753 CA', index).billedThrough).toBe('apple');
  });
});
