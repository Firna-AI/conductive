import { describe, expect, it } from 'vitest'

import { HttpError } from '../http'
import {
  expiredRestartLifecycle,
  restartDeadline,
  restartingLifecycle,
  SOFTWARE_RESTART_LIMIT_MS,
} from './durable-restart'
import { initialLifecycle, readyLifecycle } from './durable-start'
import { applyLifecycleTurn } from './durable-turns'
import type { DurableLifecycleState, LifecycleHooks } from './durable-types'

const ready: DurableLifecycleState = {
  ...initialLifecycle(
    {
      workspaceId: 'ws_1',
      orgId: 'org_1',
      firstMessage: {
        id: 'm_1',
        text: 'Hi',
        choice: { agent: 'claude', model: 'opus', effort: 'high', fast: false },
        attachmentIds: [],
      },
    },
    0,
  ),
  state: 'ready',
  runnerConnected: true,
  startupPrepared: true,
}

const hooks = {
  extendDeadline: async () => undefined,
} as unknown as LifecycleHooks

function refusalCode(change: () => unknown): string | undefined {
  try {
    change()
  } catch (error) {
    if (error instanceof HttpError) return error.code
    throw error
  }
  return undefined
}

describe('the restart of the software', () => {
  it('starts only from a running state of the same workspace', () => {
    expect(restartingLifecycle(ready, 'ws_1', 10)).toMatchObject({
      state: 'starting',
      softwareRestartAt: 10,
      lastActivityAt: 10,
    })
    // A press counts as activity, and never moves a newer activity back.
    expect(
      restartingLifecycle({ ...ready, lastActivityAt: 50 }, 'ws_1', 10),
    ).toMatchObject({ lastActivityAt: 50 })
    for (const state of ['starting', 'stopped', 'error', 'archived'] as const)
      expect(
        refusalCode(() => restartingLifecycle({ ...ready, state }, 'ws_1', 1)),
      ).toBe('workspace_not_running')
    expect(
      refusalCode(() =>
        restartingLifecycle({ ...ready, startStop: 'pending' }, 'ws_1', 1),
      ),
    ).toBe('workspace_not_running')
    expect(refusalCode(() => restartingLifecycle(ready, 'ws_2', 1))).toBe(
      'workspace_not_found',
    )
  })

  it('keeps Starting when a turn ends, until the runner is ready', async () => {
    const restarting = restartingLifecycle(
      { ...ready, state: 'working', runningSessions: ['s_1'] },
      'ws_1',
      10,
    )
    const ended = await applyLifecycleTurn(
      restarting,
      { sessionId: 's_1', running: false },
      hooks,
      () => 20,
    )
    expect(ended).toMatchObject({ state: 'starting', runningSessions: [] })
    const resumed = readyLifecycle(ended, 20)
    expect(resumed).toMatchObject({ state: 'ready' })
    expect(resumed.softwareRestartAt).toBeUndefined()
  })

  it('fails at the time limit, and only while it starts', () => {
    const restarting = restartingLifecycle(ready, 'ws_1', 10)
    const deadline = 10 + SOFTWARE_RESTART_LIMIT_MS
    expect(restartDeadline(restarting)).toBe(deadline)
    expect(expiredRestartLifecycle(restarting, deadline - 1)).toBe(restarting)
    expect(expiredRestartLifecycle(restarting, deadline)).toMatchObject({
      state: 'error',
      error: { code: 'restart_failed' },
    })
    expect(restartDeadline(ready)).toBeNull()
    const stopped = { ...restarting, state: 'stopped' as const }
    expect(expiredRestartLifecycle(stopped, deadline)).toBe(stopped)
  })

  it('checks the automatic restart deadline when the runner reports ready', () => {
    const restarting = {
      ...restartingLifecycle(ready, 'ws_1', 10),
      automaticRestartAt: 10,
      runnerDisconnectedAt: 0,
      runnerConnected: false,
    }
    expect(readyLifecycle(restarting, 180_009)).toMatchObject({
      state: 'ready',
      runnerConnected: true,
      automaticRestartAt: undefined,
      runnerDisconnectedAt: undefined,
    })
    expect(readyLifecycle(restarting, 180_010)).toMatchObject({
      state: 'error',
      error: { code: 'restart_failed' },
    })
  })
})
