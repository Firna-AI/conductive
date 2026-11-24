import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import type { RunnerEvent } from '../../src/shared/generated/RunnerEvent'
import { createHarness, type TestHarness } from '../test-support/harness'
import { FakeRunner } from '../test-support/fake-runner'
import { heldOperation } from '../test-support/held-operation'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { captureEnvironment } from './runner-output.test-support'
import {
  refreshCommands,
  refusedEvents,
  workspaceEvents,
} from './runner-repairs.test-support'
import { failure, readState } from './workspace-read-state.test-support'
import { READ_STATE_RECOVERY } from './workspace-read-recovery'
import { chatEventKey } from './storage-keys'
import { sessionAnswer } from './history-session-index.test-support'
import { workspaceUpdate } from './workspace-update'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('stores and streams masked bounded port reports to every tab and replays them after restart', async () => {
  const fixture = await createChatFixture(harness)
  await captureEnvironment(fixture, {
    KEY: { value: 'x', secret: true },
    PASSWORD: { value: 'secretpass', secret: true },
    PUBLIC: { value: 'visible', secret: false },
  })
  const first = await fixture.tab()
  const second = await fixture.tab()
  const runner = await fixture.connect()
  const event: RunnerEvent = {
    type: 'ports.updated',
    ports: [
      { port: 3000, name: 'x'.repeat(40), folder: 'x'.repeat(120) },
      {
        port: 3001,
        name: 'development-server-entry-point secretpass',
        folder: `/home/user/code/web/secretpass/${'z'.repeat(115)}`,
      },
      { port: 5173, name: 'visible', folder: null },
    ],
  }
  const sent = runner.emit(event)
  await fixture.drain()
  runner.sendEnvelope(sent)
  await fixture.drain()
  const expected = {
    type: 'ports.updated',
    ports: [
      {
        port: 3000,
        name: '[redacted]'.repeat(4),
        folder: `…${'[redacted]'.repeat(12).slice(-119)}`,
      },
      {
        port: 3001,
        name: 'development-server-entry-point [redacted',
        folder: `…ed]/${'z'.repeat(115)}`,
      },
      { port: 5173, name: 'visible', folder: null },
    ],
  }
  expect(await workspaceEvents(fixture)).toEqual([expected])
  const committed = await fixture.chat.store.read(WORKSPACE_ID, (view) =>
    view.history(0),
  )
  const live = committed.events.map((envelope) => ({ type: 'event', envelope }))
  expect(first.messages.slice(1)).toEqual(live)
  expect(second.messages.slice(1)).toEqual(live)
  expect(await fixture.chat.workspaceSummary()).toEqual({
    throughEventNumber: 1,
    lastOutputEventNumber: 0,
    working: false,
  })
  await fixture.restart()
  const replay = await fixture.tab()
  expect(replay.messages).toEqual([{ type: 'history', history: committed }])
  expect(await refusedEvents(fixture)).toEqual([])
  await first.close()
  await second.close()
  await replay.close()
})

it('refuses invalid port reports and persists one repair until a valid full replacement arrives', async () => {
  const fixture = await createChatFixture(harness)
  await harness.env.DB.prepare('DELETE FROM agent_logins').run()
  const tab = await fixture.tab()
  const runner = await fixture.connect()
  const invalid: RunnerEvent = {
    type: 'ports.updated',
    ports: [{ port: 0, name: null, folder: null }],
  }
  const refused = runner.emit(invalid)
  await fixture.drain()
  const command = refreshCommands(runner)[0]
  expect(command).toEqual({
    type: 'report.refresh',
    commandId: 'chat-0001',
    kind: 'ports.updated',
  })
  expect(await refusedEvents(fixture)).toEqual([
    {
      type: 'runner.event-refused',
      streamId: 'fake-stream-1',
      runnerEventNumber: 1,
      runnerEventType: 'ports.updated',
      reason: 'invalid',
      sessionId: null,
      turnId: null,
    },
  ])
  runner.sendEnvelope(refused)
  await fixture.drain()
  expect(refreshCommands(runner)).toEqual([command])
  await fixture.disconnect(runner)
  await fixture.restart()
  await fixture.connect(runner)
  expect(refreshCommands(runner)).toEqual([command, command])
  runner.emit(invalid)
  await fixture.drain()
  expect((await refusedEvents(fixture)).at(-1)).toEqual({
    type: 'runner.event-refused',
    streamId: 'fake-stream-1',
    runnerEventNumber: 2,
    runnerEventType: 'ports.updated',
    reason: 'invalid',
    sessionId: null,
    turnId: null,
    repairFailed: true,
  })
  await fixture.disconnect(runner)
  await fixture.restart()
  await fixture.connect(runner)
  expect(refreshCommands(runner)).toEqual([command, command])
  const replay = await fixture.tab()
  expect(replay.messages).toEqual([
    {
      type: 'history',
      history: await fixture.chat.store.read(WORKSPACE_ID, (view) =>
        view.history(0),
      ),
    },
  ])
  runner.emit({ type: 'ports.updated', ports: [] })
  await fixture.drain()
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, (view) =>
      view.repairs.get('ports.updated'),
    ),
  ).toBeUndefined()
  runner.emit(invalid)
  await fixture.drain()
  expect(refreshCommands(runner)).toEqual([
    command,
    command,
    { type: 'report.refresh', commandId: 'chat-0002', kind: 'ports.updated' },
  ])
  await tab.close()
  await replay.close()
})

