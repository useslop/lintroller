/** SPEC §4 never-say list. Matching is case-insensitive, whole words and whole phrases. */
export const NEVER_SAY: readonly string[] = [
  'every', 'overnight', 'in minutes', 'no humans', 'fully autonomous', 'guarantee', 'guaranteed',
  'AI-powered', 'insane', 'revolutionary', '10x', 'magic', 'link in bio', 'we found all',
  'all your subscriptions', 'save $', "you'll save", 'you could save', 'cancel for you', 'subscription found',
];

export function lintCopy(_text: string): { term: string; index: number }[] {
  throw new Error('not yet');
}
