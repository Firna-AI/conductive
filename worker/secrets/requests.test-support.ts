import type { RunWithSecretsRequest } from '../../src/shared/generated/RunWithSecretsRequest'
import type { RunnerEvent } from '../../src/shared/generated/RunnerEvent'
import type {
  AnswerSecretRequest,
  SecretRequestResponse,
  SecretRequestsResponse,
} from '../../src/shared/secret-requests'
import {
  SECRET_TOOL_PATHS,
  secretRequestsPath,
  secretAnswerPath,
} from '../../src/shared/secret-requests'
import { secretsPath } from '../../src/shared/secrets'
import { TOOL_TURN_HEADER } from '../../src/shared/agent-tools'
import { sessionsPath, sessionPaths } from '../../src/shared/sessions'
import { OUTER_MACHINE_ORIGIN } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_TOKEN,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import { reviewWorkspaceFixture } from '../chat/integration/workspace-review.test-support'
import { record, string } from '../chat/inputs'
import {
  readSecretRequestsResponse,
  readSecretRequestResponse,
  readSecretRequest,
} from '../../src/shared/secret-requests-read'
import { CLAUDE } from '../chat/harness.test-support'
import type { Workspace } from './requests-entry.test-support'

export async function secretFixture(bundle: string) {
  const fixture = await reviewWorkspaceFixture(bundle)
  const listRequests = async (
    cookie = fixture.cookies.ownerCookie,
  ): Promise<SecretRequestsResponse> => {
    const response = await fixture.request(
      secretRequestsPath(OUTER_ORG, OUTER_WORKSPACE),
      { headers: { Cookie: cookie } },
    )
    if (response.status !== 200) throw new Error(await response.text())
    return readSecretRequestsResponse(await response.json())
  }
  const machine = (
    path: string,
    body?: unknown,
    turnId: string | null = 'first-turn',
    token = OUTER_TOKEN,
  ) =>
    fixture.runtime.dispatchFetch(`${OUTER_MACHINE_ORIGIN}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(turnId === null ? {} : { [TOOL_TURN_HEADER]: turnId }),
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const run = (input: RunWithSecretsRequest, turnId = 'first-turn') =>
    machine(SECRET_TOOL_PATHS.run, input, turnId)
  const emit = async (event: RunnerEvent) => {
    const envelope = fixture.runner.emit(event)
    for (;;) {
      const message = record(await fixture.runner.inbox.next())
      if (
        message.type === 'confirm' &&
        message.throughEventNumber === envelope.eventNumber
      )
        return
    }
  }
  return {
    ...fixture,
    get runtime() {
      return fixture.runtime
    },
    machine,
    run,
    emit,
    listRequests,
    secretActor: async () =>
      (
        await fixture.runtime.getBindings<{
          WORKSPACES: DurableObjectNamespace<Workspace>
        }>()
      ).WORKSPACES.getByName(OUTER_WORKSPACE),
    seed: async (name: string, value: string, allAgents = false) => {
      const response = await fixture.request(secretsPath(OUTER_ORG), {
        method: 'POST',
        body: JSON.stringify({
          name,
          value,
          description: `Use ${name}`,
          allAgents,
        }),
      })
      if (response.status !== 201) throw new Error(await response.text())
      const saved = record(record(await response.json()).secret)
      return { id: string(saved.id), name: string(saved.name) }
    },
    waiting: async (input: RunWithSecretsRequest, turnId = 'first-turn') => {
      const tab = await fixture.browser()
      const response = run(input, turnId)
      const earlyResponse = response.then(async (result) => {
        throw new Error(
          `The run ended before its request: ${result.status} ${await result.clone().text()}`,
        )
      })
      for (;;) {
        const message = record(
          await Promise.race([tab.inbox.next(), earlyResponse]),
        )
        if (message.type !== 'event') continue
        const event = record(record(message.envelope).event)
        if (
          event.type === 'secrets.request.updated' &&
          record(event.request).state === 'waiting'
        ) {
          const request = readSecretRequest(event.request)
          tab.socket.close(1000, 'The request was received.')
          return { request, response, tab }
        }
      }
    },
    answer: async (
      id: string,
      body: AnswerSecretRequest,
      cookie = fixture.cookies.memberCookie,
    ): Promise<SecretRequestResponse> => {
      const response = await fixture.request(
        secretAnswerPath(OUTER_ORG, OUTER_WORKSPACE, id),
        {
          method: 'POST',
          headers: { Cookie: cookie },
          body: JSON.stringify(body),
        },
      )
      if (response.status !== 200)
        throw new Error(`${response.status}: ${await response.text()}`)
      return readSecretRequestResponse(await response.json())
    },
    finish: async (
      turnId = 'first-turn',
      messageId = 'first-message',
      sessionId = 'first-session',
    ) => {
      const envelope = fixture.runner.emit({
        type: 'turn.completed',
        sessionId,
        turnId,
        state: 'finished',
        durationMs: 1,
        files: [],
        omittedFileCount: 0,
        userMessageIds: [messageId],
      })
      for (;;) {
        const message = record(await fixture.runner.inbox.next())
        if (
          message.type === 'confirm' &&
          message.throughEventNumber === envelope.eventNumber
        )
          break
      }
      await fixture.actor().readLifecycle()
    },
    newSession: async () => {
      const response = await fixture.request(
        sessionsPath(OUTER_ORG, OUTER_WORKSPACE),
        { method: 'POST', body: JSON.stringify({ choice: CLAUDE }) },
      )
      return { id: string(record(record(await response.json()).session).id) }
    },
    send: async (
      sessionId: string,
      id: string,
      cookie = fixture.cookies.ownerCookie,
    ) => {
      const response = await fixture.request(
        sessionPaths.messages(OUTER_ORG, OUTER_WORKSPACE, sessionId),
        {
          method: 'POST',
          headers: { Cookie: cookie },
          body: JSON.stringify({
            id,
            text: 'Continue the task',
            choice: CLAUDE,
            attachmentIds: [],
          }),
        },
      )
      if (response.status !== 202) throw new Error(await response.text())
      const result = record(record(await response.json()).session)
      return {
        session: {
          id: string(result.id),
          activeTurnId:
            result.activeTurnId === null ? null : string(result.activeTurnId),
        },
      }
    },
  }
}

export type SecretFixture = Awaited<ReturnType<typeof secretFixture>>