it('keeps the first port failure on resend and starts a new one after Stop', async () => {
  const fixture = await createChatFixture(harness)
  const read = () => readState(fixture.chat.store, WORKSPACE_ID)
  await read()
  let now = 21
  const runner = await fixture.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, now: () => now }),
  )
  const invalid: RunnerEvent = {
    type: 'ports.updated',
    ports: [{ port: 0, name: null, folder: null }],
  }
  runner.emit(invalid)
  now = 22
  const firstFailure = runner.emit(invalid)
  await fixture.drain()
  runner.sendEnvelope(firstFailure)
  now = 23
  runner.emit(invalid)
  await fixture.drain()
  expect(await read()).toMatchObject({
    eventNumber: 3,
    state: {
      failures: { 'ports.updated': failure('ports.updated', 2, 22, 2) },
    },
  })
  await fixture.chat.stopWorkspace(WORKSPACE_ID)
  await fixture.drain()
  expect(await read()).toMatchObject({
    eventNumber: 4,
    state: {
      ports: {
        eventNumber: 4,
        occurredAt: fixture.clock.now(),
        event: { type: 'ports.updated', ports: null },
      },
      failures: { 'ports.updated': null },
    },
  })
  await fixture.connect(runner)
  now = 24
  runner.emit(invalid)
  await fixture.drain()
  expect(await read()).toMatchObject({
    eventNumber: 5,
    state: {
      failures: { 'ports.updated': failure('ports.updated', 5, 24, 4) },
    },
  })
})

it('includes a runner receipt that commits between two recovery pages', async () => {
  const fixture = await createChatFixture(harness)
  await captureEnvironment(fixture, {})
  const runner = await fixture.connect()
  const workspace = await workspaceUpdate(
    fixture.env.DB,
    fixture.org.id,
    WORKSPACE_ID,
  )
  await fixture.changeWorkspace(WORKSPACE_ID, async (view) => {
    await view.emit(workspace)
    for (let n = 0; n < 7; n++) await view.emit(sessionAnswer(`prior-${n}`))
  })
  const invalid: RunnerEvent = {
    type: 'ports.updated',
    ports: [{ port: 0, name: null, folder: null }],
  }
  runner.emit(invalid)
  runner.emit(invalid)
  await fixture.drain()
  const held = heldOperation()
  const order: string[] = []
  let checkpoints = 0
  await fixture.setStorageHooks({
    afterCommit: async ({ writes }) => {
      if (writes.includes(chatEventKey(11))) order.push('runner receipt')
      if (!writes.includes(READ_STATE_RECOVERY)) return
      checkpoints++
      if (checkpoints === 2) {
        order.push('first page')
        await held.wait()
      }
      if (checkpoints === 3) order.push('second page')
    },
  })
  const reading = readState(fixture.chat.store, WORKSPACE_ID)
  try {
    expect(
      await Promise.race([
        held.entered.then(() => 'first page'),
        reading.then(() => 'read finished before a page'),
      ]),
    ).toBe('first page')
    const observed = await fixture.observeNextQueued()
    runner.emit({ type: 'ports.updated', ports: [] })
    await observed.queued
    held.release()
    expect(await reading).toMatchObject({
      eventNumber: 11,
      state: {
        repositoryId: 'repo',
        ports: {
          eventNumber: 11,
          occurredAt: 1_800_000_000_000,
          event: { type: 'ports.updated', ports: [] },
        },
        failures: { 'ports.updated': null },
      },
    })
    expect(order).toEqual(['first page', 'runner receipt', 'second page'])
    await observed.restore()
    await fixture.drain()
  } finally {
    held.release()
    await fixture.clearFaults()
    await reading
  }
})
