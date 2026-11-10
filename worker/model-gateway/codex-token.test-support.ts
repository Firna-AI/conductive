import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { RunnerLogin } from '../../src/shared/runner'
import type { HttpFetch } from '../env'
import type { CodexTokens } from '../codex-auth/tokens'
import { ManualChatClock } from '../chat/chat-clock.test-support'
import { routeModelGateway } from './route'
import { codexTokenPaths } from './paths'
import { deriveTurnToken } from './token'

export const accountPath = codexTokenPaths.accounts
export const modelPath = codexTokenPaths.responses

export function accounts(
  origin = 'https://regional.chatgpt.com',
  override = 'us',
) {
  return {
    accounts: [
      {
        id: 'workspace-account',
        name: 'Example workspace',
        workspace_backend_origin: origin,
        account_routing_override: override,
      },
    ],
  }
}

export async function tokenGateway(kind: 'token' | 'api-key' = 'token') {
  const login: RunnerLogin = {
    agent: 'codex',
    kind,
    secret: 'structured-login-only-in-worker',
  }
  const token = await deriveTurnToken(
    { workspaceId: 'workspace', turnId: 'turn' },
    { nonce: 'nonce', loginVersion: 1 },
    btoa('k'.repeat(32)),
    login,
  )
  const requests: Request[] = []
  const bodies: string[] = []
  const clock = new ManualChatClock(0)
  let active = true
  let credentials: CodexTokens = {
    accessToken: 'real-only-in-worker',
    refreshToken: 'refresh-only-in-worker',
    idToken: 'id-only-in-worker',
    accountId: 'workspace-account',
    expiresAt: 100_000,
  }
  const renewals: string[] = []
  let reply: HttpFetch = async (request) => {
    if (new URL(request.url).pathname === accountPath)
      return Response.json(accounts())
    return Response.json({ models: [] })
  }
  const request = (path: string, init: RequestInit = {}) =>
    routeModelGateway(
      new Request(`https://machine.test${MACHINE_PATHS.codexGateway}${path}`, {
        ...init,
        headers: {
          authorization: `Bearer ${token}`,
          'chatgpt-account-id': 'workspace-account',
          ...Object.fromEntries(new Headers(init.headers)),
        },
      }),
      {
        dependencies: {
          now: clock.now,
          randomToken: () => 'unused',
          scheduleGatewayCheck: clock.schedule,
          fetch: async (upstream) => {
            requests.push(upstream)
            bodies.push(await upstream.text())
            return reply(upstream)
          },
        },
        workspaceAllowed: async () => true,
        codexLogin: async (_userId, failed) => {
          if (failed) {
            renewals.push(failed)
            credentials = {
              ...credentials,
              accessToken: 'rotated-only-in-worker',
            }
          }
          return credentials
        },
        workspace: () => ({
          checkTurnToken: async () =>
            active
              ? { ok: true, login, loginOwnerId: 'owner' }
              : { ok: false, reason: 'turn_not_active' },
        }),
      },
    )
  return {
    token,
    login,
    requests,
    bodies,
    renewals,
    clock,
    request,
    stop: () => {
      active = false
    },
    respond: (next: HttpFetch) => {
      reply = next
    },
  }
}
