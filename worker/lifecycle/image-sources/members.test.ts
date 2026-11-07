import { generateKeyPairSync } from 'node:crypto'

import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { cleanupDeletedOrgs } from '../../members/cleanup'
import { deleteOrg } from '../../members/deletion'
import { membersClient } from '../../members/members-test-support'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../../test-support/harness'
import { storeBoatKey } from '../../sandbox/keys'
import { firstOrgAdmin } from '../settings-data'
import { localSourceFixture } from './local-source-test-support'
import { withImageSourceCleanup } from './members'
import { readSourceJob } from './source-data'

const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 })
  .privateKey.export({ type: 'pkcs1', format: 'pem' })
  .toString()
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

function deferred() {
  let resolve: () => void = () => {
    throw new Error('Not initialized')
  }
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

it('blocks zero-workspace org purge until its image token is revoked through the required suspension hook', async () => {
  const fixture = await localSourceFixture(harness, privateKey)
  const held = deferred()
  const release = deferred()
  try {
    fixture.access.beforeClaim = async () => {
      held.resolve()
      await release.promise
    }
    await fixture.step()
    await fixture.step()
    await fixture.step()
    await held.promise
    expect(
      (await readSourceJob(fixture.env.DB, fixture.input.buildId))?.grantHash,
    ).toMatch(/^[A-Za-z0-9_-]+$/u)
    const admin = await firstOrgAdmin(fixture.env.DB, fixture.org.id)
    if (!admin) throw new Error('Missing org admin')
    await storeBoatKey(
      fixture.env,
      fixture.org.id,
      admin.userId,
      'boat-first',
      harness.boat.fetch,
      TEST_TIME,
    )
    const client = membersClient(harness)
    const dependencies = {
      ...client.dependencies,
      fetch: (request: Request) =>
        new URL(request.url).hostname === 'boat.dev'
          ? harness.boat.fetch(request)
          : fixture.access.fetch(request),
    }
    const hooks = withImageSourceCleanup(
      fixture.env,
      dependencies.fetch,
      client.hooks,
    )
    fixture.access.revokeFailures = 1
    await expect(
      deleteOrg(
        fixture.env,
        fixture.org.id,
        admin.userId,
        fixture.org.name,
        dependencies,
        hooks,
      ),
    ).rejects.toMatchObject({
      status: 502,
      code: 'org_cleanup_failed',
      message: 'The org cleanup could not finish. Try again.',
    })
    expect(client.suspendedOrgs).toEqual([])
    expect(
      (await readSourceJob(fixture.env.DB, fixture.input.buildId))
        ?.tokenCiphertext,
    ).toMatch(/^v1\./u)
    expect(
      (await readSourceJob(fixture.env.DB, fixture.input.buildId))?.grantHash,
    ).toBeNull()
    expect(
      await fixture.env.DB.prepare('SELECT id FROM image_builds WHERE id = ?')
        .bind(fixture.input.buildId)
        .first('id'),
    ).toBe(fixture.input.buildId)
    release.resolve()
    await fixture.provider.settle()
    client.setTime(TEST_TIME + 604_800_001)
    expect(await cleanupDeletedOrgs(fixture.env, dependencies, hooks)).toEqual({
      purged: [fixture.org.id],
      pending: [],
    })
    expect(fixture.access.activeTokens).toEqual([])
    expect(client.suspendedOrgs).toEqual([
      { orgId: fixture.org.id, workspaceIds: [] },
    ])
    expect(
      await readSourceJob(fixture.env.DB, fixture.input.buildId),
    ).toBeNull()
    expect(
      await fixture.env.DB.prepare('SELECT id FROM orgs WHERE id = ?')
        .bind(fixture.org.id)
        .first('id'),
    ).toBeNull()
    expect(
      harness.boat.requests.some(
        (request) =>
          request.method === 'DELETE' &&
          request.url.endsWith('/sandboxes/builder-one'),
      ),
    ).toBe(true)
  } finally {
    release.resolve()
    await fixture.dispose()
  }
})
