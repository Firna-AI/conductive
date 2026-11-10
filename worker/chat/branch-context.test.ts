import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { retryMessagePath, sessionPaths } from '../../src/shared/sessions'
import type { RunnerProtocolVersion } from '../../src/shared/runner'
import { FakeRunner } from '../test-support/fake-runner'
import { createHarness, type TestHarness } from '../test-support/harness'
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

async function checkBranches(protocolVersion: RunnerProtocolVersion) {
  const f = await createChatFixture(harness)
  const session = await f.createSession()
  const runner = await f.connect(
    new FakeRunner({ workspaceId: WORKSPACE_ID, protocolVersion }),
  )
  runner.emit({ type: 'runner.ready' })
  await f.drain()
  await f.send(session.id, 'first')
  const first = runner.commands[0]
  if (first?.type !== 'turn') throw new Error('Missing first turn.')
  expect('login' in first).toBe(protocolVersion === 1)
  expect('credential' in first).toBe(protocolVersion === 2)
  expect(first.branches).toEqual({
    workspaceBranch: 'octocat/test',
    targetBranch: 'main',
  })
  await f.env.DB.batch([
    f.env.DB.prepare('UPDATE workspaces SET branch = ? WHERE id = ?').bind(
      'octocat/next',
      WORKSPACE_ID,
    ),
    f.env.DB.prepare(
      'UPDATE repositories SET default_branch = ? WHERE id = ?',
    ).bind('trunk', 'repo'),
  ])
  await f.send(session.id, 'during')
  expect(runner.commands.at(-1)).toMatchObject({
    type: 'message',
    branches: { workspaceBranch: 'octocat/next', targetBranch: 'trunk' },
  })
  runner.disconnect()
  await f.env.DB.prepare(
    'UPDATE repositories SET default_branch = ? WHERE id = ?',
  )
    .bind('stable', 'repo')
    .run()
  await f.connect(runner)
  expect(runner.commands.at(-1)).toMatchObject({
    branches: { workspaceBranch: 'octocat/next', targetBranch: 'stable' },
  })
  runner.emit({
    type: 'turn.failed',
    sessionId: session.id,
    turnId: first.turnId,
    error: { code: 'test_failure', message: 'Try again.' },
    retryMessageId: 'during',
    durationMs: 0,
  })
  await f.drain()
  const retried = await f.fetch(
    retryMessagePath(f.org.id, WORKSPACE_ID, session.id, 'during'),
    {},
  )
  expect(retried.status).toBe(202)
  expect(runner.commands.at(-1)).toMatchObject({
    type: 'turn',
    branches: { workspaceBranch: 'octocat/next', targetBranch: 'stable' },
  })
  const retry = runner.commands.at(-1)
  if (retry?.type !== 'turn') throw new Error('Missing retry turn.')
  runner.emit({
    type: 'turn.completed',
    sessionId: session.id,
    turnId: retry.turnId,
    state: 'finished',
    durationMs: 0,
    files: [],
    omittedFileCount: 0,
    userMessageIds: ['during'],
  })
  await f.drain()
  const idle = await f.createSession()
  expect(
    (
      await f.fetch(sessionPaths.close(f.org.id, WORKSPACE_ID, idle.id), {
        stopRunningTurn: false,
      })
    ).status,
  ).toBe(200)
  expect(
    (await f.fetch(sessionPaths.reopen(f.org.id, WORKSPACE_ID, idle.id), {}))
      .status,
  ).toBe(200)
  await f.send(idle.id, 'reopened')
  expect(runner.commands.at(-1)).toMatchObject({
    type: 'turn',
    branches: { workspaceBranch: 'octocat/next', targetBranch: 'stable' },
  })
  const fresh = await f.createSession()
  await f.send(fresh.id, 'new-session')
  expect(runner.commands.at(-1)).toMatchObject({
    sessionId: fresh.id,
    branches: { workspaceBranch: 'octocat/next', targetBranch: 'stable' },
  })
  expect(JSON.stringify((await f.history(session.id)).events)).not.toContain(
    'Current branches:',
  )
}

it.each([1, 2] as const)(
  'reads current branches for each turn, in-turn message, reconnect, retry, and reopened session on protocol %s',
  checkBranches,
)
