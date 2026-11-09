import { expect } from 'vitest'

import {
  ACCOUNT_PATHS,
  type AccountResponse,
  type AgentLoginStatus,
  type SaveAgentLoginRequest,
  type SetDefaultModelRequest,
} from '../../src/shared/account'
import { GET_STARTED_PATH } from '../../src/shared/onboarding'
import { TERMS_VERSION } from '../../src/shared/terms'
import { readAccount } from '../../src/app/api/read-core'
import { saveSession, saveUser, type GitHubIdentity } from '../data/users'
import { SESSION_COOKIE } from '../security/cookies'
import { sign } from '../security/crypto'
import { saveGitHubTokens } from '../security/github-tokens'
import { TEST_TIME, type TestHarness } from '../test-support/harness'

export const noLogins: readonly AgentLoginStatus[] = [
  { agent: 'claude', connected: false },
  { agent: 'codex', connected: false },
]
export const firstLogins: readonly AgentLoginStatus[] = [
  {
    agent: 'claude',
    connected: true,
    kind: 'token',
    noReuse: true,
    updatedAt: TEST_TIME,
  },
  { agent: 'codex', connected: false },
]
export const otherClaudeLogin: readonly AgentLoginStatus[] = [
  {
    agent: 'claude',
    connected: true,
    kind: 'api-key',
    noReuse: false,
    updatedAt: TEST_TIME,
  },
  { agent: 'codex', connected: false },
]
export const otherLogins: readonly AgentLoginStatus[] = [
  {
    agent: 'claude',
    connected: true,
    kind: 'api-key',
    noReuse: false,
    updatedAt: TEST_TIME,
  },
  {
    agent: 'codex',
    connected: true,
    kind: 'api-key',
    noReuse: false,
    updatedAt: TEST_TIME,
  },
]

export interface AccountState extends Pick<
  AccountResponse,
  'defaultChoice' | 'agentLogins'
> {
  agentLoginComplete: boolean
}

export async function expectAccountState(
  harness: TestHarness,
  cookie: string,
  expected: AccountState,
  profile: {
    githubLogin: string
    orgId: string | null
    githubComplete: boolean
  },
): Promise<void> {
  const [response, started] = await Promise.all([
    harness.request(ACCOUNT_PATHS.account, cookie),
    harness.request(GET_STARTED_PATH, cookie),
  ])
  expect(response.status).toBe(200)
  const account = readAccount(await response.json())
  expect(account.user.githubLogin).toBe(profile.githubLogin)
  expect(account.defaultChoice, `${profile.githubLogin} default model`).toEqual(
    expected.defaultChoice,
  )
  expect(account.agentLogins, `${profile.githubLogin} agent logins`).toEqual(
    expected.agentLogins,
  )
  expect(started.status).toBe(200)
  expect(await started.json(), `${profile.githubLogin} Get started`).toEqual({
    orgId: profile.orgId,
    steps: [
      { step: 'github-app', complete: profile.githubComplete },
      { step: 'org', complete: profile.orgId !== null },
      { step: 'agent-login', complete: expected.agentLoginComplete },
    ],
  })
}

export async function putAccountValue(
  harness: TestHarness,
  cookie: string,
  path: string,
  body: SaveAgentLoginRequest | SetDefaultModelRequest,
): Promise<void> {
  const response = await harness.request(path, cookie, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  expect(response.status).toBe(200)
}

export async function seedBootIdentity(
  harness: TestHarness,
  profile: GitHubIdentity = {
    githubId: 7,
    githubLogin: 'octocat',
    displayName: 'Octocat',
    avatarUrl: null,
  },
): Promise<string> {
  const [, , userId, sessionId] = harness.reserveTokens(4)
  const expiresAt = TEST_TIME + 604_800_000
  await saveUser(harness.env.DB, userId, profile, TEST_TIME, TERMS_VERSION)
  await saveGitHubTokens(
    harness.env,
    userId,
    {
      accessToken: 'github-test-token',
      expiresAt: null,
      refreshToken: null,
      refreshExpiresAt: null,
    },
    TEST_TIME,
  )
  await saveSession(harness.env.DB, sessionId, userId, expiresAt, TEST_TIME)
  const token = await sign(
    { sessionId, expiresAt },
    'session',
    harness.env.SESSION_SIGNING_KEY,
  )
  return `${SESSION_COOKIE}=${token}`
}
