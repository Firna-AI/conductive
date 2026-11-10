import type { ReceiverStorage } from '../members/receiver-storage'

type AlarmSource =
  'lifecycle' | 'devices' | 'previews' | 'github' | 'browser' | 'runner'
const SECURITY_SOURCES = new Set(['devices', 'browser', 'runner'])
const DEFERRED_UNTIL = 'security:regular-alarms-deferred-until'
const PENDING = 'security:regular-alarms-pending'

export class WorkspaceAlarms {
  private readonly storage: ReceiverStorage
  private readonly securityStorage: ReceiverStorage
  constructor(
    storage: ReceiverStorage,
    securityStorage: ReceiverStorage = storage,
  ) {
    this.storage = storage
    this.securityStorage = securityStorage
  }

  async set(source: AlarmSource, at: number | null): Promise<void> {
    const storage = SECURITY_SOURCES.has(source)
      ? this.securityStorage
      : this.storage
    await storage.transaction(async (transaction) => {
      if (at === null) await transaction.delete(`alarm:${source}`)
      else await transaction.put(`alarm:${source}`, at)
      await scheduleWorkspaceAlarm(transaction)
    })
  }

  async take(
    now: number,
    fallbackLifecycle = false,
  ): Promise<ReadonlySet<string>> {
    return this.storage.transaction(async (transaction) => {
      const pending =
        (await transaction.get<Record<string, number>>(PENDING)) ?? {}
      const alarms = await transaction.list<number>({ prefix: 'alarm:' })
      for (const [key, at] of alarms) {
        const source = key.slice('alarm:'.length)
        if (at > now || SECURITY_SOURCES.has(source)) continue
        pending[source] = at
        await transaction.delete(key)
      }
      if (!Object.keys(pending).length && fallbackLifecycle)
        pending.lifecycle = now
      if (Object.keys(pending).length) {
        await transaction.put(PENDING, pending)
        await transaction.put(DEFERRED_UNTIL, now + 2_000)
      }
      await scheduleWorkspaceAlarm(transaction)
      return new Set(Object.keys(pending))
    })
  }

  async complete(sources: ReadonlySet<string>): Promise<void> {
    await this.storage.transaction(async (transaction) => {
      const pending =
        (await transaction.get<Record<string, number>>(PENDING)) ?? {}
      for (const source of sources) delete pending[source]
      if (Object.keys(pending).length) await transaction.put(PENDING, pending)
      else {
        await transaction.delete(PENDING)
        await transaction.delete(DEFERRED_UNTIL)
      }
      await scheduleWorkspaceAlarm(transaction)
    })
  }

  takeSecurity(now: number): Promise<ReadonlySet<string>> {
    return this.securityStorage.transaction(async (transaction) => {
      const alarms = await transaction.list<number>({ prefix: 'alarm:' })
      const due = [...alarms].filter(
        ([key, at]) =>
          at <= now && SECURITY_SOURCES.has(key.slice('alarm:'.length)),
      )
      for (const [key] of due) await transaction.put(key, now + 2_000)
      await scheduleWorkspaceAlarm(transaction)
      return new Set(due.map(([key]) => key.slice('alarm:'.length)))
    })
  }

  async deferRegular(at: number): Promise<void> {
    await this.securityStorage.transaction(async (transaction) => {
      const alarms = await transaction.list({ prefix: 'alarm:' })
      if (
        (await transaction.get(PENDING)) ||
        [...alarms.keys()].some(
          (key) => !SECURITY_SOURCES.has(key.slice('alarm:'.length)),
        )
      )
        await transaction.put(DEFERRED_UNTIL, at)
      else await transaction.delete(DEFERRED_UNTIL)
      await scheduleWorkspaceAlarm(transaction)
    })
  }
}

/** Suspension releases regular ownership. Live security sources keep their deadlines. */
export async function suspendWorkspaceAlarms(
  transaction: DurableObjectTransaction,
  stage: 'draining' | 'drained',
): Promise<void> {
  const alarms = await transaction.list({ prefix: 'alarm:' })
  for (const key of alarms.keys()) {
    if (!SECURITY_SOURCES.has(key.slice('alarm:'.length)))
      await transaction.delete(key)
  }
  if (stage === 'drained') {
    await transaction.delete(PENDING)
    await transaction.delete(DEFERRED_UNTIL)
  }
  await scheduleWorkspaceAlarm(transaction)
}

export async function scheduleWorkspaceAlarm(
  transaction: DurableObjectTransaction,
  options: { resumeRegular?: boolean } = {},
): Promise<void> {
  if (options.resumeRegular) await transaction.delete(DEFERRED_UNTIL)
  const alarms = await transaction.list<number>({ prefix: 'alarm:' })
  const pending = await transaction.get<Record<string, number>>(PENDING)
  for (const [source, at] of Object.entries(pending ?? {}))
    alarms.set(`alarm:pending:${source}`, at)
  const deferred = (await transaction.get<number>(DEFERRED_UNTIL)) ?? 0
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
