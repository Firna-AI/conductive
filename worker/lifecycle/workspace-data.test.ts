import { expect, it } from 'vitest'

import { updateShellWorkspace } from '../app-api/feature-workspaces-data'
import { shellWorkspaces } from '../app-api/shell-data'
import {
  seedListWorkspaces,
  setupShellListTests,
} from '../app-api/shell-list.test-support'
import { TEST_TIME } from '../test-support/harness'
import { FIRST_MESSAGE } from './durable-test-support'
import { insertWorkspace } from './workspace-data'

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
      repositoryId,
      sectionId: reordered ? generalId : undefined,
      user,
      city: 'Lisbon',
      branch: 'list-owner/lisbon',
      sessionId: 'new-session',
      turnId: 'new-turn',
      message: FIRST_MESSAGE,
      now: TEST_TIME + 100,
      runnerProtocolVersion: 1,
    }),
  ).toBe('test-image')
  expect(
    (await shellWorkspaces(db, orgId, user.id)).map(({ id }) => id),
  ).toEqual(expected)
})
