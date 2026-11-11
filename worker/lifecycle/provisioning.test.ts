import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { FIRST_MESSAGE } from './durable-test-support'
import { createWorkspace } from './workspaces'
import type { WorkspaceStartJob } from './start-types'
import { stopWorkspaceSandbox } from './workspace-actions'

const backendFixture = setupBackendTests()

it('recovers an accepted create after its caller closes and the actor restarts', async () => {
  const fixture = backendFixture()
  try {
    fixture.pauseStarts()
    const input = {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }
    // The caller leaves while its response waits. The actor keeps the job.
    const firstQueue = fixture.nextQueued()
    const abandoned = createWorkspace(
      fixture.runtime,
      fixture.org.id,
      fixture.user,
      input,
    ).catch(() => {})
    const id = await firstQueue
    const actor = fixture.starts.get(id)
    if (!actor) throw new Error('Missing actor coordinator')
    await actor.advance()
    await actor.advance()
    await actor.advance()
    await actor.advance()
    fixture.boat.statusChunkSize = 4
    await actor.advance()
    expect(await actor.job()).toMatchObject({
      phase: 'fetch',
      processId: 1,
      stdoutOffset: 4,
    })
    await abandoned
    await actor.restart()
    fixture.boat.statusChunkSize = Infinity
    const heldRead = await actor.holdResultRead()
    let settled = false
    const waiting = actor.wait().then((result) => {
      settled = true
      return result
    })
    await heldRead.entered
    try {
      for (let step = 0; step < 12 && (await actor.job()); step++) {
        if ((await actor.job())?.phase === 'runner')
          await fixture.actors
            .get(id)
            ?.endpoint()
            .reportRunnerLifecycle({ type: 'runner.ready' })
        await actor.advance()
      }
      expect(await actor.job()).toBeUndefined()
      expect(settled).toBe(true)
    } finally {
      heldRead.release()
    }
    expect(await waiting).toEqual({ ok: true })
    const reopened = await createWorkspace(
      fixture.runtime,
      fixture.org.id,
      fixture.user,
      input,
    )
    expect(reopened.workspace.id).toBe(id)
    expect(fixture.boat.starts).toHaveLength(1)
    expect(fixture.boat.commands).toHaveLength(4)
    expect(fixture.boat.commandRequests.at(-1)).toMatchObject({
      detached: true,
      command: expect.stringContaining(
        'systemctl start conductive-terminal.service',
      ),
    })
    expect(await fixture.runtime.workspace(id).readLifecycle()).toMatchObject({
      state: 'ready',
      startupPrepared: true,
      pendingFirstMessage: FIRST_MESSAGE,
    })
    const endpoint = fixture.runtime.workspace(id)
    const context = {
      env: fixture.runtime.env,
      dependencies: fixture.runtime.dependencies,
      orgId: fixture.org.id,
      workspaceId: id,
    }
    await stopWorkspaceSandbox(context)
    await endpoint.lifecycleStopped()
    const base = actor.lastAccepted()
    if (!base) throw new Error('Missing accepted create')
    const resume: WorkspaceStartJob = {
      ...base,
      kind: 'resume',
      admission: undefined,
      phase: 'machine',
      imageName: null,
      attempt: 'cancel-resume',
      allocatedSandboxId: 'bx_1',
    }
    expect(await endpoint.queueLifecycleStart(resume)).toBe(true)
    expect(await fixture.nextQueued()).toBe(id)
    await actor.advance()
    await actor.advance()
    await actor.advance()
    await stopWorkspaceSandbox(context)
    await endpoint.lifecycleStopped()
    await actor.advance()
    expect(await actor.wait()).toMatchObject({
      ok: false,
      error: { code: 'workspace_start_stopped' },
    })
    expect((await endpoint.readLifecycle())?.state).toBe('stopped')
    const resumeCount = fixture.boat.resumeIds.length
    await fixture.advanceTo(fixture.runtime.dependencies.now() + 1_000, id)
    expect(fixture.boat.resumeIds).toHaveLength(resumeCount)
    expect(fixture.boat.deletedIds).toEqual([])
    const heldAdmission = await actor.holdAdmission()
    const stale = actor.queueForEpochGuard({
      ...resume,
      attempt: 'cancel-before-admission',
    })
    await heldAdmission.entered
    await endpoint.lifecycleStopped()
    heldAdmission.release()
    expect(await stale).toBe(false)
    expect(fixture.boat.resumeIds).toHaveLength(resumeCount)

    const secondQueue = fixture.nextQueued()
    void createWorkspace(fixture.runtime, fixture.org.id, fixture.user, {
      ...input,
      firstMessage: { ...FIRST_MESSAGE, id: 'second-message' },
    }).catch(() => {})
    const cancelledId = await secondQueue
    const cancelled = fixture.starts.get(cancelledId)
    if (!cancelled) throw new Error('Missing canceled create')
    for (let step = 0; step < 8; step++) {
      if ((await cancelled.job())?.allocatedSandboxId) break
      await cancelled.advance()
    }
    const cancelledContext = { ...context, workspaceId: cancelledId }
    await stopWorkspaceSandbox(cancelledContext)
    await fixture.runtime.workspace(cancelledId).lifecycleStopped()
    await cancelled.advance()
    expect(await cancelled.wait()).toMatchObject({
      ok: false,
      error: { code: 'workspace_start_stopped' },
    })
    expect(fixture.boat.deletedIds).toEqual(['bx_2'])
    expect(
      await fixture.runtime.workspace(cancelledId).waitCreationAdmission(),
    ).toMatchObject({
      ok: true,
      created: { first: { request: { id: 'second-message' } } },
    })
    expect(
      await fixture.runtime.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM workspaces',
      ).first('count'),
    ).toBe(2)
  } finally {
    await fixture.dispose()
  }
})
