import type { ChatData, ChatStorage } from './types'

/** Each key keeps the type supplied to put(), as Durable Object KV does. */
export class MemoryChatStorage implements ChatStorage {
  records = new Map<string, unknown>()
  writes: string[] = []
  failCommit = false
  beforeCommit: ((staged: MemoryChatStorage) => Promise<void>) | null = null

  async get<T>(key: string): Promise<T | undefined> {
    return structuredClone(this.records.get(key)) as T | undefined
  }

  async put<T>(key: string, value: T): Promise<void> {
    this.records.set(key, structuredClone(value))
    this.writes.push(key)
  }

  async delete(key: string): Promise<boolean> {
    return this.records.delete(key)
  }

  async list<T>(options: {
    prefix: string
    startAfter?: string
  }): Promise<Map<string, T>> {
    const entries = [...this.records.entries()]
      .filter(
        ([key]) =>
          key.startsWith(options.prefix) &&
          (options.startAfter === undefined ||
            compareUtf8(key, options.startAfter) > 0),
      )
      .sort(([left], [right]) => compareUtf8(left, right))
    return structuredClone(new Map(entries)) as Map<string, T>
  }

  async transaction<T>(work: (data: ChatData) => Promise<T>): Promise<T> {
    const transaction = new MemoryChatStorage()
    transaction.records = structuredClone(this.records)
    const result = await work(transaction)
    await this.beforeCommit?.(transaction)
    if (this.failCommit) throw new Error('Injected storage failure')
    this.records = transaction.records
    this.writes.push(...transaction.writes)
    return result
  }
}

const encoder = new TextEncoder()

export function compareUtf8(left: string, right: string): number {
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    const difference = a[index] - b[index]
    if (difference !== 0) return difference
  }
  return a.length - b.length
}
