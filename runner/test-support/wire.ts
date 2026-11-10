import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { onTestFinished, vi } from 'vitest'

import type { ChangedFile } from '../../src/shared/files'
import type { WorkspaceToRunnerV2 as WorkspaceToRunner } from '../../src/shared/runner'
import type { RunnerConnection as TransportRunnerConnection } from '../../src/shared/runner-transport'
import {
  FakeDurableObjectEndpoint,
  type FakeDurableObjectOptions,
} from '../../worker/test-support/fake-durable-object'
import * as checkpoints from '../src/checkpoint'
import * as contextFolder from '../src/context-folder'
import { Repository, type RepositorySnapshot } from '../src/repository'
import { Runner } from '../src/runner'
import { DiskStorage, EventStore } from '../src/state'
import { FakeProviders } from './providers'

type RunnerConnection = TransportRunnerConnection<WorkspaceToRunner>

export function emptySnapshot(): RepositorySnapshot {
  return {
    entries: [],
    identities: new Map(),
    readIdentities: new Map(),
    baseCommit: 'base-commit',
    changes: {
      baseBranch: 'main',
      unpushedCommits: 0,
      uncommittedFileCount: 0,
      files: [],
      summary: { files: 0, added: 0, removed: 0 },
    },
  }
}

export async function wireFixture(
  snapshot = emptySnapshot(),
  settings: Partial<FakeDurableObjectOptions> = {},
  wrap: (connection: RunnerConnection) => RunnerConnection = (value) => value,
) {
  const directory = await mkdtemp(join(tmpdir(), 'conductive-wire-'))
  let runner: Runner | null = null
  onTestFinished(async () => {
    try {
      await runner?.close()
      await runner?.link.idle()
    } finally {
      vi.restoreAllMocks()
      await rm(directory, { recursive: true, force: true })
    }
  })
  let current = snapshot
  let turnFiles: ChangedFile[] = []
  vi.spyOn(contextFolder, 'prepareContextFolder').mockResolvedValue()
  vi.spyOn(Repository.prototype, 'snapshot').mockImplementation(async () =>
    structuredClone(current),
  )
  vi.spyOn(checkpoints, 'checkpoint').mockResolvedValue(new Map())
  vi.spyOn(checkpoints, 'changedSince').mockImplementation(async () =>
    structuredClone(turnFiles),
  )
  const storage = new DiskStorage(join(directory, 'state.json'))
  const store = await EventStore.open(storage)
  const endpoint = new FakeDurableObjectEndpoint({
    workspaceId: 'workspace-1',
    workspaceToken: 'wire-token',
    ...settings,
  })
  const providers = new FakeProviders()
  const warnings: string[] = []
  const options = {
    workspaceId: 'workspace-1',
    request: {
      url: endpoint.url,
      workspaceToken: settings.workspaceToken ?? 'wire-token',
    },
    connect: async (request: Parameters<typeof endpoint.connect>[0]) =>
      wrap(await endpoint.connect(request)),
    store,
    cwd: '/repo',
    home: '/home/agent',
    defaultBranch: 'main',
    providers: { claude: providers.open, codex: providers.open },
    warm: async () => {},
    now: () => 100,
    warn: (message: string) => {
      warnings.push(message)
    },
    disconnected: () => {},
  }
  runner = new Runner(options)
  return {
    runner,
    options,
    endpoint,
    store,
    storage,
    providers,
    warnings,
    setSnapshot: (value: RepositorySnapshot) => {
      current = value
    },
    setTurnFiles: (value: ChangedFile[]) => {
      turnFiles = value
    },
  }
}
