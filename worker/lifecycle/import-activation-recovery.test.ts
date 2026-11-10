import { expect, it } from 'vitest'

import { runnerImportWire } from '../../src/shared/runner-import'
import { conductorOldDocumentPath } from '../../src/shared/conductor-import'
import { TEST_TIME } from '../test-support/harness'
import { setupActivationTests } from './import-activation-test-hooks'

const fixtureForTest = setupActivationTests()

it('waits for current durable acknowledgements and preserves its original deadline after reconstruction', async () => {
  const fixture = fixtureForTest()
  await fixture.activate()
  await fixture.advanceToTransport()
  await fixture.connect()
  await fixture.tick()
  const [first] = await fixture.commands()
  expect(first.action.kind).toBe('open')
  expect(new TextEncoder().encode(runnerImportWire(first)).length).toBeLessThan(
    1_048_576,
  )
  await fixture.tick()
  const [repeated] = await fixture.commands()
  expect(repeated.commandId).toBe(first.commandId)
  await fixture.actor.restart()
  await fixture.connect()
  await fixture.connect()
  await fixture.actor.api.peers.receiveRunner(fixture.peer(), {
    ...first,
    type: 'import.result',
    result: { ok: true },
  })
  expect((await fixture.readJob())?.phase).toBe('import-open')
  await fixture.tick()
  const [current] = await fixture.commands()
  expect(current.connectionId).not.toBe(first.connectionId)
  await fixture.acknowledge(current)
  await fixture.setTime(TEST_TIME + 1_200_000)
  await fixture.actor.api.controls.dispatchAlarm()
  expect(await fixture.readJob()).toBeUndefined()
  expect(await fixture.actor.lifecycle.waitLifecycleStart()).toMatchObject({
    ok: false,
    error: {
      code: 'workspace_start_failed',
      message:
        'The cloud computer did not start within the 20-minute limit. Try again.',
    },
  })
  expect(fixture.boat.deletedIds).toEqual(['bx_1'])
  expect(
    (
      await fixture.request(
        conductorOldDocumentPath(fixture.org.id, 'reservation', 'old-session'),
      )
    ).status,
  ).toBe(200)
})
