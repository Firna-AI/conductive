import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { onTestFinished } from 'vitest'

import type { ImportSnapshot } from '../../src/shared/conductor-import-manifest'
import type {
  RunnerImportAction,
  RunnerImportCommand,
} from '../../src/shared/runner-import'
import { FakeDurableObjectEndpoint } from '../../worker/test-support/fake-durable-object'
import { importDigest } from '../src/import-storage'
import { importPendingPath } from '../src/import-paths'
import { Runner, type RunnerOptions } from '../src/runner'
import { initializeRunner } from '../src/initialize'
import { configuration } from '../src/config'
import { FakeProviders } from './providers'
import { importInventory } from './import-inventory'
import { removeImportFixture } from './import-cleanup'

const execute = promisify(execFile)

export async function importRunnerFixture(
  imports: RunnerOptions['imports'] = {},
  headFiles: Record<string, string> = {},
  homeInsideCheckout = false,
) {
  const directory = await mkdtemp(join(tmpdir(), 'conductive-import-'))
  let runner: Runner | null = null
  onTestFinished(async () => {
    await runner?.close()
    await removeImportFixture(directory)
  })
  const cwd = join(directory, 'repository')
  const home = homeInsideCheckout
    ? join(cwd, '.agent-home')
    : join(directory, 'home')
  const serviceHome = join(directory, 'runtime')
  await mkdir(cwd)
  await mkdir(join(serviceHome, '.conductive'), { recursive: true })
  if (!homeInsideCheckout) await mkdir(home, { recursive: true })
  const git = async (...args: string[]) =>
    (
      await execute('git', args, {
        cwd,
        env: {
          ...process.env,
          GIT_CONFIG_NOSYSTEM: '1',
          GIT_CONFIG_GLOBAL: '/dev/null',
          GIT_AUTHOR_DATE: '2026-11-10T00:00:00Z',
          GIT_COMMITTER_DATE: '2026-11-10T00:00:00Z',
        },
      })
    ).stdout.trim()
  await git('init', '-b', 'main')
  await git('config', 'user.name', 'Import fixture')
  await git('config', 'user.email', 'import@example.test')
  const files = {
    'base.txt': 'base\n',
    foo: 'old\n',
    'foo.conductive-import-next': 'keep\n',
    'gone.txt': 'gone\n',
    'nested/.context/visible.txt': 'nested\n',
    ...(homeInsideCheckout
      ? { 'user-state.json': '{"source":"keep this file"}\n' }
      : {}),
    ...headFiles,
  }
  for (const [path, text] of Object.entries(files)) {
    await mkdir(join(cwd, path, '..'), { recursive: true })
    await writeFile(join(cwd, path), text)
  }
  const attributes = join(cwd, '.git/info/attributes')
  await writeFile(
    attributes,
    '* -text -eol -filter -working-tree-encoding -ident\n',
  )
  await git('add', '.')
  await git('commit', '-m', 'Source HEAD')
  await rm(attributes)
  const remote = join(directory, 'remote.git')
  await git('clone', '--bare', cwd, remote)
  await git(
    'remote',
    'add',
    'origin',
    'https://github.com/example/repository.git',
  )
  await git(
    'config',
    `url.${remote}.insteadOf`,
    'https://github.com/example/repository.git',
  )
  const { values, entries, nativeClaude, nativeCodex, expectedCodex } =
    importInventory()
  const snapshot: ImportSnapshot = {
    version: 1,
    sourceFingerprint: 'a'.repeat(64),
    localWorkspaceId: 'local-id',
    repository: 'example/repository',
    branch: 'imported-branch',
    headOid: await git('rev-parse', 'HEAD'),
    objectFormat: 'sha1',
    bundleObjectId: null,
    recordCount: entries.length,
    objectCount: 4,
    partCount: 4,
    sessionCount: 2,
    storedBytes: Object.values(values).reduce(
      (sum, bytes) => sum + bytes.length,
      0,
    ),
    restoredBytes:
      values.code.length +
      nativeClaude.length +
      nativeCodex.length +
      values.document.length,
    gitDisk: {
      version: 1,
      treeOid: await git('rev-parse', 'HEAD^{tree}'),
      reconstruction: { objectCount: 0, inflatedBytes: 0, maxObjectBytes: 0 },
      checkout: {
        fileCount: Object.keys(files).length,
        fileBytes: Object.values(files).reduce(
          (sum, value) => sum + Buffer.byteLength(value),
          0,
        ),
        directoryCount: 2,
        symlinkCount: 0,
        symlinkBytes: 0,
        pathBytes: [...Object.keys(files), 'nested', 'nested/.context'].reduce(
          (sum, path) => sum + Buffer.byteLength(path),
          0,
        ),
      },
      lfs: {
        cacheObjectCount: 0,
        cacheBytes: 0,
        checkoutPathCount: 0,
        checkoutBytes: 0,
      },
    },
  }
  await writeFile(importPendingPath(serviceHome), 'activation-test\n')
  const endpoint = new FakeDurableObjectEndpoint({
    workspaceId: 'workspace-1',
    workspaceToken: 'token',
  })
  const providers = new FakeProviders()
  const warnings: string[] = []
  const config = configuration({
    CONDUCTIVE_WORKSPACE_ID: 'workspace-1',
    CONDUCTIVE_RUNNER_URL: endpoint.url,
    CONDUCTIVE_WORKSPACE_TOKEN: 'token',
    CONDUCTIVE_REPOSITORY: cwd,
    CONDUCTIVE_HOME: home,
    CONDUCTIVE_DEFAULT_BRANCH: 'main',
    CONDUCTIVE_WORKSPACE_BRANCH: snapshot.branch,
    CONDUCTIVE_STATE_PATH: homeInsideCheckout
      ? join(cwd, 'user-state.json')
      : join(home, 'state.json'),
  })
  const options: Parameters<typeof initializeRunner>[1] = {
    connect: endpoint.connect,
    providers: { claude: providers.open, codex: providers.open },
    warm: async () => {},
    now: () => 100,
    warn: (message) => warnings.push(message),
    disconnected: () => {},
    imports,
  }
  const beforeIndex = await readFile(join(cwd, '.git/index'))
  runner = await initializeRunner(config, options, serviceHome)
  let sequence = 0
  const command = async (action: RunnerImportAction, commandId?: string) => {
    const frame: RunnerImportCommand = {
      type: 'import.command',
      commandId: commandId ?? `command-${++sequence}`,
      activationId: 'activation-test',
      epoch: 0,
      connectionId: 'connection-1',
      action,
    }
    endpoint.send(frame)
    if (!runner) throw new Error('Missing import runner.')
    await runner.idle()
    return endpoint.importReplies.at(-1)
  }
  const metadata = async () => {
    await command({
      kind: 'open',
      snapshot,
      workspaceId: 'workspace-1',
      defaultBranch: 'main',
      deadlineAt: 1_200_100,
    })
    await command({ kind: 'manifest', offset: 0, entries })
    return command({ kind: 'preflight' })
  }
  const deliver = async () => {
    for (const entry of entries) {
      if (entry.kind !== 'part') continue
      const bytes = Object.entries(values).find(
        ([id]) => id === entry.part.id,
      )?.[1]
      if (!bytes) throw new Error('Missing import fixture content.')
      await command({
        kind: 'chunk',
        part: entry.part,
        offset: 0,
        length: bytes.length,
        sha256: importDigest(bytes),
        base64: bytes.toString('base64'),
      })
    }
  }
  return {
    get runner() {
      if (!runner) throw new Error('Missing import runner.')
      return runner
    },
    endpoint,
    get store() {
      if (!runner) throw new Error('Missing import runner.')
      return runner.link.store
    },
    home,
    serviceHome,
    beforeIndex,
    cwd,
    git,
    values,
    entries,
    snapshot,
    metadata,
    deliver,
    command,
    nativeClaude,
    nativeCodex,
    expectedCodex,
    warnings,
    read: (path: string) => readFile(join(cwd, path)),
    addFileObject: (id: string, bytes: Buffer) => {
      values[id] = bytes
      entries.push(
        {
          kind: 'object',
          id,
          purpose: 'file',
          encoding: 'identity',
          sizeBytes: bytes.length,
          restoredBytes: bytes.length,
          partCount: 1,
        },
        {
          kind: 'part',
          objectId: id,
          index: 0,
          part: {
            id,
            group: 'work',
            sizeBytes: bytes.length,
            sha256: importDigest(bytes),
          },
        },
      )
      snapshot.objectCount++
      snapshot.partCount++
      snapshot.storedBytes += bytes.length
      snapshot.restoredBytes += bytes.length
      snapshot.recordCount = entries.length
    },
    restart: async () => {
      await runner?.close()
      runner = await initializeRunner(config, options, serviceHome)
      await runner.start(false)
    },
  }
}
