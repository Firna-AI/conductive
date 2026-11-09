import type {
  WorkspaceStorage,
  WorkspaceTransaction,
  WorkspaceValues,
} from './platform-storage'

export function heldOperation() {
  let enter: () => void = () => {}
  let release: () => void = () => {}
  const entered = new Promise<void>((resolve) => {
    enter = resolve
  })
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  return {
    entered,
    release,
    wait: async () => {
      enter()
      await pending
    },
  }
}

type Maps = { [K in keyof WorkspaceValues]: Map<string, WorkspaceValues[K]> }

/** Fake platform KV and transaction boundaries. It knows no lifecycle job behavior. */
export class MemoryWorkspaceStorage implements WorkspaceStorage {
  private maps: Maps = {
    lifecycle: new Map(),
    job: new Map(),
    result: new Map(),
    publication: new Map(),
    creation: new Map(),
    turns: new Map(),
    image: new Map(),
    first: new Map(),
    number: new Map(),
    text: new Map(),
  }
  alarmAt: number | null = null
  alarmGeneration = 0
  onChange: () => void = () => {}
  private tail: Promise<unknown> = Promise.resolve()
  private readGate:
    { key: string; gate: ReturnType<typeof heldOperation> } | undefined
  private transactionGate: ReturnType<typeof heldOperation> | undefined
  private notifications = 0

  holdRead(key: string) {
    const gate = heldOperation()
    this.readGate = { key, gate }
    return gate
  }
  holdTransaction() {
    const gate = heldOperation()
    this.transactionGate = gate
    return gate
  }

  async get<K extends keyof WorkspaceValues>(
    kind: K,
    key: string,
  ): Promise<WorkspaceValues[K] | undefined> {
    const value = structuredClone(this.maps[kind].get(key))
    if (this.readGate?.key === key) {
      const gate = this.readGate.gate
      this.readGate = undefined
      await gate.wait()
    }
    return value
  }
  async put<K extends keyof WorkspaceValues>(
    kind: K,
    key: string,
    value: WorkspaceValues[K],
  ): Promise<void> {
    this.maps[kind].set(key, structuredClone(value))
    this.changed()
  }
  delete(key: string): Promise<boolean>
  delete(keys: string[]): Promise<number>
  async delete(keys: string | string[]): Promise<boolean | number> {
    let count = 0
    for (const key of typeof keys === 'string' ? [keys] : keys) {
      let removed = false
      for (const map of Object.values(this.maps))
        if (map.delete(key)) removed = true
      if (removed) count++
    }
    this.changed()
    return typeof keys === 'string' ? count > 0 : count
  }
  async list<K extends keyof WorkspaceValues>(
    kind: K,
    options: DurableObjectListOptions = {},
  ): Promise<Map<string, WorkspaceValues[K]>> {
    let entries = [...this.maps[kind].entries()]
      .filter(
        ([key]) =>
          (!options.prefix || key.startsWith(options.prefix)) &&
          (!options.startAfter || key > options.startAfter) &&
          (!options.start || key >= options.start) &&
          (!options.end || key < options.end),
      )
      .sort(([a], [b]) => a.localeCompare(b))
    if (options.reverse) entries = entries.reverse()
    if (options.limit !== undefined) entries = entries.slice(0, options.limit)
    return structuredClone(new Map(entries))
  }
  async setAlarm(at: number): Promise<void> {
    this.alarmAt = at
    this.alarmGeneration++
    this.changed()
  }
  async getAlarm(): Promise<number | null> {
    return this.alarmAt
  }
  async deleteAlarm(): Promise<void> {
    this.alarmAt = null
    this.alarmGeneration++
    this.changed()
  }

  async transaction<T>(
    operation: (storage: WorkspaceTransaction) => Promise<T>,
  ): Promise<T> {
    if (this.transactionGate) {
      const gate = this.transactionGate
      this.transactionGate = undefined
      await gate.wait()
    }
    const result = this.tail.then(async () => {
      const original = structuredClone(this.maps)
      const originalAlarm = this.alarmAt
      const originalGeneration = this.alarmGeneration
      this.notifications++
      try {
        return await operation(this)
      } catch (error) {
        this.maps = original
        this.alarmAt = originalAlarm
        this.alarmGeneration = originalGeneration
        throw error
      } finally {
        this.notifications--
        this.changed()
      }
    })
    this.tail = result.catch(() => undefined)
    return result
  }
  private changed() {
    if (!this.notifications) this.onChange()
  }
}
