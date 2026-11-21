import { expect, it } from 'vitest'

import { heldOperation } from '../test-support/held-operation'
import { automaticRestartFixture } from './automatic-restart.test-support'
import { setupBackendTests } from './backend-test-hooks'
import { CONTINUE_JOB_KEY } from './continue-types'
import { LIFECYCLE_STATE_KEY } from './durable-types'
import { RESTART_COMMAND, UPDATE_CHECK_COMMAND } from './software-restart'
import { expectSettled } from './start-outside.test-support'

const fixtureForTest = setupBackendTests()

it('restarts once after three minutes away and delivers the waiting message at readiness', async () => {
  const f = await automaticRestartFixture(fixtureForTest())
  expect(await f.lifecycle()).toMatchObject({ runnerDisconnectedAt: f.awayAt })
  await f.setOffset(120_000)
  await f.send()
  await f.setOffset(179_999)
  await f.send('newer-message')
  await f.actor.restart()
  const before = f.actor.events.length
  await f.tick(180_000)
  expect(f.commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  expect(await f.lifecycle()).toMatchObject({ state: 'starting' })
  expect(f.actor.events.slice(before)).toContainEqual(
    expect.objectContaining({
      event: expect.objectContaining({
        type: 'workspace.updated',
        workspace: expect.objectContaining({ state: 'starting' }),
        error: null,
      }),
    }),
  )
  await f.tick(185_000)
  expect(f.commands()).toHaveLength(2)

  const replacement = await f.connect('replacement')
  expect((await replacement.take()).map(({ type }) => type)).toEqual([
    'welcome',
  ])
  await replacement.ready()
  expect(await replacement.take()).toEqual([
    expect.objectContaining({ type: 'confirm' }),
    expect.objectContaining({
      type: 'turn',
      message: expect.objectContaining({
        id: 'waiting-message',
        state: 'sent',
      }),
    }),
    expect.objectContaining({
      type: 'message',
      message: expect.objectContaining({ id: 'newer-message', state: 'sent' }),
    }),
  ])
  const ready = await f.lifecycle()
  expect(ready).toMatchObject({ runnerConnected: true, state: 'working' })
  expect(ready?.runnerDisconnectedAt).toBeUndefined()
})

it('counts a saved disconnect with no time from the first alarm that sees it', async () => {
  const f = await automaticRestartFixture(fixtureForTest())
  const state = await f.lifecycle()
  if (!state) throw new Error('The saved lifecycle is missing.')
  delete state.runnerDisconnectedAt
  await f.actor.storage.put(LIFECYCLE_STATE_KEY, state)
  await f.send()
  await f.tick(180_000)
  expect(f.commands()).toEqual([])
  await f.tick(360_000)
  expect(f.commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
})

it('restarts when a waiting message shares a running turn and delivers it in a new turn', async () => {
  const f = await automaticRestartFixture(fixtureForTest(), true)
  await f.send()
  await f.tick(180_000)
  expect(f.commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  const replacement = await f.connect('replacement')
  const { sessionId, turnId, message } = f.firstTurn
  await replacement.emit({
    type: 'turn.completed',
    sessionId,
    turnId,
    state: 'stopped',
    durationMs: 180_000,
    files: [],
    omittedFileCount: 0,
    userMessageIds: [message.id],
  })
  await replacement.ready()
  const sent = (await replacement.take()).filter(({ type }) => type === 'turn')
  expect(sent).toEqual([
    expect.objectContaining({
      turnId: expect.not.stringMatching(turnId),
      message: expect.objectContaining({
        id: 'waiting-message',
        state: 'sent',
      }),
    }),
  ])
})

it('leaves a running turn alone when no message waits', async () => {
  const f = await automaticRestartFixture(fixtureForTest(), true)
  await f.tick(180_000)
  expect(await f.lifecycle()).toMatchObject({ state: 'working' })
  expect(f.commands()).toEqual([])
})

it.each([
  {
    case: 'the runner was away for less than three minutes',
    sendAt: 0,
    at: 179_999,
  },
  {
    case: 'the oldest message waited for less than a minute',
    sendAt: 120_001,
    at: 180_000,
  },
])('does not restart when $case', async ({ sendAt, at }) => {
  const f = await automaticRestartFixture(fixtureForTest())
  await f.setOffset(sendAt)
  await f.send()
  await f.tick(at)
  expect(await f.lifecycle()).toMatchObject({ state: 'ready' })
  expect(f.commands()).toEqual([])
})

it.each([
  { provider: 'archived', state: 'stopped' },
  { provider: 'archiving', state: 'ready' },
] as const)(
  'does not restart software when the provider shows $provider',
  async ({ provider, state }) => {
    const f = await automaticRestartFixture(fixtureForTest())
    await f.send()
    f.fixture.boat.states.set('bx_1', provider)
    await f.tick(180_000)
    expect(await f.lifecycle()).toMatchObject({ state })
    expect(f.commands()).toEqual([])
  },
)

it('stops the computer of a suspended owner without restarting its software', async () => {
  const f = await automaticRestartFixture(fixtureForTest())
  await f.send()
  await f.fixture.runtime.env.DB.prepare(
    'UPDATE users SET suspended_at = ? WHERE id = ?',
  )
    .bind(f.awayAt, f.fixture.user.id)
    .run()
  await f.tick(180_000)
  expect(f.fixture.boat.stopIds).toEqual(['bx_1'])
  expect(f.commands()).toEqual([])
})

it('leaves the computer with Continue while its job is pending', async () => {
  const f = await automaticRestartFixture(fixtureForTest())
  await f.send()
  await f.reserveContinue()
  await f.tick(180_000)
  expect(await f.actor.storage.get(CONTINUE_JOB_KEY)).toMatchObject({
    phase: 'check',
  })
  expect(f.commands()).toEqual([])
})

it('shows a failed automatic restart and gives the same absence no second attempt', async () => {
  const f = await automaticRestartFixture(fixtureForTest(), true)
  await f.send()
  f.fixture.boat.beforeCommand = async (command) => {
    if (command === RESTART_COMMAND) f.fixture.boat.synchronousExitCode = 1
  }
  await f.tick(180_000)
  expect(f.commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  await f.tick(360_000)
  expect(await f.lifecycle()).toMatchObject({
    state: 'error',
    error: {
      code: 'restart_failed',
      message: "The software didn't restart. Try again.",
    },
  })
  expect(f.commands()).toHaveLength(2)
})

it('handles chat and expires at the restart deadline while the provider command is held', async () => {
  const f = await automaticRestartFixture(fixtureForTest())
  await f.send()
  const held = heldOperation()
  f.fixture.boat.beforeCommand = async (command) => {
    if (command === UPDATE_CHECK_COMMAND) f.fixture.boat.synchronousExitCode = 1
    if (command === RESTART_COMMAND) {
      f.fixture.boat.synchronousExitCode = 0
      await held.wait()
    }
  }
  const restarting = f.tick(180_000)
  let deadline: Promise<void> | undefined
  try {
    await expectSettled(held.entered)
    await expectSettled(f.send('during-restart'))
    expect(await f.lifecycle()).toMatchObject({ state: 'starting' })
    let markExpired = () => {}
    const expired = new Promise<void>((resolve) => {
      markExpired = resolve
    })
    f.actor.observePublication(async ({ event }) => {
      if (
        event.type === 'workspace.updated' &&
        event.workspace.state === 'error'
      )
        markExpired()
    })
    await f.setOffset(360_000)
    deadline = f.actor.native.api.controls.dispatchAlarm()
    await expectSettled(expired)
  } finally {
    held.release()
    await Promise.all([restarting, deadline])
  }
  expect(await f.lifecycle()).toMatchObject({
    state: 'error',
    error: { code: 'restart_failed' },
  })
  expect(f.commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
})
