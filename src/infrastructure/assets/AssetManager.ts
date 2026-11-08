/** Cache de assets genéricos; GLB e texturas receberão loaders especializados nos próximos milestones. */
export class AssetManager {
  private entries = new Map<string, Promise<unknown>>();
  load<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(key);
    if (existing) return existing as Promise<T>;
    const promise = loader().catch((error: unknown) => { this.entries.delete(key); throw error; });
    this.entries.set(key, promise); return promise;
  }
  has(key: string): boolean { return this.entries.has(key); }
  clear(): void { this.entries.clear(); }
}
