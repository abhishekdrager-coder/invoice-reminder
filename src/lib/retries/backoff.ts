function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withBackoff<T>(fn: () => Promise<T>, retries = 3, baseDelayMs = 300) {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      const delay = baseDelayMs * 2 ** attempt;
      await wait(delay);
      attempt += 1;
    }
  }

  throw lastError;
}
