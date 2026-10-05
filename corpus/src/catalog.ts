// Merchant and distractor vocabulary for the generator. Every occurrence keeps one of `cores` verbatim
// (the labels test relies on this). Aliased cores must resolve to their alias id: test/catalog.test.ts checks
// that against the real engine and the real alias table.
import type { FindingKind, FixedCadence } from '@subsweep/engine';

export interface MerchantSpec {
  aliasId: string | null;      // null = unknown merchant (raw key)
  name: string;                // clean display name
  kind: FindingKind;           // label kind when recurring
  category: string;
  cores: string[];             // descriptor cores, uppercase
  prices: number[];            // base prices, cents
  cadences: FixedCadence[];    // cadences this merchant bills on
  bill?: boolean;              // amounts move ±12% month to month (utilities, telecom, insurance)
}

const MONTHLY: FixedCadence[] = ['monthly'];

export const SUBSCRIPTIONS: MerchantSpec[] = [
  { aliasId: 'netflix', name: 'Netflix', kind: 'subscription', category: 'Entertainment', cores: ['NETFLIX.COM', 'NETFLIX'], prices: [1549, 1799, 2299], cadences: MONTHLY },
  { aliasId: 'hulu', name: 'Hulu', kind: 'subscription', category: 'Entertainment', cores: ['HULU', 'HULU 866-9977-BOX'], prices: [799, 1199, 1799], cadences: MONTHLY },
  { aliasId: 'spotify', name: 'Spotify', kind: 'subscription', category: 'Music', cores: ['SPOTIFY USA', 'SPOTIFY'], prices: [999, 1099, 1199], cadences: MONTHLY },
  { aliasId: 'disney-plus', name: 'Disney+', kind: 'subscription', category: 'Entertainment', cores: ['DISNEY PLUS'], prices: [1399], cadences: MONTHLY },
  { aliasId: 'hbo-max', name: 'HBO Max', kind: 'subscription', category: 'Entertainment', cores: ['HBO MAX'], prices: [1599, 1699], cadences: MONTHLY },
  { aliasId: 'paramount-plus', name: 'Paramount+', kind: 'subscription', category: 'Entertainment', cores: ['PARAMOUNT PLUS'], prices: [799, 1299], cadences: MONTHLY },
  { aliasId: 'youtube-premium', name: 'YouTube Premium', kind: 'subscription', category: 'Entertainment', cores: ['YOUTUBE PREMIUM', 'GOOGLE *YOUTUBE PREMIUM'], prices: [1399], cadences: MONTHLY },
  { aliasId: 'dropbox', name: 'Dropbox', kind: 'subscription', category: 'Software', cores: ['DROPBOX', 'DROPBOX*2K4AB'], prices: [1199, 1999], cadences: MONTHLY },
  { aliasId: 'google-one', name: 'Google One', kind: 'subscription', category: 'Cloud', cores: ['GOOGLE *GOOGLE ONE'], prices: [199, 299, 2999], cadences: MONTHLY },
  { aliasId: 'nytimes', name: 'New York Times', kind: 'subscription', category: 'News', cores: ['NYTIMES*DIGITAL', 'NYTIMES'], prices: [1700, 2500], cadences: MONTHLY },
  { aliasId: 'peloton', name: 'Peloton', kind: 'subscription', category: 'Fitness', cores: ['PELOTON'], prices: [4400], cadences: MONTHLY },
  { aliasId: 'headspace', name: 'Headspace', kind: 'subscription', category: 'Wellness', cores: ['HEADSPACE'], prices: [1299], cadences: MONTHLY },
  { aliasId: 'adobe', name: 'Adobe', kind: 'subscription', category: 'Software', cores: ['ADOBE SYSTEMS', 'ADOBE *CC'], prices: [2299, 5499], cadences: MONTHLY },
  { aliasId: 'nordvpn', name: 'NordVPN', kind: 'subscription', category: 'Security', cores: ['NORDVPN', 'NORDVPN.COM'], prices: [1299], cadences: MONTHLY },
  { aliasId: 'strava', name: 'Strava', kind: 'subscription', category: 'Fitness', cores: ['STRAVA'], prices: [1199], cadences: MONTHLY },
  { aliasId: 'duolingo', name: 'Duolingo', kind: 'subscription', category: 'Education', cores: ['DUOLINGO'], prices: [699], cadences: MONTHLY },
  { aliasId: 'zoom', name: 'Zoom', kind: 'subscription', category: 'Software', cores: ['ZOOM.US', 'ZOOM VIDEO'], prices: [1499], cadences: MONTHLY },
  { aliasId: 'planet-fitness', name: 'Planet Fitness', kind: 'membership', category: 'Fitness', cores: ['PLANET FITNESS'], prices: [1000, 2499], cadences: MONTHLY },
  { aliasId: 'amazon-prime', name: 'Amazon Prime', kind: 'membership', category: 'Shopping', cores: ['AMAZON PRIME', 'AMZN PRIME'], prices: [1499], cadences: MONTHLY },
  { aliasId: 'uber-one', name: 'Uber One', kind: 'membership', category: 'Transportation', cores: ['UBER ONE', 'UBER *ONE'], prices: [999], cadences: MONTHLY },
  { aliasId: 'doordash-dashpass', name: 'DashPass', kind: 'membership', category: 'Food', cores: ['DASHPASS', 'DD *DASHPASS'], prices: [996], cadences: MONTHLY },
  { aliasId: 'classpass', name: 'ClassPass', kind: 'membership', category: 'Fitness', cores: ['CLASSPASS'], prices: [7900], cadences: MONTHLY },
  { aliasId: 'walmart-plus', name: 'Walmart+', kind: 'membership', category: 'Shopping', cores: ['WALMART PLUS', 'WALMART+'], prices: [1294], cadences: MONTHLY },
  { aliasId: 'costco', name: 'Costco', kind: 'membership', category: 'Shopping', cores: ['COSTCO WHSE', 'COSTCO MEMBERSHIP'], prices: [6500], cadences: ['yearly'] },
  { aliasId: 'att', name: 'AT&T', kind: 'bill', category: 'Telecom', cores: ['AT&T', 'ATT*BILL'], prices: [8412], cadences: MONTHLY, bill: true },
  { aliasId: 'verizon', name: 'Verizon', kind: 'bill', category: 'Telecom', cores: ['VERIZON WIRELESS', 'VERIZON'], prices: [6500, 8900], cadences: MONTHLY, bill: true },
  { aliasId: 'utility-water', name: 'Water utility', kind: 'bill', category: 'Utilities', cores: ['CITY WATER UTIL'], prices: [4800], cadences: ['monthly', 'bimonthly'], bill: true },
  { aliasId: 'utility-electric', name: 'Electric utility', kind: 'bill', category: 'Utilities', cores: ['CITY ELECTRIC CO', 'ELECTRIC CO AUTOPAY'], prices: [9500], cadences: MONTHLY, bill: true },
  { aliasId: 'insurance-auto', name: 'Auto insurance', kind: 'bill', category: 'Insurance', cores: ['STATE FARM INS', 'AUTO INSURANCE'], prices: [12000], cadences: MONTHLY, bill: true },
];

