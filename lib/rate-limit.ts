/** Creates an in-memory rate limiter that returns true when the limit is exceeded. */
export function createRateLimiter(
  maxRequests: number,
  windowMs: number,
): (userId: string) => boolean {
  const timestamps = new Map<string, number[]>();
  return (userId) => {
    const now = Date.now();
    const recent = (timestamps.get(userId) ?? []).filter(
      (t) => now - t < windowMs,
    );
    if (recent.length >= maxRequests) {
      timestamps.set(userId, recent);
      return true;
    }
    recent.push(now);
    timestamps.set(userId, recent);
    return false;
  };
}
