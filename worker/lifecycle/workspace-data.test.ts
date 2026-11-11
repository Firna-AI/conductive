import { expect, it } from 'vitest'

import { updateShellWorkspace } from '../app-api/feature-workspaces-data'
import { shellWorkspaces } from '../app-api/shell-data'
import {
  seedListWorkspaces,
  setupShellListTests,
} from '../app-api/shell-list.test-support'
import { TEST_TIME } from '../test-support/harness'
import { FIRST_MESSAGE } from './durable-test-support'
import { deleteProvisionalWorkspace } from './workspace-data'
import { insertWorkspace } from './workspace-insert-data'

const fixtureForTest = setupShellListTests()

it.each([
  {
    scenario: 'before any move',
    reordered: false,
    expected: ['n', 'a', 'b', 'c'],
  },
  { scenario: 'after a move', reordered: true, expected: ['n', 'c', 'a', 'b'] },
])('lists a new workspace first $scenario', async ({ reordered, expected }) => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId, repositoryId } = fixture
  await seedListWorkspaces(fixture, [
    { id: 'a', sectionId: generalId, position: 0 },
    { id: 'b', sectionId: generalId, position: 0 },
    { id: 'c', sectionId: generalId, position: 0 },
  ])
  if (reordered)
    await updateShellWorkspace(db, {
      orgId,
      userId: user.id,
      workspaceId: 'c',
      sectionId: generalId,
      position: 0,
      now: TEST_TIME + 100,
    })
  await db.batch([
    db
      .prepare(
        `INSERT INTO workspace_creation_attempts (workspace_id, org_id,
         sender_user_id, first_message_id, created_at) VALUES ('n', ?, ?, ?, ?)`,
      )
      .bind(orgId, user.id, FIRST_MESSAGE.id, TEST_TIME + 100),
    db
      .prepare(
        `INSERT INTO image_leases (workspace_id, org_id, snapshot_name)
         VALUES ('n', ?, 'test-image')`,
      )
      .bind(orgId),
  ])
  expect(
    await insertWorkspace(db, {
      id: 'n',
      orgId,
      providerAccount: 'boat',
      repositoryId,
      sectionId: reordered ? generalId : undefined,
      user,
      city: 'Lisbon',
      branch: 'list-owner/lisbon',
      sessionId: 'new-session',
      turnId: 'new-turn',
      message: FIRST_MESSAGE,
      now: TEST_TIME + 100,
    }),
  ).toEqual({ imageName: 'test-image', providerAccount: 'boat' })
  expect(
    (await shellWorkspaces(db, orgId, user.id)).map(({ id }) => id),
  ).toEqual(expected)
  expect(
    (await shellWorkspaces(db, orgId, user.id)).find(({ id }) => id === 'n')
      ?.number,
  ).toBe(4)
})

it('allocates distinct numbers during overlapping creates and never reuses a removed number', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, repositoryId, generalId, user } = fixture
  async function create(id: string) {
    await db.batch([
      db
        .prepare(
          `INSERT INTO workspace_creation_attempts
        (workspace_id, org_id, sender_user_id, first_message_id, created_at)
        VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(id, orgId, user.id, id, TEST_TIME),
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
      providerAccount: 'boat',
      repositoryId,
      sectionId: generalId,
      user,
      city: 'Lisbon',
      branch: `list-owner/${id}`,
      sessionId: `session-${id}`,
      turnId: `turn-${id}`,
      message: { ...FIRST_MESSAGE, id },
      now: TEST_TIME,
    })
  }
  await Promise.all([create('one'), create('two')])
  const rows = await shellWorkspaces(db, orgId, user.id)
  expect(rows.map(({ number }) => number).sort()).toEqual([1, 2])
  const removed = rows.find(({ number }) => number === 2)
  if (!removed) throw new Error('The second allocation is missing.')
  await deleteProvisionalWorkspace(db, orgId, removed.id)
  await create('three')
  expect(
    (await shellWorkspaces(db, orgId, user.id))
      .map(({ number }) => number)
      .sort(),
  ).toEqual([1, 3])
  await db.batch([
    db
      .prepare(
        `INSERT INTO orgs (id, name, creator_user_id, created_at)
      VALUES ('other-org', 'Other org', ?, ?)`,
      )
      .bind(user.id, TEST_TIME),
    db
      .prepare(
        `INSERT INTO org_members (org_id, user_id, role, joined_at)
      VALUES ('other-org', ?, 'admin', ?)`,
      )
      .bind(user.id, TEST_TIME),
    db.prepare(`INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch)
      VALUES ('other-repo', 'other-org', 2, 'example/other', 'main')`),
    db
      .prepare(
        `INSERT INTO sections (id, org_id, name, position, is_default, created_at)
      VALUES ('other-section', 'other-org', 'General', 0, 1, ?)`,
      )
      .bind(TEST_TIME),
  ])
  await seedListWorkspaces(
    { ...fixture, orgId: 'other-org', repositoryId: 'other-repo' },
    [{ id: 'other-workspace', sectionId: 'other-section', position: 0 }],
  )
  expect(
    (await shellWorkspaces(db, 'other-org', user.id)).map(
      ({ number }) => number,
    ),
  ).toEqual([1])
})
