/** True when something loaded at `loadedAt` (ms since the epoch) is at least `maxAgeMs` old. */
export const isOlderThan = (loadedAt: number, maxAgeMs: number, now: number = Date.now()): boolean =>
  now - loadedAt >= maxAgeMs;
