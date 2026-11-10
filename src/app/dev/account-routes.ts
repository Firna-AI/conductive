import {
  ACCOUNT_PATHS,
  agentLoginPath,
  codexDevicePath,
  defaultAgentLoginNoReuse,
  type AccountResponse,
  type AgentLoginStatus,
  type GitHubInstallationsResponse,
  type SaveAgentLoginResponse,
  type SaveAgentLoginRequest,
  type StartCodexDeviceResponse,
  type PollCodexDeviceResponse,
  type SetDefaultModelResponse,
  type SetNewWorkspaceViewResponse,
  type UpdateAgentLoginResponse,
} from '../../shared/account'
import type { Agent } from '../../shared/agents'
import {
  GET_STARTED_PATH,
  type GetStartedResponse,
} from '../../shared/onboarding'
import { coreFixtures } from '../../test-support/fixtures/core'
import { choice, flag, nested, record } from '../api/parse'
import { AGENTS, readChoice, readNewWorkspaceView } from '../api/read-core'
import type { DevBackend } from './backend'
import { json, noContent, requiredText, RouteError, type Route } from './router'
import { completeStep } from './state'

/** The saved status of one agent login of the account. */
function savedLogin(backend: DevBackend, agent: Agent): AgentLoginStatus {
  return (
    backend.state.account.agentLogins.find((item) => item.agent === agent) ?? {
      agent,
      connected: false,
    }
  )
}

/** Puts the status of one agent login in the account, in the order of `AGENTS`. */
function putLogin(backend: DevBackend, login: AgentLoginStatus): void {
  backend.state.account = {
    ...backend.state.account,
    agentLogins: AGENTS.map((agent): AgentLoginStatus =>
      agent === login.agent ? login : savedLogin(backend, agent),
    ),
  }
}

/**
 * Whether a saved login keeps other members out of the sessions of its
 * owner, as the Worker decides. A new secret of the same kind keeps the
 * choice. A new login, or one of another kind, takes the default of its
 * kind, from the shared account contract.
 */
function noReuseOf(
  saved: AgentLoginStatus,
  kind: SaveAgentLoginRequest['kind'],
): boolean {
  return saved.connected && saved.kind === kind
    ? saved.noReuse
    : defaultAgentLoginNoReuse(saved.agent, kind)
}

/**
 * Save an agent login. The secret goes nowhere, and the answer holds only
 * the kind of the login and its share choice. It completes the last step
 * of Get started.
 */
function saveLogin(backend: DevBackend, agent: Agent, body: unknown): Response {
  const fields = record(body)
  choice(fields, 'agent', [agent])
  requiredText(fields, 'secret')
  const updatedAt = backend.now()
  const saved = savedLogin(backend, agent)
  const kind = choice(fields, 'kind', ['token', 'api-key'])
  if (agent === 'codex' && kind === 'token') {
    throw new RouteError(
      400,
      'invalid_input',
      'Start the ChatGPT sign-in to connect Codex.',
    )
  }
  const noReuse = noReuseOf(saved, kind)
  const login: AgentLoginStatus = {
    agent,
    connected: true,
    kind,
    noReuse,
    updatedAt,
  }
  putLogin(backend, login)
  completeStep(backend.state, 'agent-login')
  return json(login satisfies SaveAgentLoginResponse)
}

/**
 * Changes the share choice of a login, without its secret, and answers
 * with the saved status. A login that is gone answers as not connected.
 * With `shareSave=fail`, the change fails as a failed save of the Worker.
 */
function updateLogin(
  backend: DevBackend,
  agent: Agent,
  body: unknown,
): Response {
  const noReuse = flag(record(body), 'noReuse')
  if (backend.state.shareSaveFails) throw new Error('The save failed.')
  const saved = savedLogin(backend, agent)
  const login: UpdateAgentLoginResponse = saved.connected
    ? { ...saved, noReuse }
    : saved
  putLogin(backend, login)
  return json(login)
}

function loginRoutes(backend: DevBackend, agent: Agent): Route[] {
  return [
    {
      method: 'PUT',
      path: agentLoginPath(agent),
      answer: ({ body }) => saveLogin(backend, agent, body),
    },
    {
      method: 'PATCH',
      path: agentLoginPath(agent),
      answer: ({ body }) => updateLogin(backend, agent, body),
    },
    {
      method: 'DELETE',
      path: agentLoginPath(agent),
      answer: () => {
        putLogin(backend, { agent, connected: false })
        return noContent()
      },
    },
  ]
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
    { expiresAt: number; state: 'waiting' | 'ready' | 'connected' }
  >()
  let deviceSequence = 0
  return [
    {
      method: 'POST',
      path: ACCOUNT_PATHS.codexDevice,
      answer: () => {
        const handle = `dev-codex-${++deviceSequence}`
        const expiresAt = backend.now() + 900_000
        devices.set(handle, { expiresAt, state: 'waiting' })
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
        else if (device.state === 'waiting') {
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
