import { join } from 'node:path'

import { onTestFinished } from 'vitest'

import type { Agent } from '../../src/shared/agents'
import type {
  RunnerTurnV2 as RunnerTurn,
  RunnerMessageDuringTurnV2,
} from '../../src/shared/runner'
import { FakeDurableObjectEndpoint } from '../../worker/test-support/fake-durable-object'
import { Runner } from '../src/runner'
import { DiskStorage, EventStore } from '../src/state'
import { FakeProviders } from './providers'
import { repositoryFixture } from './repository'

export function turn(
  id = '1',
  sender = 'alice',
  agent: Agent = 'claude',
): RunnerTurn {
  return {
    type: 'turn',
    commandId: `command-${id}`,
    sessionId: 'session-1',
    turnId: `turn-${id}`,
    message: {
      id: `message-${id}`,
      sessionId: 'session-1',
      sender: {
        id: sender,
        githubLogin: sender,
        displayName: null,
        avatarUrl: null,
      },
      text: 'Change the file.',
      attachments: [],
      choice: { agent, model: 'test-model', effort: 'high' },
      createdAt: 100,
      state: 'sent',
    },
    attachments: [],
    commitAuthor: null,
    credential:
      agent === 'claude'
        ? { agent, kind: 'token', token: `secret-${sender}` }
        : { agent, kind: 'api-key', token: `secret-${sender}` },
  }
}

export function duringTurn(command: RunnerTurn): RunnerMessageDuringTurnV2 {
  return {
    type: 'message',
    commandId: command.commandId,
    sessionId: command.sessionId,
    turnId: command.turnId,
    message: command.message,
    attachments: command.attachments,
  }
}

export async function runnerHarness(
  beforeStart?: (
    repository: Awaited<ReturnType<typeof repositoryFixture>>,
  ) => Promise<void>,
) {
  const repository = await repositoryFixture()
  await beforeStart?.(repository)
  const endpoint = new FakeDurableObjectEndpoint({
    workspaceId: 'workspace-1',
    workspaceToken: 'workspace-secret',
  })
  const storage = new DiskStorage(
    join(repository.home, '.conductive', 'runner-state.json'),
  )
  const store = await EventStore.open(storage)
  const providers = new FakeProviders()
  const warnings: string[] = []
  let now = 100
  const options = {
    workspaceId: 'workspace-1',
    request: { url: endpoint.url, workspaceToken: 'workspace-secret' },
    connect: endpoint.connect,
    store,
    cwd: repository.root,
    home: repository.home,
    defaultBranch: 'main',
    providers: { claude: providers.open, codex: providers.open },
    warm: async () => {},
    now: () => now,
    warn: (message: string) => {
      warnings.push(message)
    },
    disconnected: () => {},
  }
  const runner = new Runner(options)
  let cutoff = false
  onTestFinished(async () => {
    if (!cutoff) await runner.close()
  })
  await runner.start(false)
  return {
    ...repository,
    endpoint,
    providers,
    runner,
    store,
    storage,
    options,
    warnings,
    cutoff: async () => {
      cutoff = true
      runner.link.close()
      await Promise.all(providers.processes.map((provider) => provider.close()))
    },
    advance: (time: number) => {
      now += time
    },
  }
}
