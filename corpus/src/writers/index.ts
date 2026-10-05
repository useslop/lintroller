import type { FormatId } from '@subsweep/engine';
import type { Writer } from './common';
import { writeAmex } from './amex';
import { writeAppleCard } from './apple-card';
import { writeBoaCard } from './boa-card';
import { writeBoaChecking } from './boa-checking';
import { writeCapitalOneCard } from './capitalone-card';
import { writeChaseCard } from './chase-card';
import { writeChaseChecking } from './chase-checking';
import { writeCashApp } from './cashapp';
import { writeCitiCard } from './citi-card';
import { writeDiscover } from './discover';
import { writeGeneric } from './generic';
import { writeMint } from './mint';
import { writeMonarch } from './monarch';
import { writePayPal } from './paypal';
import { writeUsBank } from './usbank';
import { writeVenmo } from './venmo';
import { writeWellsFargo } from './wells-fargo';
import { writeYnab } from './ynab';

/** One writer per FormatId (generic has its own odd-column writer). */
export const WRITERS: Record<FormatId, Writer> = {
  'boa-checking': writeBoaChecking,
  'boa-card': writeBoaCard,
  'chase-checking': writeChaseChecking,
  'chase-card': writeChaseCard,
  'wells-fargo': writeWellsFargo,
  'citi-card': writeCitiCard,
  'capitalone-card': writeCapitalOneCard,
  amex: writeAmex,
  discover: writeDiscover,
  usbank: writeUsBank,
  'apple-card': writeAppleCard,
  paypal: writePayPal,
  venmo: writeVenmo,
  cashapp: writeCashApp,
  ynab: writeYnab,
  monarch: writeMonarch,
  mint: writeMint,
  generic: writeGeneric,
};
