import { Miniflare, Response as RuntimeResponse } from 'miniflare'

import type { HttpFetch } from '../env'
import type { TurnTokenEndpoint } from '../model-gateway/types'
import { workspaceLifecycleEndpoint } from '../lifecycle/workspace-transport'
import type { WorkspaceLifecycleEndpoint } from '../lifecycle/workspace-runtime'
import { advanceScheduledAlarms } from '../lifecycle/scheduled-alarms.test-support'
import type { NativeWorkspace } from './native-workspace-entry'
import type {
  NativeWorkspaceApi,
  NativeWorkspaceOptions,
} from './native-workspace-api'
import { NATIVE_TEST_TIME } from './native-workspace-api'
import { NativeHostBridge } from './native-host-bridge'
import { nativeWorkspaceBundle } from './native-bundle'
import { readNativePacket } from './native-protocol'
import { forceNativeEviction } from './native-eviction'
import { migratedStorage, TEST_D1_ID } from './migrated-storage'

const WORKER_NAME = 'worker-core-tests'
const EXPORT_NAME = 'NativeWorkspace'

interface NativeBindings {
  DB: D1Database
  CHAT_ATTACHMENTS: R2Bucket
  WORKSPACES: DurableObjectNamespace<NativeWorkspace>
}

export async function createNativeRuntime(
  environment: Record<string, string>,
  outbound: HttpFetch,
  options: { migrated?: boolean } = {},
) {
  // A migrated runtime starts from a copy of the run's migrated database.
  const storage = options.migrated ? await migratedStorage() : null
  const actors = new Map<string, NativeActor>()
  const bridges = new Map<string, NativeHostBridge>()
  let now = NATIVE_TEST_TIME
  const runtime = new Miniflare({
    enableDevRegistry: false,
    telemetry: { enabled: false },
    cf: false,
    ...(storage && { resourcePersistencePath: storage.path }),
    workers: [
      {
        config: {
          name: WORKER_NAME,
          compatibilityDate: '2026-11-06',
          exports: {
            [EXPORT_NAME]: { type: 'durable-object', storage: 'sqlite' },
          },
          env: {
            ...Object.fromEntries(
              Object.entries(environment).map(([key, value]) => [
                key,
                { type: 'text' as const, value },
              ]),
            ),
            DB: { type: 'd1', id: TEST_D1_ID },
            CHAT_ATTACHMENTS: { type: 'r2', name: 'test-chat-attachments' },
            WORKSPACES: {
              type: 'durable-object',
              worker: WORKER_NAME,
              exportName: EXPORT_NAME,
            },
            NATIVE_CONTROL: {
              type: 'fetcher',
              handler: (request) => {
                const bridge = bridges.get(
                  request.headers.get('X-Native-Actor') ?? '',
                )
                if (!bridge) throw new Error('Unknown native callback owner.')
                return bridge.fetch(request)
              },
            },
          },
          manifest: {
            mainModule: 'index.js',
            modules: {
              'index.js': {
                type: 'esm',
                contents: await nativeWorkspaceBundle(),
              },
            },
          },
        },
        dev: {
          outboundService: {
            type: 'fetcher',
            handler: async (incoming) => {
              const request = new Request(incoming.url, {
                method: incoming.method,
                headers: [...incoming.headers],
                body: ['GET', 'HEAD'].includes(incoming.method)
                  ? undefined
                  : await incoming.arrayBuffer(),
                redirect: 'manual',
              })
              const response = await outbound(request)
              return new RuntimeResponse(response.body, {
                status: response.status,
                headers: [...response.headers],
              })
            },
          },
        },
      },
    ],
  })
  const bindings = await runtime.getBindings<NativeBindings>()
  const actor = (
    name: string,
    initialOptions: NativeWorkspaceOptions = {},
  ): NativeActor => {
    const existing = actors.get(name)
    if (existing) return existing
    const id = bindings.WORKSPACES.idFromName(name).toString()
    let ready = Promise.resolve()
    const bridge = new NativeHostBridge(async (invocation) => {
      await ready
      const response = await runtime.dispatchFetch(
        `https://native.test/invoke/${id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'call', id: 'host', invocation }),
        },
      )
      const packet = readNativePacket(await response.json())
      if (packet.type !== 'done') throw new Error('Expected a native result.')
      return packet.result
    })
    bridges.set(id, bridge)
    const api = bridge.remote<NativeWorkspaceApi>()
    let options: NativeWorkspaceOptions = {
      ...initialOptions,
      workspaceId: name,
    }
    ready = api.controls.initialize(options, now)
    const value: NativeActor = {
      ready,
      api,
      rpc: bindings.WORKSPACES.getByName(name),
      fetch: async (request) => {
        await ready
        const response = await runtime.dispatchFetch(request.url, {
          method: request.method,
          headers: {
            ...Object.fromEntries(request.headers),
            'X-Native-Workspace': id,
          },
          body: ['GET', 'HEAD'].includes(request.method)
            ? undefined
            : request.body,
          duplex: 'half',
        })
        return new Response(await response.arrayBuffer(), {
          status: response.status,
          headers: [...response.headers],
        })
      },
      lifecycle: workspaceLifecycleEndpoint(api.lifecycleRpc, {
        BOAT_KEY_ENCRYPTION_KEY: environment.BOAT_KEY_ENCRYPTION_KEY,
      }),
      configure: async (next) => {
        options = { ...next, workspaceId: name }
        await api.controls.configure(options)
      },
      restart: async () => {
        await api.chat.closeConnections()
        await api.controls.drain()
        await api.controls.persist()
        bridge.cancel()
        const resetInstance = await forceNativeEviction(
          runtime,
          WORKER_NAME,
          EXPORT_NAME,
          name,
          api.controls,
        )
        await api.controls.configure(options)
        if ((await api.controls.instanceId()) === resetInstance)
          throw new Error('The native eviction kept the reset object instance.')
      },
      reset: async () => {
        bridge.cancel()
        await api.controls.reset()
        await forceNativeEviction(
          runtime,
          WORKER_NAME,
          EXPORT_NAME,
          name,
          api.controls,
        )
      },
    }
    actors.set(name, value)
    return value
  }
  return {
    runtime,
    bindings,
    migrated: storage !== null,
    actor,
    setTime: async (at: number) => {
      now = at
      await Promise.all(
        [...actors.values()].map((actor) => actor.api.controls.setTime(at)),
      )
    },
    advanceTo: async (at: number, names?: readonly string[]) => {
      return advanceScheduledAlarms(
        {
          now: () => now,
          setTime: async (value) => {
            now = value
            await Promise.all(
              [...actors.values()].map((actor) =>
                actor.api.controls.setTime(value),
              ),
            )
          },
        },
        at,
        () =>
          [...actors.entries()]
            .filter(([name]) => !names || names.includes(name))
            .map(([, actor]) => ({
              storage: actor.api.storage,
              fire: () => actor.api.controls.dispatchAlarm(),
            })),
      )
    },
    reset: async () => {
      for (const actor of actors.values()) await actor.reset()
      actors.clear()
      bridges.clear()
      now = NATIVE_TEST_TIME
    },
    dispose: async () => {
      await Promise.all([...actors.values()].map((actor) => actor.ready))
      for (const bridge of bridges.values()) bridge.cancel()
      await runtime.dispose()
      await storage?.remove()
    },
  }
}

export interface NativeActor {
  ready: Promise<void>
  api: NativeWorkspaceApi
  rpc: DurableObjectStub<NativeWorkspace>
  fetch(request: Request): Promise<Response>
  lifecycle: WorkspaceLifecycleEndpoint & TurnTokenEndpoint
  configure(options: NativeWorkspaceOptions): Promise<void>
  restart(): Promise<void>
  reset(): Promise<void>
}
