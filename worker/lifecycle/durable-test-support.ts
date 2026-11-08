import { vi } from 'vitest'

import type { SendMessageRequest } from '../../src/shared/messages'
import { DurableLifecycle } from './durable'
import type {
  DiskRetentionResult,
  DurableLifecycleState,
  LifecycleStorage,
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
      alarmAt = value
    },
    deleteAlarm: async () => {
      alarmAt = null
    },
  }
  const hooks = {
    changed: vi.fn<(state: DurableLifecycleState) => void>(),
    stop: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    keepalive: vi
      .fn<(deadlineAt: number) => Promise<DiskRetentionResult>>()
      .mockResolvedValue({ done: true, error: null }),
    extendDeadline: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  }
  const create = () => new DurableLifecycle(storage, () => now, hooks)
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
