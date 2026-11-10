import type { ReceiverStorage } from '../members/receiver-storage'

export type AlarmSource =
  | 'lifecycle'
  | `lifecycle:${'start' | 'publication' | 'changed' | 'cleanup' | 'access' | 'image' | 'run' | 'computer-stops'}`
  | 'devices'
  | 'previews'
  | 'github'
  | 'browser'
  | 'runner'

const SECURITY_SOURCES = new Set(['devices', 'browser', 'runner'])
const DEFERRED_UNTIL = 'security:regular-alarms-deferred-until'

export interface AlarmTransaction {
  read(): Promise<Map<string, number>>
  deferred(): Promise<number | undefined>
  defer(at: number | null): Promise<unknown>
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

function nativeAlarmTransaction(
  transaction: DurableObjectTransaction,
): AlarmTransaction {
  return {
    read: () => transaction.list<number>({ prefix: 'alarm:' }),
    deferred: () => transaction.get<number>(DEFERRED_UNTIL),
    defer: (at) =>
      at === null
        ? transaction.delete(DEFERRED_UNTIL)
        : transaction.put(DEFERRED_UNTIL, at),
    put: (key, at) => transaction.put(key, at),
    delete: (key) => transaction.delete(key),
    setAlarm: (at) => transaction.setAlarm(at),
    deleteAlarm: () => transaction.deleteAlarm(),
  }
}

export function nativeAlarmStorage(storage: ReceiverStorage): AlarmStorage {
  return {
    transaction: (operation) =>
      storage.transaction((transaction) =>
        operation(nativeAlarmTransaction(transaction)),
      ),
  }
}

async function scheduleAlarmTransaction(
  transaction: AlarmTransaction,
): Promise<void> {
  const alarms = await transaction.read()
  const deferred = (await transaction.deferred()) ?? 0
  if (alarms.size)
    await transaction.setAlarm(
      Math.max(
        1,
        Math.min(
          ...[...alarms].map(([key, at]) =>
            SECURITY_SOURCES.has(key.slice('alarm:'.length))
              ? at
              : Math.max(at, deferred),
          ),
        ),
      ),
    )
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
  await scheduleAlarmTransaction(transaction)
}

export class WorkspaceAlarms {
  private readonly storage: AlarmStorage
  private readonly securityStorage: AlarmStorage
  private readonly revisions = new Map<string, number>()
  constructor(storage: AlarmStorage, securityStorage: AlarmStorage = storage) {
    this.storage = storage
    this.securityStorage = securityStorage
  }

  async set(
    source: AlarmSource,
    at: number | null,
    keepEarlier = false,
  ): Promise<void> {
    this.revisions.set(source, (this.revisions.get(source) ?? 0) + 1)
    const storage = SECURITY_SOURCES.has(source)
      ? this.securityStorage
      : this.storage
    await storage.transaction(async (transaction) => {
      await writeWorkspaceAlarm(transaction, source, at, keepEarlier)
    })
  }

  async take(now: number): Promise<ReadonlySet<string>> {
    return (await this.begin(now, () => false)).due
  }

  async begin(now: number, owns: (source: string) => boolean) {
    const revisions = new Map(this.revisions)
    const lifecycleRun = owns('lifecycle:run')
    const alarms = await this.storage.transaction(async (transaction) => {
      const current = await transaction.read()
      if (lifecycleRun)
        await writeWorkspaceAlarm(transaction, 'lifecycle:run', now + 30_000)
      return current
    })
    const due = [...alarms].filter(([, at]) => at <= now)
    const owned = due.filter(([key]) => owns(key.slice('alarm:'.length)))
    return {
      due: new Set(due.map(([key]) => key.slice('alarm:'.length))),
      recovering: lifecycleRun && alarms.has('alarm:lifecycle:run'),
      finish: (finishedAt = now) =>
        this.storage.transaction(async (transaction) => {
          if (lifecycleRun) await transaction.delete('alarm:lifecycle:run')
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
          await scheduleAlarmTransaction(transaction)
        }),
    }
  }

  has(source: AlarmSource): Promise<boolean> {
    return this.storage.transaction(async (transaction) =>
      (await transaction.read()).has(`alarm:${source}`),
    )
  }

  schedule(): Promise<void> {
    return this.storage.transaction(scheduleAlarmTransaction)
  }

  async run(
    source: AlarmSource,
    now: number,
    operation: () => Promise<void>,
  ): Promise<void> {
    const revision = this.revisions.get(source)
    const key = `alarm:${source}`
    const storage = SECURITY_SOURCES.has(source)
      ? this.securityStorage
      : this.storage
    const at = await storage.transaction(async (transaction) =>
      (await transaction.read()).get(key),
    )
    await operation()
    if (
      at !== undefined &&
      at <= now &&
      this.revisions.get(source) === revision
    )
      await storage.transaction(async (transaction) => {
        if (
          (await transaction.read()).get(key) === at &&
          this.revisions.get(source) === revision
        )
          await transaction.delete(key)
        await scheduleAlarmTransaction(transaction)
      })
  }

  defer(now: number, at: number): Promise<void> {
    return this.storage.transaction(async (transaction) => {
      for (const [key, dueAt] of await transaction.read())
        if (dueAt <= now && !SECURITY_SOURCES.has(key.slice('alarm:'.length)))
          await transaction.put(key, at)
      await scheduleAlarmTransaction(transaction)
    })
  }

  takeSecurity(now: number): Promise<ReadonlySet<string>> {
    return this.securityStorage.transaction(async (transaction) => {
      const due = [...(await transaction.read())].filter(
        ([key, at]) =>
          at <= now && SECURITY_SOURCES.has(key.slice('alarm:'.length)),
      )
      for (const [key] of due) await transaction.put(key, now + 2_000)
      await scheduleAlarmTransaction(transaction)
      return new Set(due.map(([key]) => key.slice('alarm:'.length)))
    })
  }

  deferRegular(at: number | null): Promise<void> {
    return this.securityStorage.transaction(async (transaction) => {
      const regular = [...(await transaction.read()).keys()].some(
        (key) => !SECURITY_SOURCES.has(key.slice('alarm:'.length)),
      )
      await transaction.defer(regular ? at : null)
      await scheduleAlarmTransaction(transaction)
    })
  }
}

/** Suspension releases regular ownership. Live security sources keep their deadlines. */
export async function suspendWorkspaceAlarms(
  transaction: DurableObjectTransaction,
  stage: 'draining' | 'drained',
): Promise<void> {
  for (const key of (await transaction.list({ prefix: 'alarm:' })).keys()) {
    if (
      !SECURITY_SOURCES.has(key.slice('alarm:'.length)) &&
      (stage === 'drained' || key !== 'alarm:lifecycle:run')
    )
      await transaction.delete(key)
  }
  if (stage === 'drained') await transaction.delete(DEFERRED_UNTIL)
  await scheduleWorkspaceAlarm(transaction)
}

export async function scheduleWorkspaceAlarm(
  transaction: DurableObjectTransaction,
  options: { resumeRegular?: boolean } = {},
): Promise<void> {
  if (options.resumeRegular) await transaction.delete(DEFERRED_UNTIL)
  await scheduleAlarmTransaction(nativeAlarmTransaction(transaction))
}
