import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../../test-support/harness'
import { cleanupBuildImageSources } from './cleanup'
import { parallelFixture } from './parallel-test-support'
import { ProviderError } from '../../sandbox/errors'
import { decrypt } from '../../security/crypto'
import { INSTALLATION_TOKEN } from './native-github-test-support'
import { readSourceJob, sourceTokenContext } from './source-data'

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

it('overlaps two small copies and bounds parallel finalize commands by the saved memory budget', async () => {
  const fixture = await parallelFixture(harness, { memoryMiB: 1024 })
  await fixture.tick(4)
  expect(fixture.copies()).toHaveLength(2)
  fixture.copies().forEach((process) => {
    process.exitCode = 0
  })
  await fixture.tick(4)
  expect(fixture.finalizes()).toHaveLength(2)
  const logs = await fixture.env.DB.prepare(
    'SELECT text FROM image_build_logs ORDER BY event_number',
  ).all<{ text: string }>()
  expect(logs.results.map(({ text }) => text)).toEqual([
    'Updating the repositories.\n',
    'Repository copy complete.\n',
    'Repository copy complete.\n',
  ])
})

it('runs an oversized repository alone during copy and finalize', async () => {
  const fixture = await parallelFixture(harness, {
    memoryMiB: 1536,
    sizesKiB: [400_000, 1],
  })
  await fixture.tick(4)
  expect(fixture.copies()).toHaveLength(1)
  fixture.copies()[0].exitCode = 0
  await fixture.tick(3)
  expect(fixture.finalizes()).toHaveLength(0)
  expect(fixture.copies()).toHaveLength(2)
  fixture.copies()[1].exitCode = 0
  await fixture.tick(3)
  expect(fixture.finalizes()).toHaveLength(1)
  fixture.finalizes()[0].exitCode = 0
  await fixture.tick(2)
  expect(fixture.finalizes()).toHaveLength(2)
})

it('blocks all finalize commands until every copy token revocation is confirmed', async () => {
  const fixture = await parallelFixture(harness)
  await fixture.tick(4)
  expect(fixture.copies()).toHaveLength(2)
  const tokens = fixture.copyTokens()
  fixture.revokeRefusals.add(tokens.at(-1) ?? '')
  fixture.copies().forEach((process) => {
    process.exitCode = 0
  })
  await fixture.tick(3)
  expect(fixture.access.activeTokens).toEqual([tokens[1]])
  expect(fixture.finalizes()).toHaveLength(0)
  fixture.revokeRefusals.clear()
  await fixture.tick(3)
  expect(fixture.finalizes()).toHaveLength(2)
})

it('revokes every live copy token after failure even when another revoke fails', async () => {
  const fixture = await parallelFixture(harness)
  await fixture.tick(4)
  expect(fixture.copies()).toHaveLength(2)
  const tokens = fixture.copyTokens()
  fixture.revokeRefusals.add(tokens[0])
  fixture.copies()[0].exitCode = 1
  expect(await fixture.prepare()).toBe(false)
  expect(fixture.revoked).toEqual(expect.arrayContaining(tokens))
  expect(fixture.access.activeTokens).toEqual([tokens[0]])
  expect(fixture.finalizes()).toHaveLength(0)
  fixture.revokeRefusals.clear()
  expect(
    await cleanupBuildImageSources(
      fixture.env,
      fixture.access.fetch,
      fixture.input.buildId,
    ),
  ).toBe(true)
  expect(fixture.access.activeTokens).toEqual([])
})

