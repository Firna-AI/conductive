import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { WORKSPACE_ID } from '../chat/harness.test-support'
import { createHarness, type TestHarness } from '../test-support/harness'
import { continueFixture } from './continue.test-support'
import { CONTINUE_JOB_KEY, continueJobKey } from './continue-types'
import { readWorkspace } from './workspace-data'

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

async function storedAccountFixture() {
  const f = await continueFixture(harness)
  f.boat.server.addAccount({ orgId: 'kept-org', apiKey: 'kept-key' })
  f.boat.server.addAccount({ orgId: 'new-default-org', apiKey: 'new-key' })
  f.env.SANDBOX_PROVIDER_ACCOUNTS = JSON.stringify({
    kept: { kind: 'boat', orgId: 'kept-org', apiKey: 'kept-key' },
  })
  await f.env.DB.prepare(
    "UPDATE workspaces SET provider_account = 'kept' WHERE id = ?",
  )
    .bind(WORKSPACE_ID)
    .run()
  return f
}

it('keeps Continue commands and its member credential on the stored account after a default change and reconstruction', async () => {
  const f = await storedAccountFixture()
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  f.env.BOAT_API_KEY = 'new-key'
  f.env.BOAT_ORG_ID = 'new-default-org'
  const job = await f.advanceTo('fetch')
  expect(job.providerAccount).toBe('kept')
  f.boat.commandRunning = true
  await f.coordinator.advance()
  expect(await (await f.credential(job.fetchId)).json()).toEqual({
    token: 'member-continue-token',
  })
  f.boat.commandRunning = false
  f.reconstruct()
  await f.finish()
  await expect(f.result(pending.continueId)).resolves.toMatchObject({
    state: 'continued',
  })
  expect(await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).toMatchObject({
    sandboxId: 'bx_continue',
    providerAccount: 'kept',
  })
  expect(
    f.boat.commandRequests.filter(({ detached }) => detached),
  ).toHaveLength(2)
  expect(
    new Set(
      f.boat.server.requests.map((request) =>
        request.headers.get('X-Boat-Org'),
      ),
    ),
  ).toEqual(new Set(['kept-org']))
})

it('refuses a fetch credential when another account replaces the workspace with the same sandbox ID', async () => {
  const f = await storedAccountFixture()
  await f.start()
  const job = await f.advanceTo('fetch')
  f.boat.commandRunning = true
  await f.coordinator.advance()
  await f.env.DB.prepare(
    "UPDATE workspaces SET provider_account = 'boat' WHERE id = ?",
  )
    .bind(WORKSPACE_ID)
    .run()
  const requests = f.boat.server.requests.length
  await expect(f.credential(job.fetchId)).rejects.toMatchObject({
    status: 409,
    code: 'sandbox_unavailable',
  })
  expect(f.boat.server.requests).toHaveLength(requests)
  f.boat.commandRunning = false
  await f.finish()
  expect(
    new Set(
      f.boat.server.requests.map((request) =>
        request.headers.get('X-Boat-Org'),
      ),
    ),
  ).toEqual(new Set(['kept-org']))
})

it('keeps branch publication pending when another account owns the same sandbox ID', async () => {
  const f = await storedAccountFixture()
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  await f.advanceTo('publish')
  await f.env.DB.batch([
    f.env.DB.prepare(
      "UPDATE workspaces SET provider_account = 'boat' WHERE id = ?",
    ).bind(WORKSPACE_ID),
    f.env.DB.prepare(
      "UPDATE repositories SET default_branch = 'before-publication' WHERE id = 'repo'",
    ),
  ])
  const requests = f.boat.server.requests.length
  f.reconstruct()
  await f.coordinator.advance()
  expect(await f.result(pending.continueId)).toEqual(pending)
  expect(await readWorkspace(f.env.DB, f.org.id, WORKSPACE_ID)).toMatchObject({
    branch: 'octocat/test',
    sandboxId: 'bx_continue',
    providerAccount: 'boat',
  })
  expect(
    await f.env.DB.prepare(
      "SELECT default_branch FROM repositories WHERE id = 'repo'",
    ).first('default_branch'),
  ).toBe('before-publication')
  expect(f.boat.server.requests).toHaveLength(requests)
  await f.env.DB.prepare(
    "UPDATE workspaces SET provider_account = 'kept' WHERE id = ?",
  )
    .bind(WORKSPACE_ID)
    .run()
  await f.finish()
  await expect(f.result(pending.continueId)).resolves.toMatchObject({
    state: 'continued',
  })
})

it('recovers an older Continue job without an account in its original boat account', async () => {
  const f = await continueFixture(harness)
  const pending = await f.start()
  if (pending.state !== 'pending') throw new Error('Expected pending Continue.')
  const job = await f.advanceTo('fetch')
  const legacy = { ...job, providerAccount: undefined }
  await f.storage.put(continueJobKey(job.id), legacy)
  await f.storage.put(CONTINUE_JOB_KEY, legacy)
  f.reconstruct()
  await f.finish()
  await expect(f.result(pending.continueId)).resolves.toMatchObject({
    state: 'continued',
  })
  expect(
    new Set(
      f.boat.server.requests.map((request) =>
        request.headers.get('X-Boat-Org'),
      ),
    ),
  ).toEqual(new Set(['app-org']))
})
