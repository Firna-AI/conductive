import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { continueFixture } from './continue.test-support'
import { pendingContinue } from './continue-types'
import { readWorkspace } from './workspace-data'

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

it('holds dispatch and a second Continue until cancelled fetch or move commands settle', async () => {
  const f = await continueFixture(harness)
  for (const phase of ['fetch', 'move'] as const) {
    await f.resetContinue()
    const session = await f.createSession()
    const runner = await f.connect()
    runner.emit({ type: 'runner.ready' })
    await f.drain()
    await f.start()
    await f.advanceTo(phase)
    f.boat.commandRunning = true
    await f.coordinator.advance()
    await f.coordinator.cancel()
    await f.send(session.id, 'after-cancel')
    await f.coordinator.advance()
    expect(await pendingContinue(f.storage), phase).toBe(true)
    expect(runner.commands, phase).toEqual([])
    await expect(f.start({}, f.ownerUser), phase).rejects.toMatchObject({
      code: 'workspace_continuing',
    })
    f.boat.commandRunning = false
    f.reconstruct()
    await f.finish()
    const row = await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)
    expect(row.branch.startsWith('octocat/'), phase).toBe(true)
    expect(row.branch === 'octocat/test', phase).toBe(phase === 'fetch')
    expect(runner.commands, phase).toHaveLength(1)
    expect(runner.commands[0], phase).toMatchObject({
      type: 'turn',
      branches: { workspaceBranch: row.branch, targetBranch: 'main' },
    })
    runner.disconnect()
  }
})

it('reconciles a successful move after member removal without dispatching against the old branch', async () => {
  const f = await continueFixture(harness)
  const session = await f.createSession()
  await f.start()
  await f.advanceTo('move')
  f.boat.commandRunning = true
  await f.coordinator.advance()
  await f.env.DB.prepare(
    'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
  )
    .bind(f.org.id, f.member.id)
    .run()
  await f.coordinator.advance()
  expect(await pendingContinue(f.storage)).toBe(true)
  f.boat.commandRunning = false
  await f.finish()
  const row = await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)
  expect(row.branch).not.toBe('octocat/test')
  expect(
    (await f.history(session.id)).events.filter(
      ({ event }) => event.type === 'workspace.continued',
    ),
  ).toHaveLength(1)
})

it('recovers a saved resume admission before its native start call and keeps waiting for readiness', async () => {
  const f = await continueFixture(harness)
  await f.env.DB.prepare("UPDATE workspaces SET state = 'stopped' WHERE id = ?")
    .bind(WORKSPACE_ID)
    .run()
  const pending = await f.start()
  const job = await f.advanceTo('resume')
  job.resumeQueued = true
  await f.coordinator.save(job)
  f.reconstruct()
  await f.coordinator.advance()
  expect(f.resumed).toEqual([WORKSPACE_ID])
  await f.finish()
  expect(f.resumed).toEqual([WORKSPACE_ID])
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  expect(await f.result(pending.continueId)).toMatchObject({
    state: 'continued',
  })
})
