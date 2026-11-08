import { expect } from 'vitest'

import {
  ACCOUNT_PATHS,
  type AccountResponse,
  type SaveAgentLoginRequest,
  type SetDefaultModelRequest,
} from '../../src/shared/account'
import { GET_STARTED_PATH } from '../../src/shared/onboarding'
import { readAccount } from '../../src/app/api/read-core'
import type { TestHarness } from '../test-support/harness'

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
  body: SaveAgentLoginRequest | SetDefaultModelRequest,
): Promise<void> {
  const response = await harness.request(path, cookie, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  expect(response.status).toBe(200)
}
