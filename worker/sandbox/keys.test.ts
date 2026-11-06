import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { boatKeyPath } from '../../src/shared/api'
import { readBoatKey } from '../data/boat-keys'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { orgSandboxProvider } from './keys'

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

it('tests the key once and returns only saved status on writes and reads', async () => {
  const session = await harness.login()
  const org = await harness.createOrg(session)
  expect(
    await (await harness.request(boatKeyPath(org.id), session)).json(),
  ).toEqual({ configured: false })
  const saved = await harness.request(boatKeyPath(org.id), session, {
    method: 'PUT',
    body: '{"key":"boat-first"}',
  })
  expect(saved.status).toBe(200)
  expect(await saved.json()).toEqual({ configured: true, updatedAt: TEST_TIME })
  expect(harness.boat.requests).toHaveLength(1)
  expect(new URL(harness.boat.requests[0].url).pathname).toBe('/api/v1/orgs')
  const read = await harness.request(boatKeyPath(org.id), session)
  expect(await read.json()).toEqual({ configured: true, updatedAt: TEST_TIME })
  expect(harness.boat.requests).toHaveLength(1)
  const stored = await readBoatKey(harness.env.DB, org.id)
  expect(stored?.ciphertext).not.toContain('boat-first')
  expect(stored).toMatchObject({ accountId: 'team-one', accountType: 'org' })
  const user = await harness.env.DB.prepare(
    'SELECT id FROM users WHERE github_id = 7',
  ).first<string>('id')
  if (user === null) throw new Error('Missing test user')
  const provider = await orgSandboxProvider(
    harness.env,
    user,
    org.id,
    harness.boat.fetch,
  )
  expect(await provider.get('bx_one')).toEqual({ id: 'bx_one', state: 'ready' })
  expect(harness.boat.requests[1].headers.get('Authorization')).toBe(
    'Bearer boat-first',
  )
  expect(harness.boat.requests[1].headers.get('X-Boat-Org')).toBe('team-one')
})

it('allows same-account rotation and keeps the old key after a different-account save', async () => {
  const session = await harness.login()
  const org = await harness.createOrg(session)
  const save = (key: string) =>
    harness.request(boatKeyPath(org.id), session, {
      method: 'PUT',
      body: JSON.stringify({ key }),
    })
  expect((await save('boat-first')).status).toBe(200)
  harness.boat.responseOverride = Response.json({
    ok: true,
    type: 'org.list',
    orgs: [
      { id: 'team-one', type: 'org', active: false },
      { id: 'team-two', type: 'org', active: true },
    ],
  })
  expect((await save('boat-rotated')).status).toBe(200)
  harness.boat.responseOverride = null
  const before = await readBoatKey(harness.env.DB, org.id)
  const refused = await save('boat-other')
  expect(refused.status).toBe(409)
  expect(await refused.json()).toMatchObject({
    error: {
      code: 'boat_account_mismatch',
      message: expect.stringContaining('another Boat account'),
    },
  })
  expect(await readBoatKey(harness.env.DB, org.id)).toEqual(before)
  expect(harness.boat.requests).toHaveLength(3)
})

it('keeps the first account when two initial key saves compete', async () => {
  const session = await harness.login()
  const org = await harness.createOrg(session)
  const responses = await Promise.all(
    ['boat-first', 'boat-other'].map((key) =>
      harness.request(boatKeyPath(org.id), session, {
        method: 'PUT',
        body: JSON.stringify({ key }),
      }),
    ),
  )
  expect(responses.map((response) => response.status).sort()).toEqual([
    200, 409,
  ])
  expect(harness.boat.requests).toHaveLength(2)
})

it('keeps the saved key when Boat refuses the replacement and hides upstream secrets', async () => {
  const session = await harness.login()
  const org = await harness.createOrg(session)
  const save = () =>
    harness.request(boatKeyPath(org.id), session, {
      method: 'PUT',
      body: '{"key":"boat-first"}',
    })
  expect((await save()).status).toBe(200)
  const before = await readBoatKey(harness.env.DB, org.id)
  harness.boat.failure = { status: 403, code: 'api_key_action_forbidden' }
  const refused = await save()
  expect(refused.status).toBe(400)
  expect(await refused.json()).toEqual({
    error: {
      code: 'boat_key_refused',
      message: 'Boat refused this key. Check its expiry and permissions.',
    },
  })
  expect(await readBoatKey(harness.env.DB, org.id)).toEqual(before)
})
