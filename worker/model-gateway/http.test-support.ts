import type { AgentChoice } from '../../src/shared/agents'
import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import {
  CLAUDE,
  MACHINE_ORIGIN,
  WORKSPACE_ID,
} from '../chat/harness.test-support'
import { terminalEvent } from '../chat/turn-lifecycle.test-support'
import { requestBodyEntry } from '../http/request-body'
import { FakeAnthropic } from '../test-support/fake-anthropic'
import { FakeOpenAI } from '../test-support/fake-openai'
import type { TestHarness } from '../test-support/harness'
import { runningGatewayTurn } from './fixture.test-support'
import { routeModelGateway } from './route'
import { gatewayWorkspaceAllowed } from './workspace-access'

export function gatewayPath(agent: 'claude' | 'codex', suffix?: string) {
  return agent === 'claude'
    ? `${MACHINE_PATHS.claudeGateway}${suffix ?? '/v1/messages'}`
    : `${MACHINE_PATHS.codexGateway}${suffix ?? '/responses'}`
}

export async function gatewayHttp(
  harness: TestHarness,
  choice: AgentChoice = CLAUDE,
  kind: 'api-key' | 'token' = 'api-key',
) {
  const turn = await runningGatewayTurn(harness, choice)
  const { fixture } = turn
  if (kind === 'token') {
    await fixture.env.DB.prepare(
      'UPDATE agent_logins SET kind = ? WHERE user_id = ? AND agent = ?',
    )
      .bind(kind, fixture.member.id, choice.agent)
      .run()
  }
  const anthropic = new FakeAnthropic()
  const openai = new FakeOpenAI()
  const checks: string[] = []
  const workspaceLookups: string[] = []
  const workspaceCalls: string[] = []
  const fetch = requestBodyEntry(async (request) => {
    const response = await routeModelGateway(request, {
      dependencies: {
        now: fixture.clock.now,
        randomToken: () => 'unused',
        scheduleGatewayCheck: fixture.clock.schedule,
        fetch: (request) =>
          new URL(request.url).hostname === 'api.anthropic.com'
            ? anthropic.fetch(request)
            : openai.fetch(request),
      },
      workspaceAllowed(id) {
        workspaceLookups.push(id)
        return gatewayWorkspaceAllowed(fixture.env.DB, id)
      },
      workspace(id) {
        workspaceCalls.push(id)
        return {
          checkTurnToken(token) {
            checks.push(id)
            return fixture.chat.turnTokens.check(id, token)
          },
        }
      },
    })
    return response ?? new Response(null, { status: 404 })
  })
  const authorization: Record<string, string> =
    kind === 'token' || choice.agent === 'codex'
      ? { Authorization: `Bearer ${turn.token}` }
      : { 'x-api-key': turn.token }
  const request = (
    path = gatewayPath(choice.agent),
    init: RequestInit = {},
  ) => {
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...authorization,
    })
    new Headers(init.headers).forEach((value, name) => headers.set(name, value))
    return fetch(
      new Request(`${MACHINE_ORIGIN}${path}`, {
        method: 'POST',
        body: '{"model":"unfiltered-model","stream":true}',
        ...init,
        headers,
      }),
      fixture.env,
    )
  }
  return {
    ...turn,
    anthropic,
    openai,
    checks,
    workspaceLookups,
    workspaceCalls,
    request,
    fetch: (request: Request) => fetch(request, fixture.env),
    secret: `secret-${fixture.member.id}-${choice.agent}`,
    async dispose() {
      fixture.chat.closeConnections()
    },
    async finish() {
      turn.runner.emit(terminalEvent(turn.turn, 'finished'))
      await fixture.drain()
    },
  }
}

export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

export function openModelStream() {
  let source!: ReadableStreamDefaultController<Uint8Array>
  const cancelled = deferred<unknown>()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      source = controller
    },
    cancel: cancelled.resolve,
  })
  return { body, source, cancelled: cancelled.promise }
}

export const expectedWorkspace = WORKSPACE_ID
