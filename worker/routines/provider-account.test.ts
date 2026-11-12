import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { SOFTWARE } from '../lifecycle/backend-test-support'
import { seedPublishedImage } from '../lifecycle/published-image-test-support'
import { readWorkspaceAllocation } from '../lifecycle/start-allocation'
import { claimSnapshot, completeSnapshot } from '../sandbox/e2b/snapshot-data'
import { FakeE2b } from '../test-support/fake-e2b'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { startRoutineRun } from './run-starter'
import { runFixture } from './runs.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('keeps a pull request routine base and commit on the fixed org account through allocation and eviction', async () => {
  const fixture = await runFixture(harness)
  const { runtime, org, repositoryId } = fixture
  const db = runtime.env.DB
  const server = new FakeE2b()
  runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    e2b: {
      kind: 'e2b',
      apiKey: server.apiKey,
      domain: server.domain,
      templateId: 'routine-template',
    },
  })
  const fetch = runtime.dependencies.fetch
  runtime.dependencies.fetch = (request) =>
    new URL(request.url).hostname.endsWith(server.domain)
      ? server.fetch(request)
      : fetch(request)
  await db
    .prepare('UPDATE orgs SET provider_account = ? WHERE id = ?')
    .bind('e2b', org.id)
    .run()
  await seedPublishedImage(db, {
    orgId: org.id,
    buildId: 'e2b-routine-image',
    imageName: 'e2b-routine-image',
    providerAccount: 'e2b',
    repositories: [
      {
        id: repositoryId,
        orgId: org.id,
        fullName: 'example/repository',
        defaultBranch: 'main',
      },
    ],
    software: SOFTWARE,
    now: TEST_TIME,
  })
  await claimSnapshot(db, 'e2b', 'e2b-routine-image', 'routine-builder')
  await completeSnapshot(
    db,
    'e2b',
    'e2b-routine-image',
    'project/e2b-routine-image:default',
  )
  await fixture.seedRun('account-run', {
    kind: 'pull-request',
    event: 'pushed',
    number: 482,
    url: 'https://github.com/example/repository/pull/482',
    headBranch: 'feature/review',
    headSha: 'a'.repeat(40),
    baseBranch: 'release/next',
  })
  await fixture.run(() => startRoutineRun(runtime, org.id, 'account-run'))
  const workspaceId = await db
    .prepare('SELECT workspace_id FROM routine_runs WHERE id = ?')
    .bind('account-run')
    .first<string>('workspace_id')
  if (!workspaceId) throw new Error('Missing admitted routine workspace')
  const start = fixture.starts.get(workspaceId)
  if (!start) throw new Error('Missing routine start')
  expect(await start.job()).toMatchObject({
    providerAccount: 'e2b',
    imageName: 'e2b-routine-image',
    baseBranch: 'feature/review',
    startSha: 'a'.repeat(40),
  })
  await start.advance()
  await start.restart()
  const allocated = await start.job()
  if (!allocated) throw new Error('Missing saved routine allocation')
  expect(allocated).toMatchObject({
    providerAccount: 'e2b',
    baseBranch: 'feature/review',
    startSha: 'a'.repeat(40),
    allocatedSandboxId: 'sandbox-one',
  })
  expect(await readWorkspaceAllocation(runtime.env, allocated)).toMatchObject({
    snapshotName: 'e2b-routine-image',
    env: { CONDUCTIVE_DEFAULT_BRANCH: 'feature/review' },
  })
  expect(
    await db
      .prepare(
        'SELECT provider_account AS account, base_branch AS base FROM workspaces WHERE id = ?',
      )
      .bind(workspaceId)
      .first(),
  ).toEqual({ account: 'e2b', base: 'feature/review' })
  expect(fixture.boat.starts).toEqual([])
  expect(
    server.requests.filter(
      (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname === '/v2/sandboxes',
    ),
  ).toHaveLength(1)
  expect(
    await db
      .prepare('SELECT COUNT(*) AS count FROM workspace_creation_attempts')
      .first('count'),
  ).toBe(1)
})
