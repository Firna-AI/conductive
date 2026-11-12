import { expect, it } from 'vitest'

import { ProviderAccountError } from '../sandbox/accounts'
import { providerForAccount } from '../sandbox/client'
import { boatRoute } from '../sandbox/routes'
import { setupBackendTests } from './backend-test-hooks'
import { readBuildJob } from './build-data'
import { computerRecords } from './computer-ledger.test-support'
import { pendingComputerCleanup } from './computer-ledger'
import {
  deleteSandboxIfPresent,
  recordSandboxCleanup,
  retrySandboxCleanup,
} from './cleanup'
import { cleanupBuild } from './build-execution'
import { imageRetryFixture } from './retry-test-support'

const fixtureForTest = setupBackendTests()

function configureSecondary(fixture: ReturnType<typeof fixtureForTest>) {
  fixture.boat.server.addAccount({ orgId: 'second-org', apiKey: 'boat-second' })
  fixture.runtime.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    'boat-second': { kind: 'boat', orgId: 'second-org', apiKey: 'boat-second' },
  })
}

it('deletes only its cleanup account and keeps an unknown equal ID pending', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, boat } = fixture
  configureSecondary(fixture)
  for (const providerAccount of ['boat', 'boat-second', 'unknown'])
    await recordSandboxCleanup(runtime.env.DB, {
      workspaceId: `failed-${providerAccount}`,
      orgId: org.id,
      sandboxId: 'shared-computer',
      providerAccount,
    })
  expect(
    await retrySandboxCleanup(
      runtime.env,
      runtime.dependencies,
      'failed-boat-second',
    ),
  ).toBe(true)
  expect(
    boat.server.requests.map((request) => request.headers.get('X-Boat-Org')),
  ).toEqual(['second-org'])
  await expect(
    retrySandboxCleanup(runtime.env, runtime.dependencies, 'failed-unknown'),
  ).rejects.toBeInstanceOf(ProviderAccountError)
  expect(boat.server.requests).toHaveLength(1)
  expect(
    (await computerRecords(runtime.env.DB)).map((row) => ({
      account: row.providerAccount,
      deletedAt: row.deletedAt,
      pending: row.cleanupPending,
    })),
  ).toEqual([
    { account: 'boat', deletedAt: null, pending: 1 },
    {
      account: 'boat-second',
      deletedAt: runtime.dependencies.now(),
      pending: 0,
    },
    { account: 'unknown', deletedAt: null, pending: 1 },
  ])
})

it('clears the saved cleanup pointer after deletion committed before a restart', async () => {
  const fixture = fixtureForTest()
  const { runtime, org, boat } = fixture
  configureSecondary(fixture)
  const computer = {
    sandboxId: 'interrupted-computer',
    providerAccount: 'boat-second',
  }
  await recordSandboxCleanup(runtime.env.DB, {
    workspaceId: 'interrupted-cleanup',
    orgId: org.id,
    ...computer,
  })
  const now = runtime.dependencies.now()
  await deleteSandboxIfPresent(
    runtime.env.DB,
    providerForAccount(
      runtime.env,
      runtime.dependencies.fetch,
      computer.providerAccount,
    ),
    computer,
    now,
  )
  expect(
    await pendingComputerCleanup(runtime.env.DB, 'interrupted-cleanup'),
  ).toEqual([])
  await fixture.setTime(now + 1)
  expect(
    await retrySandboxCleanup(
      runtime.env,
      runtime.dependencies,
      'interrupted-cleanup',
    ),
  ).toBe(true)
  expect(
    await runtime.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM lifecycle_sandbox_cleanup',
    ).first('count'),
  ).toBe(0)
  expect(
    (await computerRecords(runtime.env.DB)).map((row) => row.deletedAt),
  ).toEqual([now])
  expect(
    boat.server.requests.map((request) => request.headers.get('X-Boat-Org')),
  ).toEqual(['second-org', 'second-org'])
})

it('routes every retained build computer through its own account', async () => {
  const fixture = fixtureForTest()
  const { runtime, images, org, boat } = fixture
  configureSecondary(fixture)
  const image = await imageRetryFixture(fixture, { steps: 1 })
  const db = runtime.env.DB
  await db
    .prepare(
      `INSERT INTO computer_ledger (sandbox_id, provider_account, org_id, purpose, purpose_id)
    VALUES ('bx_1', 'boat-second', ?, 'build', ?)`,
    )
    .bind(org.id, image.id)
    .run()
  await db
    .prepare("UPDATE image_builds SET state = 'failed' WHERE id = ?")
    .bind(image.id)
    .run()
  const job = await readBuildJob(db, org.id, image.id)
  const route = boatRoute({ operation: 'delete', sandboxId: 'bx_1' })
  expect(
    await cleanupBuild(
      images,
      providerForAccount(
        runtime.env,
        runtime.dependencies.fetch,
        job.providerAccount,
      ),
      job,
    ),
  ).toBe(true)
  expect(
    boat.server.requests
      .filter(
        (request) =>
          request.method === route.method &&
          new URL(request.url).pathname.endsWith(route.path),
      )
      .map((request) => request.headers.get('X-Boat-Org')),
  ).toEqual(['app-org', 'second-org'])
  expect(
    (await computerRecords(db)).map((row) => ({
      account: row.providerAccount,
      deleted: row.deletedAt !== null,
    })),
  ).toEqual([
    { account: 'boat', deleted: true },
    { account: 'boat-second', deleted: true },
  ])
})