it('retries a definite refused copy start within the saved window and Retry-After', async () => {
  const fixture = await parallelFixture(harness)
  await fixture.advance()
  await fixture.advance()
  fixture.refuseStarts(1)
  await fixture.advance()
  expect(await fixture.job()).toMatchObject({
    state: 'running',
    providerRetry: {
      openedAt: TEST_TIME,
      failures: 1,
      retryAt: TEST_TIME + 7000,
    },
  })
  expect(fixture.copies()).toHaveLength(0)
  await fixture.advance()
  expect(fixture.copies()).toHaveLength(0)
  fixture.setTime(TEST_TIME + 7000)
  await fixture.advance()
  expect(fixture.copies()).toHaveLength(2)
  fixture.copies()[0].exitCode = 0
  fixture.statusFailures.set(3, new ProviderError('unavailable', 503))
  await fixture.advance()
  expect(await fixture.job()).toMatchObject({
    providerRetry: {
      openedAt: TEST_TIME,
      failures: 2,
      retryAt: TEST_TIME + 9000,
    },
  })
  fixture.statusFailures.clear()
  fixture.setTime(TEST_TIME + 9000)
  fixture.copies()[1].exitCode = 0
  await fixture.advance()
  expect((await fixture.job()).providerRetry).toBeNull()
  await fixture.advance()
  expect(fixture.finalizes()).toHaveLength(2)
})

it('revokes and retains metadata token ownership before the first copy across reconstruction', async () => {
  const fixture = await parallelFixture(harness)
  fixture.access.revokeFailures = 1
  await fixture.tick(3)
  expect(fixture.copies()).toHaveLength(0)
  expect(fixture.access.activeTokens).toHaveLength(1)
  const owner = await readSourceJob(fixture.env.DB, fixture.input.buildId)
  expect(owner?.tokenCiphertext).toEqual(expect.stringMatching(/^v1\./u))
  expect(owner?.grantHash).toBeNull()
  expect(owner?.phase).toBe('ready')
  if (!owner?.tokenCiphertext) throw new Error('Missing metadata owner')
  expect(
    await decrypt(
      owner.tokenCiphertext,
      sourceTokenContext(owner),
      fixture.env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  ).toBe(`${INSTALLATION_TOKEN}_1`)
  const metadataMint = fixture.access.requests.find(
    (request) => request.method === 'POST',
  )
  expect(await metadataMint?.clone().json()).toEqual({
    repository_ids: [101, 102],
    permissions: { metadata: 'read' },
  })
  await fixture.tick(2)
  expect(fixture.copies()).toHaveLength(2)
  expect(fixture.access.events.indexOf('revoke')).toBeLessThan(
    fixture.access.events.indexOf('start-copy'),
  )
})

it('copies captured refresh repositories in parallel with their own single-repository tokens', async () => {
  const fixture = await parallelFixture(harness, { kind: 'refresh' })
  await fixture.env.DB.prepare('UPDATE repositories SET selected = 0').run()
  await fixture.tick(4)
  expect(fixture.copies()).toHaveLength(2)
  expect(
    fixture
      .copyTokens()
      .map((token) => fixture.access.tokenScopes.get(token)?.repositoryIds),
  ).toEqual([[101], [102]])
  for (const process of fixture.copies())
    expect(process.command).not.toContain('ghs_worker_only')
})

it('limits Git commands to eight and uses the minimum estimate when metadata has no size', async () => {
  const fixture = await parallelFixture(harness, {
    memoryMiB: 16_384,
    sizesKiB: Array.from({ length: 10 }, () => null),
  })
  await fixture.tick(4)
  expect(fixture.copies()).toHaveLength(8)
  fixture.copies().forEach((process) => {
    process.exitCode = 0
  })
  await fixture.tick(3)
  expect(fixture.copies()).toHaveLength(10)
  fixture.copies().forEach((process) => {
    process.exitCode = 0
  })
  await fixture.tick(3)
  expect(fixture.finalizes()).toHaveLength(8)
})

it('reserves the sum of command estimates within half the sandbox memory', async () => {
  const fixture = await parallelFixture(harness, {
    memoryMiB: 1024,
    sizesKiB: [null, 1, 1],
  })
  await fixture.tick(4)
  expect(fixture.copies()).toHaveLength(2)
  fixture.copies()[0].exitCode = 0
  await fixture.tick(2)
  expect(fixture.copies()).toHaveLength(3)
  fixture.copies().forEach((process) => {
    process.exitCode = 0
  })
  await fixture.tick(3)
  expect(fixture.finalizes()).toHaveLength(2)
  fixture.finalizes()[0].exitCode = 0
  await fixture.tick(2)
  expect(fixture.finalizes()).toHaveLength(3)
})
