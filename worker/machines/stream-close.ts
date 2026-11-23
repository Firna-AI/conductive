export interface StreamCloseStorage {
  get(key: string): unknown
  put(key: string, value: boolean): void
  delete(key: string): boolean
  list(options: { prefix: string; limit: number }): Iterable<[string, unknown]>
}

const PREFIX = 'host:stream-close:'

export class StreamClosePermits {
  private readonly storage: StreamCloseStorage

  constructor(storage: StreamCloseStorage) {
    this.storage = storage
  }

  add(id: number): void {
    this.storage.put(`${PREFIX}${id}`, true)
  }

  take(id: number): boolean {
    if (this.storage.get(`${PREFIX}${id}`) !== true) return false
    return this.storage.delete(`${PREFIX}${id}`)
  }

  clear(): void {
    for (;;) {
      const keys = Array.from(
        this.storage.list({ prefix: PREFIX, limit: 64 }),
        ([key]) => key,
      )
      if (!keys.length) return
      for (const key of keys) this.storage.delete(key)
    }
  }
}
