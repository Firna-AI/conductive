import { Workspace } from '../workspace'
import type { LifecycleEnvironment } from '../lifecycle/runtime'
import { advanceScheduledAlarms } from '../lifecycle/scheduled-alarms.test-support'
import {
  nativeChatResolvers,
  type NativeChatCallbacks,
} from './native-chat-resolvers'
import {
  nativeStorageControls,
  type NativeStorageHooks,
} from './native-storage'
import { readNativePacket } from './native-protocol'
import { NativeWorkerBridge } from './native-worker-bridge'
import {
  type NativeWorkspaceApi,
  type NativeWorkspaceOptions,
} from './native-workspace-api'
import { nativePeers } from './native-peers'
import { nativeClock } from './native-clock'
import { nativeRequests } from './native-requests'
import { nativeChatObservers } from './native-chat-observers'
import { nativeDatabase } from './native-d1'
import { nativeCryptoObservation } from './native-crypto'
import { nativeChatRecordControls } from './native-chat-record-controls'
import { nativeAttachmentControls } from './native-attachment-controls'
import { nativeWarningObservation } from './native-warnings'
import { initialNativeTitleModel } from './native-constructor-options'
import { nativeEntryFetch } from './native-entry-router'
import { nativeLifecycleControls } from './native-lifecycle-controls'
import { nativeLifecycleRpc } from './native-lifecycle-rpc'

interface NativeEnvironment extends LifecycleEnvironment {
  NATIVE_CONTROL: Fetcher
  WORKSPACES: DurableObjectNamespace<NativeWorkspace>
}

const CLOCK_KEY = '__test:native-clock'

export class NativeWorkspace extends Workspace {
  private readonly bridge: NativeWorkerBridge
  private readonly native: NativeWorkspaceApi
  private readonly saveState: () => Promise<void>

