/**
 * Deterministic seeding utilities — convert an ISO date string to a stable integer
 * so all users get identical daily puzzles without a server.
 */

export function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Convert YYYY-MM-DD → stable integer (days since Unix epoch) */
export function dateToSeed(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d);
  return Math.floor(ms / 86_400_000);
}

/** Seeded pseudo-random number generator (mulberry32) */
export function createRng(seed: number) {
  let s = seed;
  return function (): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded shuffle — Fisher-Yates */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  const rng = createRng(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Pick item at index (seed % arr.length) */
export function seededPick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
