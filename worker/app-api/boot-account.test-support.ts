import { expect } from 'vitest'

import {
  ACCOUNT_PATHS,
  type AccountResponse,
  type AgentLoginStatus,
  type SaveAgentLoginRequest,
  type SetDefaultModelRequest,
  type SetNewWorkspaceViewRequest,
} from '../../src/shared/account'
import type { AgentChoice } from '../../src/shared/agents'
import { GET_STARTED_PATH } from '../../src/shared/onboarding'
import { readAccount } from '../../src/app/api/read-core'
import { TEST_TIME, type TestHarness } from '../test-support/harness'

export const operatorModels = [
  {
    agent: 'claude',
    model: 'operator-claude',
    label: 'Claude',
    efforts: ['high'],
  },
  { agent: 'codex', model: 'operator-codex', label: 'Codex', efforts: ['low'] },
]

/** The page of the GitHub App that the harness configures, the default app. */
export const harnessGitHubAppUrl =
  'https://github.com/apps/conductive/installations/new'

export interface AccountState extends Omit<AccountResponse, 'user'> {
  agentLoginComplete: boolean
}

export function isolationAccountStates(
  choice: AgentChoice,
  otherChoice: AgentChoice,
) {
  const noLogins: readonly AgentLoginStatus[] = [
    { agent: 'claude', connected: false },
    { agent: 'codex', connected: false },
  ]
  const firstLogins: readonly AgentLoginStatus[] = [
    { agent: 'claude', connected: true, kind: 'token', updatedAt: TEST_TIME },
    { agent: 'codex', connected: false },
  ]
  const otherClaudeLogin: readonly AgentLoginStatus[] = [
    { agent: 'claude', connected: true, kind: 'api-key', updatedAt: TEST_TIME },
    { agent: 'codex', connected: false },
  ]
  const otherLogins: readonly AgentLoginStatus[] = [
    { agent: 'claude', connected: true, kind: 'api-key', updatedAt: TEST_TIME },
    { agent: 'codex', connected: true, kind: 'api-key', updatedAt: TEST_TIME },
  ]
  const empty: AccountState = {
    defaultChoice: choice,
    newWorkspaceView: 'page',
    githubAppUrl: harnessGitHubAppUrl,
    agentLogins: noLogins,
    agentLoginComplete: false,
  }
  const firstConnected: AccountState = {
    defaultChoice: choice,
    newWorkspaceView: 'page',
    githubAppUrl: harnessGitHubAppUrl,
    agentLogins: firstLogins,
    agentLoginComplete: true,
  }
  const firstSaved: AccountState = {
    ...firstConnected,
    defaultChoice: otherChoice,
  }
  const otherConnected: AccountState = {
    defaultChoice: choice,
    newWorkspaceView: 'page',
    githubAppUrl: harnessGitHubAppUrl,
    agentLogins: otherClaudeLogin,
    agentLoginComplete: true,
  }
  const otherSaved: AccountState = {
    ...otherConnected,
    agentLogins: otherLogins,
  }
  return { empty, firstConnected, firstSaved, otherConnected, otherSaved }
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
  const response = await harness.request(ACCOUNT_PATHS.account, cookie)
  expect(response.status).toBe(200)
  const { user, ...account } = readAccount(await response.json())
  const { agentLoginComplete, ...expectedAccount } = expected
  expect(user.githubLogin).toBe(profile.githubLogin)
  expect(account, `${profile.githubLogin} account`).toEqual(expectedAccount)
  const started = await harness.request(GET_STARTED_PATH, cookie)
  expect(started.status).toBe(200)
  expect(await started.json(), `${profile.githubLogin} Get started`).toEqual({
    orgId: profile.orgId,
    steps: [
      { step: 'github-app', complete: profile.githubComplete },
      { step: 'org', complete: profile.orgId !== null },
      { step: 'agent-login', complete: agentLoginComplete },
    ],
  })
}

export async function putAccountValue(
  harness: TestHarness,
  cookie: string,
  path: string,
  body:
    SaveAgentLoginRequest | SetDefaultModelRequest | SetNewWorkspaceViewRequest,
): Promise<void> {
  const response = await harness.request(path, cookie, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  expect(response.status).toBe(200)
}

export async function expectIndependentPreferences(
  harness: TestHarness,
  configuredChoice: AgentChoice,
  otherChoice: AgentChoice,
): Promise<void> {
  const cookie = await harness.login()
  const saved = await harness.request(ACCOUNT_PATHS.newWorkspaceView, cookie, {
    method: 'PUT',
    body: JSON.stringify({ view: 'dialog' }),
  })
  expect(saved.status).toBe(200)
  expect(await saved.json()).toEqual({ view: 'dialog' })
  const account = async () =>
    readAccount(
      await (await harness.request(ACCOUNT_PATHS.account, cookie)).json(),
    )
  expect(await account()).toMatchObject({
    defaultChoice: configuredChoice,
    newWorkspaceView: 'dialog',
  })

  harness.env.CONDUCTIVE_DEFAULT_CHOICE = JSON.stringify(otherChoice)
  expect(await account()).toMatchObject({
    defaultChoice: otherChoice,
    newWorkspaceView: 'dialog',
  })

  await putAccountValue(harness, cookie, ACCOUNT_PATHS.defaultModel, {
    choice: configuredChoice,
  })
  expect(await account()).toMatchObject({
    defaultChoice: configuredChoice,
    newWorkspaceView: 'dialog',
  })
  await putAccountValue(harness, cookie, ACCOUNT_PATHS.newWorkspaceView, {
    view: 'page',
  })
  expect(await account()).toMatchObject({
    defaultChoice: configuredChoice,
    newWorkspaceView: 'page',
  })
}

export async function expectInvalidWorkspaceView(
  harness: TestHarness,
): Promise<void> {
  const cookie = await harness.login()
  const response = await harness.request(
    ACCOUNT_PATHS.newWorkspaceView,
    cookie,
    {
      method: 'PUT',
      body: JSON.stringify({ view: 'drawer' }),
    },
  )
  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({
    error: { code: 'invalid_input' },
  })
}
