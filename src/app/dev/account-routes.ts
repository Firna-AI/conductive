import {
  ACCOUNT_PATHS,
  codexDevicePath,
  type AccountResponse,
  type GitHubInstallationsResponse,
  type StartCodexDeviceResponse,
  type PollCodexDeviceResponse,
  type SetDefaultModelResponse,
  type SetNewWorkspaceViewResponse,
} from '../../shared/account'
import { chatGptSignInCopy } from '../../../docs/mockups/src/components/settings/chatGptSignInCopy'
import {
  GET_STARTED_PATH,
  type GetStartedResponse,
} from '../../shared/onboarding'
import { coreFixtures } from '../../test-support/fixtures/core'
import { nested, record } from '../api/parse'
import { AGENTS, readChoice, readNewWorkspaceView } from '../api/read-core'
import type { DevBackend } from './backend'
import { json, RouteError, type Route } from './router'
import { completeStep } from './state'
import {
  loginRoutes,
  savedLogin,
  putLogin,
  noReuseOf,
} from './agent-login-routes'

function codexLoginDate(backend: DevBackend): number | null {
  const login = savedLogin(backend, 'codex')
  return login.connected ? login.updatedAt : null
}

/**
 * The account, its agent logins and preferences, and Get started.
 * Before the user installs the GitHub App, the account has no
 * installations. After that, the recorded installations answer.
 */
export function accountRoutes(backend: DevBackend): Route[] {
  const { state } = backend
  const devices = new Map<
    string,
    {
      expiresAt: number
      loginUpdatedAt: number | null
      state: 'waiting' | 'ready' | 'connected' | 'failed'
    }
  >()
  let deviceSequence = 0
  return [
    {
      method: 'POST',
      path: ACCOUNT_PATHS.codexDevice,
      answer: () => {
        const handle = `dev-codex-${++deviceSequence}`
        const expiresAt = backend.now() + 900_000
        devices.set(handle, {
          expiresAt,
          loginUpdatedAt: codexLoginDate(backend),
          state: 'waiting',
        })
        return json({
          handle,
          userCode: 'WXYZ-1234',
          verificationUrl: 'https://auth.openai.com/codex/device',
          expiresAt,
          pollIntervalMs: 5000,
        } satisfies StartCodexDeviceResponse)
      },
    },
    {
      method: 'POST',
      path: codexDevicePath(':handle'),
      answer: ({ params }) => {
        const device = devices.get(params.handle)
        if (!device)
          throw new RouteError(
            404,
            'codex_device_not_found',
            'The ChatGPT sign-in is not available.',
          )
        let result: PollCodexDeviceResponse
        if (device.expiresAt <= backend.now()) result = { state: 'expired' }
        else if (
          device.state === 'failed' ||
          (device.state !== 'connected' &&
            device.loginUpdatedAt !== codexLoginDate(backend))
        ) {
          device.state = 'failed'
          result = {
            state: 'failed',
            cause: chatGptSignInCopy.causes.loginChanged,
          }
        } else if (device.state === 'waiting') {
          device.state = 'ready'
          result = { state: 'waiting', pollIntervalMs: 5000 }
        } else {
          if (device.state === 'ready') {
            putLogin(backend, {
              agent: 'codex',
              connected: true,
              kind: 'token',
              noReuse: noReuseOf(savedLogin(backend, 'codex'), 'token'),
              updatedAt: backend.now(),
            })
            completeStep(state, 'agent-login')
            device.state = 'connected'
          }
          result = { state: 'connected', login: savedLogin(backend, 'codex') }
        }
        return json(result)
      },
    },
    {
      method: 'GET',
      path: ACCOUNT_PATHS.account,
      answer: () => json(state.account satisfies AccountResponse),
    },
    {
      method: 'PUT',
      path: ACCOUNT_PATHS.defaultModel,
      answer: ({ body }) => {
        const saved = nested(record(body), 'choice', readChoice)
        state.account = { ...state.account, defaultChoice: saved }
        return json({ choice: saved } satisfies SetDefaultModelResponse)
      },
    },
    {
      method: 'PUT',
      path: ACCOUNT_PATHS.newWorkspaceView,
      answer: ({ body }) => {
        const saved = readNewWorkspaceView(body)
        state.account = { ...state.account, newWorkspaceView: saved.view }
        return json(saved satisfies SetNewWorkspaceViewResponse)
      },
    },
    {
      method: 'GET',
      path: GET_STARTED_PATH,
      answer: () => json(state.getStarted satisfies GetStartedResponse),
    },
    {
      method: 'GET',
      path: ACCOUNT_PATHS.githubInstallations,
      answer: () =>
        state.githubAppInstalled
          ? null
          : json({
              installations: [],
              installUrl: coreFixtures().githubInstallations.installUrl,
            } satisfies GitHubInstallationsResponse),
    },
    ...AGENTS.flatMap((agent) => loginRoutes(backend, agent)),
  ]
}
