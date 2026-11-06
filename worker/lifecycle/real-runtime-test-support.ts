import { readFile, readdir, mkdir, mkdtemp } from 'node:fs/promises'

import { Miniflare, Response as RuntimeResponse } from 'miniflare'
import { build } from 'vite'

import type { AppEnv } from '../env'
import { LifecycleBoat } from './lifecycle-boat-test-support'
import type { WorkspaceRuntimeFixture } from './workspace-runtime-test-worker'
import { storeBoatKey } from '../sandbox/keys'

export async function runtimeBundle(): Promise<string> {
  const output = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      ssr: `${import.meta.dirname}/workspace-runtime-test-worker.ts`,
      write: false,
      rollupOptions: {
        external: ['cloudflare:workers'],
        output: { format: 'es' },
      },
    },
  })
  const result = Array.isArray(output) ? output[0] : output
  if (!('output' in result)) throw new Error('No Worker bundle')
  const chunk = result.output.find((entry) => entry.type === 'chunk')
  if (!chunk) throw new Error('No Worker entry chunk')
  return chunk.code
}

interface RuntimeBindings {
  DB: D1Database
  WORKSPACES: DurableObjectNamespace<WorkspaceRuntimeFixture>
}

export async function realRuntimeFixture(bundle: string) {
  const root = `${import.meta.dirname}/../../.context/boat-native-remote-workspaces/milestone-5/review-fixes/runtime`
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(`${root}/case-`)
  const boat = new LifecycleBoat()
  const requests: string[] = []
  let redirects = false
  const text = (value: string) => ({ type: 'text' as const, value })
  const create = () =>
    new Miniflare({
      enableDevRegistry: false,
      telemetry: { enabled: false },
      cf: false,
      resourcePersistencePath: directory,
      workers: [
        {
          config: {
            name: 'workspace-runtime-test',
            compatibilityDate: '2026-11-06',
            exports: {
              WorkspaceRuntimeFixture: {
                type: 'durable-object',
                storage: 'sqlite',
              },
            },
            env: {
              WORKSPACES: {
                type: 'durable-object',
                worker: 'workspace-runtime-test',
                exportName: 'WorkspaceRuntimeFixture',
              },
              DB: { type: 'd1', id: 'workspace-runtime-db' },
              APP_ORIGIN: text('https://app.conducting.test'),
              MACHINE_ORIGIN: text('https://machine.conducting.test'),
              GITHUB_CLIENT_ID: text('runtime-client'),
              GITHUB_CLIENT_SECRET: text('runtime-client-secret'),
              SESSION_SIGNING_KEY: text(btoa('s'.repeat(32))),
              BOAT_KEY_ENCRYPTION_KEY: text(btoa('e'.repeat(32))),
            },
            manifest: {
              mainModule: 'index.js',
              modules: { 'index.js': { type: 'esm', contents: bundle } },
            },
          },
          dev: {
            outboundService: {
              type: 'fetcher',
              handler: async (incoming) => {
                requests.push(incoming.url)
                if (redirects)
                  return new RuntimeResponse('redirect refused', {
                    status: 302,
                    headers: {
                      Location: 'https://credentials-must-not-follow.test/leak',
                    },
                  })
                const request = new Request(incoming.url, {
                  method: incoming.method,
                  headers: [...incoming.headers.entries()],
                  body: ['GET', 'HEAD'].includes(incoming.method)
                    ? undefined
                    : await incoming.arrayBuffer(),
                  redirect: 'manual',
                })
                const response = await boat.fetch(request)
                return new RuntimeResponse(await response.arrayBuffer(), {
                  status: response.status,
                  headers: [...response.headers.entries()],
                })
              },
            },
          },
        },
      ],
    })
  let runtime = create()
  let bindings = await runtime.getBindings<RuntimeBindings>()
  const database = bindings.DB
  const migrationDirectory = `${import.meta.dirname}/../../migrations`
  for (const name of (await readdir(migrationDirectory))
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    const source = await readFile(`${migrationDirectory}/${name}`, 'utf8')
    await database.batch(
      source
        .split(';')
        .map((sql) => sql.trim())
        .filter(Boolean)
        .map((sql) => database.prepare(sql)),
    )
  }
  const env: AppEnv = {
    DB: database,
    APP_ORIGIN: 'https://app.conducting.test',
    MACHINE_ORIGIN: 'https://machine.conducting.test',
    GITHUB_CLIENT_ID: 'runtime-client',
    GITHUB_CLIENT_SECRET: 'runtime-client-secret',
    SESSION_SIGNING_KEY: btoa('s'.repeat(32)),
    BOAT_KEY_ENCRYPTION_KEY: btoa('e'.repeat(32)),
  }
  await database.batch([
    database.prepare(
      "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('runtime-user', 11, 'octocat', 0, 0)",
    ),
    database.prepare(
      "INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES ('runtime-org', 'Runtime org', 'runtime-user', 0)",
    ),
    database.prepare(
      "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES ('runtime-org', 'runtime-user', 'admin', 0)",
    ),
    database.prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id) VALUES ('runtime-repo', 'runtime-org', 11, 'example/runtime', 'main', 91)",
    ),
    database.prepare(
      "INSERT INTO settings (org_id, org_image_name, updated_at) VALUES ('runtime-org', 'base-runtime-image', 0)",
    ),
  ])
  await storeBoatKey(env, 'runtime-org', 'boat-first', boat.fetch, Date.now())
  return {
    boat,
    requests,
    env,
    actor: (id: string) => bindings.WORKSPACES.getByName(id),
    fetch: (path: string) =>
      runtime.dispatchFetch(`https://runtime.test${path}`),
    refuseRedirects: () => {
      redirects = true
      requests.length = 0
    },
    restart: async () => {
      await runtime.dispose()
      runtime = create()
      bindings = await runtime.getBindings<RuntimeBindings>()
      env.DB = bindings.DB
    },
    dispose: () => runtime.dispose(),
  }
}
