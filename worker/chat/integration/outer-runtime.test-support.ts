import { Miniflare, Response as RuntimeResponse } from 'miniflare'
import { build } from 'vite'

import type { AppEnv, HttpFetch } from '../../env'
import { LifecycleBoat } from '../../lifecycle/lifecycle-boat-test-support'
import { FakeGitHub } from '../../test-support/fake-github'
import { TEST_ORIGIN } from '../../test-support/harness'
import { applyMigrations } from '../../test-support/migrations'
import { seedOuterRuntime } from './outer-seed.test-support'

export const OUTER_MACHINE_ORIGIN = 'https://api.conductive.test'

type OuterConfiguration = Partial<
  Pick<
    AppEnv,
    | 'CONDUCTIVE_MODELS'
    | 'CONDUCTIVE_DEFAULT_CHOICE'
    | 'CONDUCTIVE_RUNNER_ARCHIVE_URL'
    | 'CONDUCTIVE_RUNNER_ARCHIVE_SHA256'
    | 'GITHUB_APP_PRIVATE_KEY'
    | 'GITHUB_WEBHOOK_SECRET'
    | 'PREVIEW_DOMAIN'
  >
>

export async function outerWorkerBundle(
  entryPath = 'worker/index.ts',
): Promise<string> {
  const bundle = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      target: 'es2022',
      lib: { entry: entryPath, formats: ['es'] },
      rolldownOptions: { external: ['cloudflare:workers'] },
    },
  })
  const outputs = (Array.isArray(bundle) ? bundle : [bundle]).flatMap(
    (result) => ('output' in result ? result.output : []),
  )
  const entry = outputs.find(
    (output) => output.type === 'chunk' && output.isEntry,
  )
  if (entry?.type !== 'chunk')
    throw new Error('The outer Worker bundle is missing.')
  return entry.code
}

export async function createOuterRuntime(
  bundle: string,
  options: {
    appOrigin?: string
    port?: number
    assetsDirectory?: string
    https?: boolean
    configuration?: OuterConfiguration
    persistencePath?: string
    outbound?: (request: Request, fallback: HttpFetch) => Promise<Response>
  } = {},
) {
  const appOrigin = options.appOrigin ?? TEST_ORIGIN
  const boat = new LifecycleBoat()
  const github = new FakeGitHub()
  const requests: string[] = []
  const text = (value: string) => ({ type: 'text' as const, value })
  const configuration: Record<string, ReturnType<typeof text>> = {}
  for (const [name, value] of Object.entries(options.configuration ?? {})) {
    if (typeof value === 'string') configuration[name] = text(value)
  }
  const createRuntime = () =>
    new Miniflare({
      host: '127.0.0.1',
      port: options.port,
      https: options.https,
      enableDevRegistry: false,
      telemetry: { enabled: false },
      cf: false,
      resourcePersistencePath: options.persistencePath,
      workers: [
        {
          config: {
            name: 'outer-chat-tests',
            compatibilityDate: '2026-11-06',
            exports: {
              Workspace: { type: 'durable-object', storage: 'sqlite' },
            },
            env: {
              DB: { type: 'd1', id: 'outer-chat-db' },
              WORKSPACES: {
                type: 'durable-object',
                worker: 'outer-chat-tests',
                exportName: 'Workspace',
              },
              APP_ORIGIN: text(appOrigin),
              MACHINE_ORIGIN: text(OUTER_MACHINE_ORIGIN),
              GITHUB_CLIENT_ID: text('outer-client'),
              GITHUB_CLIENT_SECRET: text('outer-client-secret'),
              SESSION_SIGNING_KEY: text(btoa('s'.repeat(32))),
              BOAT_KEY_ENCRYPTION_KEY: text(btoa('e'.repeat(32))),
              BOAT_API_KEY: text(boat.server.apiKey),
              BOAT_ORG_ID: text(boat.server.orgId),
              ...configuration,
              ...(options.assetsDirectory
                ? { ASSETS: { type: 'assets' as const } }
                : {}),
            },
            ...(options.assetsDirectory
              ? {
                  assets: {
                    directory: options.assetsDirectory,
                    notFoundHandling: 'single-page-application' as const,
                    runWorkerFirst: true,
                    hasUserWorker: true,
                  },
                }
              : {}),
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
                const request = new Request(incoming.url, {
                  method: incoming.method,
                  headers: [...incoming.headers.entries()],
                  body: ['GET', 'HEAD'].includes(incoming.method)
                    ? undefined
                    : await incoming.arrayBuffer(),
                  redirect: 'manual',
                })
                const fallback =
                  new URL(request.url).hostname === 'boat.dev'
                    ? boat.fetch
                    : github.fetch
                const response = await (options.outbound
                  ? options.outbound(request, fallback)
                  : fallback(request))
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
  let runtime = createRuntime()
  try {
    const db = await runtime.getD1Database('DB')
    await applyMigrations(db)
    const env: AppEnv = {
      DB: db,
      APP_ORIGIN: appOrigin,
      MACHINE_ORIGIN: OUTER_MACHINE_ORIGIN,
      GITHUB_CLIENT_ID: 'outer-client',
      GITHUB_CLIENT_SECRET: 'outer-client-secret',
      SESSION_SIGNING_KEY: btoa('s'.repeat(32)),
      BOAT_KEY_ENCRYPTION_KEY: btoa('e'.repeat(32)),
      BOAT_API_KEY: boat.server.apiKey,
      BOAT_ORG_ID: boat.server.orgId,
      ...options.configuration,
    }
    const cookies = await seedOuterRuntime(env)
    const headers = {
      Cookie: cookies.ownerCookie,
      Origin: appOrigin,
      'Content-Type': 'application/json',
    }
    const request = (
      path: string,
      init: { method?: string; headers?: HeadersInit; body?: string } = {},
    ) => {
      const requestHeaders = new Headers(headers)
      new Headers(init.headers).forEach((value, name) => {
        requestHeaders.set(name, value)
      })
      return runtime.dispatchFetch(`${appOrigin}${path}`, {
        ...init,
        headers: [...requestHeaders.entries()],
      })
    }
    return {
      get runtime() {
        return runtime
      },
      env,
      boat,
      github,
      requests,
      cookies,
      headers,
      request,
      restart: async () => {
        if (!options.persistencePath)
          throw new Error('The restart fixture needs persistent storage.')
        await runtime.dispose()
        runtime = createRuntime()
        env.DB = await runtime.getD1Database('DB')
      },
      dispose: () => runtime.dispose(),
    }
  } catch (error) {
    await runtime.dispose()
    throw error
  }
}

export type OuterRuntime = Awaited<ReturnType<typeof createOuterRuntime>>
