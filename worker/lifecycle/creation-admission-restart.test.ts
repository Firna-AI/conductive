import { beforeAll, expect, it } from 'vitest'

import { claimCreation } from './creation-claims'
import { FIRST_MESSAGE } from './durable-test-support'
import { realRuntimeFixture, runtimeBundle } from './real-runtime-test-support'
import type { WorkspaceStartJob } from './start-types'
import { readSavedScript } from './saved-script'
import { serializeStartJob } from './start-job-codec'

let bundle: string
beforeAll(async () => {
  bundle = await runtimeBundle()
})

it('keeps admission when the actual runtime stops immediately after the machine checkpoint', async () => {
  const fixture = await realRuntimeFixture(bundle)
  try {
    const user = {
      id: 'runtime-user',
      githubId: 11,
      githubLogin: 'octocat',
      displayName: null,
      avatarUrl: null,
    }
    const job: WorkspaceStartJob = {
      workspaceId: 'runtime-admission-workspace',
      orgId: 'runtime-org',
      kind: 'create',
      imageName: 'base-runtime-image',
      startupScript: readSavedScript(''),
      environmentCiphertext: null,
      defaultBranch: 'main',
      turnId: 'runtime-admission-turn',
      attempt: 'runtime-admission-attempt',
      phase: 'records',
      processId: null,
      stdoutOffset: 0,
      stderrOffset: 0,
      creation: {
        user,
        sender: user,
        repositoryId: 'runtime-repo',
        city: 'Lisbon',
        branch: 'octocat/runtime-admission',
        sessionId: 'runtime-admission-session',
        request: { ...FIRST_MESSAGE, attachmentIds: ['runtime-attachment'] },
        createdAt: Date.now(),
      },
    }
    await claimCreation(
      fixture.env.DB,
      {
        orgId: job.orgId,
        senderUserId: user.id,
        messageId: FIRST_MESSAGE.id,
      },
      job,
    )
    const caller = fixture.actor(job.workspaceId)
    await caller.holdMachineCheckpoint()
    expect(await caller.queueLifecycleStart(serializeStartJob(job))).toBe(true)
    const interrupted = caller.tick().catch(() => {})
    await caller.machineCheckpointReached()
    expect(await caller.checkpoint()).toMatchObject({ phase: 'machine' })
    expect(fixture.boat.starts).toEqual([])
    await fixture.restart()
    await interrupted
    const restored = fixture.actor(job.workspaceId)
    for (let step = 0; step < 16 && (await restored.checkpoint()); step++) {
      if ((await restored.checkpoint())?.phase === 'runner')
        await restored.reportRunnerLifecycle({ type: 'runner.ready' })
      await restored.tick()
    }
    const completed: unknown = JSON.parse(
      JSON.stringify(await restored.waitCreationLifecycle()),
    )
    expect(completed).toEqual({ ok: true })
    expect(await restored.waitCreationAdmission()).toMatchObject({
      ok: true,
      created: {
        workspace: { id: job.workspaceId },
        first: {
          sessionId: 'runtime-admission-session',
          turnId: 'runtime-admission-turn',
          sender: user,
          request: {
            ...FIRST_MESSAGE,
            attachmentIds: ['runtime-attachment'],
          },
        },
      },
    })
    expect(fixture.boat.starts).toHaveLength(1)
    expect(fixture.boat.deletedIds).toEqual([])
    expect(
      await fixture.env.DB.prepare(
        'SELECT COUNT(*) AS count FROM workspaces WHERE id = ?',
      )
        .bind(job.workspaceId)
        .first('count'),
    ).toBe(1)
  } finally {
    await fixture.dispose()
  }
})
