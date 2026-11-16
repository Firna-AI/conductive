import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { encrypt, hash, randomToken } from '../../security/crypto'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../../test-support/harness'
import { clearSourceToken } from './cleanup-data'
import { readSourceRepository } from './data'
import { installationToken, revokeInstallationToken } from './github-app'
import { fetchSourceCommand, finalizeSourceCommand } from './native-command'
import { parallelFixture } from './parallel-test-support'
import {
  insertSourceJob,
  readSourceJob,
  setSourcePhase,
  sourceTokenContext,
  storeSourceGrant,
} from './source-data'

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

async function legacyCopy(
  fixture: Awaited<ReturnType<typeof parallelFixture>>,
  index: number,
) {
  const { env, input, access } = fixture
  await insertSourceJob(
    env.DB,
    input.orgId,
    input.buildId,
    input.sandboxId,
    input.providerAccount,
  )
  await env.DB.prepare(
    "UPDATE image_source_jobs SET source_index = ?, phase = 'ready'",
  )
    .bind(index)
    .run()
  const job = await readSourceJob(env.DB, input.buildId)
  if (!job) throw new Error('Missing legacy source')
  const repository = input.repositories[index]
  const source = await readSourceRepository(env.DB, input.orgId, repository)
  const token = await installationToken(
    access.fetch,
    env.GITHUB_CLIENT_ID,
    env.GITHUB_APP_PRIVATE_KEY,
    source,
    () => TEST_TIME,
  )
  const grant = randomToken()
  const ciphertext = await encrypt(
    token,
    sourceTokenContext({ ...job, repositoryId: repository.id }),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await storeSourceGrant(
    env.DB,
    job,
    repository.id,
    await hash(grant),
    ciphertext,
  )
  const started = await input.commands.start(
    fetchSourceCommand({
      origin: env.MACHINE_ORIGIN,
      grant,
      buildId: input.buildId,
      index,
      repository,
    }),
  )
  await setSourcePhase(env.DB, input.buildId, 'fetch', started.processId, index)
  return { token, ciphertext }
}

it('continues a confirmed legacy copy and upgrades the remaining repositories to parallel copies', async () => {
  const fixture = await parallelFixture(harness, { sizesKiB: [1, 1, 1, 1] })
  await legacyCopy(fixture, 1)
  expect(await fixture.prepare()).toBe(false)
  expect(fixture.access.requests.map((request) => request.method)).toEqual([
    'POST',
  ])
  fixture.copies()[0].exitCode = 0
  expect(await fixture.prepare()).toBe(false)
  expect(fixture.access.activeTokens).toEqual([])
  await fixture.tick(4)
  expect(fixture.copies()).toHaveLength(3)
  expect(
    fixture
      .copyTokens()
      .map((token) => fixture.access.tokenScopes.get(token)?.repositoryIds),
  ).toEqual([[102], [103], [104]])
  expect(fixture.finalizes()).toHaveLength(0)
  fixture.copies().forEach((process) => {
    process.exitCode = 0
  })
  await fixture.tick(3)
  expect(fixture.finalizes()).toHaveLength(3)
  expect(fixture.access.activeTokens).toEqual([])
})

it('waits for a confirmed legacy finalize before minting metadata or starting another copy', async () => {
  const fixture = await parallelFixture(harness)
  const { token, ciphertext } = await legacyCopy(fixture, 0)
  fixture.copies()[0].exitCode = 0
  await revokeInstallationToken(fixture.access.fetch, token)
  await clearSourceToken(fixture.env.DB, fixture.input.buildId, ciphertext)
  const started = await fixture.input.commands.start(
    finalizeSourceCommand({
      buildId: fixture.input.buildId,
      index: 0,
      repository: fixture.input.repositories[0],
      directory: fixture.input.repositoryLocations[0].directory,
    }),
  )
  await setSourcePhase(
    fixture.env.DB,
    fixture.input.buildId,
    'finalize',
    started.processId,
  )
  expect(await fixture.prepare()).toBe(false)
  expect(fixture.access.requests.map((request) => request.method)).toEqual([
    'POST',
    'DELETE',
  ])
  expect(fixture.copies()).toHaveLength(1)
  fixture.finalizes()[0].exitCode = 0
  expect(await fixture.prepare()).toBe(false)
  await fixture.tick(3)
  expect(fixture.copies()).toHaveLength(2)
  expect(fixture.finalizes()).toHaveLength(1)
})
