import { expect, it } from 'vitest'

import { FIRST_MESSAGE, lifecycleFixture } from './durable-test-support'
import { IDLE_MS, TURN_HEARTBEAT_MS } from './durable-types'

it.each(['heartbeat', 'reconcile', 'turn', 'input', 'restore'] as const)(
  'marks a provider stop found by %s before clearing the running sessions',
  async (entry) => {
    const fixture = lifecycleFixture({
      ...(entry === 'reconcile' ? { reconcile: async () => 'stopped' } : {}),
      ...(entry === 'restore' ? { checkRestore: async () => 'stopped' } : {}),
    })
    const lifecycle = fixture.lifecycle
    await lifecycle.initialize({
      workspaceId: 'workspace-one',
      orgId: 'org-one',
      firstMessage: FIRST_MESSAGE,
    })
    await lifecycle.runnerReady()
    await lifecycle.turn('session-one', true)
    fixture.setTime(1_800_000_300_000)
    if (entry === 'reconcile') await lifecycle.runnerDisconnected()
    if (entry === 'restore')
      await lifecycle.update((state) => ({
        ...state,
        restoreWatchAt: fixture.now(),
      }))
    else fixture.hooks.extendDeadline.mockResolvedValue('stopped')
    if (entry === 'turn') await lifecycle.turn('session-one', false)
    else if (entry === 'input') await lifecycle.activity()
    else await lifecycle.alarm()
    expect(await fixture.recreate().read()).toMatchObject({
      state: 'stopped',
      stoppedAt: 1_800_000_300_000,
      providerStop: { at: 1_800_000_300_000 },
      runningSessions: [],
      runnerConnected: false,
    })
  },
)

it('keeps a provider error unmarked even with a stale provider stop', async () => {
  const fixture = lifecycleFixture()
  await fixture.lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  await fixture.lifecycle.turn('session-one', true)
  await fixture.lifecycle.update((state) => ({
    ...state,
    providerStop: { at: 100 },
  }))
  fixture.hooks.extendDeadline.mockResolvedValue('error')
  await fixture.lifecycle.alarm()
  expect(await fixture.lifecycle.read()).toMatchObject({
    state: 'error',
    runningSessions: [],
    error: { code: 'sandbox_failed' },
    providerStop: undefined,
  })
})

it('saves idle stop intent before dispatch and keeps it through a pending stop and restart', async () => {
  const fixture = lifecycleFixture()
  const lifecycle = fixture.lifecycle
  await lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  await lifecycle.runnerReady()
  fixture.setTime(1_800_000_000_000 + IDLE_MS)
  fixture.hooks.stop.mockImplementationOnce(async () => {
    expect(await lifecycle.read()).toMatchObject({
      appStop: { at: 1_800_001_800_000 },
    })
    return 'pending'
  })
  await lifecycle.alarm()
  const restored = fixture.recreate()
  await restored.turn('session-one', true)
  fixture.setTime(fixture.now() + TURN_HEARTBEAT_MS)
  fixture.hooks.extendDeadline.mockResolvedValue('stopped')
  await restored.alarm()
  expect(await restored.read()).toMatchObject({
    state: 'stopped',
    appStop: { at: 1_800_001_800_000 },
    providerStop: undefined,
  })
})

it('clears both stop records at a new start', async () => {
  const fixture = lifecycleFixture()
  await fixture.lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  await fixture.lifecycle.update((state) => ({
    ...state,
    appStop: { at: 100 },
    providerStop: { at: 200 },
  }))
  await fixture.lifecycle.beginStart('resume')
  expect(await fixture.lifecycle.read()).toMatchObject({
    state: 'starting',
    appStop: undefined,
    providerStop: undefined,
  })
})

it('does not mark a confirmed stop with no running turn', async () => {
  const fixture = lifecycleFixture()
  await fixture.lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  fixture.hooks.extendDeadline.mockResolvedValue('stopped')
  await fixture.lifecycle.activity()
  expect(await fixture.lifecycle.read()).toMatchObject({
    state: 'stopped',
    providerStop: undefined,
  })
})
