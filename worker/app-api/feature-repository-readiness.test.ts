import { afterEach, beforeAll, expect, it } from 'vitest'

import { readRepositories } from '../../src/app/api/read-settings'
import { orgSettingsPaths, repositoryPath } from '../../src/shared/org-settings'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_REPOSITORY,
  OUTER_SOFTWARE,
} from '../chat/integration/outer-seed.test-support'
import { seedPublishedImage } from '../lifecycle/published-image-test-support'
import { shellRepositoryId } from './feature-repositories-data'
import { shellGitHubCatalog } from './feature-shell.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

async function repositories(active: OuterRuntime) {
  const response = await active.request(
    orgSettingsPaths.repositories(OUTER_ORG),
  )
  expect(response.status).toBe(200)
  return readRepositories(await response.json()).map(
    ({ id, ready, imageReady }) => ({ id, ready, imageReady }),
  )
}

it('returns readiness with repository choices and updates a waiting repository after publication', async () => {
  const active = (fixture = await createOuterRuntime(bundle))
  await shellGitHubCatalog(active)
  const candidateId = shellRepositoryId(OUTER_ORG, 202)
  const added = await active.request(repositoryPath(OUTER_ORG, candidateId), {
    method: 'PUT',
    body: JSON.stringify({ build: false }),
  })
  expect(added.status).toBe(200)
  expect(await repositories(active)).toEqual([
    { id: OUTER_REPOSITORY, ready: true, imageReady: true },
    { id: candidateId, ready: false, imageReady: true },
  ])
  await seedPublishedImage(active.env.DB, {
    orgId: OUTER_ORG,
    buildId: 'next-image-build',
    imageName: 'next-image',
    repositories: [
      {
        id: OUTER_REPOSITORY,
        orgId: OUTER_ORG,
        fullName: 'owner/repository',
        defaultBranch: 'main',
      },
      {
        id: candidateId,
        orgId: OUTER_ORG,
        fullName: 'owner/another-repository',
        defaultBranch: 'trunk',
      },
    ],
    software: OUTER_SOFTWARE,
    now: 3_000_000_000_000,
  })
  expect(await repositories(active)).toEqual([
    { id: OUTER_REPOSITORY, ready: true, imageReady: true },
    { id: candidateId, ready: true, imageReady: true },
  ])
})

it('returns false when no matching successful image is published', async () => {
  const active = (fixture = await createOuterRuntime(bundle))
  await active.env.DB.prepare(
    'UPDATE org_images SET image_build_id = NULL WHERE org_id = ?',
  )
    .bind(OUTER_ORG)
    .run()
  expect(await repositories(active)).toEqual([
    { id: OUTER_REPOSITORY, ready: false, imageReady: false },
  ])
  await active.env.DB.prepare(
    "UPDATE org_images SET image_build_id = 'outer-image-build', image_name = 'unpublished-image' WHERE org_id = ?",
  )
    .bind(OUTER_ORG)
    .run()
  expect(await repositories(active)).toEqual([
    { id: OUTER_REPOSITORY, ready: false, imageReady: false },
  ])
  await active.env.DB.batch([
    active.env.DB.prepare(
      "UPDATE org_images SET image_name = 'outer-image' WHERE org_id = ?",
    ).bind(OUTER_ORG),
    active.env.DB.prepare(
      "UPDATE image_builds SET state = 'failed' WHERE id = 'outer-image-build'",
    ),
  ])
  expect(await repositories(active)).toEqual([
    { id: OUTER_REPOSITORY, ready: false, imageReady: false },
  ])
  await seedPublishedImage(active.env.DB, {
    orgId: OUTER_ORG,
    buildId: 'empty-image-build',
    imageName: 'empty-image',
    repositories: [],
    software: OUTER_SOFTWARE,
    now: 3_000_000_000_000,
  })
  expect(await repositories(active)).toEqual([
    { id: OUTER_REPOSITORY, ready: false, imageReady: true },
  ])
})

it('uses only the current provider account and its captured org repositories', async () => {
  const active = (fixture = await createOuterRuntime(bundle))
  await shellGitHubCatalog(active)
  const candidateId = shellRepositoryId(OUTER_ORG, 202)
  await seedPublishedImage(active.env.DB, {
    orgId: OUTER_ORG,
    buildId: 'secondary-image-build',
    imageName: 'secondary-image',
    providerAccount: 'secondary',
    repositories: [
      {
        id: candidateId,
        orgId: OUTER_ORG,
        fullName: 'owner/another-repository',
        defaultBranch: 'trunk',
      },
      {
        id: OUTER_REPOSITORY,
        orgId: 'other-org',
        fullName: 'owner/repository',
        defaultBranch: 'main',
      },
    ],
    software: OUTER_SOFTWARE,
    now: 3_000_000_000_000,
  })
  expect(await repositories(active)).toEqual([
    { id: OUTER_REPOSITORY, ready: true, imageReady: true },
    { id: candidateId, ready: false, imageReady: true },
  ])
  await active.env.DB.prepare(
    'UPDATE orgs SET provider_account = ? WHERE id = ?',
  )
    .bind('secondary', OUTER_ORG)
    .run()
  expect(await repositories(active)).toEqual([
    { id: OUTER_REPOSITORY, ready: false, imageReady: true },
    { id: candidateId, ready: true, imageReady: true },
  ])
  await active.env.DB.prepare(
    'UPDATE orgs SET provider_account = ? WHERE id = ?',
  )
    .bind('unbuilt-account', OUTER_ORG)
    .run()
  expect(await repositories(active)).toEqual([
    { id: OUTER_REPOSITORY, ready: false, imageReady: false },
    { id: candidateId, ready: false, imageReady: false },
  ])
})
