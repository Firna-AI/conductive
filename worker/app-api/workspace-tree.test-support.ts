import { placeWorkspaces } from '../../src/shared/workspace-tree'
import { TEST_TIME } from '../test-support/harness'
import {
  readArchiveResource,
  restoreArchiveRecord,
} from '../lifecycle/archive-data'
import { FIRST_MESSAGE } from '../lifecycle/durable-test-support'
import { assignSandbox, insertWorkspace } from '../lifecycle/workspace-data'
import { shellSections, shellWorkspaces } from './shell-data'
import {
  seedListWorkspaces,
  type ShellListFixture,
} from './shell-list.test-support'

export async function seedWorkspaceTree(
  fixture: ShellListFixture,
  rows: readonly {
    id: string
    sectionId: string
    position: number
    parentId?: string
    archived?: boolean
  }[],
) {
  await seedListWorkspaces(fixture, rows)
  await fixture.db.batch(
    rows.map(({ id, parentId, archived }) =>
      fixture.db
        .prepare(
          `UPDATE workspaces SET parent_workspace_id = ?, state = ?, archived_at = ?, sandbox_id = ? WHERE id = ?`,
        )
        .bind(
          parentId ?? null,
          archived ? 'archived' : 'ready',
          archived ? TEST_TIME : null,
          `computer-${id}`,
          id,
        ),
    ),
  )
}

export async function workspacePlaces(fixture: ShellListFixture) {
  const workspaces = await shellWorkspaces(
    fixture.db,
    fixture.orgId,
    fixture.user.id,
  )
  const sections = await shellSections(
    fixture.db,
    fixture.orgId,
    fixture.user.id,
  )
  return placeWorkspaces(workspaces, sections).map(
    ({ workspace, sectionId, parentId }) => [workspace.id, sectionId, parentId],
  )
}

export async function storedTreePlaces(fixture: ShellListFixture) {
  const { results } = await fixture.db
    .prepare(
      `SELECT id, section_id AS sectionId, position, parent_workspace_id AS parentId
       FROM workspaces WHERE org_id = ? ORDER BY created_at, id`,
    )
    .bind(fixture.orgId)
    .all<{
      id: string
      sectionId: string
      position: number
      parentId: string | null
    }>()
  return results
}

export async function restoreTreeWorkspace(
  fixture: ShellListFixture,
  id: string,
) {
  const resource = await readArchiveResource(fixture.db, id)
  if (!resource) throw new Error('The archived workspace is missing.')
  return restoreArchiveRecord(
    fixture.db,
    resource,
    fixture.user.id,
    TEST_TIME + 300,
  )
}

export async function createTreeWorkspace(
  fixture: ShellListFixture,
  id: string,
  sectionId: string,
  parentId?: string,
) {
  const { db, orgId, user, repositoryId } = fixture
  await db.batch([
    db
      .prepare(
        `INSERT INTO workspace_creation_attempts
         (workspace_id, org_id, sender_user_id, first_message_id, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, orgId, user.id, id, TEST_TIME + 100),
    db
      .prepare(
        `INSERT INTO image_leases (workspace_id, org_id, snapshot_name)
         VALUES (?, ?, 'test-image')`,
      )
      .bind(id, orgId),
  ])
  await insertWorkspace(db, {
    id,
    orgId,
    user,
    repositoryId,
    sectionId,
    parentId,
    providerAccount: 'boat',
    city: 'Lisbon',
    branch: `list-owner/${id}`,
    sessionId: `session-${id}`,
    turnId: `turn-${id}`,
    message: { ...FIRST_MESSAGE, id },
    now: TEST_TIME + 100,
  })
  await assignSandbox(db, orgId, id, `computer-${id}`, 'boat')
}
