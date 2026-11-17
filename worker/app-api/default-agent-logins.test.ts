import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { ACCOUNT_PATHS, type AccountResponse } from '../../src/shared/account'
import { GET_STARTED_PATH } from '../../src/shared/onboarding'
import { orgSettingsPaths } from '../../src/shared/org-settings'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { orgEndpoint, orgLoginFixture } from './org-agent-logins.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(() => harness.reset())
afterAll(() => harness.dispose())

it('returns resolver defaults in account and org reads and completes Get started with only an org login', async () => {
  const api = await orgLoginFixture(harness)
  expect((await api.save()).status).toBe(200)
  const account = async (): Promise<AccountResponse> =>
    (await harness.request(ACCOUNT_PATHS.account, api.member)).json()
  expect((await account()).defaultLogins).toEqual([
    {
      orgId: api.org.id,
      orgName: api.org.name,
      agent: 'claude',
      login: { type: 'org', orgId: api.org.id },
    },
    { orgId: api.org.id, orgName: api.org.name, agent: 'codex', login: null },
  ])
  expect(
    await (await harness.request(GET_STARTED_PATH, api.member)).json(),
  ).toMatchObject({
    steps: [
      { step: 'github-app', complete: false },
      { step: 'org', complete: true },
      { step: 'agent-login', complete: true },
    ],
  })
  expect(
    (await api.request(orgSettingsPaths.agentLogins(api.org.id), api.member))
      .status,
  ).toBe(200)
  expect(await (await api.read(api.member)).json()).toMatchObject({
    defaultLogins: (await account()).defaultLogins,
  })
  const saved = await harness.request(
    `${ACCOUNT_PATHS.agentLogins}/claude`,
    api.member,
    {
      method: 'PUT',
      body: JSON.stringify({
        agent: 'claude',
        kind: 'api-key',
        secret: 'member-key',
      }),
    },
  )
  expect(saved.status).toBe(200)
  expect((await account()).defaultLogins?.[0]?.login).toEqual({
    type: 'personal',
    userId: api.memberId,
  })
  expect(
    (
      await api.save({
        agent: 'claude',
        kind: 'endpoint',
        endpoint: orgEndpoint,
        secret: 'endpoint-key',
      })
    ).status,
  ).toBe(200)
  expect((await account()).defaultLogins?.[0]).toEqual({
    orgId: api.org.id,
    orgName: api.org.name,
    agent: 'claude',
    login: { type: 'personal', userId: api.memberId },
    orgModelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
  })
  expect(await (await api.read(api.member)).json()).toMatchObject({
    defaultLogins: [
      {
        login: { type: 'personal', userId: api.memberId },
        orgModelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
      },
      { agent: 'codex', login: null },
    ],
  })
  expect((await api.switch(true)).status).toBe(200)
  expect((await account()).defaultLogins?.[0]?.login).toEqual({
    type: 'org',
    orgId: api.org.id,
  })
  expect((await account()).defaultLogins?.[0]).toMatchObject({
    modelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
    orgModelList: { missing: ['other-claude'], checkedAt: TEST_TIME },
  })
  expect((await api.switch(false)).status).toBe(200)
  expect((await account()).defaultLogins?.[0]?.login).toEqual({
    type: 'personal',
    userId: api.memberId,
  })
  const other = await harness.createOrg(api.admin, 'Other org')
  expect(
    (await account()).defaultLogins?.some((entry) => entry.orgId === other.id),
  ).toBe(false)
  expect(JSON.stringify(await account())).not.toMatch(
    /member-key|endpoint-key|wrappedkey|ciphertext/,
  )
})