/** Unknown merchants: no alias, so the engine keys them 'raw:' + two tokens. Usable on any cadence. */
export const RAW_MERCHANTS: MerchantSpec[] = [
  'SUNRISE CLEANERS', 'GREEN LEAF LAWN CARE', 'PEAK PET BOX', 'NORTHSIDE PARKING PASS', 'MAPLE DAYCARE',
  'ROOFTOP STORAGE UNIT', 'FRESH FARM BOX CO', 'BOOKCLUB PLUS', 'CITY BIKE SHARE PASS', 'TRIVIA NIGHT LEAGUE',
  'PIXEL PRINT CLUB', 'HARBOR SWIM SCHOOL',
].map((core) => ({
  aliasId: null,
  name: core.split(' ').map((w) => w[0]! + w.slice(1).toLowerCase()).join(' '),
  kind: 'unknown' as const,
  category: 'Other',
  cores: [core],
  prices: [],
  cadences: ['weekly', 'biweekly', 'semimonthly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'yearly'] as FixedCadence[],
}));

/** A person paid on a cadence (Venmo or Cash App rent split). Only written to wallet formats. */
export const PERSON: MerchantSpec = {
  aliasId: null, name: 'Jane Roommate', kind: 'person', category: 'Rent', cores: ['JANE ROOMMATE'], prices: [145000], cadences: MONTHLY,
};

/** Apple bills every app and music plan behind one descriptor: each price point is its own series. */
export const APPLE_PLANS: { name: string; price: number }[] = [
  { name: 'iCloud+', price: 299 },
  { name: 'Apple Music', price: 1099 },
];

/** Distractor vocabulary. Variable-amount merchants keep the family's name (see SPEC §5.2 step 8). */
export interface DistractorVocab {
  family: string;
  category: string;
  cores: string[];
  range: [number, number];          // cents, uniform
  amounts?: number[];               // fixed choices instead of a range
}

export const VOCAB: Record<string, DistractorVocab> = {
  gas: { family: 'gas', category: 'Gas', cores: ['SHELL OIL 57444', 'CHEVRON 00123456', 'EXXONMOBIL 4421', 'SPEEDWAY 0412'], range: [2500, 7500] },
  groceries: { family: 'groceries', category: 'Groceries', cores: ['KROGER #123', 'SAFEWAY 0456', "TRADER JOE'S #456", 'ALDI 1234'], range: [1200, 18000] },
  coffee: { family: 'coffee', category: 'Coffee', cores: ['STARBUCKS STORE 12345', 'DUNKIN #1234', 'PEETS COFFEE 1234'], range: [350, 1200] },
  restaurant: { family: 'restaurant', category: 'Restaurants', cores: ['CHIPOTLE 1234', 'SWEETGREEN 0456', 'LOCAL TACO BAR'], range: [900, 6500] },
  rideshare: { family: 'rideshare', category: 'Transportation', cores: ['UBER *TRIP HELP.UBER.COM', 'LYFT *RIDE 12345'], range: [700, 4500] },
  'amazon-retail': { family: 'amazon-retail', category: 'Shopping', cores: ['AMZN MKTP US*2K4AB', 'AMAZON.COM*1A2B3'], range: [499, 12000] },
  atm: { family: 'atm', category: 'Cash', cores: ['ATM WITHDRAWAL 1234 MAIN ST'], range: [0, 0], amounts: [4000, 6000, 10000] },
  refund: { family: 'refund', category: 'Shopping', cores: ['AMZN REFUND 2K4AB', 'RETURN CREDIT SUNRISE HARDWARE'], range: [500, 5000] },
  payroll: { family: 'payroll', category: 'Income', cores: ['ACME PAYROLL DIR DEP'], range: [185000, 185000] },
  transfer: { family: 'transfer', category: 'Transfers', cores: ['ONLINE TRANSFER TO SAV XXXX1234', 'ZELLE PAYMENT TO JANE SMITH'], range: [25000, 145000] },
  'card-payment': { family: 'card-payment', category: 'Payment', cores: ['PAYMENT THANK YOU', 'AUTOPAY PYMT CARD SVCS'], range: [40000, 90000] },
};

export const ONE_OFF_NAMES = [
  'LAKESIDE HARDWARE 4412', 'PIZZA BARN 77', 'BOOK NOOK 12', 'CITY DENTAL GROUP', 'RIVERBEND VET CLINIC',
  'GREEN CAR WASH', 'PARK SHOE REPAIR', 'MOUNTAIN OUTFITTERS', 'FIRST STREET PHARMACY', 'OAK TREE FLORIST',
];

export const CITY_TAILS = ['SAN JOSE CA', 'LOS GATOS CA', 'NEW YORK NY', 'AUSTIN TX', 'DENVER CO', 'PORTLAND OR'];
