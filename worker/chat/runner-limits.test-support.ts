import type { WorkspaceEventEnvelope } from '../../src/shared/events'
import type { WorkspaceToRunner } from '../../src/shared/runner'
import { MemoryChatStorage } from './memory-storage.test-support'
import { RunnerChannel } from './runner-channel'
import { parseRunnerTransport } from './runner-input'
import { ChatStore, type ChatTransaction } from './store'
import type { ChatDependencies, RunnerPeer } from './types'

export const context = { sessionId: 'session', turnId: 'turn' }
export const choice = {
  agent: 'claude',
  model: 'test',
  effort: 'high',
} as const
export const file = (path: string) => ({
  path,
  name: path.split('/').at(-1) ?? path,
  kind: 'file' as const,
  change: null,
})
export const snapshot = (
  revision: number,
  partNumber: number,
  partCount: number,
  paths: string[],
) => ({
  type: 'files.snapshot' as const,
  tree: { revision, partNumber, partCount, entries: paths.map(file) },
})

export function numberedRunnerInput(value: unknown) {
  const input = parseRunnerTransport(value)
  if (input.type !== 'event')
    throw new Error('Expected a numbered runner event.')
  return input
}

export async function createRunnerLimitsFixture() {
  const storage = new MemoryChatStorage()
  const sent: WorkspaceToRunner[] = []
  const published: WorkspaceEventEnvelope[] = []
  const hooks: WorkspaceEventEnvelope[] = []
  let closed = 0
  let failSend = false
  let commandSequence = 0
  let store = new ChatStore(storage, () => 25)
  const dependencies: ChatDependencies = {
    now: () => 25,
    scheduleBrowserCheck: () => () => undefined,
    scheduleRunnerCheck: () => () => undefined,
    readRunnerAccess: async () => true,
    readConnectionAccess: async () => [],
    firstStartIncomplete: async () => false,
    randomId: () => `command-${++commandSequence}`,
    readLoginAvailability: async () => new Set<string>(),
    resolveLogin: async () => null,
    resolveAttachments: async () => ({ attachments: [], paths: [] }),
    receiveFileResult: async () => undefined,
    runnerEventStored: async (envelope) => {
      hooks.push(structuredClone(envelope))
    },
    runnerReady: async () => undefined,
    matchesObject: () => true,
  }
  const publish = (events: readonly WorkspaceEventEnvelope[]) => {
    published.push(...structuredClone(events))
  }
  let channel = new RunnerChannel(store, dependencies, publish)
  let peer: RunnerPeer
  let streamId = 'stream'
  const connect = async (stream = streamId, restart = false) => {
    streamId = stream
    if (restart) {
      store = new ChatStore(storage, () => 25)
      channel = new RunnerChannel(store, dependencies, publish)
    }
    peer = {
      send: (message) => {
        if (failSend) throw new Error('Injected network failure')
        sent.push(structuredClone(message))
      },
      close: () => {
        closed++
      },
    }
    await channel.open(
      { id: 'workspace', orgId: 'org', archivedAt: null, tokenHash: 'hash' },
      peer,
    )
    await channel.receive(peer, {
      type: 'hello',
      protocolVersion: 1,
      workspaceId: 'workspace',
      streamId,
    })
    await store.settled()
  }
  await connect()
  await store.change(
    'workspace',
    async (transaction) => {
      await transaction.saveSession({
        id: context.sessionId,
        workspaceId: 'workspace',
        title: 'Session',
        choice,
        createdAt: 25,
        closedAt: null,
        activeTurnId: context.turnId,
        retryMessageId: null,
        startedBy: {
          id: 'sender',
          githubLogin: 'sender',
          displayName: null,
          avatarUrl: null,
        },
        sourceSessionId: null,
        loginAvailable: false,
      })
      await transaction.saveTurn({
        id: context.turnId,
        sessionId: context.sessionId,
        senderId: 'sender',
        messageIds: [],
        state: 'running',
        closeAfterStop: false,
      })
    },
    publish,
  )
  return {
    storage,
    sent,
    published,
    hooks,
    connect,
    failCursorCommit: (eventNumber: number) => {
      storage.beforeCommit = async (staged) => {
        const stagedStore = new ChatStore(staged, dependencies.now)
        const cursor = await stagedStore.read('workspace', (view) =>
          view.cursor(streamId),
        )
        if (cursor === eventNumber) throw new Error('Injected storage failure')
      }
    },
    receive: (eventNumber: number, event: unknown, extra = {}) =>
      channel.receive(peer, {
        type: 'event',
        streamId,
        eventNumber,
        occurredAt: 25,
        event,
        ...extra,
      }),
    raw: (value: unknown) => channel.receive(peer, value),
    history: () => store.read('workspace', (view) => view.history(0)),
    read: <T>(work: (view: ChatTransaction) => Promise<T>) =>
      store.read('workspace', work),
    get closed() {
      return closed
    },
    set failSend(value: boolean) {
      failSend = value
    },
  }
}
