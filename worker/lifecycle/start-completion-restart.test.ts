import { beforeAll, expect, it } from 'vitest'

import { realRuntimeFixture, runtimeBundle } from './real-runtime-test-support'
import { queueRuntimeCreate } from './runtime-lifecycle-test-support'
import { serializeStartJob } from './start-job-codec'
import type { WorkspaceStartJob } from './start-types'

let bundle: string
beforeAll(async () => {
  bundle = await runtimeBundle()
})

it('recovers pending resume stop cleanup after native completion loses its caller', async () => {
  const fixture = await realRuntimeFixture(bundle)
  try {
    const { actor: caller, job } = await queueRuntimeCreate(
      fixture,
      'completion-restart-workspace',
    )
    if (!job.creation) throw new Error('Missing runtime create input')
    for (let step = 0; step < 16 && (await caller.checkpoint()); step++) {
      if ((await caller.checkpoint())?.phase === 'runner')
        await caller.reportRunnerLifecycle({ type: 'runner.ready' })
      await caller.tick()
    }
    expect(await caller.waitCreationLifecycle()).toEqual({ ok: true })
    await caller.becomeIdle()
    expect((await caller.readLifecycle())?.state).toBe('stopped')

    const resume: WorkspaceStartJob = {
      ...job,
      kind: 'resume',
      requestedByUserId: job.creation.user.id,
      creation: undefined,
      phase: 'machine',
      allocatedSandboxId: 'bx_1',
      attempt: 'completion-restart-resume',
    }
    fixture.boat.commandOutput = ''
    expect(await caller.queueLifecycleStart(serializeStartJob(resume))).toBe(
      true,
    )
    for (let step = 0; step < 8; step++) {
      const current = await caller.checkpoint()
      if (current?.phase === 'startup' && current.processId !== null) break
      await caller.tick()
    }
    expect(await caller.checkpoint()).toMatchObject({
      phase: 'startup',
      processId: expect.any(Number),
    })
    fixture.boat.commandExitCode = 1
    await caller.holdResumeCompletion(resume.attempt)
    const interrupted = caller.tick().then(
      () => ({ status: 'completed' as const }),
      (error: unknown) => ({ status: 'interrupted' as const, error }),
    )
    await caller.resumeCompletionReached()
    const checkpoint = await caller.completionCheckpoint()
    const completedAt = checkpoint.now
    const failure = {
      code: 'workspace_start_failed',
      message: 'The cloud computer could not start. Try again.',
      log: null,
    }
    expect(checkpoint.job).toBeUndefined()
    expect(checkpoint.result).toEqual({ ok: false, error: failure })
    expect(checkpoint.state).toMatchObject({
      state: 'error',
      startStop: 'pending',
      error: failure,
    })
    expect(fixture.boat.stopIds).toEqual(['bx_1'])

    await fixture.restart()
    expect(await interrupted).toMatchObject({
      status: 'interrupted',
      error: expect.any(Error),
    })
    const restored = fixture.actor(job.workspaceId)
    const retained = await restored.completionCheckpoint()
    expect(await restored.fireScheduledAlarm()).toBe(true)
    expect(retained.alarms).toEqual([
      ['alarm:lifecycle:run', completedAt + 30_000],
    ])
    expect(retained.alarmAt).toBe(completedAt + 30_000)
    expect(retained.job).toBeUndefined()
    expect(retained.result).toEqual({ ok: false, error: failure })
    expect(fixture.boat.stopIds).toEqual(['bx_1', 'bx_1'])
    expect(fixture.boat.states.get('bx_1')).toBe('archived')
    const completed = await restored.completionCheckpoint()
    expect(completed.state).toMatchObject({
      state: 'error',
      startStop: 'stopped',
      error: failure,
    })
    expect(completed.result).toEqual({ ok: false, error: failure })
    expect(completed.runLease).toBeUndefined()
  } finally {
    await fixture.dispose()
  }
})
