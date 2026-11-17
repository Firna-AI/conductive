import { afterEach, expect, it, vi } from 'vitest'

import { waitCreationAdmission } from './creation-admission-wait'
import { WORKSPACE_START_TIME_LIMIT_MS } from './job-time-limit'
import type { WorkspaceCreationAdmission } from './start-types'
import { StartWaiters } from './start-waiters'

afterEach(() => vi.useRealTimers())

it('answers a saved creation failure when no admission was saved', async () => {
  const result = await waitCreationAdmission(
    {
      admission: async () => undefined,
      creationResult: async () => ({
        ok: false,
        error: {
          code: 'agent_login_required',
          message: 'Connect your agent login to send a message.',
          log: null,
        },
      }),
    },
    new StartWaiters<WorkspaceCreationAdmission>(),
  )
  expect(result).toEqual({
    ok: false,
    error: {
      code: 'agent_login_required',
      message: 'Connect your agent login to send a message.',
      log: null,
    },
  })
})

it('ends an admission wait at the workspace start limit when no result was saved', async () => {
  vi.useFakeTimers()
  const pending = waitCreationAdmission(
    {
      admission: async () => undefined,
      creationResult: async () => undefined,
    },
    new StartWaiters<WorkspaceCreationAdmission>(),
    WORKSPACE_START_TIME_LIMIT_MS,
  )
  let settled = false
  void pending.then(() => {
    settled = true
  })
  await vi.advanceTimersByTimeAsync(20 * 60 * 1_000 - 1)
  expect(settled).toBe(false)
  await vi.advanceTimersByTimeAsync(1)
  expect(await pending).toEqual({
    ok: false,
    error: {
      code: 'workspace_start_failed',
      message:
        'The cloud computer did not start within the 20-minute limit. Try again.',
      log: null,
    },
  })
})
