// Deterministic pseudo-random numbers so demo data stays stable for an hour.
export function seeded(label) {
  let h = 2166136261 ^ Math.floor(Date.now() / 3600e3);
  for (const c of label) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}
