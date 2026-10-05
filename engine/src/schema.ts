// Data file schemas. CONTRACT.md §4, pasted verbatim (zod 3).

import { z } from 'zod';
import { CATEGORIES, FORMAT_IDS, CADENCES } from './types';
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const httpsUrl = z.string().url().refine((u) => u.startsWith('https://'), 'https only');
const id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const platform = z.enum(['apple', 'google-play', 'amazon', 'paypal', 'roku']);

export const AliasEntrySchema = z.object({
  id, name: z.string().min(1).max(60), category: z.enum(CATEGORIES),
  kind: z.enum(['subscription', 'membership', 'bill', 'platform', 'variable-merchant']),
  patterns: z.array(z.string().min(2)).min(1),
  platform: platform.optional(),
  source: z.object({ url: httpsUrl, fetched: isoDate }).nullable(),
  verified: z.boolean(),
}).strict().refine((a) => a.verified === (a.source !== null), 'verified iff source');

const linkCheck = z.object({
  status: z.number().int(), finalUrl: z.string().url(), checkedAt: z.string().datetime({ offset: true }),
  ok: z.boolean(), note: z.string().optional(),
}).strict();

export const CancelEntrySchema = z.object({
  id, name: z.string().min(1).max(60), category: z.enum(CATEGORIES),
  domains: z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)).min(1),
  manageUrl: httpsUrl.nullable(), helpUrl: httpsUrl.nullable(), stepsStated: z.boolean(),
  via: z.array(platform).optional(), notes: z.array(z.string().max(200)),
  check: z.object({ manage: linkCheck.optional(), help: linkCheck.optional() }).strict(),
  verified: isoDate.nullable(),
}).strict()
  .refine((e) => e.manageUrl !== null || e.helpUrl !== null, 'needs a URL')
  .refine((e) => [e.manageUrl, e.helpUrl].every((u) => u === null ||
      e.domains.some((d) => { const h = new URL(u).hostname; return h === d || h.endsWith('.' + d); })),
    'every URL must be on an entry domain')
  .refine((e) => e.verified === null || Boolean(e.check.manage?.ok || e.check.help?.ok), 'verified needs an ok check')
  .refine((e) => !e.stepsStated || e.helpUrl !== null, 'stepsStated needs helpUrl');

export const FormatHelpSchema = z.object({
  format: z.enum(FORMAT_IDS), institution: z.string(), product: z.string(),
  steps: z.array(z.string().max(160)).max(5), helpUrl: httpsUrl.nullable(), verified: isoDate.nullable(),
}).strict();

export const CaseLabelsSchema = z.object({
  caseId: z.string(), format: z.enum(FORMAT_IDS), seed: z.number().int(), from: isoDate, to: isoDate,
  recurring: z.array(z.object({
    merchantKey: z.string(), aliasId: z.string().nullable(), display: z.string(),
    cadence: z.enum(CADENCES),
    kind: z.enum(['subscription', 'membership', 'bill', 'fee', 'person', 'unknown']),
    nominalCents: z.number().int().positive(), lines: z.array(z.number().int().positive()).min(1),
    traps: z.array(z.string()), mustFind: z.boolean(),
  }).strict()),
  distractors: z.array(z.object({ merchant: z.string(), family: z.string(),
    lines: z.array(z.number().int().positive()) }).strict()),
}).strict();
