export class TtlCache<T> {
  private readonly values = new Map<string, { value: T; expiresAt: number }>();

  async getOrLoad(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = this.values.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const value = await loader();
    this.values.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  clear(key?: string): void {
    if (key) {
      this.values.delete(key);
      return;
    }
    this.values.clear();
  }
}
