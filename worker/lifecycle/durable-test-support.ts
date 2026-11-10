import { vi } from 'vitest'

import type { SendMessageRequest } from '../../src/shared/messages'
import { DurableLifecycle } from './durable'
import type {
  DiskRetentionResult,
  DurableLifecycleState,
  LifecycleStorage,
  LifecycleTurnRecovery,
} from './durable-types'

export const FIRST_MESSAGE: SendMessageRequest = {
  id: 'message-one',
  text: 'Keep the first draft.',
  attachmentIds: [],
  choice: { agent: 'codex', model: 'gpt-5.5', effort: 'high' },
}

export function lifecycleFixture() {
  let now = 1_800_000_000_000
  let persisted: DurableLifecycleState | undefined
  let alarmAt: number | null = null
  const alarms = new Map<string, number>()
  const schedule = () => {
    alarmAt = alarms.size ? Math.min(...alarms.values()) : null
  }
  const storage: LifecycleStorage = {
    get: async () => structuredClone(persisted),
    put: async (_key, value) => {
      persisted = structuredClone(value)
    },
    delete: async () => {
      const existed = persisted !== undefined
      persisted = undefined
      return existed
    },
    setAlarm: async (value) => {
      alarms.set('state', value)
      schedule()
    },
    deleteAlarm: async () => {
      alarms.delete('state')
      schedule()
    },
    changedAlarm: async (at, keepEarlier = true) => {
      if (at === null) alarms.delete('changed')
      else
        alarms.set(
          'changed',
          Math.min(
            at,
            keepEarlier ? (alarms.get('changed') ?? Infinity) : Infinity,
          ),
        )
      schedule()
    },
  }
  const hooks = {
    changed: vi.fn<(state: DurableLifecycleState) => void>(),
    stop: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    keepalive: vi
      .fn<(deadlineAt: number) => Promise<DiskRetentionResult>>()
      .mockImplementation(async () => ({
        done: true,
        error: null,
        stoppedAt: now,
        eligible: true,
      })),
    extendDeadline: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    recoverTurns: vi
      .fn<() => Promise<LifecycleTurnRecovery | undefined>>()
      .mockResolvedValue(undefined),
    lastTurnEndedAt: vi
      .fn<() => Promise<number | null>>()
      .mockResolvedValue(null),
  }
  const create = () =>
    new DurableLifecycle(storage, () => now, {
      ...hooks,
      extendDeadline: (request) =>
        request?.kind === 'check'
          ? Promise.resolve()
          : request?.kind === 'input'
            ? request.extend()
            : hooks.extendDeadline(),
    })
  return {
    lifecycle: create(),
    recreate: create,
    hooks,
    now: () => now,
    setTime: (value: number) => {
      now = value
    },
    alarmAt: () => alarmAt,
  }
}
