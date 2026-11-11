import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdir,
  lstat,
  readdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { zstdCompressSync } from 'node:zlib'
import { conductorDatabasePath } from '../src/import/source.ts'
import type { ImportLocations } from '../src/import/types.ts'
import { importTemporaryDirectory } from './import-temporary.ts'

const claudeNativeId = '11111111-1111-4111-8111-111111111111'
const codexNativeId = '22222222-2222-4222-8222-222222222222'

export async function importFixture() {
  const evidence = resolve(
    import.meta.dirname,
    '../../.context/import-from-conductor/current',
  )
  await mkdir(evidence, { recursive: true })
  const directory = await importTemporaryDirectory(evidence, 'source-fixture-')
  const locations: ImportLocations = {
    home: join(directory, 'home'),
    userData: join(directory, 'profile'),
    xdgConfigHome: join(directory, 'home/.config'),
  }
  const workspace = join(locations.home, 'conductor/workspaces/repository/work')
  await mkdir(workspace, { recursive: true })
  const git = (...args: string[]) =>
    execFileSync(
      'git',
      ['-c', 'core.hooksPath=/dev/null', '-C', workspace, ...args],
      {
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          GIT_CONFIG_GLOBAL: '/dev/null',
          GIT_CONFIG_SYSTEM: '/dev/null',
        },
      },
    ).trim()
  git('init', '--template=', '--initial-branch=feature')
  await writeFile(join(workspace, 'changed.txt'), 'original\n')
  await writeFile(join(workspace, 'deleted.txt'), 'delete me\n')
  await writeFile(join(workspace, '.gitignore'), '.context/\n')
  git('add', '.')
  git(
    '-c',
    'user.name=Import test',
    '-c',
    'user.email=test@example.invalid',
    'commit',
    '-m',
    'fixture',
  )
  const headOid = git('rev-parse', 'HEAD')
  await writeFile(join(workspace, 'changed.txt'), 'working bytes\n')
  await rm(join(workspace, 'deleted.txt'))
  await writeFile(join(workspace, 'executable.sh'), '#!/bin/sh\nexit 0\n', {
    mode: 0o755,
  })
  await symlink('../outside-never-read', join(workspace, 'link'))
  await mkdir(join(workspace, '.context/empty'), { recursive: true })
  await writeFile(join(workspace, '.context/note.txt'), 'context bytes\n')
  const claude = join(
    locations.home,
    '.claude/projects/project',
    `${claudeNativeId}.jsonl`,
  )
  const codex = join(
    locations.home,
    '.codex/sessions/2026/11/10',
    `rollout-2026-11-10T00-00-00-${codexNativeId}.jsonl.zst`,
  )
  await mkdir(resolve(claude, '..'), { recursive: true })
  await mkdir(resolve(codex, '..'), { recursive: true })
  await writeFile(
    claude,
    [
      {
        type: 'user',
        uuid: 'u',
        parentUuid: null,
        timestamp: '2026-11-10T00:00:00.000Z',
        message: { role: 'user', content: 'Keep this member text.' },
      },
      {
        type: 'assistant',
        uuid: 'a',
        parentUuid: 'u',
        message: {
          role: 'assistant',
          content: [
            {
              type: 'thinking',
              thinking: 'PRIVATE THOUGHT',
              signature: 'PRIVATE SIGNATURE',
            },
            { type: 'text', text: 'Keep this answer.' },
          ],
        },
      },
    ]
      .map((value) => JSON.stringify(value))
      .join('\n') + '\n',
  )
  await writeFile(
    codex,
    zstdCompressSync(
      Buffer.from(
        [
          {
            timestamp: '2026-11-10T00:00:00.000Z',
            type: 'session_meta',
            payload: {
              id: codexNativeId,
              model_provider: 'openai',
              cwd: workspace,
            },
          },
          {
            timestamp: '2026-11-10T00:00:01.000Z',
            type: 'response_item',
            payload: {
              type: 'message',
              role: 'user',
              content: [{ type: 'input_text', text: 'Keep this Codex text.' }],
            },
          },
          {
            type: 'event_msg',
            payload: { type: 'user_message', message: 'Keep this Codex text.' },
          },
        ]
          .map((value) => JSON.stringify(value))
          .join('\n') + '\n',
      ),
    ),
  )
  const database = conductorDatabasePath(locations)
  await mkdir(resolve(database, '..'), { recursive: true })
  const db = new DatabaseSync(database)
  db.exec(`CREATE TABLE workspaces(local_id TEXT,workspace_name TEXT,directory_name TEXT,branch TEXT,state TEXT,pr_title TEXT,workspace_path TEXT,repository_id TEXT);
    CREATE TABLE repos(id TEXT,remote_url TEXT,name TEXT,default_branch TEXT,root_path TEXT);
    CREATE TABLE sessions(id TEXT,workspace_id TEXT,claude_session_id TEXT,agent_type TEXT,title TEXT);
    CREATE TABLE session_messages(secret TEXT);`)
  db.prepare('INSERT INTO repos VALUES(?,?,?,?,?)').run(
    'repository',
    'git@github.com:Firna/repository.git',
    'repository',
    'main',
    workspace,
  )
  const insert = db.prepare('INSERT INTO workspaces VALUES(?,?,?,?,?,?,?,?)')
  insert.run(
    'local-workspace',
    'Transferred name',
    'work',
    'feature',
    'ready',
    null,
    workspace,
    'repository',
  )
  insert.run(
    'archived-workspace',
    'Do not inspect',
    'archived',
    'archive',
    'archived',
    null,
    '/missing/archived',
    'repository',
  )
  const session = db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)')
  session.run(
    'claude-session',
    'local-workspace',
    claudeNativeId,
    'claude',
    'Claude session',
  )
  session.run(
    'codex-session',
    'local-workspace',
    codexNativeId,
    'codex',
    'Codex session',
  )
  session.run(
    'missing-session',
    'local-workspace',
    null,
    'claude',
    'Missing native session',
  )
  db.prepare('INSERT INTO session_messages VALUES(?)').run('PRIVATE DB MESSAGE')
  db.close()
  return {
    directory,
    locations,
    workspace,
    database,
    headOid,
    claude,
    codex,
    git,
    dispose: () => rm(directory, { recursive: true, force: true }),
  }
}

export async function sourceHashes(
  directory: string,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  async function visit(path: string, prefix: string) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const relative = prefix + entry.name
      const full = join(path, entry.name)
      const stat = await lstat(full)
      if (entry.isDirectory()) {
        result[relative] = `directory:${stat.mode & 0o777}`
        await visit(full, relative + '/')
      } else if (entry.isFile())
        result[relative] = createHash('sha256')
          .update(`file:${stat.mode & 0o777}:`)
          .update(await readFile(full))
          .digest('hex')
      else if (entry.isSymbolicLink())
        result[relative] = createHash('sha256')
          .update(`symlink:${await readlink(full)}`)
          .digest('hex')
    }
  }
  await visit(directory, '')
  return result
}
