import { reassignWorkspace } from '../members/ownership'
import { workspaceOwnerChangedHook } from './ownership-maintenance'
import type { realRuntimeFixture } from './real-runtime-test-support'
import { workspaceRuntime } from './runtime'
import { readImageSettings, workspaceRepository } from './settings-data'
import { serializeStartJob } from './start-job-codec'
import { readWorkspace, workspaceView } from './workspace-data'

type RuntimeFixture = Awaited<ReturnType<typeof realRuntimeFixture>>

export async function activeRuntimeOwner(fixture: RuntimeFixture) {
  await fixture.env.DB.batch([
    fixture.env.DB.prepare(
      "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('active-admin', 12, 'active-admin', 0, 0)",
    ),
    fixture.env.DB.prepare(
      "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES ('runtime-org', 'active-admin', 'admin', 1)",
    ),
  ])
}

export function runtimeOwnershipHooks(fixture: RuntimeFixture) {
  return {
    workspaceOwnerChanged: workspaceOwnerChangedHook(
      workspaceRuntime(fixture.env),
    ),
    readWorkspace: async (orgId: string, id: string) =>
      workspaceView(await readWorkspace(fixture.env.DB, orgId, id)),
  }
}

export function reassignRuntimeWorkspace(fixture: RuntimeFixture, id: string) {
  return reassignWorkspace(
    fixture.env.DB,
    'runtime-org',
    'active-admin',
    id,
    'active-admin',
    Date.now(),
    runtimeOwnershipHooks(fixture),
  )
}

export async function queueRuntimeResume(fixture: RuntimeFixture, id: string) {
  const row = await readWorkspace(fixture.env.DB, 'runtime-org', id)
  if (!row.sandboxId) throw new Error('Missing runtime sandbox')
  const settings = await readImageSettings(fixture.env.DB, row.orgId)
  const repository = await workspaceRepository(
    fixture.env.DB,
    row.orgId,
    row.repositoryId,
  )
  const actor = fixture.actor(id)
  const accepted = await actor.queueLifecycleStart(
    serializeStartJob({
      workspaceId: id,
      orgId: row.orgId,
      kind: 'resume',
      requestedByUserId: row.ownerUserId,
      imageName: null,
      startupScript: settings.startupScript,
      environmentCiphertext: settings.envVarsCiphertext,
      defaultBranch: repository.defaultBranch,
      turnId: row.firstTurnId,
      attempt: `resume-${id}`,
      phase: 'machine',
      processId: null,
      stdoutOffset: 0,
      stderrOffset: 0,
      allocatedSandboxId: row.sandboxId,
    }),
  )
  if (!accepted) throw new Error('Runtime resume was not queued')
  return actor
}

export async function finishRuntimeStart(fixture: RuntimeFixture, id: string) {
  const actor = fixture.actor(id)
  for (let step = 0; step < 16 && (await actor.checkpoint()); step++) {
    if ((await actor.checkpoint())?.phase === 'runner')
      await actor.reportRunnerLifecycle({ type: 'runner.ready' })
    await actor.tick()
  }
  return actor.waitLifecycleStart()
}
