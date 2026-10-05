// @subsweep/data: the bundled cancel directory, merchant aliases and export help (CONTRACT §5).
// The app imports these statically. There is no runtime fetch and no /data/ route (SPEC §10).
import type { AliasEntry, CancelEntry, FormatHelp } from '@subsweep/engine';
import aliasJson from './aliases.json';
import cancelJson from './cancel.json';
import formatsJson from './formats-help.json';
import metaJson from './meta.json';

export const aliases = aliasJson as AliasEntry[];
export const cancelDirectory = cancelJson as CancelEntry[];
export const formatsHelp = formatsJson as FormatHelp[];

export const dataMeta = {
  generated: metaJson.generated,
  aliasCount: aliases.length,
  cancelCount: cancelDirectory.length,
  verifiedCount: cancelDirectory.filter((e) => e.verified !== null).length,
  linkCheckRanAt: metaJson.linkCheckRanAt as string | null,
};
