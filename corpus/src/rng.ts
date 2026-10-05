// Seeded PRNG (mulberry32). Nothing in corpus/ may call Math.random: the same seed must give
// byte-identical CSV and labels on every machine.

export interface Rng {
  readonly seed: number;
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [lo, hi], both inclusive. */
  int(lo: number, hi: number): number;
  pick<T>(items: readonly T[]): T;
  chance(p: number): boolean;
  /** Shuffled copy; the input is not changed. */
  shuffle<T>(items: readonly T[]): T[];
  /** Independent stream that depends only on this seed and the label. */
  fork(label: string): Rng;
}

/** FNV-1a, 32-bit. Used to derive child seeds from labels. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    seed,
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (items) => items[Math.floor(next() * items.length)]!,
    chance: (p) => next() < p,
    shuffle: (items) => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    fork: (label) => createRng(hashString(`${seed}:${label}`)),
  };
}
