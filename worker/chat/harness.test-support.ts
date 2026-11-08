import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { AgentChoice } from '../../src/shared/agents'
import type {
  WorkspaceSocketMessage,
  ChatHistoryResponse,
} from '../../src/shared/events'
import { chatHistoryPath, workspaceEventsPath } from '../../src/shared/events'
import type { SendMessageResponse } from '../../src/shared/messages'
import {
  sessionsPath,
  sessionPaths,
  type SessionResponse,
} from '../../src/shared/sessions'
import type { RunnerConnectionRequest } from '../../src/shared/runner-transport'
import type {
  RunnerToWorkspace,
  WorkspaceToRunner,
} from '../../src/shared/runner'
import {
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { FakeRunner } from '../test-support/fake-runner'
import { FakeRunnerConnection } from '../test-support/runner-connection'
import { WorkspaceChat } from './backend'
import { MemoryChatStorage } from './memory-storage.test-support'
import { seedChatFixture } from './fixture-seed.test-support'
import { ManualChatClock } from './chat-clock.test-support'
import type { BrowserPeer, ChatDependencies, RunnerPeer } from './types'

export const CLAUDE: AgentChoice = {
  agent: 'claude',
  model: 'test-claude',
  effort: 'high',
}
export const CODEX: AgentChoice = {
  agent: 'codex',
  model: 'test-codex',
  effort: 'medium',
}
export const MACHINE_ORIGIN = 'https://machines.conductive.test'
export const WORKSPACE_ID = 'workspace-chat'
export const WORKSPACE_TOKEN = 'workspace-token'

export async function createChatFixture(
  harness: TestHarness,
  overrides: Partial<ChatDependencies> = {},
) {
  const { org, owner, member, ownerCookie, memberCookie } =
    await seedChatFixture(harness, WORKSPACE_ID, WORKSPACE_TOKEN)
  const storage = new MemoryChatStorage()
  const env = { ...harness.env, MACHINE_ORIGIN }
  let sequence = 0
  let connectionSequence = 0
  const clock = new ManualChatClock(TEST_TIME)
  const dependencies = {
    now: clock.now,
    scheduleBrowserCheck: clock.schedule,
    scheduleRunnerCheck: clock.schedule,
    randomId: () => `chat-${String(++sequence).padStart(4, '0')}`,
    randomConnectionId: () => `connection-${++connectionSequence}`,
    ...overrides,
  }
  let chat = new WorkspaceChat(storage, env, dependencies)
  const errors: unknown[] = []
  const transport: {
    dropIncoming: (message: RunnerToWorkspace) => boolean
    dropOutgoing: (message: WorkspaceToRunner) => boolean
    closedConnections: number
  } = {
    dropIncoming: () => false,
    dropOutgoing: () => false,
    closedConnections: 0,
  }
  const request = (
    path: string,
    body?: unknown,
    cookie = ownerCookie,
    method = body === undefined ? 'GET' : 'POST',
  ) =>
    new Request(`${TEST_ORIGIN}${path}`, {
      method,
      headers: {
        Cookie: cookie,
        Origin: TEST_ORIGIN,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const fetch = (
    path: string,
    body?: unknown,
    cookie = ownerCookie,
    method?: string,
  ) => chat.fetch(request(path, body, cookie, method))
  const drain = async () => {
    let current: Promise<unknown>
    do {
      current = chat.store.settled()
      await current
    } while (current !== chat.store.settled())
    if (errors.length) throw errors.shift()
  }
  const connect = async (
    runner = new FakeRunner({ workspaceId: WORKSPACE_ID }),
    parameters: Partial<RunnerConnectionRequest> = {},
  ) => {
    await runner.connect(
      async (connectionRequest) => {
        const connection = new FakeRunnerConnection((value) => {
          if (transport.dropIncoming(value)) return
          void chat
            .receiveRunner(peer, value)
            .catch((error: unknown) => errors.push(error))
        })
        const peer: RunnerPeer = {
          send: (message) => {
            if (!transport.dropOutgoing(message)) connection.reply(message)
          },
          close: () => connection.close(),
        }
        connection.onClose(() => {
          transport.closedConnections++
          chat.disconnectRunner(peer)
        })
        await chat.connectRunner(
          new Request(connectionRequest.url, {
            headers: {
              Authorization: `Bearer ${connectionRequest.workspaceToken}`,
            },
          }),
          peer,
        )
        return connection
      },
      {
        url: `${MACHINE_ORIGIN}${MACHINE_PATHS.runner}`,
        workspaceToken: WORKSPACE_TOKEN,
        ...parameters,
      },
    )
    await drain()
    return runner
  }
  const createSession = async (choice = CLAUDE, cookie = ownerCookie) => {
    const response = await fetch(
      sessionsPath(org.id, WORKSPACE_ID),
      { choice },
      cookie,
    )
    if (response.status !== 201)
      throw new Error(
        `Create returned ${response.status}: ${await response.text()}`,
      )
    const result: SessionResponse = await response.json()
    return result.session
  }
  const send = async (
    sessionId: string,
    id = 'message-1',
    cookie = ownerCookie,
    choice = CLAUDE,
    text = 'Check this code',
  ) => {
    const response = await fetch(
      sessionPaths.messages(org.id, WORKSPACE_ID, sessionId),
      { id, text, choice, attachmentIds: [] },
      cookie,
    )
    if (response.status !== 202)
      throw new Error(
        `Send returned ${response.status}: ${await response.text()}`,
      )
    const result: SendMessageResponse = await response.json()
    return result
  }
  const history = async (
    sessionId: string,
    after = 0,
  ): Promise<ChatHistoryResponse> => {
    const response = await fetch(
      chatHistoryPath(org.id, WORKSPACE_ID, sessionId, after),
    )
    if (response.status !== 200)
      throw new Error(`History returned ${response.status}`)
    return response.json()
  }
  const tab = async (
    after = 0,
    onSend?: (message: WorkspaceSocketMessage) => void,
    cookie = ownerCookie,
  ) => {
    const messages: WorkspaceSocketMessage[] = []
    let closed = 0
    const peer: BrowserPeer = {
      send: (message) => {
        messages.push(structuredClone(message))
        onSend?.(message)
      },
      close: () => {
        closed++
      },
    }
    const socketRequest = request(
      workspaceEventsPath(org.id, WORKSPACE_ID, after),
      undefined,
      cookie,
    )
    socketRequest.headers.set('Upgrade', 'websocket')
    const close = await chat.openBrowser(socketRequest, peer)
    return {
      messages,
      close,
      get closed() {
        return closed
      },
    }
  }
  return {
    org,
    owner,
    member,
    ownerCookie,
    memberCookie,
    storage,
    clock,
    env,
    fetch,
    request,
    createSession,
    send,
    history,
    tab,
    connect,
    drain,
    transport,
    get chat() {
      return chat
    },
    restart: () => {
      chat = new WorkspaceChat(storage, env, dependencies)
    },
  }
}

export type ChatFixture = Awaited<ReturnType<typeof createChatFixture>>
