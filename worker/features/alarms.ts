import type { ReceiverStorage } from '../members/receiver-storage'

export type AlarmSource =
  | 'lifecycle'
  | `lifecycle:${'start' | 'publication' | 'changed' | 'cleanup' | 'access' | 'image'}`
  | 'devices'
  | 'previews'
  | 'github'

export interface AlarmTransaction {
  read(): Promise<Map<string, number>>
  put(key: string, at: number): Promise<void>
  delete(key: string): Promise<unknown>
  setAlarm(at: number): Promise<void>
  deleteAlarm(): Promise<void>
}

interface AlarmStorage {
  transaction<T>(
    operation: (transaction: AlarmTransaction) => Promise<T>,
  ): Promise<T>
}

export function nativeAlarmStorage(storage: ReceiverStorage): AlarmStorage {
  return {
    transaction: (operation) =>
      storage.transaction((transaction) =>
        operation({
          read: () => transaction.list<number>({ prefix: 'alarm:' }),
          put: (key, at) => transaction.put(key, at),
          delete: (key) => transaction.delete(key),
          setAlarm: (at) => transaction.setAlarm(at),
          deleteAlarm: () => transaction.deleteAlarm(),
        }),
      ),
  }
}

async function scheduleWorkspaceAlarm(
  transaction: AlarmTransaction,
): Promise<void> {
  const alarms = await transaction.read()
  if (alarms.size) await transaction.setAlarm(Math.min(...alarms.values()))
  else await transaction.deleteAlarm()
}

export async function writeWorkspaceAlarm(
  transaction: AlarmTransaction,
  source: AlarmSource,
  at: number | null,
  keepEarlier = false,
): Promise<void> {
  const key = `alarm:${source}`
  if (at === null) await transaction.delete(key)
  else {
    const previous = keepEarlier
      ? (await transaction.read()).get(key)
      : undefined
    await transaction.put(key, Math.min(at, previous ?? Infinity))
  }
  await scheduleWorkspaceAlarm(transaction)
}

export class WorkspaceAlarms {
  private readonly storage: AlarmStorage
  private readonly revisions = new Map<string, number>()
  constructor(storage: AlarmStorage) {
    this.storage = storage
  }

  async set(
    source: AlarmSource,
    at: number | null,
    keepEarlier = false,
  ): Promise<void> {
    this.revisions.set(source, (this.revisions.get(source) ?? 0) + 1)
    await this.storage.transaction(async (transaction) => {
      await writeWorkspaceAlarm(transaction, source, at, keepEarlier)
    })
  }

  async take(now: number): Promise<ReadonlySet<string>> {
    return (await this.begin(now, () => false)).due
  }

  async begin(now: number, owns: (source: string) => boolean) {
    const revisions = new Map(this.revisions)
    const alarms = await this.storage.transaction((transaction) =>
      transaction.read(),
    )
    const due = [...alarms].filter(([, at]) => at <= now)
    const owned = due.filter(([key]) => owns(key.slice('alarm:'.length)))
    return {
      due: new Set(due.map(([key]) => key.slice('alarm:'.length))),
      finish: (finishedAt = now) =>
        this.storage.transaction(async (transaction) => {
          const current = await transaction.read()
          const future = Math.min(
            ...[...current.values()].filter((at) => at > finishedAt),
          )
          const next = future === Infinity ? finishedAt + 30_000 : future
          for (const [key, at] of owned) {
            const source = key.slice('alarm:'.length)
            if (
              current.get(key) === at &&
              this.revisions.get(source) === revisions.get(source)
            )
              await transaction.put(key, next)
          }
          await scheduleWorkspaceAlarm(transaction)
        }),
    }
  }

  has(source: AlarmSource): Promise<boolean> {
    return this.storage.transaction(async (transaction) =>
      (await transaction.read()).has(`alarm:${source}`),
    )
  }

  schedule(): Promise<void> {
    return this.storage.transaction(scheduleWorkspaceAlarm)
  }

  async run(
    source: AlarmSource,
    now: number,
    operation: () => Promise<void>,
  ): Promise<void> {
    const revision = this.revisions.get(source)
    const key = `alarm:${source}`
    const at = await this.storage.transaction(async (transaction) =>
      (await transaction.read()).get(key),
    )
    await operation()
    if (
      at !== undefined &&
      at <= now &&
      this.revisions.get(source) === revision
    )
      await this.storage.transaction(async (transaction) => {
        if (
          (await transaction.read()).get(key) === at &&
          this.revisions.get(source) === revision
        )
          await transaction.delete(key)
        await scheduleWorkspaceAlarm(transaction)
      })
  }

  defer(now: number, at: number): Promise<void> {
    return this.storage.transaction(async (transaction) => {
      for (const [key, dueAt] of await transaction.read())
        if (dueAt <= now) await transaction.put(key, at)
      await scheduleWorkspaceAlarm(transaction)
    })
  }
}
