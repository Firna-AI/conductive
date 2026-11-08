import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { readRetention } from './retention-data'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { resumeWorkspace } from './workspace-resume'
import { reconcileWorkspaceSandbox } from './workspace-actions'

const backendFixture = setupBackendTests()

it('keeps a stopped disk through startup and stop failures without a stale stop after user open', async () => {
  const fixture = await backendFixture()
  try {
    const { runtime, org, user, boat } = fixture
    const created = await fixture.run(() =>
      createCompletedWorkspace(runtime, org.id, user, {
        repositoryId: fixture.repositoryId,
        firstMessage: FIRST_MESSAGE,
      }),
    )
    const actor = fixture.actors.get(created.workspace.id)?.endpoint()
    if (!actor) throw new Error('Missing production controller')
    const context = {
      env: runtime.env,
      dependencies: runtime.dependencies,
      orgId: org.id,
      workspaceId: created.workspace.id,
    }
    await actor.reportRunnerLifecycle({ type: 'runner.ready' })
    await actor.runnerLifecycleDisconnected()
    boat.states.set('bx_1', 'archived')
    expect(await reconcileWorkspaceSandbox(context)).toBe('stopped')
    fixture.setTime(TEST_TIME)
    await actor.lifecycleStopped()
    fixture.setTime(TEST_TIME + 1_123_200_000)
    await actor.alarm()
    expect(boat.resumeIds).toEqual(['bx_1'])
    expect(
      await readRetention(runtime.env.DB, created.workspace.id),
    ).toMatchObject({ phase: 'wait' })
    boat.states.set('bx_1', 'archived')
    await actor.alarm()
    expect(
      await readRetention(runtime.env.DB, created.workspace.id),
    ).toMatchObject({ phase: 'resume' })
    expect((await actor.readLifecycle())?.nextDiskKeepaliveAt).toBe(
      TEST_TIME + 1_123_200_000,
    )
    await actor.alarm()
    await actor.alarm()
    boat.commandExitCode = 1
    await actor.alarm()
    await actor.alarm()
    expect(await readRetention(runtime.env.DB, created.workspace.id)).toEqual({
      phase: 'stop',
      error: 'The startup script failed during disk retention.',
    })
    expect(boat.commands.at(-1)).toContain(
      '/run/conductive/retention-startup.sh',
    )
    boat.failStop = true
    await actor.alarm()
    expect(
      await readRetention(runtime.env.DB, created.workspace.id),
    ).toMatchObject({ phase: 'stop' })
    expect((await actor.readLifecycle())?.nextDiskKeepaliveAt).toBe(
      TEST_TIME + 1_123_200_000,
    )
    expect(boat.resumeIds).toEqual(['bx_1', 'bx_1'])
    boat.failStop = false
    boat.commandExitCode = 0
    await fixture.run(() =>
      resumeWorkspace(runtime, org.id, created.workspace.id, user.id),
    )
    expect(await readRetention(runtime.env.DB, created.workspace.id)).toBe(null)
    expect(boat.resumeIds).toEqual(['bx_1', 'bx_1', 'bx_1'])
    expect(await actor.readLifecycle()).toMatchObject({
      state: 'ready',
      start: { kind: 'resume' },
      nextDiskKeepaliveAt: null,
    })
    const stops = boat.stopIds.length
    await actor.alarm()
    expect(boat.stopIds).toHaveLength(stops)
    expect(boat.deletedIds).toEqual([])
  } finally {
    await fixture.dispose()
  }
})

it('ends failed maintenance and refuses destructive resume of a normal errored workspace', async () => {
  const fixture = await backendFixture()
  try {
    const { runtime, org, user, boat } = fixture
    const created = await fixture.run(() =>
      createCompletedWorkspace(runtime, org.id, user, {
        repositoryId: fixture.repositoryId,
        firstMessage: FIRST_MESSAGE,
      }),
    )
    const actor = fixture.actors.get(created.workspace.id)?.endpoint()
    if (!actor) throw new Error('Missing production controller')
    // A failed maintenance restart can be stopped safely, then resumed normally.
    fixture.setTime(TEST_TIME)
    boat.states.set('bx_1', 'archived')
    await actor.lifecycleStopped()
    fixture.setTime(TEST_TIME + 1_123_200_000)
    await actor.alarm()
    boat.states.set('bx_1', 'error')
    boat.failStop = true
    await expect(
      fixture.run(() =>
        resumeWorkspace(runtime, org.id, created.workspace.id, user.id),
      ),
    ).rejects.toMatchObject({ code: 'workspace_start_failed' })
    expect(
      await readRetention(runtime.env.DB, created.workspace.id),
    ).toMatchObject({
      phase: 'stop',
      error: 'The cloud computer failed during disk retention.',
    })
    await actor.lifecycleActivity()
    boat.failStop = false
    await actor.alarm()
    expect(await readRetention(runtime.env.DB, created.workspace.id)).toBe(null)
    await fixture.run(() =>
      resumeWorkspace(runtime, org.id, created.workspace.id, user.id),
    )
    expect((await actor.readLifecycle())?.startupPrepared).toBe(true)
    // A normal user's error can contain unsaved writes. Never resume it automatically.
    await actor.reportRunnerLifecycle({ type: 'runner.ready' })
    await actor.lifecycleFailed({
      code: 'sandbox_failed',
      message: 'The cloud computer failed.',
      log: null,
    })
    boat.states.set('bx_1', 'error')
    const resumes = boat.resumeIds.length
    await expect(
      fixture.run(() =>
        resumeWorkspace(runtime, org.id, created.workspace.id, user.id),
      ),
    ).rejects.toMatchObject({ code: 'workspace_start_failed' })
    expect(boat.resumeIds).toHaveLength(resumes)
    expect(boat.deletedIds).toEqual([])
    expect((await actor.readLifecycle())?.pendingFirstMessage).toEqual(
      FIRST_MESSAGE,
    )
  } finally {
    await fixture.dispose()
  }
})
