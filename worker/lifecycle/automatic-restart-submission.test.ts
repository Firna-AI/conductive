import { expect, it, onTestFinished, vi } from 'vitest'

import * as workspaceStore from '../previews/workspace-store'
import { heldOperation } from '../test-support/held-operation'
import { automaticRestartFixture } from './automatic-restart.test-support'
import { setupBackendTests } from './backend-test-hooks'
import type { DurableLifecycleState } from './durable-types'
import { RESTART_COMMAND, UPDATE_CHECK_COMMAND } from './software-restart'
import { expectSettled } from './start-outside.test-support'

const fixtureForTest = setupBackendTests()

it('submits the automatic restart before its deadline when a target read after submission would stall', async () => {
  const f = await automaticRestartFixture(fixtureForTest())
  await f.send()
  const heldRead = heldOperation()
  const sent = heldOperation()
  let sentState: DurableLifecycleState['state'] | undefined
  const readTarget = workspaceStore.readWorkspaceTarget
  let readsAfterUpdate: number | undefined
  const spy = vi
    .spyOn(workspaceStore, 'readWorkspaceTarget')
    .mockImplementation(async (...args) => {
      if (readsAfterUpdate !== undefined && ++readsAfterUpdate === 2)
        await heldRead.wait()
      return readTarget(...args)
    })
  onTestFinished(() => {
    spy.mockRestore()
  })
  f.fixture.boat.beforeCommand = async (command) => {
    if (command === UPDATE_CHECK_COMMAND) readsAfterUpdate = 0
    if (command === RESTART_COMMAND) {
      sentState = (await f.lifecycle())?.state
      await sent.wait()
    }
  }
  const restarting = f.advanceRestart()
  let alarm: Promise<void> | undefined
  try {
    const first = await expectSettled(
      Promise.race([
        heldRead.entered.then(() => 'read'),
        sent.entered.then(() => 'send'),
        restarting.then(() => 'complete'),
      ]),
    )
    if (first === 'read') {
      const expired = f.restartFailure()
      await f.setOffset(360_000)
      alarm = f.actor.native.api.controls.dispatchAlarm()
      await expectSettled(expired)
    }
  } finally {
    heldRead.release()
    sent.release()
    await restarting
    await alarm
  }
  expect(sentState).toBe('starting')
  expect(f.commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  expect(f.hostCommands()).toEqual(f.commands())
})

it('handles chat and expires at the restart deadline while the host command is held', async () => {
  const f = await automaticRestartFixture(fixtureForTest())
  await f.send()
  let deadline: Promise<void> | undefined
  await f
    .duringRestart(f.holdCommand(RESTART_COMMAND, 1), async () => {
      await expectSettled(f.send('during-restart'))
      await expectSettled(f.connect('replacement'))
      expect(await f.lifecycle()).toMatchObject({ state: 'starting' })
      const expired = f.restartFailure()
      await f.setOffset(360_000)
      deadline = f.actor.native.api.controls.dispatchAlarm()
      await expectSettled(expired)
    })
    .finally(async () => {
      await deadline
    })
  expect(await f.lifecycle()).toMatchObject({
    state: 'error',
    error: { code: 'restart_failed' },
  })
  expect(f.commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  expect(f.hostCommands()).toEqual(f.commands())
})
