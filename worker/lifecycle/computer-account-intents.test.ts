import { expect, it } from 'vitest'

import { providerForAccount } from '../sandbox/client'
import { setupBackendTests } from './backend-test-hooks'
import { recordSandboxCleanup } from './cleanup'
import { computerRecords } from './computer-ledger.test-support'
import { recordComputerIntent, rejectComputerIntent } from './computer-ledger'
import { createResource } from './resource-intents'

const fixtureForTest = setupBackendTests()

it('keeps equal allocation keys and imported IDs separate across accounts', async () => {
  const { runtime, org, user, boat } = fixtureForTest()
  boat.server.addAccount({ orgId: 'second-org', apiKey: 'boat-second' })
  runtime.env.SANDBOX_PROVIDER_ACCOUNTS = {
    'boat-second': { kind: 'boat', orgId: 'second-org', apiKey: 'boat-second' },
  }
  for (const providerAccount of ['boat', 'boat-second'])
    await recordSandboxCleanup(runtime.env.DB, {
      workspaceId: `imported-${providerAccount}`,
      orgId: org.id,
      sandboxId: 'bx_1',
      providerAccount,
    })
  const allocate = (providerAccount: string) =>
    createResource(
      runtime.env.DB,
      providerForAccount(
        runtime.env,
        runtime.dependencies.fetch,
        providerAccount,
      ),
      {
        kind: 'sandbox',
        ownership: {
          orgId: org.id,
          providerAccount,
          ownerUserId: user.id,
          purpose: 'workspace',
          purposeId: `imported-${providerAccount}`,
        },
        mayHaveAllocated: false,
        input: {
          name: 'computer',
          env: {},
          ttlSeconds: 1800,
          idempotencyKey: 'shared-key',
        },
        persist: async () => {},
      },
    )
  const records = async () =>
    (await computerRecords(runtime.env.DB)).map((row) => ({
      account: row.providerAccount,
      key: row.allocationKey,
      sandboxId: row.sandboxId,
      owner: row.ownerUserId,
      purposeId: row.purposeId,
    }))
  await allocate('boat')
  expect(await records()).toEqual([
    {
      account: 'boat',
      key: 'shared-key',
      sandboxId: 'bx_1',
      owner: user.id,
      purposeId: 'imported-boat',
    },
    {
      account: 'boat-second',
      key: null,
      sandboxId: 'bx_1',
      owner: null,
      purposeId: 'imported-boat-second',
    },
  ])
  await allocate('boat-second')
  expect(await records()).toEqual([
    {
      account: 'boat',
      key: 'shared-key',
      sandboxId: 'bx_1',
      owner: user.id,
      purposeId: 'imported-boat',
    },
    {
      account: 'boat-second',
      key: 'shared-key',
      sandboxId: 'bx_1',
      owner: user.id,
      purposeId: 'imported-boat-second',
    },
  ])
})

it('rejects and reopens only the allocation of the named account', async () => {
  const { runtime, org, user, boat } = fixtureForTest()
  boat.server.addAccount({ orgId: 'second-org', apiKey: 'boat-second' })
  runtime.env.SANDBOX_PROVIDER_ACCOUNTS = {
    'boat-second': { kind: 'boat', orgId: 'second-org', apiKey: 'boat-second' },
  }
  for (const providerAccount of ['boat', 'boat-second'])
    await recordComputerIntent(
      runtime.env.DB,
      'refused-key',
      {
        orgId: org.id,
        providerAccount,
        ownerUserId: user.id,
        purpose: 'build',
        purposeId: 'refused-build',
      },
      false,
    )
  await rejectComputerIntent(runtime.env.DB, 'refused-key', 'boat-second')
  const read = () =>
    runtime.env.DB.prepare(
      `SELECT provider_account AS account, create_rejected AS rejected
     FROM computer_ledger ORDER BY id`,
    ).all()
  expect((await read()).results).toEqual([
    { account: 'boat', rejected: 0 },
    { account: 'boat-second', rejected: 1 },
  ])
  expect(
    await recordComputerIntent(
      runtime.env.DB,
      'refused-key',
      {
        orgId: org.id,
        providerAccount: 'boat',
        ownerUserId: user.id,
        purpose: 'build',
        purposeId: 'refused-build',
      },
      true,
    ),
  ).toBe(false)
  expect((await read()).results).toEqual([
    { account: 'boat', rejected: 0 },
    { account: 'boat-second', rejected: 1 },
  ])
  expect(
    await recordComputerIntent(
      runtime.env.DB,
      'refused-key',
      {
        orgId: org.id,
        providerAccount: 'boat-second',
        ownerUserId: user.id,
        purpose: 'build',
        purposeId: 'refused-build',
      },
      true,
    ),
  ).toBe(true)
  expect((await read()).results).toEqual([
    { account: 'boat', rejected: 0 },
    { account: 'boat-second', rejected: 0 },
  ])
})
