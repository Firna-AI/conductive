import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { activeWorkspace, isProcessed } from '../github/data'
import { createHarness, type TestHarness } from '../test-support/harness'
import { heldOperation } from '../test-support/held-operation'
import { BASE_CHANGE_JOB_KEY } from './base-change-job'
import { repositoryDefaultRaceFixture } from './repository-default-race.test-support'

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

it('fetches the saved default after an older delivery replaces its prepared move and loses the guarded repository save', async () => {
  const f = await repositoryDefaultRaceFixture(harness)
  const older = f.older()
  let reads = 0
  const delivery = f.runDelivery(
    'older-default',
    async () => (++reads === 1 ? 'trunk' : 'release'),
    older.database,
    older.saved,
  )
  try {
    await older.gate.entered
    await f.runDelivery('newer-default', async () => 'release')
    expect((await f.pending())?.change.to).toBe('release')
    expect(
      await activeWorkspace(f.env.DB, f.binding.id, f.binding.orgId),
    ).toMatchObject({ defaultBranch: 'release', baseBranch: null })
  } finally {
    older.gate.release()
    await delivery
  }
  expect(older.writes).toEqual([0, 1])
  expect((await f.pending())?.change.to).toBe('trunk')
  expect(
    [...(await f.storage.list({ prefix: 'baseChange:' }))].map(([key]) => key),
  ).toEqual([BASE_CHANGE_JOB_KEY])
  await f.advance()
  expect(f.fetches()).toHaveLength(1)
  expect(f.fetches()[0].command).toContain(
    '+refs/heads/release:refs/heads/continue-base',
  )
  expect(f.installs()).toHaveLength(1)
  expect(f.installs()[0].command).toContain('refs/remotes/origin/release')
  expect(await f.pending()).toBeUndefined()
  expect(await f.storage.get('alarm:baseChange')).toBeUndefined()
})

it('keeps one growing retry while a rename returns to an earlier default before its save completes', async () => {
  const f = await repositoryDefaultRaceFixture(harness)
  f.boat.synchronousExitCode = 1
  await f.runDelivery('forward-again', async () => 'trunk')
  const forward = await f.pending()
  if (!forward) throw new Error('Missing forward move.')
  await f.advance()
  expect(await f.pending()).toMatchObject({ id: forward.id, failures: 1 })

  f.boat.synchronousExitCode = 0
  const returning = f.holdSave()
  const back = f.runDelivery(
    'return-to-main',
    async () => 'main',
    returning.database,
  )
  try {
    await returning.gate.entered
    await f.advance()
    expect(await f.pending()).toMatchObject({
      id: forward.id,
      failures: 2,
      change: { to: 'trunk' },
      repositoryBeforeSave: { defaultBranch: 'main' },
    })
    expect((await f.pending())?.repositoryDeliveries).toHaveLength(1)
    expect(
      [...(await f.storage.list({ prefix: 'baseChange:' }))].map(
        ([key]) => key,
      ),
    ).toEqual([BASE_CHANGE_JOB_KEY])
  } finally {
    returning.gate.release()
    await back
  }
  await f.advance()
  expect(f.fetches().at(-1)?.command).toContain(
    '+refs/heads/main:refs/heads/continue-base',
  )
  expect(f.installs().at(-1)?.command).toContain('refs/remotes/origin/main')
  expect(await f.pending()).toBeUndefined()
  expect(await f.storage.get('alarm:baseChange')).toBeUndefined()
})

it('keeps the newer saved-default move when an earlier fetch finishes after the rename', async () => {
  const f = await repositoryDefaultRaceFixture(harness)
  await f.runDelivery('first-default', async () => 'trunk')
  const first = await f.pending()
  if (!first) throw new Error('Missing first move.')
  const fetched = heldOperation()
  let held = false
  f.boat.beforeCommand = async (command) => {
    if (!held && command.includes('credential.helper=/usr/local/bin/')) {
      held = true
      await fetched.wait()
    }
  }
  const moving = f.advance()
  try {
    await fetched.entered
    await f.runDelivery('next-default', async () => 'release')
    expect(await f.pending()).toMatchObject({
      id: first.id,
      change: { to: 'release' },
    })
    expect(await f.credentialSender(first.id)).toBeNull()
  } finally {
    fetched.release()
    await moving
  }
  expect(f.installs()).toEqual([])
  expect(await f.pending()).toMatchObject({
    id: first.id,
    failures: 0,
    change: { to: 'release' },
  })
  await f.advance()
  expect(f.installs()).toHaveLength(1)
  expect(f.fetches().at(-1)?.command).toContain(
    '+refs/heads/release:refs/heads/continue-base',
  )
  expect(f.installs()[0].command).toContain('refs/remotes/origin/release')
  expect(await f.pending()).toBeUndefined()
})

it('refuses a delayed metadata write after its failed sync closes and the move completes', async () => {
  const f = await repositoryDefaultRaceFixture(harness)
  const late = f.lateSave()
  await expect(
    f.runDelivery('delayed-default', async () => 'trunk', late.database),
  ).rejects.toThrow('The metadata write lost its reply.')
  await f.advance()
  expect(f.fetches().at(-1)?.command).toContain(
    '+refs/heads/main:refs/heads/continue-base',
  )
  expect(await f.pending()).toBeUndefined()
  expect(await late.execute()).toBe(0)
  expect(
    await activeWorkspace(f.env.DB, f.binding.id, f.binding.orgId),
  ).toMatchObject({ defaultBranch: 'main', baseBranch: null })
})

it('closes an interrupted sync receipt and keeps one retry before completing the saved-default move', async () => {
  const f = await repositoryDefaultRaceFixture(harness)
  const late = f.lateSave()
  await f.env.DB.prepare(
    `CREATE TRIGGER reject_sync_close BEFORE UPDATE OF processed_at ON github_webhook_deliveries
     WHEN OLD.delivery_id LIKE 'repository-default:%'
     BEGIN SELECT RAISE(ABORT, 'held receipt close'); END`,
  ).run()
  await expect(
    f.runDelivery('interrupted-default', async () => 'trunk', late.database),
  ).rejects.toThrow('held receipt close')
  await f.env.DB.exec('DROP TRIGGER reject_sync_close')
  const pending = await f.pending()
  const receipt = pending?.repositoryDeliveries?.[0]
  if (!pending || !receipt) throw new Error('Missing interrupted move.')
  expect(await isProcessed(f.env.DB, receipt)).toBe(false)
  await f.advance()
  expect(await f.pending()).toMatchObject({ id: pending.id, failures: 1 })
  expect(await isProcessed(f.env.DB, receipt)).toBe(true)
  expect(await late.execute()).toBe(0)
  await f.advance()
  expect(f.fetches().at(-1)?.command).toContain(
    '+refs/heads/main:refs/heads/continue-base',
  )
  expect(f.installs().at(-1)?.command).toContain('refs/remotes/origin/main')
  expect(await f.pending()).toBeUndefined()
  expect(await f.storage.get('alarm:baseChange')).toBeUndefined()
})
