import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { SOFTWARE } from '../lifecycle/backend-test-support'
import { seedPublishedImage } from '../lifecycle/published-image-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
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
})
afterAll(async () => harness.dispose())

it('admits agent creates only from the fixed org account and keeps waiting repository guidance', async () => {
  const { db } = fixture
  await publishToolImage(db, 'org-a', 'boat-image', [
    {
      id: 'boat-only',
      orgId: 'org-a',
      fullName: 'example/boat-only',
      defaultBranch: 'main',
    },
  ])
  await db.batch([
    db
      .prepare('UPDATE orgs SET provider_account = ? WHERE id = ?')
      .bind('e2b', 'org-a'),
    db.prepare(`INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, selected)
      VALUES ('boat-only', 'org-a', 3, 'example/boat-only', 'main', 1)`),
  ])
  await seedPublishedImage(db, {
    orgId: 'org-a',
    providerAccount: 'e2b',
    buildId: 'e2b-image',
    imageName: 'e2b-snapshot',
    repositories: [
      {
        id: 'repo-a',
        orgId: 'org-a',
        fullName: 'example/alpha',
        defaultBranch: 'main',
      },
    ],
    software: SOFTWARE,
    now: TEST_TIME,
  })
  const available = await fixture.create({
    repositoryId: 'repo-a',
    firstMessage: 'Task',
  })
  expect(available.status).toBe(201)
  expect(fixture.services.createWorkspace).toHaveBeenCalledOnce()
  const waiting = await fixture.create({
    repositoryId: 'boat-only',
    firstMessage: 'Task',
  })
  expect(waiting.status).toBe(404)
  expect(await waiting.json()).toEqual({
    error: {
      code: 'repository_not_found',
      message: 'The repository is ready after the next build.',
    },
  })
  await db
    .prepare('UPDATE repositories SET selected = 0 WHERE id = ?')
    .bind('boat-only')
    .run()
  const unavailable = await fixture.create({
    repositoryId: 'boat-only',
    firstMessage: 'Task',
  })
  expect(unavailable.status).toBe(404)
  expect(await unavailable.json()).toEqual({
    error: {
      code: 'repository_not_found',
      message: 'The repository is not available.',
    },
  })
  expect(fixture.services.createWorkspace).toHaveBeenCalledOnce()
})
