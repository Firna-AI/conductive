import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createHarness, type TestHarness } from '../test-support/harness'
import { captureEnvironment, outputFixture } from './runner-output.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { part, sourceRecords } from './tool-detail.test-support'
import { encrypt } from '../security/crypto'
import { temporaryValueContext } from '../secrets/request-records'

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

it('retries encrypted private state after rollback and restart, releases expired matching ends, and replays one completed update', async () => {
  const f = await outputFixture(harness, {})
  const tab = await f.tab()
  await f.changeWorkspace(WORKSPACE_ID, async (view) => {
    await view.secrets.saveValue({
      id: 'temporary',
      name: 'COMMAND_TOKEN',
      suppliedBy: {
        id: f.owner.id,
        githubLogin: 'owner',
        displayName: null,
        avatarUrl: null,
      },
      createdAt: f.clock.now(),
      ciphertext: await encrypt(
        'command-private-value',
        temporaryValueContext(WORKSPACE_ID, 'temporary'),
        f.env.BOAT_KEY_ENCRYPTION_KEY,
      ),
      sessionId: f.context.sessionId,
      expiresAt: f.clock.now() + 1,
    })
  })
  await f.setStorageHooks({
    beforeCommit: async (staged) => {
      const cursor = await staged.read(WORKSPACE_ID, (view) =>
        view.cursor('fake-stream-1'),
      )
      if (cursor === 3) throw new Error('Injected private source rollback')
    },
  })
  const first = f.runner.emit(part(f.context, 'ordinary command-private-', 1))
  await expect(f.drain()).rejects.toThrow('Injected private source rollback')
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.cursor('fake-stream-1'),
    ),
  ).toBe(2)
  expect(sourceRecords((await f.snapshot()).records).size).toBe(0)
  expect(f.runner.pendingEvents()).toHaveLength(1)
  await f.clearFaults()
  await f.connect(f.runner)
  expect(f.runner.pendingEvents()).toEqual([])
  f.runner.sendEnvelope(first)
  f.runner.sendEnvelope({ ...first, eventNumber: 5 })
  await f.drain()
  expect(f.runner.received).toContainEqual({
    type: 'resend',
    streamId: 'fake-stream-1',
    fromEventNumber: 4,
  })
  const stored = JSON.stringify([...(await f.snapshot()).records])
  expect(stored).not.toContain('command-private-')
  expect(stored).not.toContain('ordinary command')
  const savedSource = sourceRecords((await f.snapshot()).records)
  expect(savedSource.size).toBeGreaterThan(0)
  await f.clock.advance(2)
  await f.changeWorkspace(WORKSPACE_ID, (view) =>
    view.secrets.expire(f.clock.now()),
  )
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) => view.secrets.values()),
  ).toEqual([])
  await captureEnvironment(f, { LATER: { value: 'secretpass', secret: true } })
  await f.restart()
  await f.connect(f.runner)
  expect(f.runner.received.at(-1)).toMatchObject({
    type: 'welcome',
    confirmedThrough: 3,
  })
  await f.setStorageHooks({
    beforeCommit: async (staged) => {
      const cursor = await staged.read(WORKSPACE_ID, (view) =>
        view.cursor('fake-stream-1'),
      )
      if (cursor === 4) throw new Error('Injected final source rollback')
    },
  })
  const final = f.runner.emit(
    part(f.context, 'value|command-private-value! secretpass', 2, true),
  )
  await expect(f.drain()).rejects.toThrow('Injected final source rollback')
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.cursor('fake-stream-1'),
    ),
  ).toBe(3)
  expect(sourceRecords((await f.snapshot()).records)).toEqual(savedSource)
  await f.clearFaults()
  await f.connect(f.runner)
  f.runner.sendEnvelope(final)
  f.runner.sendEnvelope({ ...final, eventNumber: 6 })
  await f.drain()
  expect(f.runner.received).toContainEqual({
    type: 'resend',
    streamId: 'fake-stream-1',
    fromEventNumber: 5,
  })
  const history = await f.history(f.context.sessionId)
  const tools = history.events.filter(
    ({ event }) => event.type === 'tool.updated',
  )
  expect(tools).toHaveLength(1)
  expect(tools[0]?.event).toMatchObject({
    type: 'tool.updated',
    tool: {
      detail:
        'ordinary command-private-value|command-private-value! [redacted]',
      target: '[redacted]',
      omittedDetailBytes: 17,
    },
  })
  const replay = await f.tab()
  expect(
    replay.messages
      .flatMap((message) =>
        message.type === 'history' ? message.history.events : [],
      )
      .filter(({ event }) => event.type === 'tool.updated'),
  ).toEqual(tools)
  expect(JSON.stringify(history)).toContain('command-private-value')
  expect(
    await f.chat.store.read(WORKSPACE_ID, (view) =>
      view.output.readTool('fake-stream-1'),
    ),
  ).toBeUndefined()
  expect(sourceRecords((await f.snapshot()).records).size).toBe(0)
  await tab.close()
  await replay.close()
})
