import { describe, expect, it } from 'vitest';
import { buildAliasIndex, classifyRow, cleanDescriptor, normalizeMerchant, type Txn } from '../src/index';
import { INDEX } from './helpers';

// RESEARCH §3 before → after examples plus more synthetic descriptors (all invented)
const CASES: [string, string, string | null][] = [
  ['SQ *BLUE BOTTLE 1234 OAKLAND CA', 'blue bottle', 'square'],
  ['PAYPAL *SPOTIFYUSA', 'spotifyusa', 'paypal'],
  ['APPLE.COM/BILL 866-712-7753 CA', 'apple', 'apple'],
  ["TST* JOE'S DINER", 'joes diner', 'toast'],
  ['NETFLIX.COM', 'netflix', null],
  ['AMZN Mktp US*A1B2C3D4E', 'amazon marketplace', 'amazon'],
  ['DD *DOORDASH SAN FRANCISCO', 'doordash san francisco', 'doordash'],
  ['UBER *EATS HELP.UBER.COM', 'uber eats', 'uber'],
  ['GOOGLE *YOUTUBE PREMIUM', 'youtube premium', 'google'],
  ['CHECKCARD 0912 WAL-MART #1234 BENTONVILLE AR', 'wal mart', null],
  ['PURCHASE AUTHORIZED ON 09/12 CASH APP*JDOE 8004337747 CA', 'cash app jdoe', 'cashapp'],
  ['RECURRING PAYMENT AUTHORIZED ON 09/01 PANDORA MEDIA 8773526479', 'pandora media', null],
  ['POS DEBIT VENMO WEB PMT 1234567890', 'venmo web pmt', 'venmo'],
  ['PP*FS*ADOBE SYSTEMS', 'adobe systems', 'paypal'],
  ['ACH DEBIT NETFLIX.COM DES:Subscr ID:XXXXXXXXXX WEB', 'netflix', null],
  ['NETFLIX.COM 800-585-4219 CA', 'netflix', null],
  ['HULU 866-9977-BOX', 'hulu', null],
  ['SPOTIFY USA', 'spotify', null],
  ['SPOTIFY USA 8777781234 NY', 'spotify', null],
  ['DISNEY PLUS', 'disney plus', null],
  ['APPLE TV+', 'apple tv+', null],
  ['GOOGLE *Google One', 'google one', 'google'],
  ['GOOGLE *TINDER', 'tinder', 'google'],
  ['PADDLE.NET* NOTEAPP', 'noteapp', 'paddle'],
  ['FS *SOFTCO', 'softco', 'fastspring'],
  ['SP AFTERGLOW CANDLES', 'afterglow candles', 'shopify'],
  ['UBER *ONE', 'uber one', 'uber'],
  ['UBER *TRIP HELP.UBER.COM', 'uber trip', 'uber'],
  ['LYFT *1 RIDE 09-14', 'lyft ride', 'lyft'],
  ['DOORDASH*BURGERS', 'doordash burgers', 'doordash'],
  ['ONLINE TRANSFER TO SAV XXXX1234', 'online transfer to sav', null],
  ['PENDING - NETFLIX.COM', 'netflix', null],
  ['POS PURCHASE PLANET GYM #0042 DENVER CO', 'planet gym', null],
  ['SHELL OIL 57444 HOUSTON TX', 'shell oil', null],
  ['AMAZON PRIME*1A2B3 AMZN.COM/BILL WA', 'amazon prime', null],
  ['ＮＥＴＦＬＩＸ．ＣＯＭ', 'netflix', null],
  ['DEBIT CARD PURCHASE XXXXX1234 SPOTIFY USA', 'spotify', null],
  ['MONTHLY MAINTENANCE FEE', 'monthly maintenance fee', null],
  ['ZELLE TO J SMITH', 'zelle to j smith', 'zelle'],
  ['24 HOUR FITNESS #123 IRVINE CA', '24 hour fitness', null],
];

describe('cleanDescriptor (SPEC §7)', () => {
  for (const [raw, cleaned, processor] of CASES) {
    it(raw, () => {
      expect(cleanDescriptor(raw)).toEqual({ cleaned, processor });
    });
  }
  it('has at least 30 cases', () => expect(CASES.length).toBeGreaterThanOrEqual(30));
});

describe('normalizeMerchant', () => {
  it('alias order is priority: uber one before uber', () => {
    expect(normalizeMerchant('UBER *ONE', INDEX).key).toBe('uber-one');
    expect(normalizeMerchant('UBER *TRIP HELP.UBER.COM', INDEX).key).toBe('uber');
  });
  it('APPLE.COM/BILL is billed through Apple', () => {
    const m = normalizeMerchant('APPLE.COM/BILL', INDEX);
    expect(m).toMatchObject({ key: 'apple', billedThrough: 'apple', processor: 'apple', kind: 'platform' });
  });
  it('Google Play billing, except Google-owned services', () => {
    expect(normalizeMerchant('GOOGLE *TINDER', INDEX).billedThrough).toBe('google-play');
    expect(normalizeMerchant('GOOGLE *YOUTUBE PREMIUM', INDEX)).toMatchObject({ key: 'youtube-premium', billedThrough: null });
  });
  it('no alias: raw key from the first two significant tokens, Title Case display', () => {
    const m = normalizeMerchant('SQ *BLUE BOTTLE 1234 OAKLAND CA', INDEX);
    expect(m).toMatchObject({ key: 'raw:blue bottle', aliasId: null, display: 'Blue Bottle' });
  });
  it('buildAliasIndex throws on an invalid RegExp', () => {
    expect(() => buildAliasIndex([{ id: 'x', name: 'X', category: 'other', kind: 'subscription', patterns: ['(['], source: null, verified: false }])).toThrow();
  });
});

describe('classifyRow', () => {
  const t = (description: string, amountCents: number, type?: string): Txn =>
    ({ id: '0:1', source: 0, line: 1, date: '2026-09-01', description, amountCents, currency: 'USD', ...(type ? { type } : {}) });
  const c = (d: string, cents: number, kind: 'bank' | 'card' | 'wallet' | 'unknown' = 'bank', type?: string) =>
    classifyRow(t(d, cents, type), normalizeMerchant(d, INDEX), kind);
  it('families', () => {
    expect(c('PAYMENT THANK YOU', 50000, 'card')).toBe('card-payment');
    expect(c('CHASE CREDIT CRD AUTOPAY', -50000)).toBe('card-payment');
    expect(c('ONLINE TRANSFER TO SAV XXXX1234', -20000)).toBe('transfer');
    expect(c('ZELLE TO J SMITH', -120000)).toBe('transfer');
    expect(c('ACME CORP PAYROLL DIR DEP', 250000)).toBe('income');
    expect(c('ATM WITHDRAWAL 1234 MAIN ST', -6000)).toBe('atm');
    expect(c('MONTHLY MAINTENANCE FEE', -1200)).toBe('fee');
    expect(c('INTEREST CHARGE ON PURCHASES', -2345, 'card')).toBe('interest');
    expect(c('NETFLIX.COM REFUND', 1549, 'card')).toBe('refund');
    expect(c('NETFLIX.COM', -1549)).toBe('purchase');
    expect(c('Jane Roommate', -775, 'wallet', 'Payment')).toBe('purchase');
    expect(c('Standard Transfer', -5000, 'wallet', 'Standard Transfer')).toBe('transfer');
  });
});
