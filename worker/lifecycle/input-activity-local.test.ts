import { expect, it } from 'vitest'

import { FIRST_MESSAGE, lifecycleFixture } from './durable-test-support'

it('keeps the exact latest input through local writes and stops only thirty minutes after it', async () => {
  const fixture = lifecycleFixture()
  const lifecycle = fixture.lifecycle
  const initial = fixture.now()
  await lifecycle.initialize({
    workspaceId: 'workspace',
    orgId: 'org',
    firstMessage: FIRST_MESSAGE,
  })
  await lifecycle.runnerReady()
  await lifecycle.input.record(initial + 50_000)
  await lifecycle.input.record(initial + 20_000)
  expect(await lifecycle.read()).toMatchObject({
    lastActivityAt: initial + 50_000,
  })
  fixture.setTime(initial + 1_849_999)
  await lifecycle.alarm()
  expect(fixture.hooks.stop).toHaveBeenCalledTimes(0)
  expect(fixture.alarmAt()).toBe(initial + 1_850_000)
  fixture.setTime(initial + 1_850_000)
  await lifecycle.alarm()
  expect(fixture.hooks.stop).toHaveBeenCalledTimes(1)
  expect(await lifecycle.read()).toMatchObject({
    state: 'stopped',
    lastActivityAt: initial + 50_000,
  })
})
