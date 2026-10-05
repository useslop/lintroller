/** SPEC §4 never-say list. Matching is case-insensitive, whole words and whole phrases. */
export const NEVER_SAY: readonly string[] = [
  'every', 'overnight', 'in minutes', 'no humans', 'fully autonomous', 'guarantee', 'guaranteed',
  'AI-powered', 'insane', 'revolutionary', '10x', 'magic', 'link in bio', 'we found all',
  'all your subscriptions', 'save $', "you'll save", 'you could save', 'cancel for you', 'subscription found',
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const COMPILED = NEVER_SAY.map((term) => {
  const body = term.split(/[\s-]+/).map((w) => esc(w).replace(/'/g, "['’]")).join('[\\s-]+');
  const pre = /^\w/.test(term) ? '\\b' : '';
  const post = /\w$/.test(term) ? '\\b' : '';
  return { term, re: new RegExp(`${pre}${body}${post}`, 'gi') };
});

export function lintCopy(text: string): { term: string; index: number }[] {
  const hits: { term: string; index: number }[] = [];
  for (const { term, re } of COMPILED) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      hits.push({ term, index: m.index });
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return hits.sort((a, b) => a.index - b.index || a.term.localeCompare(b.term));
}
