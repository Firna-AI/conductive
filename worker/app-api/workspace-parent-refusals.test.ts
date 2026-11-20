import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { setupShellListTests } from './shell-list.test-support'
import { writeWorkspaceParentChange } from './workspace-parent-change-data'
import {
  seedWorkspaceTree,
  storedTreePlaces,
} from './workspace-tree.test-support'

const fixtureForTest = setupShellListTests()

it('refuses loops, depth through archived rows, missing parents and sections, and archived moved workspaces without changes', async () => {
  const fixture = fixtureForTest()
  const { db, orgId, user, generalId, reviewId } = fixture
  await seedWorkspaceTree(fixture, [
    { id: 'moving', sectionId: generalId, position: 0 },
    {
      id: 'child',
      sectionId: generalId,
      position: 1,
      parentId: 'moving',
      archived: true,
    },
    { id: 'root', sectionId: reviewId, position: 0, archived: true },
    {
      id: 'middle',
      sectionId: reviewId,
      position: 1,
      parentId: 'root',
      archived: true,
    },
    { id: 'target', sectionId: reviewId, position: 2, parentId: 'middle' },
  ])
  await db
    .prepare(
      "INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES ('other-org', 'Other', ?, 1)",
    )
    .bind(user.id)
    .run()
  await db
    .prepare(
      "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES ('other-org', ?, 'member', 1)",
    )
    .bind(user.id)
    .run()
  await db
    .prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('outside-repo', 'other-org', 2, 'other/repo', 'main')",
    )
    .run()
  await db
    .prepare(
      "INSERT INTO sections (id, org_id, name, position, created_at) VALUES ('outside-section', 'other-org', 'Other', 0, 1)",
    )
    .run()
  await db
    .prepare(
      "INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, created_at, updated_at) VALUES ('outside', 'other-org', 'outside-repo', ?, 'outside-section', 'Outside', 'outside', 'ready', 1, 1)",
    )
    .bind(user.id)
    .run()
  const before = await storedTreePlaces(fixture)
  const cases = [
    {
      workspaceId: 'moving',
      parentId: 'moving',
      status: 409,
      code: 'nesting_cycle',
    },
    {
      workspaceId: 'moving',
      parentId: 'child',
      status: 409,
      code: 'nesting_cycle',
    },
    {
      workspaceId: 'moving',
      parentId: 'target',
      status: 409,
      code: 'nesting_limit',
      message:
        'W-2 is the deepest workspace in the moved tree. Choose a parent at depth 1 or less.',
    },
    {
      workspaceId: 'moving',
      parentId: 'missing',
      status: 404,
      code: 'workspace_not_found',
    },
    {
      workspaceId: 'moving',
      parentId: 'outside',
      status: 404,
      code: 'workspace_not_found',
    },
    {
      workspaceId: 'child',
      parentId: 'root',
      status: 409,
      code: 'workspace_archived',
    },
    {
      workspaceId: 'moving',
      parentId: 'root',
      sectionId: 'missing',
      status: 404,
      code: 'section_not_found',
    },
  ]
  for (const item of cases) {
    await expect(
      writeWorkspaceParentChange(db, {
        orgId,
        userId: user.id,
        workspaceId: item.workspaceId,
        sectionId: item.sectionId,
        target: { kind: 'parent', id: item.parentId },
        now: TEST_TIME + 200,
      }),
      JSON.stringify(item),
    ).rejects.toMatchObject({
      status: item.status,
      code: item.code,
      ...(item.message !== undefined && { message: item.message }),
    })
    expect(await storedTreePlaces(fixture)).toEqual(before)
  }
})
