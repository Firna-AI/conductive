import type { backendFixture } from './backend-test-support'
import { TEST_TIME } from '../test-support/harness'
import { reassignWorkspace } from '../members/ownership'
import { createCompletedWorkspace } from './completed-creation-test-support'
import { FIRST_MESSAGE } from './durable-test-support'
import { workspaceOwnerChangedHook } from './ownership-maintenance'
import { readRetention } from './retention-data'
import { readWorkspace, workspaceView } from './workspace-data'

type Fixture = Awaited<ReturnType<typeof backendFixture>>

export async function stoppedRetentionFixture(fixture: Fixture) {
  const { runtime, org, user, boat } = fixture
  const created = await fixture.run(() =>
    createCompletedWorkspace(runtime, org.id, user, {
      repositoryId: fixture.repositoryId,
      firstMessage: FIRST_MESSAGE,
    }),
  )
  const id = created.workspace.id
  const platform = fixture.actors.get(id)
  if (!platform) throw new Error('Missing retention controller')
  fixture.setTime(TEST_TIME)
  boat.states.set('bx_1', 'archived')
  await platform.endpoint().lifecycleStopped()
  return {
    ...fixture,
    id,
    platform,
    progress: () => readRetention(runtime.env.DB, id),
    tick: async (now: number) => {
      await fixture.advanceTo(now, id)
    },
  }
}

export async function addRetentionAdmin(fixture: Fixture) {
  await fixture.runtime.env.DB.batch([
    fixture.runtime.env.DB.prepare(
      "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('retention-admin', 77, 'retention-admin', 0, 0)",
    ),
    fixture.runtime.env.DB.prepare(
      "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, 'retention-admin', 'admin', 1)",
    ).bind(fixture.org.id),
  ])
}

export function reassignRetentionOwner(fixture: Fixture, id: string) {
  return reassignWorkspace(
    fixture.runtime.env.DB,
    fixture.org.id,
    'retention-admin',
    id,
    'retention-admin',
    fixture.runtime.dependencies.now(),
    {
      workspaceOwnerChanged: workspaceOwnerChangedHook(fixture.runtime),
      readWorkspace: async (orgId, workspaceId) =>
        workspaceView(
          await readWorkspace(fixture.runtime.env.DB, orgId, workspaceId),
          fixture.runtime.env.APP_ORIGIN,
        ),
    },
  )
}

export function retentionDates(fixture: Fixture, id: string) {
  return fixture.runtime.env.DB.prepare(
    `SELECT stopped_at AS stoppedAt, next_disk_keepalive_at AS nextDiskKeepaliveAt
     FROM workspaces WHERE id = ? AND org_id = ?`,
  )
    .bind(id, fixture.org.id)
    .first<{ stoppedAt: number; nextDiskKeepaliveAt: number }>()
}
