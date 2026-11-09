import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import {
  fullReport,
  oversizedReport,
  refreshCommands,
} from './runner-repairs.test-support'
import { sessionRecord } from './retry.test-support'
import type { TitleModelCall } from './title-model'
import { createTitleFixture } from './workspace-title.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterEach(() => {
  vi.restoreAllMocks()
})
afterAll(async () => {
  await harness.dispose()
})

it.each(['first request', 'retry'] as const)(
  'asks for no title after a name is set before the %s',
  async (phase) => {
    const run = vi
      .fn<TitleModelCall>()
      .mockResolvedValue({ response: 'Automatic replacement' })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { fixture, first, acceptFirst, drain } = await createTitleFixture(
      harness,
      run,
    )
    if (phase === 'retry') {
      run.mockResolvedValueOnce({ response: '' })
      await acceptFirst()
      await drain()
      expect(run).toHaveBeenCalledTimes(1)
    }
    await fixture.env.DB.prepare('UPDATE workspaces SET name = ? WHERE id = ?')
      .bind('Client name', WORKSPACE_ID)
      .run()
    if (phase === 'first request') await acceptFirst()
    else await fixture.send(first.sessionId, 'after-client-name')
    await drain()
    expect(run).toHaveBeenCalledTimes(phase === 'first request' ? 0 : 1)
    expect((await sessionRecord(fixture, first.sessionId)).title).toBeNull()
    expect(
      await fixture.env.DB.prepare('SELECT name FROM workspaces WHERE id = ?')
        .bind(WORKSPACE_ID)
        .first('name'),
    ).toBe('Client name')
  },
)

it('ends a title repair and confirms a skipped runner report without changing the name or history', async () => {
  const fixture = await createChatFixture(harness)
  await fixture.env.DB.prepare('UPDATE workspaces SET name = ? WHERE id = ?')
    .bind('Client name', WORKSPACE_ID)
    .run()
  const runner = await fixture.connect()
  runner.emit(oversizedReport('workspace.title'))
  await fixture.drain()
  expect(refreshCommands(runner)).toHaveLength(1)
  const before = await fixture.chat.readWorkspace(WORKSPACE_ID, (view) =>
    view.history(0),
  )
  runner.emit(fullReport('workspace.title'))
  await fixture.drain()
  expect(
    await fixture.chat.readWorkspace(WORKSPACE_ID, (view) =>
      view.repairs.get('workspace.title'),
    ),
  ).toBeUndefined()
  expect(runner.received.at(-1)).toEqual({
    type: 'confirm',
    streamId: 'fake-stream-1',
    throughEventNumber: 2,
  })
  expect(runner.pendingEvents()).toEqual([])
  expect(
    await fixture.chat.readWorkspace(WORKSPACE_ID, (view) => view.history(0)),
  ).toEqual(before)
  expect(
    await fixture.env.DB.prepare('SELECT name FROM workspaces WHERE id = ?')
      .bind(WORKSPACE_ID)
      .first('name'),
  ).toBe('Client name')
  fixture.restart()
  await fixture.connect(runner)
  expect(refreshCommands(runner)).toHaveLength(1)
})
