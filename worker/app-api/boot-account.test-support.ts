import { expect } from 'vitest'

import {
  ACCOUNT_PATHS,
  type AccountResponse,
  type SaveAgentLoginRequest,
  type SetDefaultModelRequest,
  type SetNewWorkspaceViewRequest,
} from '../../src/shared/account'
import type { AgentChoice } from '../../src/shared/agents'
import { GET_STARTED_PATH } from '../../src/shared/onboarding'
import { readAccount } from '../../src/app/api/read-core'
import type { TestHarness } from '../test-support/harness'

export const operatorModels = [
  {
    agent: 'claude',
    model: 'operator-claude',
    label: 'Claude',
    efforts: ['high'],
  },
  { agent: 'codex', model: 'operator-codex', label: 'Codex', efforts: ['low'] },
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
  const response = await harness.request(ACCOUNT_PATHS.account, cookie)
  expect(response.status).toBe(200)
  const account = readAccount(await response.json())
  expect(account.user.githubLogin).toBe(profile.githubLogin)
  expect(account.defaultChoice, `${profile.githubLogin} default model`).toEqual(
    expected.defaultChoice,
  )
  expect(account.agentLogins, `${profile.githubLogin} agent logins`).toEqual(
    expected.agentLogins,
  )
  const started = await harness.request(GET_STARTED_PATH, cookie)
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
