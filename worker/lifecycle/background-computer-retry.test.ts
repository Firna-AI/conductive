import { expect, it } from 'vitest'

import { FakeE2b } from '../test-support/fake-e2b'
import { setupBackendTests } from './backend-test-hooks'
import {
  assertRetryDay,
  nativeRetryProbe,
  refuseAction,
  retryActor,
} from './background-retry.test-support'
import {
  COMPUTER_STOP_TASK_KEY,
  computerStopObjectName,
} from './computer-stop-task'

const fixtureForTest = setupBackendTests()

it.each(['boat', 'e2b'] as const)(
  'keeps %s computer stop waits per identity through a day and a repeat enqueue',
  async (providerAccount) => {
    const fixture = fixtureForTest()
    const sandboxId = 'sandbox-one'
    const computer = { providerAccount, sandboxId }
    const server = new FakeE2b()
    server.sandboxes.set(sandboxId, {
      sandboxID: sandboxId,
      state: 'running',
      metadata: {},
    })
    if (providerAccount === 'e2b') {
      fixture.runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
        e2b: {
          kind: 'e2b',
          apiKey: server.apiKey,
          domain: server.domain,
          templateId: 'e2b-template',
        },
      })
      const fetch = fixture.runtime.dependencies.fetch
      fixture.runtime.dependencies.fetch = (request) =>
        new URL(request.url).hostname.endsWith(server.domain)
          ? server.fetch(request)
          : fetch(request)
    }
    await fixture.runtime.env.DB.prepare(
      `INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, purpose)
       VALUES (?, ?, ?, 'retained')`,
    )
      .bind(sandboxId, providerAccount, fixture.org.id)
      .run()
    fixture.boat.states.set(sandboxId, 'ready')
    const id = computerStopObjectName(fixture.org.id)
    const actor = retryActor(fixture, id)
    await actor.storage.put(COMPUTER_STOP_TASK_KEY, {
      orgId: fixture.org.id,
      computers: [computer],
    })
    const fault = refuseAction(fixture, 'stop', sandboxId, providerAccount)
    const probe = nativeRetryProbe(
      fixture,
      actor,
      id,
      'lifecycle:computer-stops',
      fault.calls,
    )
    await assertRetryDay(probe)
    expect(fault.reads()).toBe(30)
    await actor.native.api.controller.queueComputerStops(fixture.org.id, [
      computer,
    ])
    expect(fault.calls()).toBe(30)
    const at = (await probe.alarm()) ?? 0
    await probe.setTime(at)
    fault.succeed()
    await probe.run()
    expect(fault.calls()).toBe(31)
    expect(await actor.storage.get(COMPUTER_STOP_TASK_KEY)).toBeUndefined()
    expect(await probe.alarm()).toBeUndefined()

    fixture.boat.states.set(sandboxId, 'ready')
    server.sandboxes.set(sandboxId, {
      sandboxID: sandboxId,
      state: 'running',
      metadata: {},
    })
    fault.fail('120')
    await actor.native.api.controller.queueComputerStops(fixture.org.id, [
      computer,
    ])
    expect(fault.calls()).toBe(32)
    expect(await probe.alarm()).toBe(at + 120_000)
    await probe.setTime(at + 120_000)
    fault.fail('7200')
    await probe.run()
    expect(await probe.alarm()).toBe(at + 3_720_000)
    await probe.setTime(at + 3_720_000)
    fault.fail()
    await probe.run()
    expect(await probe.alarm()).toBe(at + 3_840_000)
  },
)

it('stops a newly queued computer at once while an old computer keeps its wait', async () => {
  const fixture = fixtureForTest()
  const first = { providerAccount: 'boat', sandboxId: 'first-computer' }
  const second = { providerAccount: 'boat', sandboxId: 'second-computer' }
  for (const computer of [first, second]) {
    await fixture.runtime.env.DB.prepare(
      `INSERT INTO computer_ledger (sandbox_id, org_id, purpose)
       VALUES (?, ?, 'retained')`,
    )
      .bind(computer.sandboxId, fixture.org.id)
      .run()
    fixture.boat.states.set(computer.sandboxId, 'ready')
  }
  const id = computerStopObjectName(fixture.org.id)
  const actor = retryActor(fixture, id)
  const fault = refuseAction(fixture, 'stop', first.sandboxId)
  fault.fail('120')
  const now = fixture.runtime.dependencies.now()
  await actor.native.api.controller.queueComputerStops(fixture.org.id, [first])
  await actor.native.api.controller.queueComputerStops(fixture.org.id, [
    first,
    second,
  ])
  expect(fault.calls()).toBe(1)
  expect(fixture.boat.stopIds).toEqual([second.sandboxId])
  expect(await actor.storage.get(COMPUTER_STOP_TASK_KEY)).toEqual({
    orgId: fixture.org.id,
    computers: [first],
  })
  expect(await actor.storage.get('alarm:lifecycle:computer-stops')).toBe(
    now + 120_000,
  )
})

it('accepts an empty computer stop enqueue without an alarm', async () => {
  const fixture = fixtureForTest()
  const actor = retryActor(fixture, computerStopObjectName(fixture.org.id))
  await expect(
    actor.native.api.controller.queueComputerStops(fixture.org.id, []),
  ).resolves.toEqual([])
  expect(await actor.storage.getAlarm()).toBeNull()
})

it('keeps the earliest computer safety alarm while a later identity makes a provider call', async () => {
  const fixture = fixtureForTest()
  const first = { providerAccount: 'boat', sandboxId: 'new-computer' }
  const second = { providerAccount: 'boat', sandboxId: 'old-computer' }
  for (const computer of [first, second]) {
    await fixture.runtime.env.DB.prepare(
      `INSERT INTO computer_ledger (sandbox_id, org_id, purpose)
       VALUES (?, ?, 'retained')`,
    )
      .bind(computer.sandboxId, fixture.org.id)
      .run()
    fixture.boat.states.set(computer.sandboxId, 'ready')
  }
  const id = computerStopObjectName(fixture.org.id)
  const actor = retryActor(fixture, id)
  await actor.storage.put(COMPUTER_STOP_TASK_KEY, {
    orgId: fixture.org.id,
    computers: [second],
  })
  const fault = refuseAction(fixture, 'stop', second.sandboxId)
  const probe = nativeRetryProbe(
    fixture,
    actor,
    id,
    'lifecycle:computer-stops',
    fault.calls,
  )
  const waits = [
    30_000, 60_000, 120_000, 240_000, 480_000, 960_000, 1_920_000, 3_600_000,
  ]
  let at = probe.now()
  for (const wait of waits) {
    await probe.setTime(at)
    await probe.run()
    at += wait
  }
  await actor.storage.put(COMPUTER_STOP_TASK_KEY, {
    orgId: fixture.org.id,
    computers: [first, second],
  })
  await probe.setTime(at)
  fixture.boat.stopReplyState = 'ready'
  const safety: unknown[] = []
  fault.observe(async () => {
    safety.push(await probe.alarm())
  })
  await probe.run()
  expect(fault.calls()).toBe(9)
  expect(safety).toEqual([at + 30_000])
  expect(await probe.alarm()).toBe(at + 30_000)
})
