import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { recordUserSuspension } from '../operator/data'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
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
it('closes an idle runner after owner suspension without a queued message', async () => {
  const fixture = await createChatFixture(harness)
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  await recordUserSuspension(harness.env.DB, 7, fixture.member.id, TEST_TIME)
  await fixture.clock.advance(15000)
  expect(fixture.transport.closedConnections).toBe(1)
  expect(runner.commands).toEqual([])
})
it.each(['archived', 'deleted', 'suspended'] as const)(
  'refuses runner titles and file results after the workspace is %s',
  async (change) => {
    const results: unknown[] = []
    const fixture = await createChatFixture(harness, {
      receiveFileResult: async (value) => {
        results.push(value)
      },
    })
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const before = await fixture.chat.readWorkspace(WORKSPACE_ID, (view) =>
      view.history(0),
    )
    if (change === 'archived') {
      await harness.env.DB.prepare(
        'UPDATE workspaces SET archived_at = ? WHERE id = ?',
      )
        .bind(TEST_TIME, WORKSPACE_ID)
        .run()
    } else if (change === 'deleted') {
      await harness.env.DB.prepare(
        'UPDATE orgs SET deleted_at = ? WHERE id = ?',
      )
        .bind(TEST_TIME, fixture.org.id)
        .run()
    } else {
      await harness.env.DB.prepare(
        'UPDATE users SET suspended_at = ? WHERE id = ?',
      )
        .bind(TEST_TIME, fixture.owner.id)
        .run()
    }
    runner.reply({
      type: 'file.read.result',
      requestId: 'stale-file-request',
      result: {
        ok: false,
        error: {
          code: 'file_unavailable',
          message: 'The file is not available.',
        },
      },
    })
    runner.emit({ type: 'workspace.title', name: 'Forbidden title' })
    await fixture.drain()
    expect(fixture.transport.closedConnections).toBe(1)
    expect(
      await fixture.chat.readWorkspace(WORKSPACE_ID, (view) => view.history(0)),
    ).toEqual(before)
    expect(results).toEqual([])
  },
)
