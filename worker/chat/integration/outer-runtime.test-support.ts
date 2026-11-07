import { Miniflare, Response as RuntimeResponse } from 'miniflare'
import { build } from 'vite'

import type { AppEnv } from '../../env'
import { LifecycleBoat } from '../../lifecycle/lifecycle-boat-test-support'
import { FakeGitHub } from '../../test-support/fake-github'
import { TEST_ORIGIN } from '../../test-support/harness'
import { applyMigrations } from '../../test-support/migrations'
import { seedOuterRuntime } from './outer-seed.test-support'

export const OUTER_MACHINE_ORIGIN = 'https://api.conductive.test'

export async function outerWorkerBundle(): Promise<string> {
  const bundle = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      target: 'es2022',
      lib: { entry: 'worker/index.ts', formats: ['es'] },
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
  } = {},
) {
  const appOrigin = options.appOrigin ?? TEST_ORIGIN
  const boat = new LifecycleBoat()
  const github = new FakeGitHub()
  const requests: string[] = []
  const text = (value: string) => ({ type: 'text' as const, value })
  const runtime = new Miniflare({
    host: '127.0.0.1',
    port: options.port,
    https: options.https,
    enableDevRegistry: false,
    telemetry: { enabled: false },
    cf: false,
    workers: [
      {
        config: {
          name: 'outer-chat-tests',
          compatibilityDate: '2026-11-06',
          exports: { Workspace: { type: 'durable-object', storage: 'sqlite' } },
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
              const response = await (
                new URL(request.url).hostname === 'boat.dev'
                  ? boat.fetch
                  : github.fetch
              )(request)
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
    }
    const cookies = await seedOuterRuntime(env, boat)
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
      runtime,
      env,
      boat,
      github,
      requests,
      cookies,
      headers,
      request,
      dispose: () => runtime.dispose(),
    }
  } catch (error) {
    await runtime.dispose()
    throw error
  }
}

export type OuterRuntime = Awaited<ReturnType<typeof createOuterRuntime>>
