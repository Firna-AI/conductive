import {
  ACCOUNT_PATHS,
  agentLoginPath,
  type AccountResponse,
  type AgentLoginStatus,
  type GitHubInstallationsResponse,
  type SaveAgentLoginResponse,
  type SetDefaultModelResponse,
  type SetNewWorkspaceViewResponse,
} from '../../shared/account'
import type { Agent } from '../../shared/agents'
import {
  GET_STARTED_PATH,
  type GetStartedResponse,
} from '../../shared/onboarding'
import { coreFixtures } from '../../test-support/fixtures/core'
import { choice, nested, record } from '../api/parse'
import { AGENTS, readChoice, readNewWorkspaceView } from '../api/read-core'
import type { DevBackend } from './backend'
import { json, noContent, requiredText, type Route } from './router'
import { completeStep } from './state'

/** Puts the status of one agent login in the account, in the order of `AGENTS`. */
function putLogin(backend: DevBackend, login: AgentLoginStatus): void {
  const { account } = backend.state
  backend.state.account = {
    ...account,
    agentLogins: AGENTS.map((agent): AgentLoginStatus =>
      agent === login.agent
        ? login
        : (account.agentLogins.find((item) => item.agent === agent) ?? {
            agent,
            connected: false,
          }),
    ),
  }
}

/**
 * Save an agent login. The secret goes nowhere, and the answer holds only
 * the kind of the login. It completes the last step of Get started.
 */
function saveLogin(backend: DevBackend, agent: Agent, body: unknown): Response {
  const fields = record(body)
  choice(fields, 'agent', [agent])
  requiredText(fields, 'secret')
  const updatedAt = backend.now()
  const login: AgentLoginStatus =
    agent === 'codex'
      ? {
          agent,
          connected: true,
          kind: choice(fields, 'kind', ['api-key']),
          updatedAt,
        }
      : {
          agent,
          connected: true,
          kind: choice(fields, 'kind', ['token', 'api-key']),
          updatedAt,
        }
  putLogin(backend, login)
  completeStep(backend.state, 'agent-login')
  return json(login satisfies SaveAgentLoginResponse)
}

function loginRoutes(backend: DevBackend, agent: Agent): Route[] {
  return [
    {
      method: 'PUT',
      path: agentLoginPath(agent),
      answer: ({ body }) => saveLogin(backend, agent, body),
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
  return [
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
