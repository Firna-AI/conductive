import type { backendFixture } from './backend-test-support'
import { completeCreationAttempt } from './creation-attempt-data'
import { claimCreation } from './creation-claims'
import { FIRST_MESSAGE } from './durable-test-support'
import type { RepositoryLocation } from './repository-locations'
import { readSavedScript } from './saved-script'
import { recordRunningEnvironment } from './start-environment'
import type { WorkspaceStartJob } from './start-types'
import { ensureWorkspaceToken } from './tokens'
import { assignSandbox, insertWorkspace } from './workspace-data'
import { orgProviderForAccount } from '../sandbox/client'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { runnerSoftware } from '../configuration'
import { softwareVersion } from '../software-image/version'
import { recordWorkspaceSoftwareVersion } from './workspace-software-data'

export async function seededCompletedWorkspace(
  fixture: Awaited<ReturnType<typeof backendFixture>>,
  input: {
    repositoryLocations?: readonly RepositoryLocation[]
    environmentCiphertext?: string | null
  } = {},
) {
  const { runtime, org, user, repositoryId } = fixture
  const { env, dependencies } = runtime
  const id = 'captured-workspace'
  const sessionId = `${id}-session`
  const turnId = `${id}-turn`
  const now = dependencies.now()
  const creation = {
    repositoryId,
    user,
    sender: user,
    city: 'Lisbon',
    branch: 'octocat/lisbon-ab12',
    sessionId,
    request: FIRST_MESSAGE,
    createdAt: now,
  }
  const job: WorkspaceStartJob = {
    workspaceId: id,
    orgId: org.id,
    providerAccount: DEFAULT_PROVIDER_ACCOUNT,
    kind: 'create',
    requestedByUserId: user.id,
    imageName: null,
    startupScript: readSavedScript(''),
    environmentCiphertext: input.environmentCiphertext ?? null,
    defaultBranch: 'main',
    repositoryLocations: input.repositoryLocations,
    turnId,
    attempt: `${id}-create`,
    phase: 'records',
    processId: null,
    stdoutOffset: 0,
    stderrOffset: 0,
    creation,
  }
  await claimCreation(
    env.DB,
    { orgId: org.id, senderUserId: user.id, messageId: FIRST_MESSAGE.id },
    job,
  )
  const image = await insertWorkspace(env.DB, {
    ...creation,
    id,
    orgId: org.id,
    providerAccount: job.providerAccount,
    message: FIRST_MESSAGE,
    now,
    turnId,
    repositoryLocations: input.repositoryLocations,
  })
  const provider = await orgProviderForAccount(
    env,
    user.id,
    org.id,
    dependencies.fetch,
    job.providerAccount,
  )
  const sandbox = await provider.create({
    name: id,
    snapshotName: image.imageName,
    env: {},
    ttlSeconds: 1_800,
    idempotencyKey: job.attempt,
    labels: { org: org.id, workspace: id },
  })
  await assignSandbox(env.DB, org.id, id, sandbox.id, job.providerAccount)
  await recordWorkspaceSoftwareVersion(
    env.DB,
    org.id,
    id,
    await softwareVersion(runnerSoftware(env)),
  )
  await ensureWorkspaceToken(env, id, dependencies.randomToken, now)
  await recordRunningEnvironment(
    env.DB,
    id,
    input.environmentCiphertext ?? null,
  )
  const endpoint = runtime.workspace(id)
  await endpoint.initializeLifecycle({
    workspaceId: id,
    orgId: org.id,
    firstMessage: FIRST_MESSAGE,
    firstTurn: { sessionId, turnId, senderUserId: user.id },
  })
  await endpoint.beginLifecycleStart('create')
  await endpoint.lifecyclePrepared()
  const actor = fixture.actors.get(id)
  if (!actor) throw new Error('Missing seeded workspace actor')
  await actor.endpoint().reportRunnerLifecycle({ type: 'runner.ready' })
  await completeCreationAttempt(env.DB, id)
  return { id, sandboxId: sandbox.id, actor }
}
