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
import { encrypt, hash } from '../security/crypto'
import {
  TEST_ORIGIN,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { FakeRunner } from '../test-support/fake-runner'
import { FakeRunnerConnection } from '../test-support/runner-connection'
import { WorkspaceChat } from './backend'
import { MemoryChatStorage } from './memory-storage.test-support'
import { agentLoginContext } from './queries'
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
export const MACHINE_ORIGIN = 'https://machines.conducting.test'
export const WORKSPACE_ID = 'workspace-chat'
export const WORKSPACE_TOKEN = 'workspace-token'

export async function createChatFixture(
  harness: TestHarness,
  overrides: Partial<ChatDependencies> = {},
) {
  const ownerCookie = await harness.login()
  const org = await harness.createOrg(ownerCookie)
  const owner = await harness.env.DB.prepare(
    'SELECT id FROM users WHERE github_id = 7',
  ).first<{ id: string }>()
  if (!owner) throw new Error('The owner is missing.')
  harness.github.profile = {
    id: 8,
    login: 'teammate',
    name: 'Teammate',
    avatar_url: null,
  }
  const memberCookie = await harness.login()
  const member = await harness.env.DB.prepare(
    'SELECT id FROM users WHERE github_id = 8',
  ).first<{ id: string }>()
  if (!member) throw new Error('The member is missing.')
  await harness.env.DB.batch([
    harness.env.DB.prepare(
      'INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
    ).bind(org.id, member.id, 'member', TEST_TIME),
    harness.env.DB.prepare(
      'INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES (?, ?, ?, ?, ?)',
    ).bind('repo', org.id, 10, 'example/repo', 'main'),
    harness.env.DB.prepare(
      'INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      WORKSPACE_ID,
      org.id,
      'repo',
      owner.id,
      'Test',
      'octocat/test',
      TEST_TIME,
      TEST_TIME,
    ),
  ])
  await harness.env.DB.prepare(
    'INSERT INTO workspace_tokens (workspace_id, token_hash, ciphertext, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(
      WORKSPACE_ID,
      await hash(WORKSPACE_TOKEN),
      'unused-token-ciphertext',
      TEST_TIME,
    )
    .run()
  for (const user of [owner, member]) {
    for (const agent of ['claude', 'codex'] as const) {
      await harness.env.DB.prepare(
        'INSERT INTO agent_logins (user_id, agent, kind, ciphertext, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(
          user.id,
          agent,
          'api-key',
          await encrypt(
            `secret-${user.id}-${agent}`,
            agentLoginContext(user.id, agent),
            harness.env.BOAT_KEY_ENCRYPTION_KEY,
          ),
          TEST_TIME,
          TEST_TIME,
        )
        .run()
    }
  }
  const storage = new MemoryChatStorage()
  const env = { ...harness.env, MACHINE_ORIGIN }
  let sequence = 0
  const dependencies = {
    now: () => TEST_TIME,
    randomId: () => `chat-${String(++sequence).padStart(4, '0')}`,
    ...overrides,
  }
  let chat = new WorkspaceChat(storage, env, dependencies)
  const errors: unknown[] = []
  const transport: {
    dropIncoming: (message: RunnerToWorkspace) => boolean
    dropOutgoing: (message: WorkspaceToRunner) => boolean
  } = {
    dropIncoming: () => false,
    dropOutgoing: () => false,
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
        connection.onClose(() => chat.disconnectRunner(peer))
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
        url: `${MACHINE_ORIGIN}/runner`,
        workspaceToken: WORKSPACE_TOKEN,
        ...parameters,
      },
    )
    await drain()
    return runner
  }
  const createSession = async (choice = CLAUDE) => {
    const response = await fetch(sessionsPath(org.id, WORKSPACE_ID), { choice })
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
  ) => {
    const messages: WorkspaceSocketMessage[] = []
    const peer: BrowserPeer = {
      send: (message) => {
        messages.push(structuredClone(message))
        onSend?.(message)
      },
      close: () => undefined,
    }
    const socketRequest = request(
      workspaceEventsPath(org.id, WORKSPACE_ID, after),
    )
    socketRequest.headers.set('Upgrade', 'websocket')
    const close = await chat.openBrowser(socketRequest, peer)
    return { messages, close }
  }
  return {
    org,
    owner,
    member,
    ownerCookie,
    memberCookie,
    storage,
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
