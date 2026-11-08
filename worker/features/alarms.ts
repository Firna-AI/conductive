import type { ReceiverStorage } from '../members/receiver-storage'

type AlarmSource = 'lifecycle' | 'devices' | 'previews' | 'github'

export class WorkspaceAlarms {
  private readonly storage: ReceiverStorage
  constructor(storage: ReceiverStorage) {
    this.storage = storage
  }

  async set(source: AlarmSource, at: number | null): Promise<void> {
    await this.storage.transaction(async (transaction) => {
      if (at === null) await transaction.delete(`alarm:${source}`)
      else await transaction.put(`alarm:${source}`, at)
      await this.schedule(transaction)
    })
  }

  async take(now: number): Promise<ReadonlySet<string>> {
    return this.storage.transaction(async (transaction) => {
      const alarms = await transaction.list<number>({ prefix: 'alarm:' })
      const due = [...alarms].filter(([, at]) => at <= now)
      for (const [key] of due) await transaction.delete(key)
      await this.schedule(transaction)
      return new Set(due.map(([key]) => key.slice('alarm:'.length)))
    })
  }

  private async schedule(transaction: DurableObjectTransaction): Promise<void> {
    const alarms = await transaction.list<number>({ prefix: 'alarm:' })
    if (alarms.size) await transaction.setAlarm(Math.min(...alarms.values()))
    else await transaction.deleteAlarm()
  }
}
