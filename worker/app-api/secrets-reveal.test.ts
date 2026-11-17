import { afterEach, beforeAll, expect, it } from 'vitest'

import { secretRevealPath, secretsPath } from '../../src/shared/secrets'
import {
  createOuterRuntime,
  outerWorkerBundle,
  type OuterRuntime,
} from '../chat/integration/outer-runtime.test-support'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'
import { addSecret, secretRevealRecords } from './secrets.test-support'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('reveals one value to an admin and records every reveal with its secret name', async () => {
  fixture = await createOuterRuntime(bundle)
  const secret = await addSecret(fixture, OUTER_ORG)
  const path = secretRevealPath(OUTER_ORG, secret.id)
  for (let index = 0; index < 2; index++) {
    const response = await fixture.request(path, { method: 'POST', body: '{}' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ value: 'private' })
  }
  expect(await secretRevealRecords(fixture)).toEqual([
    {
      orgId: OUTER_ORG,
      secretId: secret.id,
      secretName: 'TOKEN',
      revealedByUserId: 'owner',
      revealedAt: expect.any(Number),
    },
    {
      orgId: OUTER_ORG,
      secretId: secret.id,
      secretName: 'TOKEN',
      revealedByUserId: 'owner',
      revealedAt: expect.any(Number),
    },
  ])
})

it('refuses a member even when they created the secret', async () => {
  fixture = await createOuterRuntime(bundle)
  const secret = await addSecret(fixture, OUTER_ORG)
  const response = await fixture.request(
    secretRevealPath(OUTER_ORG, secret.id),
    {
      method: 'POST',
      headers: { Cookie: fixture.cookies.memberCookie },
      body: '{}',
    },
  )
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({
    error: { code: 'admin_required' },
  })
  expect(await secretRevealRecords(fixture)).toEqual([])
})

it('requires POST, a matching Origin, and a secret from the calling org', async () => {
  fixture = await createOuterRuntime(bundle)
  const secret = await addSecret(fixture, OUTER_ORG)
  const path = secretRevealPath(OUTER_ORG, secret.id)
  expect((await fixture.request(path)).status).toBe(404)
  const crossOrigin = await fixture.request(path, {
    method: 'POST',
    headers: { Origin: 'https://other.test' },
    body: '{}',
  })
  expect(crossOrigin.status).toBe(403)
  expect(await crossOrigin.json()).toMatchObject({
    error: { code: 'origin_forbidden' },
  })
  const noOrigin = await fixture.runtime.dispatchFetch(
    `${fixture.env.APP_ORIGIN}${path}`,
    {
      method: 'POST',
      headers: {
        Cookie: fixture.cookies.ownerCookie,
        'Content-Type': 'application/json',
      },
      body: '{}',
    },
  )
  expect(noOrigin.status).toBe(403)
  expect(await noOrigin.json()).toMatchObject({
    error: { code: 'origin_forbidden' },
  })
  const otherOrg = await fixture.request(
    secretRevealPath('other-org', secret.id),
    {
      method: 'POST',
      headers: { Cookie: fixture.cookies.outsiderCookie },
      body: '{}',
    },
  )
  expect(otherOrg.status).toBe(404)
  expect(await otherOrg.json()).toMatchObject({
    error: { code: 'secret_not_found' },
  })
  expect(await secretRevealRecords(fixture)).toEqual([])
})

it('shows the latest reader and time to all members without returning values in the list', async () => {
  fixture = await createOuterRuntime(bundle)
  const secret = await addSecret(fixture, OUTER_ORG)
  const other = await addSecret(fixture, OUTER_ORG, 'OTHER')
  const path = secretRevealPath(OUTER_ORG, secret.id)
  expect(
    (await fixture.request(path, { method: 'POST', body: '{}' })).status,
  ).toBe(200)
  await fixture.env.DB.prepare(
    "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, 'outsider', 'admin', 2)",
  )
    .bind(OUTER_ORG)
    .run()
  expect(
    (
      await fixture.request(path, {
        method: 'POST',
        headers: { Cookie: fixture.cookies.outsiderCookie },
        body: '{}',
      })
    ).status,
  ).toBe(200)
  const records = await secretRevealRecords(fixture)
  const response = await fixture.request(secretsPath(OUTER_ORG), {
    headers: { Cookie: fixture.cookies.memberCookie },
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    secrets: [
      { ...other, lastReveal: null },
      {
        ...secret,
        lastReveal: {
          revealedByUserId: 'outsider',
          revealedBy: {
            id: 'outsider',
            githubLogin: 'outsider',
            displayName: null,
            avatarUrl: null,
          },
          revealedAt: records[1].revealedAt,
        },
      },
    ],
  })
})
