type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

export function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const item = store.get(key);

  if (!item || now > item.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  if (item.count >= max) {
    return { allowed: false, remaining: 0 };
  }

  item.count += 1;
  store.set(key, item);
  return { allowed: true, remaining: max - item.count };
}
