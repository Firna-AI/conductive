import { execFile } from 'node:child_process'
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { promisify } from 'node:util'
import type { ImportManifestEntry } from '../../../src/shared/conductor-import-manifest.ts'
import type { ImportRepositoryFacts } from '../../../src/shared/conductor-import-operation.ts'
import type { ImportPart } from '../../../src/shared/conductor-import-storage.ts'
import { conductorDatabasePath } from './source.ts'
import { readStageBuild } from './stage-read.ts'
import { readState, stageDirectory } from './stage-state.ts'
import {
  buildStage,
  prepareStage,
  readStagePage,
  readStagePart,
  sealStage,
} from './stage.ts'
import type { ImportLocations, ImportStage } from './types.ts'

export const signal = () => new AbortController().signal

export async function packageFixture(base = true) {
  const root = await mkdtemp(join(tmpdir(), 'conductive-package-'))
  const locations = {
    home: join(root, 'home'),
    userData: join(root, 'private'),
  }
  const workspace = join(locations.home, 'conductor/workspaces/example/work')
  await mkdir(workspace, { recursive: true })
  const run = promisify(execFile)
  const git = async (...args: string[]) =>
    (
      await run('git', ['-C', workspace, ...args], {
        env: {
          ...process.env,
          GIT_CONFIG_GLOBAL: '/dev/null',
          GIT_CONFIG_SYSTEM: '/dev/null',
          GIT_AUTHOR_NAME: 'Import Tester',
          GIT_AUTHOR_EMAIL: 'import@example.invalid',
          GIT_COMMITTER_NAME: 'Import Tester',
          GIT_COMMITTER_EMAIL: 'import@example.invalid',
          GIT_AUTHOR_DATE: '2026-11-10T00:00:00Z',
          GIT_COMMITTER_DATE: '2026-11-10T00:00:00Z',
        },
      })
    ).stdout.trim()
  const write = async (
    path: string,
    bytes: string | Uint8Array,
    mode = 0o644,
  ) => {
    const destination = join(workspace, path)
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, bytes, { mode })
    await chmod(destination, mode)
    return destination
  }
  const commit = async (message: string) => {
    await git('add', '-A', '--', '.')
    await git('commit', '--quiet', '-m', message)
    return git('rev-parse', 'HEAD')
  }
  await git('init', '--quiet', '--initial-branch=work', '--template=')
  if (base) {
    await write('tracked.txt', 'committed\n')
    await write('gone.txt', 'gone\n')
    await write('script.sh', '#!/bin/sh\nbase\n')
    await commit('base')
  }
  const database = conductorDatabasePath(locations)
  await mkdir(dirname(database), { recursive: true })
  const db = new DatabaseSync(database)
  db.exec(`CREATE TABLE repos(id TEXT,remote_url TEXT,name TEXT,default_branch TEXT);
    CREATE TABLE workspaces(local_id TEXT,workspace_name TEXT,directory_name TEXT,branch TEXT,state TEXT,workspace_path TEXT,repository_id TEXT);
    CREATE TABLE sessions(id TEXT,workspace_id TEXT,claude_session_id TEXT,agent_type TEXT,title TEXT,model TEXT);`)
  db.prepare('INSERT INTO repos VALUES (?,?,?,?)').run(
    'repo',
    'git@github.com:example/repo.git',
    'example',
    'main',
  )
  db.prepare('INSERT INTO workspaces VALUES (?,?,?,?,?,?,?)').run(
    'local-one',
    'Selected work',
    'work',
    'work',
    'active',
    workspace,
    'repo',
  )
  db.close()
  return {
    root,
    locations,
    workspace,
    database,
    git,
    write,
    commit,
    session(id: string, nativeId: string | null, agent: string, title: string) {
      const db = new DatabaseSync(database)
      try {
        db.prepare('INSERT INTO sessions VALUES (?,?,?,?,?,?)').run(
          id,
          'local-one',
          nativeId,
          agent,
          title,
          'test-model',
        )
      } finally {
        db.close()
      }
    },
    async native(path: string, bytes: string | Uint8Array) {
      const destination = join(locations.home, path)
      await mkdir(dirname(destination), { recursive: true })
      await writeFile(destination, bytes)
      return destination
    },
    dispose: () => rm(root, { recursive: true, force: true }),
  }
}

