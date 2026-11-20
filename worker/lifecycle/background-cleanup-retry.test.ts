import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import {
  assertRetryDay,
  nativeRetryProbe,
  refuseAction,
  retryActor,
} from './background-retry.test-support'
import { recordSandboxCleanup } from './cleanup'

const fixtureForTest = setupBackendTests()

it('backs off workspace cleanup through a day, persists early alarms, honors Retry-After, and resets on success', async () => {
  const fixture = fixtureForTest()
  const id = 'cleanup-retry'
  const actor = retryActor(fixture, id)
  const queue = async () => {
    await recordSandboxCleanup(fixture.runtime.env.DB, {
      workspaceId: id,
      orgId: fixture.org.id,
      sandboxId: 'cleanup-computer',
      providerAccount: 'boat',
    })
    await actor.storage.put('lifecycle:cleanup', id)
  }
  await queue()
  const fault = refuseAction(fixture, 'delete', 'cleanup-computer')
  const probe = nativeRetryProbe(
    fixture,
    actor,
    id,
    'lifecycle:cleanup',
    fault.calls,
  )
  await assertRetryDay(probe)
  expect(fault.reads()).toBe(0)

  await fixture.setTime(fixture.runtime.dependencies.now() + 210_000)
  fault.succeed()
  await probe.run()
  expect(fault.calls()).toBe(31)
  expect(await actor.storage.get('lifecycle:cleanup')).toBeUndefined()
  expect(await probe.alarm()).toBeUndefined()

  await queue()
  fault.fail('120')
  const resetAt = probe.now()
  await probe.run()
  expect(fault.calls()).toBe(32)
  expect(await probe.alarm()).toBe(resetAt + 120_000)
  await probe.setTime(resetAt + 120_000)
  fault.fail('7200')
  await probe.run()
  expect(await probe.alarm()).toBe(resetAt + 3_720_000)
  await probe.setTime(resetAt + 3_720_000)
  fault.fail()
  await probe.run()
  expect(await probe.alarm()).toBe(resetAt + 3_840_000)
})
