import { expect, it } from 'vitest'

import { FIRST_MESSAGE, lifecycleFixture } from './durable-test-support'

const MINUTE = 60_000

async function readyFixture() {
  const fixture = lifecycleFixture()
  await fixture.lifecycle.initialize({
    workspaceId: 'workspace-one',
    orgId: 'org-one',
    firstMessage: FIRST_MESSAGE,
  })
  return fixture
}

it('stops an idle sandbox after a shorter stop time', async () => {
  const fixture = await readyFixture()
  const startedAt = fixture.now()
  fixture.hooks.idleMs.mockResolvedValue(15 * MINUTE)
  await fixture.lifecycle.runnerReady()
  expect(fixture.alarmAt()).toBe(startedAt + 15 * MINUTE)
  fixture.setTime(startedAt + 15 * MINUTE)
  await fixture.lifecycle.alarm()
  expect(fixture.hooks.stop).toHaveBeenCalledTimes(1)
  expect(await fixture.lifecycle.read()).toMatchObject({ state: 'stopped' })
})

it('keeps a running sandbox to a longer stop time and extends its provider stop', async () => {
  const fixture = await readyFixture()
  const startedAt = fixture.now()
  await fixture.lifecycle.runnerReady()
  expect(fixture.alarmAt()).toBe(startedAt + 30 * MINUTE)
  fixture.hooks.idleMs.mockResolvedValue(90 * MINUTE)
  fixture.setTime(startedAt + 30 * MINUTE)
  await fixture.lifecycle.alarm()
  expect(fixture.hooks.stop).toHaveBeenCalledTimes(0)
  expect(fixture.hooks.extendDeadline).toHaveBeenCalledTimes(1)
  expect(fixture.alarmAt()).toBe(startedAt + 90 * MINUTE)
  fixture.setTime(startedAt + 90 * MINUTE)
  await fixture.lifecycle.alarm()
  expect(fixture.hooks.stop).toHaveBeenCalledTimes(1)
})

it('does not extend the provider stop for an early alarm', async () => {
  const fixture = await readyFixture()
  const startedAt = fixture.now()
  await fixture.lifecycle.runnerReady()
  fixture.setTime(startedAt + 15 * MINUTE - 1)
  await fixture.lifecycle.alarm()
  expect(fixture.hooks.extendDeadline).toHaveBeenCalledTimes(0)
  expect(fixture.hooks.stop).toHaveBeenCalledTimes(0)
  expect(fixture.alarmAt()).toBe(startedAt + 30 * MINUTE)
})
