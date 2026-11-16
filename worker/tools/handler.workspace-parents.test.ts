import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../test-support/harness'
import { publishToolImage } from './list-test-support'
import { toolFixture, type ToolFixture } from './test-support'

let harness: TestHarness
let fixture: ToolFixture

beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
  fixture = await toolFixture(harness)
  await publishToolImage(fixture.db)
})
afterAll(async () => {
  await harness.dispose()
})

it('passes an archived parent of another repository through creation', async () => {
  await fixture.db.batch([
    fixture.db.prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('parent-repo', 'org-a', 9, 'example/parent', 'main')",
    ),
    fixture.db.prepare(
      "UPDATE workspaces SET repository_id = 'parent-repo' WHERE id = 'archived-workspace'",
    ),
  ])
  const response = await fixture.create({
    repositoryId: 'repo-a',
    firstMessage: 'Task',
    parentId: 'archived-workspace',
  })
  expect(response.status).toBe(201)
  expect(fixture.services.createWorkspace).toHaveBeenCalledWith(
    expect.objectContaining({ parentId: 'archived-workspace' }),
  )
})

it('refuses unknown parents and parents outside the calling org', async () => {
  for (const parentId of ['missing-workspace', 'outside-workspace']) {
    const response = await fixture.create({
      repositoryId: 'repo-a',
      firstMessage: 'Task',
      parentId,
    })
    expect(response.status, parentId).toBe(404)
    expect(await response.json()).toEqual({
      error: {
        code: 'workspace_not_found',
        message: 'The parent workspace is not available.',
      },
    })
  }
  expect(fixture.services.createWorkspace).not.toHaveBeenCalled()
})

it('counts archived ancestors and gives sibling advice at depth three', async () => {
  await fixture.db.batch([
    fixture.db.prepare(
      "UPDATE workspaces SET parent_workspace_id = 'calling-workspace' WHERE id = 'archived-workspace'",
    ),
    fixture.db.prepare(
      "UPDATE workspaces SET parent_workspace_id = 'archived-workspace' WHERE id = 'teammate-workspace'",
    ),
    fixture.db.prepare(
      `INSERT INTO workspaces
       (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, created_at, updated_at, parent_workspace_id)
       VALUES ('deepest', 'org-a', 'repo-a', 'owner', 'general-a', 'Deepest', 'owner/deepest', 'ready', 4, 4, 'teammate-workspace')`,
    ),
  ])
  const allowed = await fixture.create({
    repositoryId: 'repo-a',
    firstMessage: 'Task at depth three',
    parentId: 'teammate-workspace',
  })
  expect(allowed.status).toBe(201)
  fixture.services.createWorkspace.mockClear()
  const response = await fixture.create({
    repositoryId: 'repo-a',
    firstMessage: 'Task',
    parentId: 'deepest',
  })
  expect(response.status).toBe(409)
  expect(await response.json()).toEqual({
    error: {
      code: 'nesting_limit',
      message:
        'W-4 is at the deepest level. Create a sibling instead. Pass parentId "teammate-workspace". Start the name with a one-word group prefix, such as "Limits: ".',
    },
  })
  expect(fixture.services.createWorkspace).not.toHaveBeenCalled()
})

it('keeps the unknown-section check when a create names a parent', async () => {
  const response = await fixture.create({
    repositoryId: 'repo-a',
    firstMessage: 'Task',
    parentId: 'calling-workspace',
    sectionId: 'unknown-section',
  })
  expect(response.status).toBe(404)
  expect(await response.json()).toMatchObject({
    error: { code: 'section_not_found' },
  })
  expect(fixture.services.createWorkspace).not.toHaveBeenCalled()
})