export const facts = (
  branchHeadOid: string | null = null,
): ImportRepositoryFacts => ({
  id: 'facts-one',
  repositoryId: 1,
  fullName: 'example/repo',
  branch: 'work',
  branchHeadOid,
  defaultBranch: 'main',
  defaultHeadOid: null,
  observedAt: 1794268800000,
})

export async function divergedSource(
  fixture: Awaited<ReturnType<typeof packageFixture>>,
  ancestor: string,
) {
  const tree = await fixture.git('rev-parse', `${ancestor}^{tree}`)
  const localHead = await fixture.git(
    'commit-tree',
    tree,
    '-p',
    ancestor,
    '-m',
    'Unpublished local B',
  )
  const remoteHead = await fixture.git(
    'commit-tree',
    tree,
    '-p',
    ancestor,
    '-m',
    'Advanced remote C',
  )
  const descendant = await fixture.git(
    'commit-tree',
    tree,
    '-p',
    localHead,
    '-m',
    'Another unpublished local tip',
  )
  await fixture.git('update-ref', 'refs/heads/work', localHead)
  await fixture.git('update-ref', 'refs/remotes/origin/main', ancestor)
  await fixture.git('update-ref', 'refs/heads/private-descendant', descendant)
  return { localHead, remoteHead, tree }
}

export async function packageSelection(locations: ImportLocations) {
  const prepared = await prepareStage(
    locations,
    'local-one',
    'org/member/device',
    'reservation-one',
    signal(),
  )
  const built = await buildStage(
    locations,
    prepared.id,
    facts(),
    undefined,
    signal(),
  )
  return sealStage(locations, built.id, [], signal())
}

export async function manifest(locations: ImportLocations, stage: ImportStage) {
  const entries: ImportManifestEntry[] = []
  while (entries.length < stage.snapshot.recordCount) {
    const page = await readStagePage(
      locations,
      stage.id,
      entries.length,
      signal(),
    )
    if (!page.length) throw new Error('The manifest ended early.')
    entries.push(...page)
  }
  return entries
}

export async function content(
  locations: ImportLocations,
  stage: ImportStage,
  entries: ImportManifestEntry[],
  id: string,
) {
  const parts = entries.filter(
    (entry) => entry.kind === 'part' && entry.objectId === id,
  )
  const bytes: Uint8Array[] = []
  for (const part of parts) {
    if (part.kind !== 'part') throw new Error('Expected a part.')
    bytes.push(await readStagePart(locations, stage.id, part.part, signal()))
  }
  return Buffer.concat(bytes)
}

export async function stagedPartPath(
  locations: ImportLocations,
  stage: ImportStage,
  part: ImportPart,
) {
  const directory = stageDirectory(locations, stage.id)
  const current = readStageBuild(
    await readState(join(directory, 'current.json')),
  )
  return join(directory, current.directory, 'parts', part.id)
}

export const claudeMemory = () =>
  `${JSON.stringify({
    type: 'user',
    uuid: 'question',
    parentUuid: null,
    timestamp: '2026-11-10T10:00:00.000Z',
    message: { role: 'user', content: 'Original question.' },
  })}\n${JSON.stringify({
    type: 'assistant',
    uuid: 'answer',
    parentUuid: 'question',
    timestamp: '2026-11-10T10:01:00.000Z',
    message: {
      id: 'logical-answer',
      role: 'assistant',
      content: [{ type: 'text', text: 'Original answer.' }],
    },
  })}\n`
