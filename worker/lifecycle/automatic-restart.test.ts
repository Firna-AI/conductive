import { expect, it } from 'vitest'

import type { RunnerEvent } from '../../src/shared/generated/RunnerEvent'
import { automaticRestartFixture } from './automatic-restart.test-support'
import { setupBackendTests } from './backend-test-hooks'
import { CONTINUE_JOB_KEY } from './continue-types'
import { LIFECYCLE_STATE_KEY } from './durable-types'
import { RESTART_COMMAND, UPDATE_CHECK_COMMAND } from './software-restart'
import { expectSettled } from './start-outside.test-support'

const fixtureForTest = setupBackendTests()
const welcome = (confirmedThrough: number) =>
  expect.objectContaining({ type: 'welcome', confirmedThrough })
const sentMessage = (id: string) =>
  expect.objectContaining({ id, state: 'sent' })
const sentCommand = (type: 'turn' | 'message', id: string) =>
  expect.objectContaining({ type, message: sentMessage(id) })

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
  expect(f.hostCommands()).toEqual(f.commands())
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
  expect(await replacement.take()).toEqual([welcome(2)])
  expect(await f.lifecycle()).toMatchObject({ state: 'starting' })
  await replacement.ready()
  expect(await replacement.take()).toEqual([
    expect.objectContaining({ type: 'confirm', throughEventNumber: 3 }),
    sentCommand('turn', 'waiting-message'),
    sentCommand('message', 'newer-message'),
  ])
  const ready = await f.lifecycle()
  expect(ready).toMatchObject({ runnerConnected: true, state: 'working' })
  expect(ready?.runnerDisconnectedAt).toBeUndefined()
  expect(ready?.softwareRestartAt).toBeUndefined()
})

it('ends an automatic restart at its deadline if the replacement only says hello on the saved stream', async () => {
  const f = await automaticRestartFixture(fixtureForTest())
  await f.send()
  await f.tick(180_000)
  expect(f.commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  expect(f.hostCommands()).toEqual(f.commands())
  const replacement = await f.connect('replacement')
  const starting = {
    state: 'starting',
    runnerConnected: false,
    softwareRestartAt: f.awayAt + 180_000,
  }
  expect(await f.lifecycle()).toMatchObject(starting)
  expect(await replacement.take()).toEqual([welcome(2)])
  await f.tick(359_999)
  expect(await f.lifecycle()).toMatchObject(starting)
  await f.tick(360_000)
  expect(await f.lifecycle()).toMatchObject({
    state: 'error',
    error: { code: 'restart_failed' },
  })
  expect(await replacement.take()).toEqual([])
})

it('cancels the automatic restart when the runner recovers before command submission', async () => {
  const f = await automaticRestartFixture(fixtureForTest())
  await f.send()
  const recovered = await f.duringRestart(
    f.holdCommand(UPDATE_CHECK_COMMAND),
    async () => {
      const runner = await expectSettled(f.connect('recovered'))
      expect(await expectSettled(f.lifecycle())).toMatchObject({
        runnerConnected: true,
      })
      return runner
    },
  )
  expect(await recovered.take()).toEqual([
    welcome(2),
    sentCommand('turn', 'waiting-message'),
  ])
  expect(f.commands()).toEqual([UPDATE_CHECK_COMMAND])
  expect(f.hostCommands()).toEqual(f.commands())
  expect(await f.lifecycle()).toMatchObject({
    state: 'working',
    runnerConnected: true,
  })
})

it('keeps the original turn running when readiness cancels the restart during access checks', async () => {
  const f = await automaticRestartFixture(fixtureForTest(), 'started')
  await f.send()
  const held = f.holdRestartAccess()
  const recovered = await f.duringRestart(held, async () => {
    const runner = await expectSettled(
      f.connect('recovered', 'recovered-stream'),
    )
    expect(await runner.take()).toEqual([welcome(0)])
    await expectSettled(runner.ready())
    return runner
  })
  const { sessionId, turnId } = f.firstTurn
  expect(f.commands()).toEqual([UPDATE_CHECK_COMMAND])
  expect(f.hostCommands()).toEqual(f.commands())
  expect(await f.originalTurnEnds()).toEqual([])
  expect(await f.lifecycle()).toMatchObject({
    state: 'working',
    runnerConnected: true,
    runningSessions: [sessionId],
  })
  expect(await recovered.take()).toContainEqual(
    expect.objectContaining({
      type: 'message',
      turnId,
      message: sentMessage('waiting-message'),
    }),
  )
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
  expect(f.hostCommands()).toEqual(f.commands())
})

it('restarts when a waiting message shares a running turn and delivers it in a new turn', async () => {
  const f = await automaticRestartFixture(fixtureForTest(), 'started')
  await f.send()
  await f.tick(180_000)
  expect(f.commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  expect(f.hostCommands()).toEqual(f.commands())
  const replacement = await f.connect('replacement')
  expect(await replacement.take()).toEqual([welcome(2)])
  const { sessionId, turnId, message } = f.firstTurn
  const recoveredEnd = {
    type: 'turn.completed',
    sessionId,
    turnId,
    state: 'stopped',
    durationMs: 180_000,
    files: [],
    filesUnavailable: true,
    omittedFileCount: 0,
    userMessageIds: [message.id],
  } satisfies RunnerEvent
  await replacement.emit(recoveredEnd)
  expect(await replacement.take()).toEqual([
    expect.objectContaining({ type: 'confirm', throughEventNumber: 3 }),
  ])
  await replacement.ready()
  const sent = (await replacement.take()).filter(({ type }) => type === 'turn')
  expect(sent).toEqual([
    expect.objectContaining({
      turnId: expect.not.stringMatching(turnId),
      message: sentMessage('waiting-message'),
    }),
  ])
  expect(await f.originalTurnEnds()).toEqual([
    {
      late: undefined,
      event: expect.objectContaining({
        type: 'turn.completed',
        state: 'stopped',
        userMessageIds: [message.id],
      }),
    },
    { late: true, event: recoveredEnd },
  ])
})

it('leaves a running turn alone when no message waits', async () => {
  const f = await automaticRestartFixture(fixtureForTest(), 'running')
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
  const f = await automaticRestartFixture(fixtureForTest(), 'running')
  await f.send()
  f.fixture.boat.beforeCommand = async (command) => {
    if (command === RESTART_COMMAND) f.fixture.boat.synchronousExitCode = 1
  }
  await f.tick(180_000)
  expect(f.commands()).toEqual([UPDATE_CHECK_COMMAND, RESTART_COMMAND])
  expect(f.hostCommands()).toEqual(f.commands())
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
