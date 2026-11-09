import { FIRST_MESSAGE } from '../lifecycle/durable-test-support'
import type { backendFixture } from '../lifecycle/backend-test-support'
import { createWorkspace } from '../lifecycle/workspaces'
import { API_PATHS, type User } from '../../src/shared/api'
import { seedWorkspace } from '../members/members-test-support'
import { seedBackendLogin } from '../lifecycle/backend-seed.test-support'
import { orgSandboxProvider } from '../sandbox/client'
import {
  assignSandbox,
  readWorkspace,
  workspaceView,
} from '../lifecycle/workspace-data'

export type SuspensionFixture = Awaited<ReturnType<typeof backendFixture>>

export async function joinedMember(fixture: SuspensionFixture): Promise<User> {
  fixture.harness.github.profile = { id: 8, login: 'other-member' }
  const session = await fixture.harness.login()
  const current = await fixture.harness.request(API_PATHS.session, session)
  const { user }: { user: User } = await current.json()
  await fixture.runtime.env.DB.prepare(
    "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'member', 0)",
  )
    .bind(fixture.org.id, user.id)
    .run()
  await seedBackendLogin(fixture.harness, user.id)
  return user
}

export async function existingWorkspace(
  fixture: SuspensionFixture,
  id: string,
  user: User = fixture.user,
) {
  const { env, dependencies } = fixture.runtime
  await seedWorkspace(
    fixture.harness,
    fixture.org,
    user,
    id,
    fixture.repositoryId,
  )
  await env.DB.prepare(
    `INSERT INTO workspace_runtime (workspace_id, org_id, created_by_user_id, session_id,
       first_turn_id, agent, model, effort, first_message_id)
     VALUES (?, ?, ?, ?, ?, 'codex', 'gpt-5.5', 'high', ?)`,
  )
    .bind(
      id,
      fixture.org.id,
      user.id,
      `${id}-session`,
      `${id}-turn`,
      `${id}-message`,
    )
    .run()
  const provider = await orgSandboxProvider(
    env,
    user.id,
    fixture.org.id,
    dependencies.fetch,
  )
  const sandbox = await provider.create({
    name: id,
    env: {},
    ttlSeconds: 1800,
    idempotencyKey: id,
    labels: { org: fixture.org.id, workspace: id },
  })
  await assignSandbox(env.DB, fixture.org.id, id, sandbox.id)
  await fixture.runtime.workspace(id).initializeLifecycle({
    workspaceId: id,
    orgId: fixture.org.id,
    firstMessage: { ...FIRST_MESSAGE, id: `${id}-message` },
    firstTurn: {
      turnId: `${id}-turn`,
      sessionId: `${id}-session`,
      senderUserId: user.id,
    },
  })
  await fixture.runtime.workspace(id).lifecyclePrepared()
  return workspaceView(await readWorkspace(env.DB, fixture.org.id, id))
}

export function completedWorkspace(
  fixture: SuspensionFixture,
  messageId: string,
  user: User = fixture.user,
) {
  return fixture.run(async () => {
    const created = await createWorkspace(
      fixture.runtime,
      fixture.org.id,
      user,
      {
        repositoryId: fixture.repositoryId,
        firstMessage: { ...FIRST_MESSAGE, id: messageId },
      },
    )
    const result = await fixture.runtime
      .workspace(created.workspace.id)
      .waitCreationLifecycle()
    if (!result.ok) throw new Error(result.error.message)
    const queuedId = await fixture.nextQueued()
    if (queuedId !== created.workspace.id)
      throw new Error('Unexpected queued workspace')
    return created.workspace
  })
}
