import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { sessionPaths } from '../../src/shared/sessions'
import { FakeRunner } from '../test-support/fake-runner'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { record } from './inputs'
import { ChatStore, ChatTransaction } from './store'
import { TurnLifecycle } from './turn-lifecycle'
import { startTurn, terminalEvent } from './turn-lifecycle.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())
afterEach(() => vi.restoreAllMocks())

it('warns once for committed finished, stopped, and failed turns without a Stop request', async () => {
  const fixture = await createChatFixture(harness)
  const runner = await fixture.connect(
    new FakeRunner({
      workspaceId: WORKSPACE_ID,
      streamId: '12345678-1234-4234-8234-123456789abc',
    }),
  )
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  await fixture.actor.api.controls.captureWarnings(true)
  try {
    for (const state of ['finished', 'stopped', 'failed'] as const) {
      const session = await fixture.createSession()
      const turn = await startTurn(fixture, runner, session.id, state)
      const envelope = runner.emit(terminalEvent(turn, state))
      await fixture.drain()
      runner.sendEnvelope(envelope)
      runner.emit(terminalEvent(turn, state))
      await fixture.drain()
    }
    expect(await fixture.actor.api.controls.warningCalls()).toEqual(
      ['finished', 'stopped', 'failed'].map((state) => [
        {
          kind: 'turn_ended_without_stop_request',
          message: 'A turn ended without a Stop request.',
          workspaceId: 'unknown',
          turnId: 'unknown',
          state,
          connectionId: 'unknown',
          streamId: '12345678-1234-4234-8234-123456789abc',
          protocolVersion: 2,
        },
      ]),
    )
  } finally {
    await fixture.actor.api.controls.captureWarnings(false)
    await fixture.chat.closeConnections()
  }
})

it('keeps Stop attribution when an older turn has only its first saved Stop event', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const turn = await startTurn(fixture, runner, session.id, 'stopped-message')
  const stop = sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id)
  expect((await fixture.fetch(stop, { turnId: turn.turnId })).status).toBe(200)
  await fixture.actor.api.controls.captureWarnings(true)
  try {
    await fixture.changeWorkspace(WORKSPACE_ID, async (transaction) => {
      const stored = await transaction.turn(turn.turnId)
      if (!stored) throw new Error('The stopped turn is missing.')
      delete stored.stopRequest
      await transaction.saveTurn(stored)
    })
    runner.emit(terminalEvent(turn, 'finished'))
    await fixture.drain()
    expect(await fixture.actor.api.controls.warningCalls()).toEqual([])
    const next = await startTurn(fixture, runner, session.id, 'next-message')
    expect((await fixture.fetch(stop, { turnId: next.turnId })).status).toBe(
      200,
    )
    runner.emit(terminalEvent(next, 'stopped'))
    await fixture.drain()
    expect(await fixture.actor.api.controls.warningCalls()).toEqual([])
  } finally {
    await fixture.actor.api.controls.captureWarnings(false)
    await fixture.chat.closeConnections()
  }
})

it('does not warn for a rolled-back end and warns once when the runner retries it', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const turn = await startTurn(fixture, runner, session.id, 'retry-end')
  await fixture.actor.api.controls.captureWarnings(true)
  try {
    await fixture.failNextCommit('before', 'Injected end rollback')
    const envelope = runner.emit(terminalEvent(turn, 'stopped'))
    await expect(fixture.drain()).rejects.toThrow('Injected end rollback')
    const endWarnings = async () =>
      (await fixture.actor.api.controls.warningCalls())
        .flat()
        .filter(
          (warning) =>
            record(warning).kind === 'turn_ended_without_stop_request',
        )
    expect(await endWarnings()).toEqual([])
    await fixture.clearFaults()
    await fixture.connect(runner)
    await fixture.drain()
    expect(await endWarnings()).toEqual([
      {
        kind: 'turn_ended_without_stop_request',
        message: 'A turn ended without a Stop request.',
        workspaceId: 'unknown',
        turnId: 'unknown',
        state: 'stopped',
        connectionId: 'unknown',
        streamId: 'unknown',
        protocolVersion: 2,
      },
    ])
    runner.sendEnvelope(envelope)
    await fixture.drain()
    expect(await endWarnings()).toHaveLength(1)
  } finally {
    await fixture.actor.api.controls.captureWarnings(false)
    await fixture.chat.closeConnections()
  }
})

it('fails a new system-stopped turn without reading Stop history', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const turn = await startTurn(fixture, runner, session.id, 'system-stop')
  const history = vi.spyOn(ChatTransaction.prototype, 'history')
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const store = new ChatStore(fixture.storage, () => TEST_TIME)
  await store.change(
    WORKSPACE_ID,
    async (transaction) => {
      const savedSession = await transaction.session(session.id)
      if (!savedSession) throw new Error('The stopped session is missing.')
      const lifecycle = new TurnLifecycle(transaction, savedSession)
      await lifecycle.fail(
        turn.turnId,
        'The agent login is not available.',
        () => 'system-interrupt',
      )
      const stopping = await transaction.turn(turn.turnId)
      if (!stopping) throw new Error('The stopped turn is missing.')
      await lifecycle.workspaceStopped(stopping)
    },
    () => undefined,
  )
  expect(history).not.toHaveBeenCalled()
  expect(
    await store.read(WORKSPACE_ID, (view) => view.turn(turn.turnId)),
  ).toMatchObject({
    state: 'failed',
    error: {
      code: 'agent_login_required',
      message: 'The agent login is not available.',
    },
  })
  expect(warning.mock.calls).toEqual([
    [
      {
        kind: 'turn_ended_without_stop_request',
        message: 'A turn ended without a Stop request.',
        workspaceId: 'unknown',
        turnId: 'unknown',
        state: 'failed',
        connectionId: null,
        streamId: null,
        protocolVersion: null,
      },
    ],
  ])
})

it('completes a turn when its diagnostic lookup of an older Stop request fails', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const turn = await startTurn(fixture, runner, session.id, 'history-failure')
  const stop = sessionPaths.interrupt(fixture.org.id, WORKSPACE_ID, session.id)
  expect((await fixture.fetch(stop, { turnId: turn.turnId })).status).toBe(200)
  await fixture.changeWorkspace(WORKSPACE_ID, async (transaction) => {
    const stored = await transaction.turn(turn.turnId)
    if (!stored) throw new Error('The stopped turn is missing.')
    delete stored.stopRequest
    await transaction.saveTurn(stored)
  })
  const history = vi
    .spyOn(ChatTransaction.prototype, 'history')
    .mockRejectedValue(new Error('Injected diagnostic history read failure'))
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const store = new ChatStore(fixture.storage, () => TEST_TIME)
  await store.change(
    WORKSPACE_ID,
    async (transaction) => {
      const savedSession = await transaction.session(session.id)
      const stored = await transaction.turn(turn.turnId)
      if (!savedSession || !stored)
        throw new Error('The stopped turn is missing.')
      await new TurnLifecycle(transaction, savedSession).workspaceStopped(
        stored,
      )
    },
    () => undefined,
  )
  expect(history).toHaveBeenCalledTimes(1)
  expect(
    (await store.read(WORKSPACE_ID, (view) => view.turn(turn.turnId)))?.state,
  ).toBe('stopped')
  expect(warning).not.toHaveBeenCalled()
})
