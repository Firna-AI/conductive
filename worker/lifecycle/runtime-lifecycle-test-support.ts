import { FIRST_MESSAGE } from './durable-test-support'
import { claimCreation } from './creation-claims'
import { readWorkspace } from './workspace-data'
import type { WorkspaceStartJob } from './start-types'
import type { realRuntimeFixture } from './real-runtime-test-support'
import { readSavedScript } from './saved-script'
import { serializeStartJob } from './start-job-codec'

export async function runningRuntimeWorkspace(
  fixture: Awaited<ReturnType<typeof realRuntimeFixture>>,
) {
  const workspaceId = 'runtime-state-workspace'
  const user = {
    id: 'runtime-user',
    githubId: 11,
    githubLogin: 'octocat',
    displayName: null,
    avatarUrl: null,
  }
  const job: WorkspaceStartJob = {
    workspaceId,
    orgId: 'runtime-org',
    kind: 'create',
    imageName: 'base-runtime-image',
    startupScript: readSavedScript(''),
    environmentCiphertext: null,
    defaultBranch: 'main',
    turnId: 'turn-one',
    attempt: 'runtime-state-attempt',
    phase: 'records',
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
    creation: {
      user,
      sender: user,
      repositoryId: 'runtime-repo',
      city: 'Lisbon',
      branch: 'octocat/runtime-state',
      sessionId: 'session-one',
      request: FIRST_MESSAGE,
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
  const actor = fixture.actor(workspaceId)
  await actor.queueLifecycleStart(serializeStartJob(job))
  for (let step = 0; step < 16 && (await actor.checkpoint()); step++) {
    if ((await actor.checkpoint())?.phase === 'runner')
      await actor.reportRunnerLifecycle({ type: 'runner.ready' })
    await actor.tick()
  }
  const result = await actor.waitCreationLifecycle()
  if (!result.ok) throw new Error(`Runtime create failed: ${result.error.code}`)
  const { sandboxId } = await readWorkspace(
    fixture.env.DB,
    job.orgId,
    workspaceId,
  )
  if (!sandboxId) throw new Error('No runtime sandbox')
  await actor.reportRunnerLifecycle({ type: 'runner.ready' })
  for (const suffix of ['one', 'two'])
    await actor.registerLifecycleTurn({
      turnId: `turn-${suffix}`,
      sessionId: `session-${suffix}`,
      senderUserId: 'runtime-user',
    })
  return { actor, workspaceId, sandboxId }
}
