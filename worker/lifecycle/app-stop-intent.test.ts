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
  await fixture.lifecycle.alarm()
  expect(fixture.hooks.keepalive).toHaveBeenCalledTimes(1)
  expect(providerStopped).toHaveBeenCalledTimes(0)
})
