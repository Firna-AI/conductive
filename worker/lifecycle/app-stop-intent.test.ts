import { expect, it, vi } from 'vitest'

import { FIRST_MESSAGE, lifecycleFixture } from './durable-test-support'
import { DISK_KEEPALIVE_MS, LIFECYCLE_STATE_KEY } from './durable-types'

it('records an explicit app stop before confirming it with running sessions', async () => {
  const fixture = lifecycleFixture()
  await fixture.lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  await fixture.lifecycle.turn('session-one', true)
  await fixture.lifecycle.stopped()
  expect(await fixture.lifecycle.read()).toMatchObject({
    state: 'stopped',
    appStop: { at: 1_800_000_000_000 },
    providerStop: undefined,
    runningSessions: [],
  })
})

it('persists failed-start stop intent before its pending cleanup dispatches after restart', async () => {
  const fixture = lifecycleFixture()
  await fixture.lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  await fixture.lifecycle.stopFailedStart(
    {
      code: 'workspace_start_failed',
      message: 'The cloud computer could not start. Try again.',
      log: null,
    },
    false,
  )
  expect(await fixture.lifecycle.read()).toMatchObject({
    startStop: 'pending',
    appStop: { at: 1_800_000_000_000 },
  })
  fixture.hooks.stop.mockImplementationOnce(async () => {
    expect(await fixture.lifecycle.read()).toMatchObject({
      appStop: { at: 1_800_000_000_000 },
    })
    return 'stopped'
  })
  await fixture.recreate().alarm()
  expect(fixture.hooks.stop).toHaveBeenCalledTimes(1)
  expect(await fixture.lifecycle.read()).toMatchObject({
    state: 'error',
    startStop: 'stopped',
    providerStop: undefined,
  })
})

it('retains Archive stop intent when Restore leaves its provider stop pending', async () => {
  const fixture = lifecycleFixture()
  await fixture.lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  await fixture.lifecycle.turn('session-one', true)
  await fixture.lifecycle.archive()
  expect(await fixture.lifecycle.read()).toMatchObject({
    state: 'archived',
    appStop: { at: 1_800_000_000_000 },
    runningSessions: [],
  })
  await fixture.recreate().restoreStopped(null, fixture.now(), true)
  fixture.hooks.stop.mockImplementationOnce(async () => {
    expect(await fixture.lifecycle.read()).toMatchObject({
      appStop: { at: 1_800_000_000_000 },
    })
    return 'stopped'
  })
  await fixture.recreate().alarm()
  expect(fixture.hooks.stop).toHaveBeenCalledTimes(1)
  expect(await fixture.lifecycle.read()).toMatchObject({
    state: 'stopped',
    providerStop: undefined,
  })
})

it('saves disk retention stop intent before its provider work with an older stored state', async () => {
  const providerStopped = vi.fn()
  const fixture = lifecycleFixture({ providerStopped })
  await fixture.lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  await fixture.lifecycle.stopped()
  const stopped = await fixture.lifecycle.read()
  if (!stopped) throw new Error('Missing stopped lifecycle')
  await fixture.storage.put(LIFECYCLE_STATE_KEY, {
    ...stopped,
    appStop: undefined,
    providerStop: { at: 1_800_000_000_000 },
  })
  fixture.setTime(1_800_000_000_000 + DISK_KEEPALIVE_MS)
  fixture.hooks.keepalive.mockImplementationOnce(async () => {
    expect(await fixture.lifecycle.read()).toMatchObject({
      appStop: { at: 1_801_123_200_000 },
      providerStop: undefined,
    })
    return { done: true, error: null, stoppedAt: fixture.now(), eligible: true }
  })
  await fixture.recreate().alarm()
  expect(fixture.hooks.keepalive).toHaveBeenCalledTimes(1)
  expect(providerStopped).toHaveBeenCalledTimes(0)
})
