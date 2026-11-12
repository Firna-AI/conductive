import { Miniflare } from 'miniflare'
import { encrypt, hash, sign } from '../security/crypto'
import { SESSION_COOKIE } from '../security/cookies'
import { TEST_ORIGIN } from '../test-support/harness'
import { applyMigrations } from '../test-support/migrations'
import { migratedStorage, TEST_D1_ID } from '../test-support/migrated-storage'
import { workerLibraryBundle } from '../test-support/test-bundles'
import { seedAppAccess } from '../test-support/app-access'
import {
  MACHINE_ORIGIN,
  WORKSPACE_ID,
  WORKSPACE_TOKEN,
} from './harness.test-support'
import { agentLoginContext } from './queries'
export async function createAdapterRuntime(
  entryPoint = 'worker/workspace.ts',
  workspaceId = WORKSPACE_ID,
) {
  const code = await workerLibraryBundle(entryPoint)
  // The global teardown deletes this folder, because callers dispose only
  // the runtime.
  const storage = await migratedStorage()
  const runtime = new Miniflare({
    enableDevRegistry: false,
    telemetry: { enabled: false },
    cf: false,
    ...(storage && { resourcePersistencePath: storage.path }),
    workers: [
      {
        config: {
          name: 'chat-adapter-tests',
          compatibilityDate: '2026-11-06',
          compatibilityFlags: ['global_fetch_strictly_public'],
          exports: { Workspace: { type: 'durable-object', storage: 'sqlite' } },
          env: {
            DB: { type: 'd1', id: TEST_D1_ID },
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
            return env.WORKSPACES.get(env.WORKSPACES.idFromName('${workspaceId}')).fetch(request);
          } };`,
              },
            },
          },
        },
      },
    ],
  })
  const db = await runtime.getD1Database('DB')
  if (!storage) await applyMigrations(db)
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
      .bind('session', 'owner', 4000000000000),
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
        workspaceId,
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
      .bind(workspaceId, await hash(WORKSPACE_TOKEN), 'unused', 1),
  ])
  await seedAppAccess(db, ['owner'], 1)
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
    { sessionId: 'session', expiresAt: 4000000000000 },
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
