import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { createHarness, type TestHarness } from '../../test-support/harness'
import { sourceRepositoryUrl } from './native-command'
import { parallelFixture } from './parallel-test-support'
import { readSourceJob } from './source-data'
import { heldOperation } from '../../test-support/held-operation'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it('pins mixed installation batches and size indexes across failed revocation and reconstruction', async () => {
  const fixture = await parallelFixture(harness, {
    memoryMiB: 1536,
    sizesKiB: [1, 400_000, 1],
    installations: [701, 702, 701],
  })
  await fixture.tick(2)
  fixture.access.revokeFailures = 2
  await expect(fixture.prepare()).resolves.toBe(false)
  const metadata = () =>
    [...fixture.access.tokenScopes.values()].filter((scope) => scope.metadata)
  expect(metadata()).toEqual([
    {
      installationId: 701,
      repositoryIds: [101, 103],
      metadata: true,
      canRead: false,
    },
  ])
  expect(fixture.copies()).toHaveLength(0)
  await fixture.env.DB.prepare(
    "UPDATE repositories SET installation_id = 703 WHERE id = 'parallel-1'",
  ).run()
  await expect(fixture.prepare()).resolves.toBe(false)
  expect(metadata()).toHaveLength(1)
  expect(
    (await readSourceJob(fixture.env.DB, fixture.input.buildId))
      ?.tokenCiphertext,
  ).toEqual(expect.stringMatching(/^v1\./u))
  await expect(fixture.prepare()).resolves.toBe(false)
  expect(fixture.access.activeTokens).toEqual([])
  expect(fixture.copies()).toHaveLength(0)
  fixture.access.revokeFailures = 1
  await expect(fixture.prepare()).resolves.toBe(false)
  expect(metadata()).toEqual([
    {
      installationId: 701,
      repositoryIds: [101, 103],
      metadata: true,
      canRead: false,
    },
    {
      installationId: 702,
      repositoryIds: [102],
      metadata: true,
      canRead: false,
    },
  ])
  expect(
    fixture.access.requests
      .filter((request) => request.method === 'GET')
      .map((request) => new URL(request.url).pathname),
  ).toEqual(['/repositories/101', '/repositories/103', '/repositories/102'])
  expect(fixture.copies()).toHaveLength(0)
  await fixture.env.DB.prepare(
    "UPDATE repositories SET installation_id = 702 WHERE id = 'parallel-1'",
  ).run()
  await fixture.prepare()
  expect(fixture.copies().map((process) => process.command)).toEqual([
    expect.stringContaining(sourceRepositoryUrl('example/parallel-0')),
    expect.stringContaining(sourceRepositoryUrl('example/parallel-2')),
  ])
  expect(
    fixture
      .copyTokens()
      .map((token) => fixture.access.tokenScopes.get(token)?.repositoryIds),
  ).toEqual([[101], [103]])
})

it('sizes more than 500 repositories with scoped metadata batches before any copy', async () => {
  const fixture = await parallelFixture(harness, {
    memoryMiB: 1536,
    sizesKiB: Array.from({ length: 501 }, (_, index) =>
      index === 0 ? 400_000 : 1,
    ),
  })
  await expect(fixture.tick(2)).resolves.toBeUndefined()
  const reads = heldOperation()
  let started = 0
  let ready: () => void = () => {}
  const sixStarted = new Promise<void>((resolve) => {
    ready = resolve
  })
  fixture.access.beforeMetadata = async () => {
    if (++started === 6) ready()
    await reads.wait()
  }
  const firstChunk = fixture.prepare()
  try {
    await sixStarted
    expect(
      fixture.access.requests.filter((request) => request.method === 'GET'),
    ).toHaveLength(6)
  } finally {
    reads.release()
    await firstChunk
    fixture.access.beforeMetadata = undefined
  }
  for (let step = 0; step < 40 && !fixture.copies().length; step++)
    await fixture.prepare()
  expect(fixture.copies()).toHaveLength(1)
  const scopes = [...fixture.access.tokenScopes.values()].filter(
    (scope) => scope.metadata,
  )
  expect(
    scopes.map((scope) => [
      scope.installationId,
      scope.repositoryIds.length,
      scope.canRead,
    ]),
  ).toEqual([
    [701, 500, false],
    [701, 1, false],
  ])
  expect(scopes.flatMap((scope) => scope.repositoryIds)).toEqual(
    Array.from({ length: 501 }, (_, index) => index + 101),
  )
  expect(
    fixture.access.requests
      .filter((request) => request.method === 'GET')
      .map((request) => new URL(request.url).pathname),
  ).toEqual(
    Array.from({ length: 501 }, (_, index) => `/repositories/${index + 101}`),
  )
  expect(
    fixture.access.events
      .filter((event) => ['mint', 'revoke', 'start-copy'].includes(event))
      .slice(0, 4),
  ).toEqual(['mint', 'revoke', 'mint', 'revoke'])
  expect(
    [...fixture.access.tokens].filter(
      ([token, active]) =>
        active && fixture.access.tokenScopes.get(token)?.metadata,
    ),
  ).toEqual([])
})
