import { onTestFinished } from 'vitest'

import type { AgentChatEvent } from '../../src/shared/chat-events'
import { AgentEngine } from '../src/engine'
import { EventStore, type RunnerState } from '../src/state'
import { FakeProviders } from './providers'

export async function engineFixture() {
  let saved: RunnerState = {
    streamId: 'engine-test-stream',
    nextEventNumber: 1,
    confirmedThrough: 0,
    outbox: [],
    sessions: [],
    fileRevisions: { tree: 0, changes: 0 },
  }
  const storage = {
    read: async () => saved,
    write: async (value: RunnerState) => {
      saved = structuredClone(value)
    },
  }
  const providers = new FakeProviders()
  const events: AgentChatEvent[] = []
  const warnings: string[] = []
  const store = await EventStore.open(storage)
  const options = {
    cwd: '/repo',
    home: '/home/agent',
    computerMcpUrl: 'http://computer.test/mcp',
    store,
    providers: { claude: providers.open, codex: providers.open },
    now: () => 100,
    checkpoint: async () => new Map<string, string>(),
    changedSince: async () => [],
    emit: async (event: AgentChatEvent) => {
      events.push(structuredClone(event))
    },
    warn: (message: string) => {
      warnings.push(message)
    },
  }
  const engine = new AgentEngine(options)
  onTestFinished(() => engine.close())
  return { engine, providers, events, warnings, store, storage, options }
}
