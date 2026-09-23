/**
 * Seeded randomness.
 *
 * Anything "random" in this demo has to be reproducible: the same listing must
 * get the same house drawing and the same price history on every render, in
 * every browser, on every visit — otherwise the illustration flickers between
 * re-renders and the price chart tells a different story each time you open it.
 * So nothing here calls `Math.random()` or reads the clock; everything derives
 * from a string seed (in practice, `listing.id`).
 */

/** FNV-1a — small, fast, and stable across runs (unlike hashing by iteration). */
export function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — 32-bit PRNG, seeded once per listing. */
export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
