import { readFile, readdir } from 'node:fs/promises'

import { Miniflare } from 'miniflare'
import { build } from 'vite'

import { encrypt, hash, sign } from '../security/crypto'
import { SESSION_COOKIE } from '../security/cookies'
import { TEST_ORIGIN } from '../test-support/harness'
import {
  MACHINE_ORIGIN,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
} from './harness.test-support'
import { agentLoginContext } from './queries'

export async function createAdapterRuntime() {
  const bundle = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      target: 'es2022',
      lib: { entry: 'worker/workspace.ts', formats: ['es'] },
      rolldownOptions: { external: ['cloudflare:workers'] },
    },
  })
  const outputs = (Array.isArray(bundle) ? bundle : [bundle]).flatMap(
    (result) => ('output' in result ? result.output : []),
  )
  const entry = outputs.find(
    (output) => output.type === 'chunk' && output.isEntry,
  )
  const code = entry?.type === 'chunk' ? entry.code : undefined
  if (!code) throw new Error('The adapter bundle is missing.')
  const runtime = new Miniflare({
    enableDevRegistry: false,
    telemetry: { enabled: false },
    cf: false,
    workers: [
      {
        config: {
          name: 'chat-adapter-tests',
          compatibilityDate: '2026-11-06',
          exports: { Workspace: { type: 'durable-object', storage: 'sqlite' } },
          env: {
            DB: { type: 'd1', id: 'chat-db' },
            WORKSPACES: {
              type: 'durable-object',
              worker: 'chat-adapter-tests',
              exportName: 'Workspace',
            },
            APP_ORIGIN: { type: 'text', value: TEST_ORIGIN },
            MACHINE_ORIGIN: { type: 'text', value: MACHINE_ORIGIN },
            SESSION_SIGNING_KEY: { type: 'text', value: btoa('s'.repeat(32)) },
            BOAT_KEY_ENCRYPTION_KEY: {
              type: 'text',
              value: btoa('e'.repeat(32)),
            },
          },
          manifest: {
            mainModule: 'index.js',
            modules: {
              'workspace.js': { type: 'esm', contents: code },
              'index.js': {
                type: 'esm',
                contents: `
          export { Workspace } from './workspace.js';
          export default { fetch(request, env) {
            return env.WORKSPACES.get(env.WORKSPACES.idFromName('${WORKSPACE_ID}')).fetch(request);
          } };`,
              },
            },
          },
        },
      },
    ],
  })
  const db = await runtime.getD1Database('DB')
  const directory = `${import.meta.dirname}/../../migrations`
  const migrations = (await readdir(directory))
    .filter((name) => name.endsWith('.sql'))
    .sort()
  for (const name of migrations) {
    const sql = await readFile(`${directory}/${name}`, 'utf8')
    await db.batch(
      sql
        .split(';')
        .map((statement) => statement.trim())
        .filter(Boolean)
        .map((statement) => db.prepare(statement)),
    )
  }
  await db.batch([
    db
      .prepare(
        'INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind('owner', 10, 'owner', 1, 1),
    db
      .prepare(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      )
      .bind('session', 'owner', 4_000_000_000_000),
    db
      .prepare(
        'INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind('org', 'Org', 'owner', 1),
    db
      .prepare(
        'INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
      )
      .bind('org', 'owner', 'admin', 1),
    db
      .prepare(
        'INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES (?, ?, ?, ?, ?)',
      )
      .bind('repo', 'org', 10, 'owner/repo', 'main'),
    db
      .prepare(
        'INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        WORKSPACE_ID,
        'org',
        'repo',
        'owner',
        'Workspace',
        'owner/workspace',
        1,
        1,
      ),
    db
      .prepare(
        'INSERT INTO workspace_tokens (workspace_id, token_hash, ciphertext, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(WORKSPACE_ID, await hash(WORKSPACE_TOKEN), 'unused', 1),
  ])
  await db
    .prepare(
      'INSERT INTO agent_logins (user_id, agent, kind, ciphertext, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(
      'owner',
      'claude',
      'api-key',
      await encrypt(
        'adapter-secret',
        agentLoginContext('owner', 'claude'),
        btoa('e'.repeat(32)),
      ),
      1,
      1,
    )
    .run()
  const sessionToken = await sign(
    { sessionId: 'session', expiresAt: 4_000_000_000_000 },
    'session',
    btoa('s'.repeat(32)),
  )
  const headers = {
    Cookie: `${SESSION_COOKIE}=${sessionToken}`,
    Origin: TEST_ORIGIN,
    'Content-Type': 'application/json',
  }
  return { runtime, headers }
}

export class SocketInbox {
  private readonly values: unknown[] = []
  private readonly readers: ((value: unknown) => void)[] = []

  constructor(socket: {
    addEventListener(
      type: 'message',
      listener: (event: { data: unknown }) => void,
    ): void
  }) {
    socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string')
        throw new Error('Expected a text socket message.')
      const value: unknown = JSON.parse(event.data)
      const reader = this.readers.shift()
      if (reader) reader(value)
      else this.values.push(value)
    })
  }

  next(): Promise<unknown> {
    if (this.values.length) return Promise.resolve(this.values.shift())
    return new Promise((resolve) => this.readers.push(resolve))
  }
}
