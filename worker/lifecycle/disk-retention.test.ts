import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { keepWorkspaceDisk } from './disk-retention'
import { readRetention } from './retention-data'
import { createWorkspace } from './workspaces'
import { openWorkspace } from './workspace-resume'
import { reconcileWorkspaceSandbox } from './workspace-actions'

const backendFixture = setupBackendTests()

it('keeps a stopped disk through startup and stop failures without a stale stop after user open', async () => {
  const fixture = await backendFixture()
  try {
    const { runtime, org, user, boat } = fixture
    const created = await createWorkspace(runtime, org.id, user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    })
    const durable = fixture.fixtures.get(created.workspace.id)
    if (!durable) throw new Error('Missing durable state')
    const context = {
      env: runtime.env,
      dependencies: runtime.dependencies,
      orgId: org.id,
      workspaceId: created.workspace.id,
    }
    durable.hooks.keepalive.mockImplementation(() => keepWorkspaceDisk(context))
    await durable.lifecycle.runnerReady()
    await durable.lifecycle.runnerDisconnected()
    boat.states.set('bx_1', 'archived')
    expect(await reconcileWorkspaceSandbox(context)).toBe('stopped')
    await durable.lifecycle.stopped()
    fixture.setTime(TEST_TIME + 1_123_200_000)
    await durable.lifecycle.alarm()
    expect(boat.resumeIds).toEqual(['bx_1'])
    expect(
      await readRetention(runtime.env.DB, created.workspace.id),
    ).toMatchObject({ phase: 'wait' })
    boat.states.set('bx_1', 'archived')
    await durable.lifecycle.alarm()
    expect(
      await readRetention(runtime.env.DB, created.workspace.id),
    ).toMatchObject({ phase: 'resume' })
    expect((await durable.lifecycle.read())?.nextDiskKeepaliveAt).toBe(
      TEST_TIME + 1_123_200_000,
    )
    await durable.lifecycle.alarm()
    await durable.lifecycle.alarm()
    boat.synchronousExitCode = 1
    await durable.lifecycle.alarm()
    expect(await readRetention(runtime.env.DB, created.workspace.id)).toEqual({
      phase: 'stop',
      error: 'The startup script failed during disk retention.',
    })
    expect(boat.commands.at(-1)).toContain(
      '/run/conducting/retention-startup.sh',
    )
    boat.failStop = true
    await expect(durable.lifecycle.alarm()).rejects.toMatchObject({
      kind: 'unavailable',
    })
    expect((await durable.lifecycle.read())?.nextDiskKeepaliveAt).toBe(
      TEST_TIME + 1_123_200_000,
    )
    expect(boat.resumeIds).toEqual(['bx_1', 'bx_1'])
    boat.failStop = false
    boat.synchronousExitCode = 0
    await openWorkspace(
      runtime,
      org.id,
      created.workspace.id,
      user.id,
      'tab-one',
    )
    expect(await readRetention(runtime.env.DB, created.workspace.id)).toBe(null)
    expect(boat.resumeIds).toEqual(['bx_1', 'bx_1', 'bx_1'])
    expect(await durable.lifecycle.read()).toMatchObject({
      state: 'starting',
      start: { kind: 'resume' },
      nextDiskKeepaliveAt: null,
    })
    const stops = boat.stopIds.length
    await durable.lifecycle.alarm()
    expect(boat.stopIds).toHaveLength(stops)
    expect(boat.deletedIds).toEqual([])
  } finally {
    await fixture.dispose()
  }
})
