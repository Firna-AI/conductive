import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { onTestFinished } from 'vitest'

import type { AgentChatEvent } from '../../src/shared/chat-events'
import { AgentEngine } from '../src/engine'
import type { EngineOptions } from '../src/engine-session'
import { agentInstructions } from '../src/instructions'
import { DiskStorage, EventStore } from '../src/state'
import { FakeProviders } from './providers'

export async function engineFixture(overrides: Partial<EngineOptions> = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'conductive-engine-'))
  const storage = new DiskStorage(join(directory, 'state.json'))
  const providers = new FakeProviders()
  const events: AgentChatEvent[] = []
  const warnings: string[] = []
  const store = overrides.store ?? (await EventStore.open(storage))
  const options: EngineOptions = {
    cwd: '/repo',
    home: '/home/agent',
    instructions: (branches) => ({
      text: agentInstructions({
        cwd: '/repo',
        defaultBranch: branches?.targetBranch ?? 'main',
        workspaceBranch: branches?.workspaceBranch,
      }),
      branches: branches ?? null,
    }),
    tools: {
      machineOrigin: 'https://machines.conductive.test',
      workspaceToken: 'workspace-secret',
    },
    store,
    providers: { claude: providers.open, codex: providers.open },
    now: () => 100,
    checkpoint: async () => new Map<string, string>(),
    changedSince: async () => [],
    emit: async (event: AgentChatEvent) => {
      await options.store.append(event, options.now())
      events.push(structuredClone(event))
    },
    warn: (message: string) => {
      warnings.push(message)
    },
    ...overrides,
  }
  const engine = new AgentEngine(options)
  onTestFinished(async () => {
    try {
      await engine.close()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
  return { engine, providers, events, warnings, store, storage, options }
}
