import type { AgentWatchSessionRequest } from '../../src/shared/generated/AgentWatchSessionRequest'
import type { SessionWatchEndState } from '../../src/shared/generated/SessionWatchEndState'
import type { TurnEndReason } from '../../src/shared/generated/TurnEndReason'
import type { ChatData } from './types'
import { cleanupBusy } from '../members/cleanup-lease'
import {
  LIFECYCLE_FENCE_KEY,
  type ReceiverFence,
} from '../members/receiver-fence'

const TARGET = 'chat:session-watch:target:'
const RECEIPT = 'chat:session-watch:receipt:'
const STOP = 'chat:session-watch:stop:'
const LIVE_TARGET = 'chat:session-watch:live-target:'
const RESUME = 'chat:session-watch:resume:'

export interface CallingWatchTurn {
  workspaceId: string
  sessionId: string
  turnId: string
  senderUserId: string
  stopNonce: string | null
}

export interface ToolSessionWatch extends AgentWatchSessionRequest {
  orgId: string
  workspaceId: string
  sessionId: string
  caller: CallingWatchTurn
}

interface WatchIdentity extends Omit<ToolSessionWatch, 'turnId'> {
  id: string
  turnId: string
}

export type SessionWatch = WatchIdentity &
  (
    | { stage: 'pending' }
    | {
        stage: 'ready'
        state: SessionWatchEndState
        reason: TurnEndReason | null
      }
    | { stage: 'settled'; outcome: WatchReceipt['state'] }
  )

export type ReadySessionWatch = Extract<SessionWatch, { stage: 'ready' }>

export type WatchReceipt = {
  watch: ReadySessionWatch
} & (
  | { state: 'suppressed' }
  | {
      state: 'accepted'
      messageId: string
      resume: 'pending' | 'handed-off' | 'waiting' | 'cancelled'
    }
)

/** Enumerate native pages through the end, including pages with only settled work. */
async function all<T>(data: ChatData, prefix: string): Promise<T[]> {
  const result: T[] = []
  let startAfter: string | undefined
  for (;;) {
    const page = await data.list<T>({ prefix, startAfter, limit: 64 })
    if (!page.size) return result
    for (const [key, value] of page) {
      result.push(value)
      startAfter = key
    }
  }
}

export class SessionWatchRecords {
  private readonly data: ChatData

  constructor(data: ChatData) {
    this.data = data
  }

  async active(): Promise<boolean> {
    const fence = await this.data.get<ReceiverFence>(LIFECYCLE_FENCE_KEY)
    return !fence || fence.mode === 'active'
  }

  async assertActive(generation?: number): Promise<void> {
    const fence = await this.data.get<ReceiverFence>(LIFECYCLE_FENCE_KEY)
    if (
      (fence && fence.mode !== 'active') ||
      (generation !== undefined && (fence?.generation ?? 0) !== generation)
    )
      throw cleanupBusy()
  }

  stopNonce(sessionId: string): Promise<string | null> {
    return this.data
      .get<string>(`${STOP}${sessionId}`)
      .then((value) => value ?? null)
  }

  invalidate(sessionId: string, nonce: string): Promise<void> {
    return this.data.put(`${STOP}${sessionId}`, nonce)
  }

  target(id: string): Promise<SessionWatch | undefined> {
    return this.data.get(`${TARGET}${id}`)
  }

  targets(): Promise<SessionWatch[]> {
    return all(this.data, TARGET)
  }

  activeTargets(): Promise<Exclude<SessionWatch, { stage: 'settled' }>[]> {
    return all(this.data, LIVE_TARGET)
  }

  async saveTarget(watch: SessionWatch): Promise<void> {
    await this.data.put(`${TARGET}${watch.id}`, watch)
    if (watch.stage === 'settled')
      await this.data.delete(`${LIVE_TARGET}${watch.id}`)
    else await this.data.put(`${LIVE_TARGET}${watch.id}`, watch)
  }

  receipt(id: string): Promise<WatchReceipt | undefined> {
    return this.data.get(`${RECEIPT}${id}`)
  }

  receipts(): Promise<WatchReceipt[]> {
    return all(this.data, RECEIPT)
  }

  pendingResumes(): Promise<Extract<WatchReceipt, { state: 'accepted' }>[]> {
    return all(this.data, RESUME)
  }

  async saveReceipt(receipt: WatchReceipt): Promise<void> {
    await this.data.put(`${RECEIPT}${receipt.watch.id}`, receipt)
    if (receipt.state === 'accepted' && receipt.resume === 'pending')
      await this.data.put(`${RESUME}${receipt.watch.id}`, receipt)
    else await this.data.delete(`${RESUME}${receipt.watch.id}`)
  }

  async due(now: number): Promise<number | null> {
    const targets = await this.activeTargets()
    if (targets.some((watch) => watch.stage === 'ready')) return now
    if (targets.some((watch) => watch.stage === 'pending')) return now + 30_000
    const pending = (await this.pendingResumes()).length !== 0
    return pending ? now + 30_000 : null
  }
}
