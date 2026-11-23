import type { WakeUp } from '../../src/shared/generated/WakeUp'
import type { ChatData } from './types'
import {
  LIFECYCLE_FENCE_KEY,
  type ReceiverFence,
} from '../members/receiver-fence'
import { cleanupBusy } from '../members/cleanup-lease'

const root = 'chat:session-wake-up:'
const recordKey = (id: string) => `${root}record:${encodeURIComponent(id)}`
const repeatKey = (hash: string) => `${root}repeat:${hash}`
const duePrefix = `${root}due:`
const resumePrefix = `${root}resume:`
const sessionPrefix = (id: string) =>
  `${root}session:${encodeURIComponent(id)}:`

function timeKey(at: number): string {
  return String(BigInt(at) + BigInt(Number.MAX_SAFE_INTEGER)).padStart(17, '0')
}

type Due = { id: string; at: number }

export type PendingWakeUp = {
  stage: 'pending'
  orgId: string
  sessionId: string
  senderUserId: string
  repeat: string
  wakeUp: WakeUp
}

type SettledWakeUp = { stage: 'fired' | 'ended'; sessionId: string }
type WakeUpRecord = PendingWakeUp | SettledWakeUp

export interface WakeUpResume {
  id: string
  orgId: string
  sessionId: string
  senderUserId: string
  messageId: string
  at?: number
}

export class SessionWakeUpRecords {
  private readonly data: ChatData

  constructor(data: ChatData) {
    this.data = data
  }

  async assertActive(generation?: number): Promise<void> {
    const fence = await this.data.get<ReceiverFence>(LIFECYCLE_FENCE_KEY)
    if (
      (fence && fence.mode !== 'active') ||
      (generation !== undefined && (fence?.generation ?? 0) !== generation)
    )
      throw cleanupBusy()
  }

  record(id: string): Promise<WakeUpRecord | undefined> {
    return this.data.get(recordKey(id))
  }

  async repeated(hash: string): Promise<PendingWakeUp | undefined> {
    const id = await this.data.get<string>(repeatKey(hash))
    const record = id === undefined ? undefined : await this.record(id)
    return record?.stage === 'pending' ? record : undefined
  }

  async save(record: PendingWakeUp): Promise<void> {
    const { id, at } = record.wakeUp
    const suffix = `${timeKey(at)}:${id}`
    await this.data.put(recordKey(id), record)
    await this.data.put(repeatKey(record.repeat), id)
    await this.data.put(`${duePrefix}${suffix}`, { id, at } satisfies Due)
    await this.data.put(`${sessionPrefix(record.sessionId)}${suffix}`, id)
  }

  async settle(record: PendingWakeUp, stage: SettledWakeUp['stage']) {
    const { id, at } = record.wakeUp
    const { sessionId } = record
    const suffix = `${timeKey(at)}:${id}`
    await this.data.put(recordKey(id), {
      stage,
      sessionId,
    } satisfies SettledWakeUp)
    await this.data.delete(repeatKey(record.repeat))
    await this.data.delete(`${duePrefix}${suffix}`)
    await this.data.delete(`${sessionPrefix(sessionId)}${suffix}`)
  }

  async pending(sessionId: string): Promise<WakeUp[]> {
    const wakeUps: WakeUp[] = []
    let startAfter: string | undefined
    for (;;) {
      const page = await this.data.list<string>({
        prefix: sessionPrefix(sessionId),
        startAfter,
        limit: 64,
      })
      if (!page.size) return wakeUps
      for (const [key, id] of page) {
        const record = await this.record(id)
        if (record?.stage === 'pending') wakeUps.push(record.wakeUp)
        startAfter = key
      }
    }
  }

  async due(now: number): Promise<Due[]> {
    const page = await this.data.list<Due>({ prefix: duePrefix, limit: 64 })
    return [...page.values()].filter(({ at }) => at <= now)
  }

  async next(): Promise<number | null> {
    const page = await this.data.list<Due>({ prefix: duePrefix, limit: 1 })
    return [...page.values()][0]?.at ?? null
  }

  saveResume(receipt: WakeUpResume): Promise<void> {
    return this.data.put(`${resumePrefix}${receipt.id}`, receipt)
  }

  async resumeForMessage(
    messageId: string,
    wakeUpId?: string,
  ): Promise<WakeUpResume | undefined> {
    if (wakeUpId !== undefined)
      return this.data.get<WakeUpResume>(`${resumePrefix}${wakeUpId}`)
    // Older scheduled commands carry only the message ID.
    let startAfter: string | undefined
    for (;;) {
      const page = await this.data.list<WakeUpResume>({
        prefix: resumePrefix,
        startAfter,
        limit: 64,
      })
      if (!page.size) return undefined
      for (const [key, receipt] of page) {
        if (receipt.messageId === messageId) return receipt
        startAfter = key
      }
    }
  }

  async resumes(): Promise<WakeUpResume[]> {
    return [
      ...(
        await this.data.list<WakeUpResume>({ prefix: resumePrefix, limit: 64 })
      ).values(),
    ]
  }

  async hasResume(): Promise<boolean> {
    return (await this.data.list({ prefix: resumePrefix, limit: 1 })).size > 0
  }

  async finishResume(id: string): Promise<void> {
    await this.data.delete(`${resumePrefix}${id}`)
  }

  async endResume(receipt: WakeUpResume): Promise<void> {
    await this.data.put(recordKey(receipt.id), {
      stage: 'ended',
      sessionId: receipt.sessionId,
    } satisfies SettledWakeUp)
    await this.finishResume(receipt.id)
  }
}
