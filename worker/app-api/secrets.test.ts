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
import {
  addSecret,
  secretReply,
  storedSecretValue,
} from './secrets.test-support'
import { secretValueContext } from '../secrets/data'
import { decrypt } from '../security/crypto'

let bundle: string
let fixture: OuterRuntime | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle()
})
afterEach(async () => {
  await fixture?.dispose()
  fixture = undefined
})

it('lets members manage their own secrets and reserves other secrets and marks for admins', async () => {
  fixture = await createOuterRuntime(bundle)
  const member = { Cookie: fixture.cookies.memberCookie }
  const markedCreate = await fixture.request(secretsPath(OUTER_ORG), {
    method: 'POST',
    headers: member,
    body: JSON.stringify({
      name: 'NOT_ALLOWED',
      description: '',
      value: 'private',
      allAgents: true,
    }),
  })
  expect(markedCreate.status).toBe(403)
  const create = await fixture.request(secretsPath(OUTER_ORG), {
    method: 'POST',
    headers: member,
    body: JSON.stringify({ name: 'TOKEN', description: 'First', value: 'old' }),
  })
  expect(create.status).toBe(201)
  const secret = await secretReply(create)
  expect(secret).toMatchObject({ createdByUserId: 'member', allAgents: false })
  await fixture.env.DB.prepare('UPDATE org_secrets SET name = ? WHERE id = ?')
    .bind('Cloudflare (read-only)', secret.id)
    .run()
  const path = secretPath(OUTER_ORG, secret.id)
  const replace = await fixture.request(path, {
    method: 'PATCH',
    headers: member,
    body: JSON.stringify({ description: 'Changed', value: '  new\n' }),
  })
  expect(replace.status).toBe(200)
  expect(await replace.json()).toMatchObject({
    secret: { name: 'Cloudflare (read-only)', description: 'Changed' },
  })
  expect((await storedSecretValue(fixture, OUTER_ORG, secret.id)).value).toBe(
    '  new\n',
  )
  const revealed = await fixture.request(
    secretRevealPath(OUTER_ORG, secret.id),
    {
      method: 'POST',
      body: '{}',
    },
  )
  expect(revealed.status).toBe(200)
  expect(await revealed.json()).toEqual({ value: '  new\n' })
  const mark = secretAllAgentsPath(OUTER_ORG, secret.id)
  expect(
    (
      await fixture.request(mark, {
        method: 'PUT',
        headers: member,
        body: JSON.stringify({ allAgents: true }),
      })
    ).status,
  ).toBe(403)
  expect(
    (
      await fixture.request(mark, {
        method: 'PUT',
        body: JSON.stringify({ allAgents: true }),
      })
    ).status,
  ).toBe(200)
  expect(
    (
      await fixture.request(mark, {
        method: 'PUT',
        headers: member,
        body: JSON.stringify({ allAgents: false }),
      })
    ).status,
  ).toBe(403)
  const cleared = await fixture.request(mark, {
    method: 'PUT',
    body: JSON.stringify({ allAgents: false }),
  })
  expect(cleared.status).toBe(200)
  expect(await cleared.json()).toMatchObject({ secret: { allAgents: false } })
  const own = await fixture.request(secretsPath(OUTER_ORG), {
    method: 'POST',
    body: JSON.stringify({
      name: 'ADMIN_TOKEN',
      description: '',
      value: 'private',
      allAgents: true,
    }),
  })
  expect(own.status).toBe(201)
  const adminSecret = await secretReply(own)
  expect(adminSecret).toMatchObject({ allAgents: true })
  const adminPath = secretPath(OUTER_ORG, adminSecret.id)
  for (const method of ['PATCH', 'DELETE']) {
    const denied = await fixture.request(adminPath, {
      method,
      headers: member,
      body: JSON.stringify({ value: 'wrong' }),
    })
    expect(denied.status).toBe(403)
  }
  expect(
    (
      await fixture.request(path, {
        method: 'PATCH',
        body: JSON.stringify({ description: 'Admin edit', value: '' }),
      })
    ).status,
  ).toBe(200)
  expect((await storedSecretValue(fixture, OUTER_ORG, secret.id)).value).toBe(
    '  new\n',
  )
  expect(
    (
      await fixture.request(path, {
        method: 'DELETE',
        headers: member,
        body: '{}',
      })
    ).status,
  ).toBe(204)
  const forAdmin = await addSecret(fixture, OUTER_ORG)
  expect(
    (
      await fixture.request(secretPath(OUTER_ORG, forAdmin.id), {
        method: 'DELETE',
        body: '{}',
      })
    ).status,
  ).toBe(204)
})

