import { afterEach, beforeAll, expect, it } from 'vitest'

import {
  secretAllAgentsPath,
  secretPath,
  secretRevealPath,
  secretsPath,
} from '../../src/shared/secrets'
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

it('refuses Reveal in a suspended org while keeping secret metadata readable', async () => {
  fixture = await createOuterRuntime(bundle)
  const secret = await addSecret(fixture, OUTER_ORG)
  const path = secretRevealPath(OUTER_ORG, secret.id)
  expect(
    (await fixture.request(path, { method: 'POST', body: '{}' })).status,
  ).toBe(200)
  const records = await secretRevealRecords(fixture)
  await fixture.env.DB.prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
    .bind(OUTER_ORG)
    .run()
  const response = await fixture.request(path, { method: 'POST', body: '{}' })
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({
    error: { code: 'org_suspended' },
  })
  expect(await secretRevealRecords(fixture)).toEqual(records)
  const list = await fixture.request(secretsPath(OUTER_ORG), {
    headers: { Cookie: fixture.cookies.memberCookie },
  })
  expect(list.status).toBe(200)
  expect(await list.json()).toMatchObject({
    secrets: [
      {
        lastReveal: {
          revealedByUserId: 'owner',
          revealedAt: records[0].revealedAt,
        },
      },
    ],
  })
})

it('hides the old reveal after value replacement and keeps it after metadata changes', async () => {
  fixture = await createOuterRuntime(bundle)
  const secret = await addSecret(fixture, OUTER_ORG)
  const path = secretPath(OUTER_ORG, secret.id)
  const revealPath = secretRevealPath(OUTER_ORG, secret.id)
  expect(
    (await fixture.request(revealPath, { method: 'POST', body: '{}' })).status,
  ).toBe(200)
  const records = await secretRevealRecords(fixture)
  const description = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({ description: 'Changed', value: '' }),
  })
  expect(description.status).toBe(200)
  expect(await description.json()).toMatchObject({
    secret: { lastReveal: { revealedAt: records[0].revealedAt } },
  })
  const marked = await fixture.request(
    secretAllAgentsPath(OUTER_ORG, secret.id),
    {
      method: 'PUT',
      body: JSON.stringify({ allAgents: true }),
    },
  )
  expect(marked.status).toBe(200)
  expect(await marked.json()).toMatchObject({
    secret: { lastReveal: { revealedAt: records[0].revealedAt } },
  })
  const replaced = await fixture.request(path, {
    method: 'PATCH',
    body: JSON.stringify({ value: '  replacement\n' }),
  })
  expect(replaced.status).toBe(200)
  expect(await replaced.json()).toMatchObject({ secret: { lastReveal: null } })
  const list = await fixture.request(secretsPath(OUTER_ORG))
  expect(await list.json()).toMatchObject({ secrets: [{ lastReveal: null }] })
  expect(await secretRevealRecords(fixture)).toEqual(records)
  const revealed = await fixture.request(revealPath, {
    method: 'POST',
    body: '{}',
  })
  expect(revealed.status).toBe(200)
  expect(await revealed.json()).toEqual({ value: '  replacement\n' })
  const after = await secretRevealRecords(fixture)
  expect(after).toHaveLength(2)
  const current = await fixture.request(secretsPath(OUTER_ORG))
  expect(await current.json()).toMatchObject({
    secrets: [
      {
        lastReveal: {
          revealedByUserId: 'owner',
          revealedAt: after[1].revealedAt,
        },
      },
    ],
  })
})

it('keeps reveal records after secret deletion and removes them only with the org', async () => {
  fixture = await createOuterRuntime(bundle)
  const secret = await addSecret(fixture, OUTER_ORG)
  expect(
    (
      await fixture.request(secretRevealPath(OUTER_ORG, secret.id), {
        method: 'POST',
        body: '{}',
      })
    ).status,
  ).toBe(200)
  const records = await secretRevealRecords(fixture)
  const deleted = await fixture.request(secretPath(OUTER_ORG, secret.id), {
    method: 'DELETE',
    body: '{}',
  })
  expect(deleted.status).toBe(204)
  expect(await secretRevealRecords(fixture)).toEqual(records)
  expect(await (await fixture.request(secretsPath(OUTER_ORG))).json()).toEqual({
    secrets: [],
  })
  const recreated = await addSecret(fixture, OUTER_ORG)
  expect(recreated.id).not.toBe(secret.id)
  expect(recreated).toMatchObject({ lastReveal: null })
  await fixture.env.DB.prepare(
    'UPDATE orgs SET deleted_at = 1, purge_after = 2 WHERE id = ?',
  )
    .bind(OUTER_ORG)
    .run()
  expect(await secretRevealRecords(fixture)).toEqual(records)
  await fixture.env.DB.prepare('DELETE FROM orgs WHERE id = ?')
    .bind(OUTER_ORG)
    .run()
  expect(await secretRevealRecords(fixture)).toEqual([])
})