  constructor(context: DurableObjectState, env: NativeEnvironment) {
    const bridge = new NativeWorkerBridge(
      env.NATIVE_CONTROL,
      context.id.toString(),
    )
    const database = nativeDatabase(env.DB)
    env = { ...env, DB: database.db }
    const clock = nativeClock()
    const callbacks: NativeChatCallbacks = {
      runTitleModel: initialNativeTitleModel(context.id.toString(), bridge),
    }
    const hooks: NativeStorageHooks = {}
    const state = {
      workspaceId: undefined as string | undefined,
      ids: [] as string[],
      sequence: 0,
      idPrefix: 'chat',
      idWidth: 4,
      connectionSequence: 0,
      idFallback: undefined as string | undefined,
    }
    const controls = nativeStorageControls(context, hooks, clock.now)
    const observations = nativeChatObservers()
    const pending = new Set<Promise<unknown>>()
    const errors: unknown[] = []
    const waitUntil = context.waitUntil.bind(context)
    context.waitUntil = (work) => {
      pending.add(work)
      void work.then(
        () => pending.delete(work),
        (error: unknown) => {
          pending.delete(work)
          errors.push(error)
        },
      )
      waitUntil(work)
    }
    super(
      context,
      env,
      clock.now,
      {
        ...nativeChatResolvers(
          env,
          callbacks,
          clock.now,
          () => state.workspaceId,
          () => `connection-${++state.connectionSequence}`,
        ),
        randomId: () =>
          state.ids.shift() ??
          state.idFallback ??
          `${state.idPrefix}-${String(++state.sequence).padStart(state.idWidth, '0')}`,
        scheduleBrowserCheck: clock.schedule,
        scheduleRunnerCheck: clock.schedule,
        callbackObservers: observations.callbacks,
      },
      clock.schedule,
    )
    this.bridge = bridge
    observations.observePublications(this.chat)
    const instanceId = crypto.randomUUID()
    let onPublication: NativeWorkspaceOptions['onPublication']
    let onQueued: NativeWorkspaceOptions['onQueued']
    const run = this.chat.store.run.bind(this.chat.store)
    this.chat.store.run = <T>(work: () => Promise<T>): Promise<T> => {
      const result = run(work)
      if (onQueued) context.waitUntil(onQueued())
      return result
    }
    const publish = this.chat.commitWorkspaceEvent.bind(this.chat)
    this.chat.commitWorkspaceEvent = async (workspaceId, event, occurredAt) => {
      await publish(workspaceId, event, occurredAt)
      await onPublication?.({
        workspaceId,
        event,
        occurredAt: occurredAt ?? clock.now(),
      })
    }
    const saveClock = async () => {
      await controls.unobservedPut(CLOCK_KEY, { at: clock.now(), ...state })
    }
    this.saveState = saveClock
    context.blockConcurrencyWhile(async () => {
      const saved = await context.storage.get<{ at: number } & typeof state>(
        CLOCK_KEY,
      )
      if (saved) {
        Object.assign(state, saved)
        await clock.setTime(saved.at)
      }
    })
    const drain = async () => {
      let work: Promise<unknown>
      do {
        work = this.chat.store.settled()
        await work
      } while (work !== this.chat.store.settled())
      if (errors.length) throw errors.shift()
    }
    this.native = {
      chat: this.chat,
      controller: this.controller,
      storage: context.storage,
      peers: nativePeers(this.chat),
      requests: nativeRequests((request) => this.fetch(request)),
      lifecycleRpc: nativeLifecycleRpc(env.WORKSPACES.get(context.id)),
      lifecycleControls: nativeLifecycleControls(
        this,
        this.controller,
        context.storage,
        () => ({
          instanceId,
          alarmGeneration: controls.alarmGeneration(),
        }),
      ),
      controls: {
        instanceId: async () => instanceId,
        abortFixture: async () =>
          context.abort('The native test fixture requested an object reset.'),
        initialize: async (options, at) => {
          await this.native.controls.configure(options)
          await clock.setTime(at)
        },
        ...nativeCryptoObservation(),
        ...nativeWarningObservation(),
        ...nativeChatRecordControls(this.chat, this.integration.files),
        ...nativeAttachmentControls(env, clock.now),
        configure: async (options) => {
          state.workspaceId = options.workspaceId
          for (const key of Object.keys(hooks))
            Reflect.deleteProperty(hooks, key)
          Object.assign(hooks, options.hooks)
          for (const key of Object.keys(callbacks))
            Reflect.deleteProperty(callbacks, key)
          Object.assign(callbacks, options.callbacks)
          onPublication = options.onPublication
          onQueued = options.onQueued
          Object.assign(env, options.environment)
          database.state.observe = options.onQuery
          for (const key of Object.keys(observations.observers))
            Reflect.deleteProperty(observations.observers, key)
          Object.assign(observations.observers, options.observers)
          state.idPrefix = options.idPrefix ?? 'chat'
          state.idWidth = options.idWidth ?? 4
          state.idFallback = options.idFallback
        },
        snapshot: async () => ({
          instanceId,
          records: new Map(
            [...(await context.storage.list({ prefix: '' }))].filter(
              ([key]) => !key.startsWith('__test:'),
            ),
          ),
          writes: controls.writes(),
          alarmAt: await context.storage.getAlarm(),
          alarmGeneration: controls.alarmGeneration(),
          now: clock.now(),
          scheduledCount: clock.scheduledCount(),
        }),
        nextIds: async (ids) => {
          state.ids.push(...ids)
          await saveClock()
        },
        setTime: async (at) => {
          await clock.setTime(at)
        },
        advance: async (at) =>
          advanceScheduledAlarms(
            {
              now: clock.now,
              setTime: async (value) => {
                await clock.setTime(value)
                await saveClock()
              },
            },
            at,
            () => [
              {
                storage: context.storage,
                fire: async () => {
                  await this.alarm()
                  await this.settledAlarms()
                },
              },
            ],
          ),
        drain,
        drainBackground: async () => {
          while (pending.size) await Promise.allSettled([...pending])
          await drain()
        },
        reset: async () => {
          this.chat.closeConnections()
          for (const key of Object.keys(hooks))
            Reflect.deleteProperty(hooks, key)
          await context.storage.deleteAlarm()
          await context.storage.deleteAll()
        },
        rawRecords: () => context.storage.list({ prefix: '' }),
        dispatchAlarm: async () => {
          await this.alarm()
          await this.settledAlarms()
        },
        eventNumber: (workspaceId) =>
          this.chat.readWorkspace(
            workspaceId,
            async (view) => view.eventNumber,
          ),
        takeEvents: observations.takeEvents,
        takeStoredEvents: observations.takeStoredEvents,
        persist: saveClock,
      },
    }
    bridge.values.register('root', this.native)
  }

  async nativeInvoke(input: unknown) {
    const packet = readNativePacket(input)
    if (packet.type !== 'call') throw new Error('Expected a native invocation.')
    const result = await this.bridge.values.invoke(packet.invocation)
    return result
  }

  override async fetch(request: Request): Promise<Response> {
    try {
      return await super.fetch(request)
    } finally {
      await this.saveState()
    }
  }
}

/** @public Bundled Worker entry for the native test runtime. */
export default {
  fetch: nativeEntryFetch,
}