it('keeps values encrypted and out of replies, uses org-unique names, and blocks suspended writes', async () => {
  fixture = await createOuterRuntime(bundle)
  for (const name of [
    'Cloudflare (read-only)',
    'Clé_API',
    'A-B',
    'A=B',
    'A\0B',
  ]) {
    const refused = await fixture.request(secretsPath(OUTER_ORG), {
      method: 'POST',
      body: JSON.stringify({ name, description: '', value: 'private' }),
    })
    expect(refused.status, JSON.stringify(name)).toBe(400)
    expect(await refused.json()).toMatchObject({
      error: {
        code: 'invalid_secret_name',
        message: 'Use only letters, digits, and underscores.',
      },
    })
  }
  const input = {
    name: '  9_token_ \n',
    description: 'Access',
    value: '  private\n',
  }
  const response = await fixture.request(secretsPath(OUTER_ORG), {
    method: 'POST',
    body: JSON.stringify(input),
  })
  expect(response.status).toBe(201)
  const secret = await secretReply(response)
  expect(secret).toMatchObject({ name: '9_token_' })
  const { ciphertext, value } = await storedSecretValue(
    fixture,
    OUTER_ORG,
    secret.id,
  )
  expect(ciphertext).not.toContain('private')
  expect(value).toBe('  private\n')
  await expect(
    decrypt(
      ciphertext,
      secretValueContext('other-org', secret.id),
      fixture.env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  ).rejects.toMatchObject({ name: 'OperationError' })
  const duplicate = await fixture.request(secretsPath(OUTER_ORG), {
    method: 'POST',
    body: JSON.stringify(input),
  })
  expect(duplicate.status).toBe(409)
  expect(await duplicate.json()).toMatchObject({
    error: { code: 'secret_name_exists' },
  })
  const list = await fixture.request(secretsPath(OUTER_ORG), {
    headers: { Cookie: fixture.cookies.memberCookie },
  })
  expect(list.status).toBe(200)
  expect(await list.json()).toEqual({ secrets: [secret] })
  expect(Object.keys(secret).sort()).toEqual([
    'allAgents',
    'createdAt',
    'createdBy',
    'createdByUserId',
    'description',
    'id',
    'lastReveal',
    'name',
    'updatedAt',
  ])
  const other = await fixture.request(secretsPath('other-org'), {
    method: 'POST',
    headers: { Cookie: fixture.cookies.outsiderCookie },
    body: JSON.stringify(input),
  })
  expect(other.status).toBe(201)
  expect(
    (
      await fixture.request(secretPath('other-org', secret.id), {
        method: 'DELETE',
        body: '{}',
        headers: { Cookie: fixture.cookies.outsiderCookie },
      })
    ).status,
  ).toBe(404)
  await fixture.env.DB.prepare('UPDATE orgs SET suspended_at = 1 WHERE id = ?')
    .bind(OUTER_ORG)
    .run()
  expect((await fixture.request(secretsPath(OUTER_ORG))).status).toBe(200)
  const suspended = await fixture.request(secretPath(OUTER_ORG, secret.id), {
    method: 'PATCH',
    body: JSON.stringify({ value: 'wrong' }),
  })
  expect(suspended.status).toBe(403)
  expect(await suspended.json()).toMatchObject({
    error: { code: 'org_suspended' },
  })
})
