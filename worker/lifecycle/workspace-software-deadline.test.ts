import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import {
  reachPhase,
  softwareResume,
} from './workspace-software-start.test-support'

const fixtureForTest = setupBackendTests()

it('fails a hung software update at the original twenty-minute start deadline', async () => {
  const fixture = fixtureForTest()
  const start = await softwareResume(fixture)
  expect(await reachPhase(start, 'software')).toMatchObject({
    phase: 'software',
  })
  await start.advance()
  fixture.boat.commandRunning = true
  await start.restart()
  await fixture.advanceTo(TEST_TIME + 1_199_999, start.id)
  expect(await start.job()).toMatchObject({
    phase: 'software',
    deadlineAt: TEST_TIME + 1_200_000,
  })
  await fixture.advanceTo(TEST_TIME + 1_200_000, start.id)
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: {
      message:
        'The cloud computer did not start within the 20-minute limit. Try again.',
    },
  })
  expect(fixture.boat.stopIds).toEqual([start.sandboxId])
  expect(
    fixture.boat.commands.some((command) =>
      command.includes('systemctl restart conductive-runner.service'),
    ),
  ).toBe(false)
})

it('fails the start when a failed update status arrives at the start deadline', async () => {
  const fixture = fixtureForTest()
  const start = await softwareResume(fixture)
  expect(await reachPhase(start, 'software')).toMatchObject({
    phase: 'software',
  })
  await start.advance()
  fixture.boat.commandExitCode = 1
  fixture.boat.beforeStatus = async () => {
    fixture.boat.beforeStatus = undefined
    await fixture.setTime(TEST_TIME + 1_200_000)
  }
  await start.advance()
  expect(await start.wait()).toMatchObject({
    ok: false,
    error: {
      message:
        'The cloud computer did not start within the 20-minute limit. Try again.',
    },
  })
  expect(
    fixture.boat.commands.some((command) =>
      command.includes('systemctl restart conductive-runner.service'),
    ),
  ).toBe(false)
})
