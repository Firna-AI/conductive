import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import {
  orgAgentLoginPath,
  refreshOrgAgentLoginModelsPath,
} from '../../src/shared/org-settings'
import { leaveOrgPath } from '../../src/shared/orgs'
import { decryptAgentLogin } from '../chat/queries'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import {
  orgEndpoint,
  orgLoginFixture,
  savedOrgLogin,
} from './org-agent-logins.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => harness.reset())
afterAll(async () => harness.dispose())

it('lets an admin save one encrypted API key per agent and members read only metadata', async () => {
  const api = await orgLoginFixture(harness)
  for (const agent of ['claude', 'codex'] as const) {
    const saved = await api.save({
      agent,
      kind: 'api-key',
      secret: ' key\n one ',
    })
    expect(saved.status).toBe(200)
    const metadata = {
      agent,
      connected: true,
      kind: 'api-key',
      useForEveryMember: false,
      updatedAt: TEST_TIME,
    }
    expect(await saved.json()).toEqual(metadata)
    const row = await savedOrgLogin(harness, api.org.id, agent)
    expect(row).toMatchObject({ createdBy: api.userId, createdAt: TEST_TIME })
    expect(row?.ciphertext).not.toContain('keyone')
    expect(
      await decryptAgentLogin(
        harness.env,
        { orgId: api.org.id },
        { agent, kind: 'api-key' },
        row?.ciphertext ?? '',
      ),
    ).toEqual({ agent, kind: 'api-key', secret: 'keyone' })
  }
  expect(await (await api.read(api.member)).json()).toEqual({
    defaultLogins: ['claude', 'codex'].map((agent) => ({
      orgId: api.org.id,
      orgName: api.org.name,
      agent,
      login: { type: 'org', orgId: api.org.id },
    })),
    agentLogins: ['claude', 'codex'].map((agent) => ({
      agent,
      connected: true,
      kind: 'api-key',
      useForEveryMember: false,
      updatedAt: TEST_TIME,
    })),
  })
})

it('refuses member writes with the admin error and hides logins from nonmembers', async () => {
  const api = await orgLoginFixture(harness)
  for (const [method, path, body] of [
    [
      'PUT',
      orgAgentLoginPath(api.org.id, 'claude'),
      { agent: 'claude', kind: 'api-key', secret: 'key' },
    ],
    [
      'PATCH',
      orgAgentLoginPath(api.org.id, 'claude'),
      { useForEveryMember: true },
    ],
    ['DELETE', orgAgentLoginPath(api.org.id, 'claude'), {}],
    ['POST', refreshOrgAgentLoginModelsPath(api.org.id, 'claude'), {}],
  ] as const) {
    const response = await api.request(path, api.member, {
      method,
      body: JSON.stringify(body),
    })
    expect(response.status, method).toBe(403)
    expect(await response.json()).toEqual({
      error: {
        code: 'admin_required',
        message: 'Ask an org admin to make this change.',
      },
    })
  }
  await harness.env.DB.prepare(
    'DELETE FROM org_members WHERE org_id = ? AND user_id = ?',
  )
    .bind(api.org.id, api.memberId)
    .run()
  const hidden = await api.read(api.member)
  expect(hidden.status).toBe(404)
  expect(await hidden.json()).toEqual({
    error: {
      code: 'org_not_found',
      message: 'The org is not available.',
    },
  })
})

it('changes only the switch, keeps it on replacement across kinds, and resets it after removal', async () => {
  const api = await orgLoginFixture(harness)
  expect((await api.save()).status).toBe(200)
  const initial = await savedOrgLogin(harness, api.org.id)
  api.setTime(TEST_TIME + 1)
  expect(await (await api.switch(true)).json()).toEqual({
    agent: 'claude',
    connected: true,
    kind: 'api-key',
    useForEveryMember: true,
    updatedAt: TEST_TIME,
  })
  expect(await savedOrgLogin(harness, api.org.id)).toEqual(initial)
  expect(
    await (
      await api.save({
        agent: 'claude',
        kind: 'endpoint',
        endpoint: orgEndpoint,
        secret: 'new-key',
      })
    ).json(),
  ).toMatchObject({
    useForEveryMember: true,
    kind: 'endpoint',
    updatedAt: TEST_TIME + 1,
  })
  api.setTime(TEST_TIME + 2)
  expect(await (await api.save()).json()).toMatchObject({
    kind: 'api-key',
    useForEveryMember: true,
    updatedAt: TEST_TIME + 2,
  })
  expect(await savedOrgLogin(harness, api.org.id)).toMatchObject({
    origin: null,
    ids: null,
    readAt: null,
    createdAt: TEST_TIME,
  })
  const removed = await api.request(
    orgAgentLoginPath(api.org.id, 'claude'),
    api.admin,
    { method: 'DELETE', body: '{}' },
  )
  expect(removed.status).toBe(204)
  expect(await (await api.read()).json()).toEqual({
    defaultLogins: ['claude', 'codex'].map((agent) => ({
      orgId: api.org.id,
      orgName: api.org.name,
      agent,
      login: null,
    })),
    agentLogins: [
      { agent: 'claude', connected: false },
      { agent: 'codex', connected: false },
    ],
  })
  expect(await (await api.save()).json()).toMatchObject({
    useForEveryMember: false,
  })
})

it('keeps a login after its creator leaves and deletes it with its org', async () => {
  const api = await orgLoginFixture(harness)
  expect((await api.save()).status).toBe(200)
  await harness.env.DB.prepare(
    "UPDATE org_members SET role = 'admin' WHERE org_id = ? AND user_id = ?",
  )
    .bind(api.org.id, api.memberId)
    .run()
  const left = await api.request(leaveOrgPath(api.org.id), api.admin, {
    method: 'POST',
    body: '{}',
  })
  expect(left.status).toBe(204)
  expect(await savedOrgLogin(harness, api.org.id)).toMatchObject({
    createdBy: api.userId,
  })
  expect(await (await api.read(api.member)).json()).toMatchObject({
    agentLogins: [
      { agent: 'claude', connected: true },
      { agent: 'codex', connected: false },
    ],
  })
  await harness.env.DB.prepare('DELETE FROM orgs WHERE id = ?')
    .bind(api.org.id)
    .run()
  expect(await savedOrgLogin(harness, api.org.id)).toBeNull()
})

it('refuses to decrypt copied org ciphertext for another org or a personal login', async () => {
  const api = await orgLoginFixture(harness)
  expect((await api.save()).status).toBe(200)
  const row = await savedOrgLogin(harness, api.org.id)
  for (const owner of [{ orgId: 'another-org' }, api.org.id]) {
    await expect(
      decryptAgentLogin(
        harness.env,
        owner,
        { agent: 'claude', kind: 'api-key' },
        row?.ciphertext ?? '',
      ),
    ).rejects.toMatchObject({ name: 'OperationError' })
  }
})
